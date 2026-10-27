/**
 * Test Coverage Summary Plugin
 * Gera coverage executando `flutter test --coverage` e mostra
 * uma tabela de cobertura no summary da PR.
 *
 * Filtra somente arquivos .dart (sem `_test.dart`) modificados/criados na PR.
 * Mostra: linhas cobertas, linhas totais, percentual por arquivo e total.
 *
 * Testes rodados: os `_test.dart` da PR e os dos source files de usecases/, datasources/,
 * repositories/, viewmodels/, models/ e entities/ (sem barrel files e .g.dart/.freezed.dart),
 * pela mesma regra do flutter-test-runner.
 */
import { execSync } from "child_process";
import { DartLayerFolder, DartPath, createPlugin, getDanger, sendMarkdown } from "@types";
import * as fs from "fs";
import * as path from "path";

interface FileCoverage {
  file: string;
  linesHit: number;
  linesTotal: number;
  percent: number;
}

const TESTABLE_FOLDERS = [
  DartLayerFolder.UseCases,
  DartLayerFolder.DataSources,
  DartLayerFolder.Repositories,
  DartLayerFolder.ViewModels,
  DartLayerFolder.Models,
  DartLayerFolder.Entities,
];

/** Gerados sem teste próprio (lista do plugin, menor que `DartPath.isGenerated`). */
const GENERATED_SUFFIXES = [".g.dart", ".freezed.dart"];

function isTestFile(file: DartPath): boolean {
  return file.fileName.endsWith("_test.dart");
}

/** Arquivo de produção que deve ter teste: .dart das pastas-alvo, sem barrel e sem gerados. */
function isTestableSource(file: DartPath): boolean {
  return (
    file.isDart &&
    !isTestFile(file) &&
    !GENERATED_SUFFIXES.includes(file.compoundSuffix ?? "") &&
    !file.isBarrel &&
    TESTABLE_FOLDERS.some((folder) => file.inFolder(folder))
  );
}

/**
 * `.../lib/(...)/x.dart` → `test/(...)/x_test.dart`, sempre no test/ da raiz, onde o
 * `flutter test` roda (o `DartPath.expectedTestPath` aponta para o test/ do pacote em monorepo).
 */
function computeTestPath(file: DartPath): string | null {
  const libIdx = file.path.indexOf("lib/");
  if (libIdx === -1) return null;
  const relative = file.path.substring(libIdx + "lib/".length);
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

function collectTestFiles(git: { created_files: string[]; modified_files: string[] }): string[] {
  const testFiles = new Set<string>();
  const allChanged = [...git.created_files, ...git.modified_files].map((f) => DartPath.of(f));

  // testes alterados na PR
  for (const file of allChanged) {
    if (isTestFile(file) && fs.existsSync(file.path)) {
      testFiles.add(file.path);
    }
  }

  // testes dos source files da PR
  for (const file of allChanged.filter(isTestableSource)) {
    const directTest = computeTestPath(file);
    if (directTest && fs.existsSync(directTest)) {
      testFiles.add(directTest);
      continue;
    }

    const testFileName = file.fileName.replace(/\.dart$/, "_test.dart");
    const cwd = process.cwd();
    const found = findTestByName(cwd, testFileName);
    if (found) {
      testFiles.add(path.relative(cwd, found));
    }
  }

  return [...testFiles];
}

/** Arquivos .dart da PR que não são `_test.dart` (os que entram na tabela de cobertura). */
function prSourceFiles(git: { created_files: string[]; modified_files: string[] }): DartPath[] {
  return [...git.created_files, ...git.modified_files]
    .map((f) => DartPath.of(f))
    .filter((file) => file.isDart && !isTestFile(file));
}

function generateCoverage(testFiles: string[]): boolean {
  const lcovPath = "coverage/lcov.info";

  try {
    const args = testFiles.length > 0 ? testFiles.join(" ") : "";
    const cmd = `flutter test --coverage ${args}`;
    execSync(cmd, {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 300_000,
    });
  } catch {
    // Tests may fail but coverage can still be partially generated
  }

  return fs.existsSync(lcovPath);
}

function parseLcov(content: string): FileCoverage[] {
  const files: FileCoverage[] = [];
  let currentFile = "";
  let linesHit = 0;
  let linesTotal = 0;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (trimmed.startsWith("SF:")) {
      currentFile = trimmed.substring(3);
    } else if (trimmed.startsWith("LH:")) {
      linesHit = parseInt(trimmed.substring(3), 10) || 0;
    } else if (trimmed.startsWith("LF:")) {
      linesTotal = parseInt(trimmed.substring(3), 10) || 0;
    } else if (trimmed === "end_of_record") {
      if (currentFile && linesTotal > 0) {
        files.push({
          file: currentFile,
          linesHit,
          linesTotal,
          percent: Math.round((linesHit / linesTotal) * 100),
        });
      }
      currentFile = "";
      linesHit = 0;
      linesTotal = 0;
    }
  }

  return files;
}

function normalizePath(filePath: string): string {
  let p = filePath.replace(/\\/g, "/");
  const libIdx = p.indexOf("lib/");
  if (libIdx > 0) {
    p = p.substring(libIdx);
  }
  return p;
}

function coverageEmoji(percent: number): string {
  if (percent >= 80) return "🟢";
  if (percent >= 60) return "🟡";
  if (percent >= 40) return "🟠";
  return "🔴";
}

function shortPath(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length <= 3) return filePath;
  return ".../" + parts.slice(-3).join("/");
}

function reportCoverage(git: { created_files: string[]; modified_files: string[] }): void {
  const testFiles = collectTestFiles(git);
  if (testFiles.length === 0) return;

  const lcovPath = "coverage/lcov.info";

  if (!fs.existsSync(lcovPath)) {
    const generated = generateCoverage(testFiles);
    if (!generated) {
      sendMarkdown(
        "📊 **Cobertura de Testes** — indisponível\n\n" +
          "Não foi possível gerar `coverage/lcov.info`. " +
          "Verifique se os testes compilam corretamente."
      );
      return;
    }
  }

  // eslint-disable-next-line no-restricted-syntax -- lcov.info, não é código Dart
  const lcovContent = fs.readFileSync(lcovPath, "utf-8");
  const allCoverage = parseLcov(lcovContent);

  if (allCoverage.length === 0) {
    sendMarkdown(
      "📊 **Cobertura de Testes** — indisponível\n\n" +
        "Arquivo `coverage/lcov.info` sem dados de cobertura."
    );
    return;
  }

  const prFiles = new Set(prSourceFiles(git).map((file) => normalizePath(file.path)));

  if (prFiles.size === 0) return;

  const prCoverage = allCoverage.filter((c) => prFiles.has(normalizePath(c.file)));

  if (prCoverage.length === 0) {
    const totalHit = allCoverage.reduce((s, c) => s + c.linesHit, 0);
    const totalLines = allCoverage.reduce((s, c) => s + c.linesTotal, 0);
    const totalPercent = totalLines > 0 ? Math.round((totalHit / totalLines) * 100) : 0;

    sendMarkdown(
      `📊 **Cobertura de Testes** — ${coverageEmoji(totalPercent)} ${totalPercent}% geral ` +
        `(${allCoverage.length} arquivo(s) no projeto)\n\n` +
        "Nenhum arquivo da PR possui dados de cobertura individuais."
    );
    return;
  }

  prCoverage.sort((a, b) => a.percent - b.percent);

  let totalHit = 0;
  let totalLines = 0;
  for (const c of prCoverage) {
    totalHit += c.linesHit;
    totalLines += c.linesTotal;
  }
  const totalPercent = totalLines > 0 ? Math.round((totalHit / totalLines) * 100) : 0;

  let md =
    `${coverageEmoji(totalPercent)} **Cobertura de Testes** — ` +
    `${totalPercent}% (${prCoverage.length} arquivo(s) da PR)\n\n`;
  md += "| Arquivo | Cobertura | Linhas |\n";
  md += "| :-- | :--: | :--: |\n";

  for (const c of prCoverage) {
    const emoji = coverageEmoji(c.percent);
    md += `| \`${shortPath(normalizePath(c.file))}\` | ${emoji} ${c.percent}% | ${c.linesHit}/${c.linesTotal} |\n`;
  }

  if (prCoverage.length > 1) {
    md += `| **Total** | **${coverageEmoji(totalPercent)} ${totalPercent}%** | **${totalHit}/${totalLines}** |\n`;
  }

  sendMarkdown(md);
}

function sendChecklist(git: { created_files: string[]; modified_files: string[] }): void {
  if (prSourceFiles(git).length === 0) return;

  let md = "**Checklist**\n\n";
  md += "| | Item |\n";
  md += "| :--: | :-- |\n";
  md += "| ⬜ | Testado em dispositivo Android |\n";
  md += "| ⬜ | Testado em dispositivo iOS |\n";
  md += "| ⬜ | Testado em Plataforma WEB (Servidor) |\n";
  md += "| ⬜ | UI responsiva em diferentes tamanhos de tela |\n";

  sendMarkdown(md);
}

export default createPlugin(
  {
    name: "test-coverage-summary",
    description: "Gera e mostra cobertura de testes no summary da PR",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    reportCoverage(git);
    sendChecklist(git);
  }
);
