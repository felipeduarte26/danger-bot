/**
 * Lexer Dart e utilitários sobre tokens (base do modelo em `src/dart`).
 * Uso interno: os plugins usam as classes de `src/dart` (DartFile, DartClass...).
 */
export type TokenKind = "ident" | "number" | "string" | "punct";

export interface Token {
  kind: TokenKind;
  value: string;
  start: number;
  end: number;
}

export interface CommentRange {
  start: number;
  end: number;
}

export interface Lexed {
  source: string;
  tokens: Token[];
  comments: CommentRange[];
  lineStarts: number[];
}

export const PUNCTUATORS = [
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

export function isIdentStart(c: string | undefined): boolean {
  return c !== undefined && /[A-Za-z_$]/.test(c);
}

export function isIdentPart(c: string | undefined): boolean {
  return c !== undefined && /[A-Za-z0-9_$]/.test(c);
}

export function isDigit(c: string | undefined): boolean {
  return c !== undefined && c >= "0" && c <= "9";
}

export function skipBlockComment(s: string, i: number): number {
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
export function skipString(s: string, i: number, raw: boolean): number {
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
export function skipInterpolation(s: string, i: number): number {
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

export function skipNumber(s: string, i: number): number {
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

export function lex(source: string): Lexed {
  const tokens: Token[] = [];
  const comments: CommentRange[] = [];
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
    for (const p of PUNCTUATORS) {
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
export function lineOf(lx: Lexed, offset: number): number {
  let lo = 0;
  let hi = lx.lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lx.lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

export function lineStartOffset(lx: Lexed, offset: number): number {
  return lx.lineStarts[lineOf(lx, offset) - 1];
}

export function isPunct(t: Token | undefined, v: string): boolean {
  return t?.kind === "punct" && t.value === v;
}

export function isIdent(t: Token | undefined, v?: string): boolean {
  return t?.kind === "ident" && (v === undefined || t.value === v);
}

export function tokText(lx: Lexed, from: number, to: number): string {
  return lx.source.slice(lx.tokens[from].start, lx.tokens[to].end);
}

export const CLOSERS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

/** Índice do token que fecha o bracket aberto em `open`, ou -1. */
export function matchClose(tokens: Token[], open: number, limit = tokens.length): number {
  const stack: string[] = [];
  for (let j = open; j < limit; j++) {
    const t = tokens[j];
    if (t.kind !== "punct") continue;
    if (t.value === "(" || t.value === "[" || t.value === "{") {
      stack.push(CLOSERS[t.value]);
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
export function matchOpenBackward(tokens: Token[], close: number, lower: number): number {
  const openers: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
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

export const TYPE_ARG_PUNCT = new Set([",", ".", "?", "<", ">", "(", ")", "{", "}"]);

/**
 * True se um `<` logo após `prev` pode abrir argumentos de tipo: depois de um
 * identificador (`List<int>`, `foo<T>()`) ou no início de uma expressão
 * (`= <String, int>{}`), onde não pode ser uma comparação.
 */
export function startsTypeArgs(prev: Token): boolean {
  return prev.kind === "ident" || !isExpressionEnd(prev);
}

/**
 * Tenta casar `<...>` como argumentos de tipo a partir de `open`.
 * Retorna o índice do `>` correspondente ou -1 (ex.: é uma comparação).
 */
export function matchTypeArgs(tokens: Token[], open: number, limit: number): number {
  let depth = 0;
  for (let j = open; j < limit && j < open + 400; j++) {
    const t = tokens[j];
    if (t.kind === "ident") continue;
    if (t.kind !== "punct" || !TYPE_ARG_PUNCT.has(t.value)) return -1;
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
export function findAtDepth0(
  tokens: Token[],
  from: number,
  limit: number,
  stops: string[]
): number {
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
export function splitTopLevelCommas(tokens: Token[], from: number, to: number): [number, number][] {
  const chunks: [number, number][] = [];
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

export function isExpressionEnd(t: Token | undefined): boolean {
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
export function interpolationTokens(stringToken: Token): Token[] {
  const s = stringToken.value;
  if (s.startsWith("r")) return [];
  const result: Token[] = [];
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
export function referencesAny(
  tokens: Token[],
  from: number,
  to: number,
  names: Set<string>
): boolean {
  const stack: string[] = [];
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

export const ASSIGNMENT_OPERATORS = new Set([
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
export function assignsAny(tokens: Token[], from: number, to: number, names: Set<string>): boolean {
  for (let j = from; j <= to; j++) {
    const t = tokens[j];
    if (t.kind !== "ident" || !names.has(t.value)) continue;
    const prev = j > from ? tokens[j - 1] : undefined;
    if (prev?.kind === "punct" && [".", "?.", "..", "?.."].includes(prev.value)) continue;
    const next = tokens[j + 1];
    if (next?.kind === "punct" && ASSIGNMENT_OPERATORS.has(next.value) && j + 1 <= to) {
      return true;
    }
    if (prev && (isPunct(prev, "++") || isPunct(prev, "--"))) return true;
  }
  return false;
}

export function hasCommentBetween(lx: Lexed, start: number, end: number): boolean {
  return lx.comments.some((c) => c.start >= start && c.end <= end);
}

/** True se alguma string de tokens[from..to] ocupa mais de uma linha. */
export function hasMultilineString(lx: Lexed, from: number, to: number): boolean {
  for (let j = from; j <= to; j++) {
    const t = lx.tokens[j];
    if (t.kind === "string" && t.value.includes("\n")) return true;
  }
  return false;
}

export function isOpener(t: Token | undefined): boolean {
  return isPunct(t, "(") || isPunct(t, "[") || isPunct(t, "{");
}

export function isCloser(t: Token | undefined): boolean {
  return isPunct(t, ")") || isPunct(t, "]") || isPunct(t, "}");
}

/** Palavras depois das quais `(` abre um record/expressão, e não uma lista de argumentos. */
export const NON_CALLEE_WORDS = new Set([
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
export function isRemovableTrailingComma(tokens: Token[], comma: number, lower: number): boolean {
  const close = tokens[comma + 1];
  if (!isPunct(tokens[comma], ",") || !isCloser(close)) return false;
  if (!isPunct(close, ")")) return true;
  const open = matchOpenBackward(tokens, comma + 1, lower);
  if (open < lower) return false;
  const before = tokens[open - 1];
  const isArgumentList =
    isPunct(before, ">") ||
    isPunct(before, ")") ||
    (before?.kind === "ident" && !NON_CALLEE_WORDS.has(before.value));
  return isArgumentList || findAtDepth0(tokens, open + 1, comma, [","]) >= 0;
}

/**
 * Texto de tokens[from..to] em uma linha, juntando as quebras token a token
 * (nunca altera o conteúdo de strings): sem espaço logo depois de `(`/`[` e
 * antes de `)`/`]`, e sem vírgula final antes de fechamento (exceto em record
 * de um campo). Retorna null se houver comentário ou string multi-linha.
 */
export function singleLine(lx: Lexed, from: number, to: number): string | null {
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
export function typeTextOf(lx: Lexed, from: number, to: number): string | null {
  if (hasCommentBetween(lx, lx.tokens[from].start, lx.tokens[to].end)) return null;
  if (hasMultilineString(lx, from, to)) return null;
  return joinTokens(lx, from, to);
}

/** Comentários (texto original) imediatamente antes de `tok`, depois de `afterOffset`. */
export function leadingComments(lx: Lexed, afterOffset: number, tok: number): CommentRange[] {
  const start = lx.tokens[tok].start;
  return lx.comments.filter((c) => c.start >= afterOffset && c.end <= start);
}

export const JOIN_OPENERS = new Set(["(", "[", "{", "<"]);
export const JOIN_CLOSERS = new Set([")", "]", "}", ">"]);

/**
 * Texto dos tokens `[from, to]` em uma linha e sem comentários, no formato de
 * uma linha do `dart format`: um espaço onde havia separação, exceto junto de
 * `(`, `[`, `{`, `<` e fechamentos, e sem a vírgula final do formato "tall"
 * (`Function(\n  String a,\n)` → `Function(String a)`).
 */
export function joinTokens(lx: Lexed, from: number, to: number): string {
  const { tokens } = lx;
  let out = "";
  let previous: Token | null = null;
  for (let k = from; k <= to; k++) {
    const t = tokens[k];
    const next = k < to ? tokens[k + 1] : undefined;
    if (isPunct(t, ",") && isPunct(next, ">")) continue;
    if (k < to && isRemovableTrailingComma(tokens, k, from)) continue;
    const separated = previous !== null && (t.start > previous.end || isPunct(previous, ","));
    const glued =
      (previous?.kind === "punct" && JOIN_OPENERS.has(previous.value)) ||
      (t.kind === "punct" && JOIN_CLOSERS.has(t.value));
    if (separated && !glued) out += " ";
    out += t.value;
    previous = t;
  }
  return out;
}
