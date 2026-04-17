/**
 * Flutter Test Runner Plugin
 * Executa os testes unitários relacionados aos arquivos da PR e reporta resultados.
 *
 * Comportamento:
 * - Coleta testes da PR: arquivos _test.dart modificados + testes correspondentes a source files
 * - Roda `flutter test --reporter json` para cada arquivo
 * - Reporta testes que falharam como warnings (NÃO quebra a pipeline)
 * - Mostra sumário de resultados (passou/falhou/erro/skip)
 *
 * Gera coverage se `flutter test --coverage` estiver disponível,
 * para ser consumido pelo plugin test-coverage-summary.
 */
import { execSync } from "child_process";
import { createPlugin, getDanger, sendMarkdown, sendWarn } from "@types";
import * as fs from "fs";
import * as path from "path";

interface TestResult {
  id: number;
  name: string;
  result: "success" | "failure" | "error";
  errorMessage?: string;
  file?: string;
}

interface TestSummary {
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  total: number;
  duration: number;
  failures: TestResult[];
}

function isBarrelFile(filePath: string): boolean {
  const fileName = path.basename(filePath, ".dart");
  const parentDir = path.basename(path.dirname(filePath));
  return fileName === parentDir;
}

const TESTABLE_FOLDERS = [
  "/usecases/",
  "/datasources/",
  "/repositories/",
  "/viewmodels/",
  "/models/",
  "/entities/",
];

function isTestableSource(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return TESTABLE_FOLDERS.some((f) => normalized.includes(f));
}

function computeTestPath(sourcePath: string): string | null {
  const normalized = sourcePath.replace(/\\/g, "/");
  const libIdx = normalized.indexOf("lib/");
  if (libIdx === -1) return null;
  const relative = normalized.substring(libIdx + "lib/".length);
  return "test/" + relative.replace(/\.dart$/, "_test.dart");
}

function findTestByName(projectRoot: string, testFileName: string): string | null {
  const testRoot = path.join(projectRoot, "test");
  if (!fs.existsSync(testRoot)) return null;

  function search(dir: string): string | null {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return null;
    }
    for (const entry of entries) {
      if (entry === testFileName) return path.join(dir, entry);
      const full = path.join(dir, entry);
      try {
        if (fs.statSync(full).isDirectory()) {
          const found = search(full);
          if (found) return found;
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  return search(testRoot);
}

function parseJsonTestOutput(output: string): TestSummary {
  const summary: TestSummary = {
    passed: 0,
    failed: 0,
    errors: 0,
    skipped: 0,
    total: 0,
    duration: 0,
    failures: [],
  };

  const tests = new Map<number, { name: string; suiteFile?: string }>();
  const lines = output.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    let event: any;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    if (event.type === "testStart" && event.test) {
      tests.set(event.test.id, {
        name: event.test.name,
        suiteFile: event.test.root_url || event.test.url,
      });
    }

    if (event.type === "testDone" && event.testID !== null) {
      const test = tests.get(event.testID);
      if (!test) continue;
      if (event.hidden || event.skipped) {
        if (event.skipped) summary.skipped++;
        continue;
      }

      summary.total++;
      if (event.result === "success") {
        summary.passed++;
      } else if (event.result === "failure") {
        summary.failed++;
        summary.failures.push({
          id: event.testID,
          name: test.name,
          result: "failure",
          file: test.suiteFile,
        });
      } else if (event.result === "error") {
        summary.errors++;
        summary.failures.push({
          id: event.testID,
          name: test.name,
          result: "error",
          file: test.suiteFile,
        });
      }
    }

    if (event.type === "error" && event.testID !== null) {
      const existing = summary.failures.find((f) => f.id === event.testID);
      if (existing) {
        existing.errorMessage = event.error;
      }
    }

    if (event.type === "done") {
      summary.duration = event.time || 0;
    }
  }

  return summary;
}

function collectTestFiles(git: { created_files: string[]; modified_files: string[] }): string[] {
  const testFiles = new Set<string>();

  const allChanged = [...git.created_files, ...git.modified_files];

  for (const file of allChanged) {
    if (file.endsWith("_test.dart") && fs.existsSync(file)) {
      testFiles.add(file);
    }
  }

  for (const file of allChanged) {
    if (
      !file.endsWith(".dart") ||
      file.endsWith("_test.dart") ||
      file.endsWith(".g.dart") ||
      file.endsWith(".freezed.dart") ||
      isBarrelFile(file) ||
      !isTestableSource(file)
    ) {
      continue;
    }

    const directTest = computeTestPath(file);
    if (directTest && fs.existsSync(directTest)) {
      testFiles.add(directTest);
      continue;
    }

    const testFileName = path.basename(file, ".dart") + "_test.dart";
    const cwd = process.cwd();
    const found = findTestByName(cwd, testFileName);
    if (found) {
      const relative = path.relative(cwd, found);
      testFiles.add(relative);
    }
  }

  return [...testFiles];
}

export default createPlugin(
  {
    name: "flutter-test-runner",
    description: "Executa testes da PR e reporta resultados",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const testFiles = collectTestFiles(git);

    if (testFiles.length === 0) {
      return;
    }

    let summary: TestSummary;

    try {
      const testFileArgs = testFiles.join(" ");
      const cmd = `flutter test --reporter json ${testFileArgs}`;

      let output = "";
      try {
        output = execSync(cmd, {
          encoding: "utf-8",
          stdio: "pipe",
          timeout: 300_000,
        });
      } catch (error: any) {
        output = (error.stdout || "") + (error.stderr || "");
      }

      summary = parseJsonTestOutput(output);
    } catch {
      return;
    }

    if (summary.total === 0) {
      return;
    }

    const allPassed = summary.failed === 0 && summary.errors === 0;

    let md = allPassed
      ? `✅ **Testes da PR** — ${summary.passed} passou(aram)`
      : `⚠️ **Testes da PR** — ${summary.failed + summary.errors} falha(s)`;
    md += "\n\n";
    md += "| Métrica | Resultado |\n";
    md += "| :-- | :--: |\n";
    md += `| Passou | **${summary.passed}** |\n`;

    if (summary.failed > 0) {
      md += `| Falhou | **${summary.failed}** |\n`;
    }
    if (summary.errors > 0) {
      md += `| Erros | **${summary.errors}** |\n`;
    }
    if (summary.skipped > 0) {
      md += `| Ignorados | ${summary.skipped} |\n`;
    }

    md += `| Total | ${summary.total} |\n`;

    sendMarkdown(md);

    if (summary.failures.length > 0) {
      const failedFiles = [
        ...new Set(
          summary.failures
            .map((f) => f.file)
            .filter(Boolean)
            .map((f) => {
              const parts = f!.replace(/\\/g, "/").split("/");
              return parts[parts.length - 1];
            })
        ),
      ];

      const fileList = failedFiles.map((f) => `\`${f}\``).join(", ");
      sendWarn(`**${summary.failed + summary.errors} teste(s) com erro:** ${fileList}`);
    }
  }
);
