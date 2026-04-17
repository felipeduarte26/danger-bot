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
 * Lê o coverage/lcov.info (gerado pelo flutter-test-runner ou por step anterior do CI)
 * e mostra uma tabela de cobertura no summary da PR.
 *
 * Filtra somente arquivos modificados/criados na PR.
 * Mostra: linhas cobertas, linhas totais, percentual por arquivo e total.
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
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
  return filePath.replace(/\\/g, "/").replace(/^.*\/lib\//, "lib/");
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
    description: "Mostra cobertura de testes no summary da PR",
    enabled: true,
  },
  async () => {
    const lcovPath = "coverage/lcov.info";
    if (!fs.existsSync(lcovPath)) {
      return;
    }
    const { git } = (0, _types_1.getDanger)();
    const prFiles = new Set(
      [...git.created_files, ...git.modified_files]
        .filter((f) => f.endsWith(".dart") && !f.endsWith("_test.dart"))
        .map(normalizePath)
    );
    if (prFiles.size === 0) return;
    const lcovContent = fs.readFileSync(lcovPath, "utf-8");
    const allCoverage = parseLcov(lcovContent);
    const prCoverage = allCoverage.filter((c) => {
      const normalized = normalizePath(c.file);
      return prFiles.has(normalized);
    });
    if (prCoverage.length === 0) return;
    prCoverage.sort((a, b) => a.percent - b.percent);
    let totalHit = 0;
    let totalLines = 0;
    for (const c of prCoverage) {
      totalHit += c.linesHit;
      totalLines += c.linesTotal;
    }
    const totalPercent = totalLines > 0 ? Math.round((totalHit / totalLines) * 100) : 0;
    let md = `${coverageEmoji(totalPercent)} **Cobertura de Testes** — ${totalPercent}% (${prCoverage.length} arquivo(s) da PR)\n\n`;
    md += "| Arquivo | Cobertura | Linhas |\n";
    md += "| :-- | :--: | :--: |\n";
    for (const c of prCoverage) {
      const emoji = coverageEmoji(c.percent);
      md += `| \`${shortPath(c.file)}\` | ${emoji} ${c.percent}% | ${c.linesHit}/${c.linesTotal} |\n`;
    }
    if (prCoverage.length > 1) {
      md += `| **Total** | **${coverageEmoji(totalPercent)} ${totalPercent}%** | **${totalHit}/${totalLines}** |\n`;
    }
    (0, _types_1.sendMarkdown)(md);
  }
);
