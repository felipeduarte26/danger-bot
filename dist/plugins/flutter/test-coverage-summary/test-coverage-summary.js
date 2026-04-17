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
 * Test Coverage Summary Plugin
 * Gera coverage executando `flutter test --coverage` e mostra
 * uma tabela de cobertura no summary da PR.
 *
 * Filtra somente arquivos modificados/criados na PR.
 * Mostra: linhas cobertas, linhas totais, percentual por arquivo e total.
 */
const child_process_1 = require("child_process");
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const TESTABLE_FOLDERS = [
  "/usecases/",
  "/datasources/",
  "/repositories/",
  "/viewmodels/",
  "/models/",
  "/entities/",
];
function isBarrelFile(filePath) {
  const fileName = path.basename(filePath, ".dart");
  const parentDir = path.basename(path.dirname(filePath));
  return fileName === parentDir;
}
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
      testFiles.add(path.relative(cwd, found));
    }
  }
  return [...testFiles];
}
function generateCoverage(testFiles) {
  const lcovPath = "coverage/lcov.info";
  try {
    const args = testFiles.length > 0 ? testFiles.join(" ") : "";
    const cmd = `flutter test --coverage ${args}`;
    (0, child_process_1.execSync)(cmd, {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 300000,
    });
  } catch {
    // Tests may fail but coverage can still be partially generated
  }
  return fs.existsSync(lcovPath);
}
function parseLcov(content) {
  const files = [];
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
function normalizePath(filePath) {
  let p = filePath.replace(/\\/g, "/");
  const libIdx = p.indexOf("lib/");
  if (libIdx > 0) {
    p = p.substring(libIdx);
  }
  return p;
}
function coverageEmoji(percent) {
  if (percent >= 80) return "🟢";
  if (percent >= 60) return "🟡";
  if (percent >= 40) return "🟠";
  return "🔴";
}
function shortPath(filePath) {
  const parts = filePath.split("/");
  if (parts.length <= 3) return filePath;
  return ".../" + parts.slice(-3).join("/");
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "test-coverage-summary",
    description: "Gera e mostra cobertura de testes no summary da PR",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const testFiles = collectTestFiles(git);
    if (testFiles.length === 0) return;
    const lcovPath = "coverage/lcov.info";
    const lcovExists = fs.existsSync(lcovPath);
    if (!lcovExists) {
      const generated = generateCoverage(testFiles);
      if (!generated) {
        (0, _types_1.sendMarkdown)(
          "📊 **Cobertura de Testes** — indisponível\n\n" +
            "Não foi possível gerar `coverage/lcov.info`. " +
            "Verifique se os testes compilam corretamente."
        );
        return;
      }
    }
    const lcovContent = fs.readFileSync(lcovPath, "utf-8");
    const allCoverage = parseLcov(lcovContent);
    if (allCoverage.length === 0) {
      (0, _types_1.sendMarkdown)(
        "📊 **Cobertura de Testes** — indisponível\n\n" +
          "Arquivo `coverage/lcov.info` sem dados de cobertura."
      );
      return;
    }
    const prFiles = new Set(
      [...git.created_files, ...git.modified_files]
        .filter((f) => f.endsWith(".dart") && !f.endsWith("_test.dart"))
        .map(normalizePath)
    );
    if (prFiles.size === 0) return;
    const prCoverage = allCoverage.filter((c) => prFiles.has(normalizePath(c.file)));
    if (prCoverage.length === 0) {
      const totalHit = allCoverage.reduce((s, c) => s + c.linesHit, 0);
      const totalLines = allCoverage.reduce((s, c) => s + c.linesTotal, 0);
      const totalPercent = totalLines > 0 ? Math.round((totalHit / totalLines) * 100) : 0;
      (0, _types_1.sendMarkdown)(
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
    (0, _types_1.sendMarkdown)(md);
  }
);
