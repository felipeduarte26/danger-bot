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
 * Date Type Checker Plugin
 *
 * Detecta campos com nome de data/hora declarados como String
 * quando deveriam ser DateTime. Analisa entities e models.
 *
 * Detecção por nome (camelCase):
 * - Sufixos: At, Date, Timestamp, Time, Dt
 * - Prefixos: date, timestamp, dt
 * - Nomes exatos: date, timestamp, datetime, deadline, birthday, dt
 *
 * Detecção por documentação (///):
 * - Se o doc comment acima do campo menciona "date", "time",
 *   "datetime", "timestamp" ou "data de", o campo é reportado
 *   mesmo que o nome não siga os padrões acima.
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const DATE_SUFFIXES = ["At", "Date", "Timestamp", "Time", "Dt"];
const DATE_PREFIXES = ["date", "timestamp", "dt"];
const EXACT_NAMES = new Set(["date", "timestamp", "datetime", "deadline", "birthday", "dt"]);
const DATE_PREFIX_EXCLUSIONS = new Set([
  "dateformat",
  "dateformatter",
  "dateparser",
  "dateutil",
  "dateutils",
  "datehelper",
  "dateservice",
  "datevalidator",
  "dateconverter",
  "datepicker",
  "daterange",
  "dateselection",
  "datewidget",
  "timestampformat",
  "timestampparser",
  "timestamputil",
]);
const STRING_FIELD_RE = /^\s*(?:final\s+|late\s+(?:final\s+)?)?(?:String\??)\s+(\w+)\s*[;=]/;
const DOC_DATE_KEYWORDS_RE = /\b(date|time|datetime|timestamp|data\s+de|fecha)\b/i;
function looksLikeDateField(name) {
  const lower = name.toLowerCase();
  if (EXACT_NAMES.has(lower)) return true;
  if (DATE_PREFIX_EXCLUSIONS.has(lower)) return false;
  for (const suffix of DATE_SUFFIXES) {
    if (name.endsWith(suffix) && name.length > suffix.length) return true;
  }
  for (const prefix of DATE_PREFIXES) {
    if (lower.startsWith(prefix) && name.length > prefix.length) {
      const nextChar = name[prefix.length];
      if (nextChar === nextChar.toUpperCase() || nextChar === "_") return true;
    }
  }
  return false;
}
function getDocComment(lines, fieldLine) {
  const docs = [];
  for (let j = fieldLine - 1; j >= 0; j--) {
    const trimmed = lines[j].trim();
    if (trimmed.startsWith("///")) {
      docs.unshift(trimmed);
    } else {
      break;
    }
  }
  return docs.join(" ");
}
function isEntityOrModelFile(filePath) {
  const lower = filePath.toLowerCase();
  return (
    lower.includes("/entities/") ||
    lower.includes("/models/") ||
    lower.endsWith("_entity.dart") ||
    lower.endsWith("_model.dart")
  );
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "date-type-checker",
    description:
      "Detecta campos com nome de data declarados como String ao invés de DateTime em entities e models",
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
        isEntityOrModelFile(f) &&
        fs.existsSync(f)
    );
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(STRING_FIELD_RE);
        if (!match) continue;
        const fieldName = match[1];
        const nameMatch = looksLikeDateField(fieldName);
        const doc = getDocComment(lines, i);
        const docMatch = doc.length > 0 && DOC_DATE_KEYWORDS_RE.test(doc);
        if (!nameMatch && !docMatch) continue;
        const lineContent = lines[i].trim();
        const reason = nameMatch
          ? `O campo \`${fieldName}\` parece representar uma data/hora mas está declarado como \`String\`.`
          : `A documentação do campo \`${fieldName}\` menciona data/hora (\`${doc.slice(0, 80)}\`) mas o tipo é \`String\`.`;
        (0, _types_1.sendFormattedFail)({
          title: "CAMPO DE DATA DECLARADO COMO STRING",
          description: `${reason} Use \`DateTime\` para garantir tipagem segura e operações de data nativas.`,
          problem: {
            wrong: lineContent,
            correct: lineContent.replace(/String\?/, "DateTime?").replace(/String /, "DateTime "),
            wrongLabel: "String para campo de data",
            correctLabel: "DateTime (tipagem correta)",
          },
          action: {
            code: `final DateTime ${fieldName};\n\n// Ao receber de JSON:\nDateTime.parse(json['${fieldName}']);\n\n// Ao converter para JSON:\n${fieldName}.toIso8601String()`,
          },
          objective:
            "Usar `DateTime` para campos de data garante **tipagem segura**, permite operações nativas (comparação, formatação, diferença) e evita erros de parsing em runtime.",
          reference: {
            text: "Dart DateTime class",
            url: "https://api.dart.dev/stable/dart-core/DateTime-class.html",
          },
          file,
          line: i + 1,
        });
      }
    }
  }
);
