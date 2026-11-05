"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Date Type Checker Plugin
 *
 * Detecta campos com nome de data/hora declarados como String
 * quando deveriam ser DateTime. Analisa entities e models.
 *
 * Campos: `String`/`String?` (com ou sem `final`/`late`) do corpo da classe ou
 * do primary constructor (Dart 3.13+); `static` e `const` ficam de fora.
 * Variáveis locais e de nível superior não são campos.
 *
 * Detecção por nome (camelCase):
 * - Sufixos: At, Date, Timestamp, Time, Dt
 * - Prefixos: date, timestamp, dt
 * - Nomes exatos: date, timestamp, datetime, deadline, birthday, dt
 *
 * Detecção por documentação (///):
 * - Se o doc comment do campo menciona "date", "datetime", "timestamp",
 *   "time of/when/at", "data de" ou "fecha", o campo é reportado mesmo que o
 *   nome não siga os padrões acima. No primary constructor vale a doc do
 *   próprio parâmetro.
 * - Não contam: "time" sozinho ("the first time"), "up to date"/"out of date" e
 *   campo com nome de texto (`successMessage`, `timeLabel`, `dateFormat`...), que
 *   guarda um texto mesmo quando a doc fala de data.
 */
const _types_1 = require("../../../types.js");
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
const DOC_DATE_KEYWORDS_RE =
  /\b(date|datetime|timestamp|data\s+de|fecha)\b|\btime\s+(of|when|at)\b/i;
/** Expressões com "date" que não falam de data. */
const DOC_NOT_A_DATE_RE = /\b(up\s+to|out\s+of)\s+date\b/gi;
/** Nome de campo que guarda texto: a doc pode citar data sem o campo ser uma. */
const TEXT_FIELD_SUFFIXES = [
  "Message",
  "Text",
  "Label",
  "Title",
  "Description",
  "Format",
  "Pattern",
  "Name",
  "Hint",
  "Error",
  "Url",
  "Path",
  "Key",
  "Id",
  "Zone",
];
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
/** Linhas `///` da doc do campo, como escritas, unidas por espaço. */
function docText(field) {
  return (field.doc?.comments ?? [])
    .filter((c) => c.kind === _types_1.DartCommentKind.Doc)
    .map((c) => c.text.trim())
    .join(" ");
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
    const files = _types_1.DartFile.changed().filter((file) => isEntityOrModelFile(file.path.path));
    for (const file of files) {
      for (const field of file.declarations.flatMap((d) => d.fields)) {
        if (!field.type?.isString || field.isStatic || field.isConst) continue;
        // No primary constructor, o código mostrado é o parâmetro (`required final String createdAt`).
        const param =
          field.origin === _types_1.DartFieldOrigin.PrimaryConstructor
            ? field.declaringParameter
            : null;
        checkStringField(
          file.path.path,
          field.name,
          docText(field),
          param ? param.text : field.lineText,
          field.nameLine
        );
      }
    }
  }
);
function checkStringField(file, fieldName, doc, lineContent, line) {
  const nameMatch = looksLikeDateField(fieldName);
  const docMatch =
    doc.length > 0 &&
    !TEXT_FIELD_SUFFIXES.some(
      (suffix) => fieldName.endsWith(suffix) || fieldName === suffix.toLowerCase()
    ) &&
    DOC_DATE_KEYWORDS_RE.test(doc.replace(DOC_NOT_A_DATE_RE, " "));
  if (!nameMatch && !docMatch) return;
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
    line,
  });
}
