"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
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
const child_process_1 = require("child_process");
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function isBarrelFile(filePath) {
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
function isTestableSource(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return TESTABLE_FOLDERS.some((f) => normalized.includes(f));
}
function computeTestPath(sourcePath) {
  const normalized = sourcePath.replace(/\\/g, "/");
  const libIdx = normalized.indexOf("lib/");
  if (libIdx === -1) return null;
  const relative = normalized.substring(libIdx + "lib/".length);
  return "test/" + relative.replace(/\.dart$/, "_test.dart");
}
function findTestByName(projectRoot, testFileName) {
  const testRoot = path.join(projectRoot, "test");
  if (!fs.existsSync(testRoot)) return null;
  function search(dir) {
    let entries;
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
function parseJsonTestOutput(output) {
  const summary = {
    passed: 0,
    failed: 0,
    errors: 0,
    skipped: 0,
    total: 0,
    duration: 0,
    failures: [],
  };
  const tests = new Map();
  const lines = output.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    let event;
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
function collectTestFiles(git) {
  const testFiles = new Set();
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
exports.default = (0, _types_1.createPlugin)(
  {
    name: "flutter-test-runner",
    description: "Executa testes da PR e reporta resultados",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const testFiles = collectTestFiles(git);
    if (testFiles.length === 0) {
      return;
    }
    let summary;
    try {
      const testFileArgs = testFiles.join(" ");
      const cmd = `flutter test --reporter json ${testFileArgs}`;
      let output = "";
      try {
        output = (0, child_process_1.execSync)(cmd, {
          encoding: "utf-8",
          stdio: "pipe",
          timeout: 300000,
        });
      } catch (error) {
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
    (0, _types_1.sendMarkdown)(md);
    if (summary.failures.length > 0) {
      const failedFiles = [
        ...new Set(
          summary.failures
            .map((f) => f.file)
            .filter(Boolean)
            .map((f) => {
              const parts = f.replace(/\\/g, "/").split("/");
              return parts[parts.length - 1];
            })
        ),
      ];
      const fileList = failedFiles.map((f) => `\`${f}\``).join(", ");
      (0, _types_1.sendWarn)(
        `**${summary.failed + summary.errors} teste(s) com erro:** ${fileList}`
      );
    }
  }
);
