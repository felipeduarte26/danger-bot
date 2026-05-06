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
 * Empty Catch Detector Plugin
 *
 * Detecta blocos catch vazios ou que contêm apenas comentários.
 * Catch vazio engole erros silenciosamente, tornando bugs extremamente
 * difíceis de rastrear e mascarando problemas reais em produção.
 *
 * Não flageia catch com rethrow, return, throw, break, continue
 * ou qualquer statement real. Ignora arquivos de teste.
 *
 * @see {@link https://dart.dev/tools/linter-rules/empty_catches} Dart Linter: empty_catches
 * @see Clean Code — Robert C. Martin, Cap. 7: Error Handling
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const CATCH_RE = /(?:catch\s*\(|on\s+\w[\w.]*\s+catch\s*\(|on\s+\w[\w.]*\s*\{)/;
/**
 * Constrói máscara de linhas a ignorar (comentários de bloco e multi-line strings).
 */
function buildSkipMask(lines) {
  const skip = new Array(lines.length).fill(false);
  let inBlock = false;
  let inMultiStr = false;
  let strDelim = "";
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (inBlock) {
      skip[i] = true;
      if (trimmed.includes("*/")) inBlock = false;
      continue;
    }
    if (inMultiStr) {
      skip[i] = true;
      if (lines[i].includes(strDelim)) inMultiStr = false;
      continue;
    }
    if (trimmed.startsWith("/*")) {
      skip[i] = true;
      inBlock = true;
      if (trimmed.includes("*/") && trimmed.indexOf("*/") > trimmed.indexOf("/*") + 1) {
        inBlock = false;
      }
      continue;
    }
    if (trimmed.includes("'''") || trimmed.includes('"""')) {
      const delim = trimmed.includes("'''") ? "'''" : '"""';
      const firstIdx = trimmed.indexOf(delim);
      const secondIdx = trimmed.indexOf(delim, firstIdx + 3);
      if (secondIdx === -1) {
        inMultiStr = true;
        strDelim = delim;
      }
    }
  }
  return skip;
}
/**
 * Verifica se o corpo de um bloco catch está efetivamente vazio
 * (apenas whitespace, comentários de linha ou comentários de bloco).
 */
function isCatchBodyEmpty(lines, openBraceLine) {
  let braces = 0;
  let foundOpen = false;
  let closeLine = openBraceLine;
  for (let i = openBraceLine; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === "{") {
        braces++;
        foundOpen = true;
      }
      if (ch === "}") {
        braces--;
        if (foundOpen && braces <= 0) {
          closeLine = i;
          const bodyLines = extractBodyLines(lines, openBraceLine, closeLine);
          const empty = bodyLines.every((l) => {
            const t = l.trim();
            return (
              t === "" ||
              t.startsWith("//") ||
              t.startsWith("///") ||
              t.startsWith("*") ||
              t.startsWith("/*") ||
              t.endsWith("*/")
            );
          });
          return { empty, closeLine };
        }
      }
    }
  }
  return { empty: false, closeLine };
}
/**
 * Extrai as linhas internas do body (entre { e }).
 */
function extractBodyLines(lines, openLine, closeLine) {
  if (openLine === closeLine) {
    const line = lines[openLine];
    const openIdx = line.indexOf("{");
    const closeIdx = line.lastIndexOf("}");
    if (openIdx >= 0 && closeIdx > openIdx) {
      const inner = line.substring(openIdx + 1, closeIdx);
      return [inner];
    }
    return [];
  }
  const result = [];
  const firstLine = lines[openLine];
  const openIdx = firstLine.indexOf("{");
  if (openIdx >= 0) {
    result.push(firstLine.substring(openIdx + 1));
  }
  for (let i = openLine + 1; i < closeLine; i++) {
    result.push(lines[i]);
  }
  const lastLine = lines[closeLine];
  const closeIdx = lastLine.indexOf("}");
  if (closeIdx > 0) {
    result.push(lastLine.substring(0, closeIdx));
  }
  return result;
}
/**
 * Extrai um snippet do catch para exibir na mensagem.
 */
function extractSnippet(lines, start, end, maxLines = 6) {
  const snippet = [];
  for (let i = start; i <= end && snippet.length < maxLines; i++) {
    snippet.push(lines[i]);
  }
  if (end - start + 1 > maxLines) {
    snippet.push("    // ...");
  }
  return snippet.map((l) => l.replace(/^\s{2}/, "")).join("\n");
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "empty-catch-detector",
    description: "Detecta blocos catch vazios ou com apenas comentários",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f) =>
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        !f.endsWith(".mocks.dart") &&
        !f.includes("/test/") &&
        !f.includes("/testing/") &&
        fs.existsSync(f)
    );
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const skip = buildSkipMask(lines);
      for (let i = 0; i < lines.length; i++) {
        if (skip[i]) continue;
        const trimmed = lines[i].trim();
        if (!CATCH_RE.test(trimmed)) continue;
        let braceLineIdx = i;
        if (!trimmed.includes("{")) {
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            if (lines[j].includes("{")) {
              braceLineIdx = j;
              break;
            }
          }
          if (braceLineIdx === i) continue;
        }
        const { empty, closeLine } = isCatchBodyEmpty(lines, braceLineIdx);
        if (!empty) continue;
        const snippet = extractSnippet(lines, i, closeLine);
        (0, _types_1.sendFormattedFail)({
          title: "CATCH VAZIO DETECTADO",
          description: `Bloco \`catch\` vazio ou com apenas comentários detectado. Erros engolidos silenciosamente mascaram bugs e tornam a depuração extremamente difícil.`,
          problem: {
            wrong: snippet,
            correct: `} catch (e, stackTrace) {\n  logger.error('Operação falhou', error: e, stackTrace: stackTrace);\n  rethrow; // ou trate o erro adequadamente\n}`,
            wrongLabel: "Catch vazio — erro silenciado",
            correctLabel: "Catch com tratamento adequado",
          },
          action: {
            text: "Trate o erro de forma explícita. Opções válidas:",
            code: `// Opção 1: Log + rethrow\ncatch (e, stackTrace) {\n  logger.error('Falha na operação', error: e, stackTrace: stackTrace);\n  rethrow;\n}\n\n// Opção 2: Retornar um Result/Failure\ncatch (e) {\n  return Left(ServerFailure(e.toString()));\n}\n\n// Opção 3: Se realmente precisa ignorar (raro), documente o motivo\ncatch (_) {\n  // Intencionalmente ignorado: [justificativa] // danger:ignore\n}`,
          },
          objective:
            "Garantir que erros sejam sempre tratados explicitamente — nunca engolidos silenciosamente.",
          reference: {
            text: "Dart Linter: empty_catches",
            url: "https://dart.dev/tools/linter-rules/empty_catches",
          },
          file,
          line: i + 1,
        });
      }
    }
  }
);
