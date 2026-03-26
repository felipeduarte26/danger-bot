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
 * Avoid Nested Conditional Plugin
 * Detecta ternários aninhados que prejudicam a legibilidade.
 *
 * Padrão detectado:
 *   condição ? valor : outraCondição ? valor : valor
 *
 * Ternários aninhados são difíceis de ler e manter.
 * A recomendação é usar if/else, switch ou variáveis intermediárias.
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const NESTED_TERNARY_RE = /\?[^?:]*\?/;
function isInsideString(line, matchIndex) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < matchIndex; i++) {
    if (line[i] === "'" && !inDouble && line[i - 1] !== "\\") inSingle = !inSingle;
    if (line[i] === '"' && !inSingle && line[i - 1] !== "\\") inDouble = !inDouble;
  }
  return inSingle || inDouble;
}
function stripComments(line) {
  const commentIdx = line.indexOf("//");
  if (commentIdx === -1) return line;
  if (isInsideString(line, commentIdx)) return line;
  return line.slice(0, commentIdx);
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "avoid-nested-conditional",
    description: "Detecta ternários aninhados e condicionais excessivamente complexos",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f) =>
        f.endsWith(".dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        !f.endsWith("_test.dart") &&
        fs.existsSync(f)
    );
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const reported = new Set();
      for (let i = 0; i < lines.length; i++) {
        const clean = stripComments(lines[i]);
        const match = clean.match(NESTED_TERNARY_RE);
        if (match?.index !== undefined && !isInsideString(clean, match.index)) {
          if (reported.has(i + 1)) continue;
          reported.add(i + 1);
          const snippet = clean.trim().slice(0, 80);
          (0, _types_1.sendFormattedWarn)({
            title: "TERNÁRIO ANINHADO DETECTADO",
            description: `Ternário dentro de ternário dificulta a leitura.`,
            problem: {
              wrong: `final result = condA ? valA : condB ? valB : valC;`,
              correct: `if (condA) {\n  result = valA;\n} else if (condB) {\n  result = valB;\n} else {\n  result = valC;\n}`,
              wrongLabel: "Ternário aninhado",
              correctLabel: "if/else legível",
            },
            action: {
              text: `Linha com ternário aninhado: \`${snippet}${snippet.length >= 80 ? "..." : ""}\``,
              code: `// Alternativas:\n// 1. Use if/else\n// 2. Use switch/case\n// 3. Extraia para variáveis intermediárias\n// 4. Extraia para um método dedicado`,
            },
            objective: "Manter o código **legível** e fácil de **debugar**.",
            reference: {
              text: "Effective Dart: Usage",
              url: "https://dart.dev/effective-dart/usage",
            },
            file,
            line: i + 1,
          });
        }
      }
    }
  }
);
