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
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

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

function looksLikeDateField(name: string): boolean {
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

function getDocComment(lines: string[], fieldLine: number): string {
  const docs: string[] = [];
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

function isEntityOrModelFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.includes("/entities/") ||
    lower.includes("/models/") ||
    lower.endsWith("_entity.dart") ||
    lower.endsWith("_model.dart")
  );
}

export default createPlugin(
  {
    name: "date-type-checker",
    description:
      "Detecta campos com nome de data declarados como String ao invés de DateTime em entities e models",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f: string) =>
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

        sendFormattedFail({
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
