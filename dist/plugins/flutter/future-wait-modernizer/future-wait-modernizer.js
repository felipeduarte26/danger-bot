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
 * Future Wait Modernizer Plugin
 *
 * Detecta uso de Future.wait([...]) com lista literal e sugere a sintaxe
 * moderna de tupla com .wait introduzida no Dart 3.
 *
 * A sintaxe de tupla é preferível porque:
 *   - Type-safe: cada resultado já vem com o tipo correto
 *   - Sem casts: não precisa de result[0] as Type
 *   - Mais legível: destructuring com nomes descritivos
 *
 * Não flageia Future.wait com variáveis ou expressões dinâmicas
 * (ex: Future.wait(listaDeFutures), Future.wait(items.map(...))),
 * pois nesses casos a tupla não é aplicável.
 *
 * @see {@link https://dart.dev/language/records#multiple-returns} Dart Records
 * @see {@link https://api.dart.dev/stable/dart-async/FutureRecord2/wait.html} FutureRecord.wait
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const FUTURE_WAIT_RE = /Future\s*\.\s*wait\s*\(/;
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
    if (trimmed.startsWith("//") || trimmed.startsWith("///") || trimmed.startsWith("*")) {
      skip[i] = true;
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
function isLiteralListArg(lines, startLine) {
  const line = lines[startLine];
  const match = line.match(FUTURE_WAIT_RE);
  if (!match) return false;
  const afterParen = line.substring(match.index + match[0].length).trim();
  if (afterParen.startsWith("[")) return true;
  if (afterParen === "" || afterParen === "\r") {
    for (let j = startLine + 1; j < Math.min(startLine + 4, lines.length); j++) {
      const nextTrimmed = lines[j].trim();
      if (nextTrimmed === "") continue;
      return nextTrimmed.startsWith("[");
    }
  }
  return false;
}
/**
 * Extrai o snippet COMPLETO do Future.wait (sem truncar),
 * incluindo a linha de atribuição se existir.
 */
function extractFullSnippet(lines, start) {
  const snippet = [];
  let parens = 0;
  let foundOpen = false;
  let endLine = start;
  for (let i = start; i < lines.length; i++) {
    snippet.push(lines[i]);
    for (const ch of lines[i]) {
      if (ch === "(") {
        parens++;
        foundOpen = true;
      }
      if (ch === ")") parens--;
    }
    if (foundOpen && parens <= 0) {
      endLine = i;
      const afterClose = lines[i].substring(lines[i].lastIndexOf(")") + 1).trim();
      if (!afterClose.endsWith(";")) {
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const t = lines[j].trim();
          if (t === "") continue;
          if (t === ";" || t === ");") {
            snippet.push(lines[j]);
            endLine = j;
          }
          break;
        }
      }
      break;
    }
  }
  const minIndent = snippet.reduce((min, l) => {
    if (l.trim() === "") return min;
    const indent = l.match(/^\s*/)?.[0].length ?? 0;
    return Math.min(min, indent);
  }, Infinity);
  return {
    text: snippet.map((l) => (minIndent < Infinity ? l.substring(minIndent) : l)).join("\n"),
    endLine,
  };
}
/**
 * Extrai as chamadas individuais de dentro do Future.wait([...]).
 * Retorna cada future como string limpa.
 */
function extractFutures(lines, start) {
  let fullText = "";
  let parens = 0;
  let foundOuterOpen = false;
  for (let i = start; i < lines.length; i++) {
    fullText += lines[i] + "\n";
    for (const ch of lines[i]) {
      if (ch === "(") {
        parens++;
        foundOuterOpen = true;
      }
      if (ch === ")") parens--;
    }
    if (foundOuterOpen && parens <= 0) break;
  }
  const listMatch = fullText.match(/Future\s*\.\s*wait\s*\(\s*\[/);
  if (!listMatch) return [];
  const listStart = listMatch.index + listMatch[0].length;
  let brackets = 1;
  let listEnd = listStart;
  for (let k = listStart; k < fullText.length; k++) {
    if (fullText[k] === "[") brackets++;
    if (fullText[k] === "]") {
      brackets--;
      if (brackets <= 0) {
        listEnd = k;
        break;
      }
    }
  }
  const listContent = fullText.substring(listStart, listEnd);
  const futures = [];
  let depth = 0;
  let current = "";
  for (const ch of listContent) {
    if (ch === "(" || ch === "[" || ch === "{" || ch === "<") depth++;
    if (ch === ")" || ch === "]" || ch === "}" || ch === ">") depth--;
    if (ch === "," && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) futures.push(trimmed);
      current = "";
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last) futures.push(last);
  return futures;
}
/**
 * Extrai um nome de variável a partir de uma chamada de future.
 *   _listPickingsUsecase(...)  → listPickingsResult
 *   _repository.fetchPayments(...) → fetchPaymentsResult
 *   fetchCartBudgetUsecase()   → fetchCartBudgetResult
 */
function futureToVarName(futureCall) {
  const firstLine = futureCall.split("\n")[0].trim();
  const dotMatch = firstLine.match(/\.(\w+)\s*[(<]/);
  if (dotMatch) {
    return cleanVarName(dotMatch[1]) + "Result";
  }
  const directMatch = firstLine.match(/^_?(\w+)\s*[(<]/);
  if (directMatch) {
    return cleanVarName(directMatch[1]) + "Result";
  }
  return cleanVarName(firstLine.replace(/[^a-zA-Z0-9]/g, "")) + "Result";
}
function cleanVarName(name) {
  let clean = name.replace(/^_+/, "");
  clean = clean.replace(/(usecase|Usecase|UseCase)$/i, "");
  clean = clean.replace(/(repository|Repository)$/i, "");
  clean = clean.replace(/(datasource|Datasource|DataSource)$/i, "");
  if (!clean) return "result";
  return clean.charAt(0).toLowerCase() + clean.slice(1);
}
/**
 * Compacta uma chamada multi-line em uma única linha legível.
 */
function compactCall(futureCall) {
  return futureCall
    .split("\n")
    .map((l) => l.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/,\s*$/, "");
}
/**
 * Verifica se o Future.wait tem seu resultado atribuído a uma variável.
 * Olha a linha atual e até 5 linhas anteriores para cobrir casos multi-line
 * como: final [\n  result as Type,\n] = await Future.wait([...])
 */
function hasAssignment(lines, idx) {
  const currentTrimmed = lines[idx].trim();
  if (/^(final|var|const)\s/.test(currentTrimmed)) return true;
  if (/\w+\s*=\s*await/.test(currentTrimmed)) return true;
  if (/^]\s*=\s*await/.test(currentTrimmed)) {
    for (let j = idx - 1; j >= Math.max(0, idx - 8); j--) {
      const prev = lines[j].trim();
      if (prev === "") continue;
      if (/^(final|var|const)\s+\[/.test(prev)) return true;
      if (prev.endsWith(";") || prev.endsWith("{") || prev.endsWith("}")) break;
    }
  }
  return false;
}
/**
 * Deduplicar nomes de variáveis adicionando sufixo numérico quando necessário.
 */
function deduplicateNames(names) {
  const counts = new Map();
  const result = [];
  for (const name of names) {
    const count = counts.get(name) ?? 0;
    counts.set(name, count + 1);
    if (count > 0) {
      result.push(`${name}${count + 1}`);
    } else {
      const totalOccurrences = names.filter((n) => n === name).length;
      result.push(totalOccurrences > 1 ? `${name}1` : name);
    }
  }
  return result;
}
/**
 * Gera a sugestão de correção baseada nas futures reais detectadas.
 */
function generateCorrection(futures, indent) {
  if (futures.length === 0) return "";
  const varNames = deduplicateNames(futures.map(futureToVarName));
  const compacted = futures.map(compactCall);
  const calls = compacted.map((c) => `${indent}  ${c},`).join("\n");
  const destructuring = varNames.map((v) => `${indent}  ${v},`).join("\n");
  return `final (\n${destructuring}\n${indent}) = await (\n${calls}\n${indent}).wait;`;
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "future-wait-modernizer",
    description: "Detecta Future.wait e sugere uso de tupla com .wait do Dart 3",
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
        !f.includes("/generated/") &&
        fs.existsSync(f)
    );
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const skip = buildSkipMask(lines);
      for (let i = 0; i < lines.length; i++) {
        if (skip[i]) continue;
        if (!FUTURE_WAIT_RE.test(lines[i])) continue;
        if (!isLiteralListArg(lines, i)) continue;
        if (!hasAssignment(lines, i)) continue;
        const { text: wrongSnippet } = extractFullSnippet(lines, i);
        const futures = extractFutures(lines, i);
        const lineIndent = lines[i].match(/^\s*/)?.[0] ?? "";
        const correction = generateCorrection(futures, lineIndent);
        (0, _types_1.sendFormattedFail)({
          title: "FUTURE.WAIT COM LISTA LITERAL",
          description:
            "`Future.wait([...])` detectado. Prefira a sintaxe de **tupla com `.wait`** do Dart 3 — type-safe, sem necessidade de cast por índice e mais legível.",
          problem: {
            wrong: wrongSnippet,
            correct:
              correction ||
              `final (\n  resultA,\n  resultB,\n) = await (\n  futureA(),\n  futureB(),\n).wait;`,
            wrongLabel: "Future.wait — acesso por índice, requer cast",
            correctLabel: "Tupla .wait — type-safe, destructuring direto",
          },
          action: {
            text: "Substitua `Future.wait([...])` pela sintaxe de **tupla com `.wait`**:",
            code:
              correction ||
              `final (\n  resultA,\n  resultB,\n) = await (\n  futureA(),\n  futureB(),\n).wait;`,
          },
          objective:
            "Usar a sintaxe moderna de tupla com `.wait` para **type-safety**, eliminando casts manuais e acesso por índice.",
          reference: {
            text: "Dart Records — Multiple Returns",
            url: "https://dart.dev/language/records#multiple-returns",
          },
          file,
          line: i + 1,
        });
      }
    }
  }
);
