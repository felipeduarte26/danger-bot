"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOIN_CLOSERS =
  exports.JOIN_OPENERS =
  exports.NON_CALLEE_WORDS =
  exports.ASSIGNMENT_OPERATORS =
  exports.TYPE_ARG_PUNCT =
  exports.CLOSERS =
  exports.PUNCTUATORS =
    void 0;
exports.isIdentStart = isIdentStart;
exports.isIdentPart = isIdentPart;
exports.isDigit = isDigit;
exports.skipBlockComment = skipBlockComment;
exports.skipString = skipString;
exports.skipInterpolation = skipInterpolation;
exports.skipNumber = skipNumber;
exports.lex = lex;
exports.lineOf = lineOf;
exports.lineStartOffset = lineStartOffset;
exports.isPunct = isPunct;
exports.isIdent = isIdent;
exports.tokText = tokText;
exports.matchClose = matchClose;
exports.matchOpenBackward = matchOpenBackward;
exports.startsTypeArgs = startsTypeArgs;
exports.matchTypeArgs = matchTypeArgs;
exports.findAtDepth0 = findAtDepth0;
exports.splitTopLevelCommas = splitTopLevelCommas;
exports.isExpressionEnd = isExpressionEnd;
exports.interpolationTokens = interpolationTokens;
exports.referencesAny = referencesAny;
exports.assignsAny = assignsAny;
exports.hasCommentBetween = hasCommentBetween;
exports.hasMultilineString = hasMultilineString;
exports.isOpener = isOpener;
exports.isCloser = isCloser;
exports.isRemovableTrailingComma = isRemovableTrailingComma;
exports.singleLine = singleLine;
exports.typeTextOf = typeTextOf;
exports.leadingComments = leadingComments;
exports.joinTokens = joinTokens;
exports.PUNCTUATORS = [
  ">>>=",
  "...?",
  "...",
  ">>=",
  "<<=",
  "~/=",
  "??=",
  "?..",
  "=>",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "??",
  "?.",
  "..",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "~/",
  "<<",
];
function isIdentStart(c) {
  return c !== undefined && /[A-Za-z_$]/.test(c);
}
function isIdentPart(c) {
  return c !== undefined && /[A-Za-z0-9_$]/.test(c);
}
function isDigit(c) {
  return c !== undefined && c >= "0" && c <= "9";
}
function skipBlockComment(s, i) {
  let depth = 0;
  let j = i;
  while (j < s.length) {
    if (s.startsWith("/*", j)) {
      depth++;
      j += 2;
    } else if (s.startsWith("*/", j)) {
      depth--;
      j += 2;
      if (depth === 0) return j;
    } else {
      j++;
    }
  }
  return s.length;
}
/** Pula uma string Dart. `i` aponta para a aspa de abertura. */
function skipString(s, i, raw) {
  const q = s[i];
  const triple = s[i + 1] === q && s[i + 2] === q;
  let j = i + (triple ? 3 : 1);
  while (j < s.length) {
    const c = s[j];
    if (!raw && c === "\\") {
      j += 2;
      continue;
    }
    if (triple) {
      if (c === q && s[j + 1] === q && s[j + 2] === q) return j + 3;
    } else {
      if (c === q) return j + 1;
      if (c === "\n") return j;
    }
    if (!raw && c === "$" && s[j + 1] === "{") {
      j = skipInterpolation(s, j + 2);
      continue;
    }
    j++;
  }
  return s.length;
}
/** Pula o conteúdo de `${ ... }`. `i` aponta para o primeiro caractere após `${`. */
function skipInterpolation(s, i) {
  let depth = 1;
  let j = i;
  while (j < s.length) {
    const c = s[j];
    if (c === "'" || c === '"') {
      j = skipString(s, j, false);
      continue;
    }
    if (c === "r" && (s[j + 1] === "'" || s[j + 1] === '"') && !isIdentPart(s[j - 1])) {
      j = skipString(s, j + 1, true);
      continue;
    }
    if (c === "/" && s[j + 1] === "/") {
      const nl = s.indexOf("\n", j);
      j = nl < 0 ? s.length : nl;
      continue;
    }
    if (c === "/" && s[j + 1] === "*") {
      j = skipBlockComment(s, j);
      continue;
    }
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) return j + 1;
    }
    j++;
  }
  return s.length;
}
function skipNumber(s, i) {
  let j = i;
  if (s[j] === "0" && (s[j + 1] === "x" || s[j + 1] === "X")) {
    j += 2;
    while (j < s.length && /[0-9a-fA-F_]/.test(s[j])) j++;
    return j;
  }
  while (j < s.length && (isDigit(s[j]) || s[j] === "_")) j++;
  if (s[j] === "." && isDigit(s[j + 1])) {
    j++;
    while (j < s.length && (isDigit(s[j]) || s[j] === "_")) j++;
  }
  if (
    (s[j] === "e" || s[j] === "E") &&
    (isDigit(s[j + 1]) || s[j + 1] === "+" || s[j + 1] === "-")
  ) {
    j += 2;
    while (j < s.length && isDigit(s[j])) j++;
  }
  return j;
}
function lex(source) {
  const tokens = [];
  const comments = [];
  const n = source.length;
  let i = 0;
  while (i < n) {
    const c = source[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === "﻿") {
      i++;
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      const nl = source.indexOf("\n", i);
      // em arquivos CRLF o `\r` não faz parte do comentário
      const end = nl < 0 ? n : source[nl - 1] === "\r" ? nl - 1 : nl;
      comments.push({ start: i, end });
      i = end;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      const end = skipBlockComment(source, i);
      comments.push({ start: i, end });
      i = end;
      continue;
    }
    if (c === "r" && (source[i + 1] === "'" || source[i + 1] === '"')) {
      const end = skipString(source, i + 1, true);
      tokens.push({ kind: "string", value: source.slice(i, end), start: i, end });
      i = end;
      continue;
    }
    if (c === "'" || c === '"') {
      const end = skipString(source, i, false);
      tokens.push({ kind: "string", value: source.slice(i, end), start: i, end });
      i = end;
      continue;
    }
    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < n && isIdentPart(source[j])) j++;
      tokens.push({ kind: "ident", value: source.slice(i, j), start: i, end: j });
      i = j;
      continue;
    }
    if (isDigit(c) || (c === "." && isDigit(source[i + 1]))) {
      const end = skipNumber(source, i);
      tokens.push({ kind: "number", value: source.slice(i, end), start: i, end });
      i = end;
      continue;
    }
    let matched = c;
    for (const p of exports.PUNCTUATORS) {
      if (source.startsWith(p, i)) {
        matched = p;
        break;
      }
    }
    tokens.push({ kind: "punct", value: matched, start: i, end: i + matched.length });
    i += matched.length;
  }
  const lineStarts = [0];
  for (let j = 0; j < n; j++) {
    if (source[j] === "\n") lineStarts.push(j + 1);
  }
  return { source, tokens, comments, lineStarts };
}
/** Linha (1-based) de um offset. */
function lineOf(lx, offset) {
  let lo = 0;
  let hi = lx.lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lx.lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}
function lineStartOffset(lx, offset) {
  return lx.lineStarts[lineOf(lx, offset) - 1];
}
function isPunct(t, v) {
  return t?.kind === "punct" && t.value === v;
}
function isIdent(t, v) {
  return t?.kind === "ident" && (v === undefined || t.value === v);
}
function tokText(lx, from, to) {
  return lx.source.slice(lx.tokens[from].start, lx.tokens[to].end);
}
exports.CLOSERS = { "(": ")", "[": "]", "{": "}" };
/** Índice do token que fecha o bracket aberto em `open`, ou -1. */
function matchClose(tokens, open, limit = tokens.length) {
  const stack = [];
  for (let j = open; j < limit; j++) {
    const t = tokens[j];
    if (t.kind !== "punct") continue;
    if (t.value === "(" || t.value === "[" || t.value === "{") {
      stack.push(exports.CLOSERS[t.value]);
      continue;
    }
    if (t.value === ")" || t.value === "]" || t.value === "}") {
      if (stack.pop() !== t.value) return -1;
      if (stack.length === 0) return j;
    }
  }
  return -1;
}
/** Índice do token que abre o bracket fechado em `close`, ou -1. */
function matchOpenBackward(tokens, close, lower) {
  const openers = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (let j = close; j >= lower; j--) {
    const t = tokens[j];
    if (t.kind !== "punct") continue;
    if (t.value === ")" || t.value === "]" || t.value === "}") {
      stack.push(openers[t.value]);
      continue;
    }
    if (t.value === "(" || t.value === "[" || t.value === "{") {
      if (stack.pop() !== t.value) return -1;
      if (stack.length === 0) return j;
    }
  }
  return -1;
}
exports.TYPE_ARG_PUNCT = new Set([",", ".", "?", "<", ">", "(", ")", "{", "}"]);
/**
 * True se um `<` logo após `prev` pode abrir argumentos de tipo: depois de um
 * identificador (`List<int>`, `foo<T>()`) ou no início de uma expressão
 * (`= <String, int>{}`), onde não pode ser uma comparação.
 */
function startsTypeArgs(prev) {
  return prev.kind === "ident" || !isExpressionEnd(prev);
}
/**
 * Tenta casar `<...>` como argumentos de tipo a partir de `open`.
 * Retorna o índice do `>` correspondente ou -1 (ex.: é uma comparação).
 */
function matchTypeArgs(tokens, open, limit) {
  let depth = 0;
  for (let j = open; j < limit && j < open + 400; j++) {
    const t = tokens[j];
    if (t.kind === "ident") continue;
    if (t.kind !== "punct" || !exports.TYPE_ARG_PUNCT.has(t.value)) return -1;
    if (t.value === "<") depth++;
    if (t.value === ">") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}
/**
 * Avança de `from` até o primeiro token de `stops` no nível 0, pulando
 * brackets e argumentos de tipo. Retorna o índice do token encontrado ou -1.
 */
function findAtDepth0(tokens, from, limit, stops) {
  let j = from;
  while (j < limit) {
    const t = tokens[j];
    if (t.kind === "punct") {
      if (stops.includes(t.value)) return j;
      if (t.value === "(" || t.value === "[" || t.value === "{") {
        const close = matchClose(tokens, j, limit);
        if (close < 0) return -1;
        j = close + 1;
        continue;
      }
      if (t.value === "<" && j > 0 && startsTypeArgs(tokens[j - 1])) {
        const close = matchTypeArgs(tokens, j, limit);
        if (close > 0) {
          j = close + 1;
          continue;
        }
      }
    }
    j++;
  }
  return -1;
}
/** Divide tokens[from..to] em pedaços separados por vírgula no nível 0. */
function splitTopLevelCommas(tokens, from, to) {
  const chunks = [];
  let start = from;
  let j = from;
  while (j <= to) {
    const comma = findAtDepth0(tokens, j, to + 1, [","]);
    if (comma < 0) {
      if (start <= to) chunks.push([start, to]);
      break;
    }
    if (comma > start) chunks.push([start, comma - 1]);
    start = comma + 1;
    j = comma + 1;
  }
  return chunks;
}
function isExpressionEnd(t) {
  if (t === undefined) return false;
  if (t.kind === "number" || t.kind === "string") return true;
  if (t.kind === "ident") {
    return ![
      "const",
      "new",
      "return",
      "await",
      "throw",
      "is",
      "as",
      "in",
      "case",
      "yield",
    ].includes(t.value);
  }
  return t.value === ")" || t.value === "]" || t.value === "}" || t.value === "!";
}
// ---------------------------------------------------------------------------
// Referências a nomes (inclui interpolação dentro de strings)
// ---------------------------------------------------------------------------
/** Tokens das expressões interpoladas (`$x` e `${...}`) de uma string. */
function interpolationTokens(stringToken) {
  const s = stringToken.value;
  if (s.startsWith("r")) return [];
  const result = [];
  let i = s.startsWith("'''") || s.startsWith('"""') ? 3 : 1;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "$" && s[i + 1] === "{") {
      const end = skipInterpolation(s, i + 2);
      const inner = lex(s.slice(i + 2, end - 1));
      for (const t of inner.tokens) {
        result.push(t);
        if (t.kind === "string") result.push(...interpolationTokens(t));
      }
      i = end;
      continue;
    }
    if (c === "$" && isIdentStart(s[i + 1]) && s[i + 1] !== "$") {
      let j = i + 2;
      while (j < s.length && isIdentPart(s[j]) && s[j] !== "$") j++;
      result.push({ kind: "ident", value: s.slice(i + 1, j), start: 0, end: 0 });
      i = j;
      continue;
    }
    i++;
  }
  return result;
}
/**
 * True se algum nome de `names` é referenciado em tokens[from..to]
 * (ignora acesso a membro `.x` e rótulos de argumentos nomeados `x:`).
 */
function referencesAny(tokens, from, to, names) {
  const stack = [];
  for (let j = from; j <= to; j++) {
    const t = tokens[j];
    if (t.kind === "string") {
      const inner = interpolationTokens(t);
      if (inner.length > 0 && referencesAny(inner, 0, inner.length - 1, names)) return true;
      continue;
    }
    if (t.kind === "punct") {
      if (t.value === "(" || t.value === "[" || t.value === "{") stack.push(t.value);
      if (t.value === ")" || t.value === "]" || t.value === "}") stack.pop();
      continue;
    }
    if (t.kind !== "ident" || !names.has(t.value)) continue;
    const prev = j > from ? tokens[j - 1] : undefined;
    if (prev?.kind === "punct" && [".", "?.", "..", "?.."].includes(prev.value)) continue;
    const isNamedArgLabel =
      stack[stack.length - 1] === "(" &&
      isPunct(tokens[j + 1], ":") &&
      prev !== undefined &&
      (isPunct(prev, "(") || isPunct(prev, ","));
    if (isNamedArgLabel) continue;
    return true;
  }
  return false;
}
exports.ASSIGNMENT_OPERATORS = new Set([
  "=",
  "+=",
  "-=",
  "*=",
  "/=",
  "~/=",
  "%=",
  "<<=",
  ">>=",
  ">>>=",
  "&=",
  "|=",
  "^=",
  "??=",
  "++",
  "--",
]);
/** True se algum nome de `names` sofre atribuição (`x = `, `x++`, `++x`...) em tokens[from..to]. */
function assignsAny(tokens, from, to, names) {
  for (let j = from; j <= to; j++) {
    const t = tokens[j];
    if (t.kind !== "ident" || !names.has(t.value)) continue;
    const prev = j > from ? tokens[j - 1] : undefined;
    if (prev?.kind === "punct" && [".", "?.", "..", "?.."].includes(prev.value)) continue;
    const next = tokens[j + 1];
    if (next?.kind === "punct" && exports.ASSIGNMENT_OPERATORS.has(next.value) && j + 1 <= to) {
      return true;
    }
    if (prev && (isPunct(prev, "++") || isPunct(prev, "--"))) return true;
  }
  return false;
}
function hasCommentBetween(lx, start, end) {
  return lx.comments.some((c) => c.start >= start && c.end <= end);
}
/** True se alguma string de tokens[from..to] ocupa mais de uma linha. */
function hasMultilineString(lx, from, to) {
  for (let j = from; j <= to; j++) {
    const t = lx.tokens[j];
    if (t.kind === "string" && t.value.includes("\n")) return true;
  }
  return false;
}
function isOpener(t) {
  return isPunct(t, "(") || isPunct(t, "[") || isPunct(t, "{");
}
function isCloser(t) {
  return isPunct(t, ")") || isPunct(t, "]") || isPunct(t, "}");
}
/** Palavras depois das quais `(` abre um record/expressão, e não uma lista de argumentos. */
exports.NON_CALLEE_WORDS = new Set([
  "final",
  "var",
  "const",
  "required",
  "covariant",
  "late",
  "return",
  "in",
  "is",
  "as",
  "case",
  "when",
  "await",
  "yield",
  "throw",
  "else",
  "new",
  "extends",
  "implements",
  "with",
  "on",
  "async",
  "sync",
]);
/**
 * Vírgula final (antes do fechamento) que pode ser removida. Em lista de
 * argumentos/parâmetros (`foo(a,)`, `Function(int a,)`) ela é opcional; num
 * record de um campo (`(1,)`, `(int,)`) é obrigatória e fica.
 */
function isRemovableTrailingComma(tokens, comma, lower) {
  const close = tokens[comma + 1];
  if (!isPunct(tokens[comma], ",") || !isCloser(close)) return false;
  if (!isPunct(close, ")")) return true;
  const open = matchOpenBackward(tokens, comma + 1, lower);
  if (open < lower) return false;
  const before = tokens[open - 1];
  const isArgumentList =
    isPunct(before, ">") ||
    isPunct(before, ")") ||
    (before?.kind === "ident" && !exports.NON_CALLEE_WORDS.has(before.value));
  return isArgumentList || findAtDepth0(tokens, open + 1, comma, [","]) >= 0;
}
/**
 * Texto de tokens[from..to] em uma linha, juntando as quebras token a token
 * (nunca altera o conteúdo de strings): sem espaço logo depois de `(`/`[` e
 * antes de `)`/`]`, e sem vírgula final antes de fechamento (exceto em record
 * de um campo). Retorna null se houver comentário ou string multi-linha.
 */
function singleLine(lx, from, to) {
  const { tokens, source } = lx;
  if (hasCommentBetween(lx, tokens[from].start, tokens[to].end)) return null;
  if (hasMultilineString(lx, from, to)) return null;
  let out = "";
  for (let j = from; j <= to; j++) {
    const t = tokens[j];
    if (j > from) {
      const prev = tokens[j - 1];
      const gap = source.slice(prev.end, t.start);
      const glued = isPunct(prev, "(") || isPunct(prev, "[") || isPunct(t, ")") || isPunct(t, "]");
      if (gap.includes("\n")) {
        out += isOpener(prev) || isCloser(t) ? "" : " ";
      } else {
        out += glued ? "" : gap;
      }
    }
    if (j < to && isRemovableTrailingComma(tokens, j, from)) continue;
    out += source.slice(t.start, t.end);
  }
  return out;
}
/** Tipo em uma linha no formato canônico (null se houver comentário ou string multi-linha). */
function typeTextOf(lx, from, to) {
  if (hasCommentBetween(lx, lx.tokens[from].start, lx.tokens[to].end)) return null;
  if (hasMultilineString(lx, from, to)) return null;
  return joinTokens(lx, from, to);
}
/** Comentários (texto original) imediatamente antes de `tok`, depois de `afterOffset`. */
function leadingComments(lx, afterOffset, tok) {
  const start = lx.tokens[tok].start;
  return lx.comments.filter((c) => c.start >= afterOffset && c.end <= start);
}
exports.JOIN_OPENERS = new Set(["(", "[", "{", "<"]);
exports.JOIN_CLOSERS = new Set([")", "]", "}", ">"]);
/**
 * Texto dos tokens `[from, to]` em uma linha e sem comentários, no formato de
 * uma linha do `dart format`: um espaço onde havia separação, exceto junto de
 * `(`, `[`, `{`, `<` e fechamentos, e sem a vírgula final do formato "tall"
 * (`Function(\n  String a,\n)` → `Function(String a)`).
 */
function joinTokens(lx, from, to) {
  const { tokens } = lx;
  let out = "";
  let previous = null;
  for (let k = from; k <= to; k++) {
    const t = tokens[k];
    const next = k < to ? tokens[k + 1] : undefined;
    if (isPunct(t, ",") && isPunct(next, ">")) continue;
    if (k < to && isRemovableTrailingComma(tokens, k, from)) continue;
    const separated = previous !== null && (t.start > previous.end || isPunct(previous, ","));
    const glued =
      (previous?.kind === "punct" && exports.JOIN_OPENERS.has(previous.value)) ||
      (t.kind === "punct" && exports.JOIN_CLOSERS.has(t.value));
    if (separated && !glued) out += " ";
    out += t.value;
    previous = t;
  }
  return out;
}
