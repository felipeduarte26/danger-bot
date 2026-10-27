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
export declare const PUNCTUATORS: string[];
export declare function isIdentStart(c: string | undefined): boolean;
export declare function isIdentPart(c: string | undefined): boolean;
export declare function isDigit(c: string | undefined): boolean;
export declare function skipBlockComment(s: string, i: number): number;
/** Pula uma string Dart. `i` aponta para a aspa de abertura. */
export declare function skipString(s: string, i: number, raw: boolean): number;
/** Pula o conteúdo de `${ ... }`. `i` aponta para o primeiro caractere após `${`. */
export declare function skipInterpolation(s: string, i: number): number;
export declare function skipNumber(s: string, i: number): number;
export declare function lex(source: string): Lexed;
/** Linha (1-based) de um offset. */
export declare function lineOf(lx: Lexed, offset: number): number;
export declare function lineStartOffset(lx: Lexed, offset: number): number;
export declare function isPunct(t: Token | undefined, v: string): boolean;
export declare function isIdent(t: Token | undefined, v?: string): boolean;
export declare function tokText(lx: Lexed, from: number, to: number): string;
export declare const CLOSERS: Record<string, string>;
/** Índice do token que fecha o bracket aberto em `open`, ou -1. */
export declare function matchClose(tokens: Token[], open: number, limit?: number): number;
/** Índice do token que abre o bracket fechado em `close`, ou -1. */
export declare function matchOpenBackward(tokens: Token[], close: number, lower: number): number;
export declare const TYPE_ARG_PUNCT: Set<string>;
/**
 * True se um `<` logo após `prev` pode abrir argumentos de tipo: depois de um
 * identificador (`List<int>`, `foo<T>()`) ou no início de uma expressão
 * (`= <String, int>{}`), onde não pode ser uma comparação.
 */
export declare function startsTypeArgs(prev: Token): boolean;
/**
 * Tenta casar `<...>` como argumentos de tipo a partir de `open`.
 * Retorna o índice do `>` correspondente ou -1 (ex.: é uma comparação).
 */
export declare function matchTypeArgs(tokens: Token[], open: number, limit: number): number;
/**
 * Avança de `from` até o primeiro token de `stops` no nível 0, pulando
 * brackets e argumentos de tipo. Retorna o índice do token encontrado ou -1.
 */
export declare function findAtDepth0(
  tokens: Token[],
  from: number,
  limit: number,
  stops: string[]
): number;
/** Divide tokens[from..to] em pedaços separados por vírgula no nível 0. */
export declare function splitTopLevelCommas(
  tokens: Token[],
  from: number,
  to: number
): [number, number][];
export declare function isExpressionEnd(t: Token | undefined): boolean;
/** Tokens das expressões interpoladas (`$x` e `${...}`) de uma string. */
export declare function interpolationTokens(stringToken: Token): Token[];
/**
 * True se algum nome de `names` é referenciado em tokens[from..to]
 * (ignora acesso a membro `.x` e rótulos de argumentos nomeados `x:`).
 */
export declare function referencesAny(
  tokens: Token[],
  from: number,
  to: number,
  names: Set<string>
): boolean;
export declare const ASSIGNMENT_OPERATORS: Set<string>;
/** True se algum nome de `names` sofre atribuição (`x = `, `x++`, `++x`...) em tokens[from..to]. */
export declare function assignsAny(
  tokens: Token[],
  from: number,
  to: number,
  names: Set<string>
): boolean;
export declare function hasCommentBetween(lx: Lexed, start: number, end: number): boolean;
/** True se alguma string de tokens[from..to] ocupa mais de uma linha. */
export declare function hasMultilineString(lx: Lexed, from: number, to: number): boolean;
export declare function isOpener(t: Token | undefined): boolean;
export declare function isCloser(t: Token | undefined): boolean;
/** Palavras depois das quais `(` abre um record/expressão, e não uma lista de argumentos. */
export declare const NON_CALLEE_WORDS: Set<string>;
/**
 * Vírgula final (antes do fechamento) que pode ser removida. Em lista de
 * argumentos/parâmetros (`foo(a,)`, `Function(int a,)`) ela é opcional; num
 * record de um campo (`(1,)`, `(int,)`) é obrigatória e fica.
 */
export declare function isRemovableTrailingComma(
  tokens: Token[],
  comma: number,
  lower: number
): boolean;
/**
 * Texto de tokens[from..to] em uma linha, juntando as quebras token a token
 * (nunca altera o conteúdo de strings): sem espaço logo depois de `(`/`[` e
 * antes de `)`/`]`, e sem vírgula final antes de fechamento (exceto em record
 * de um campo). Retorna null se houver comentário ou string multi-linha.
 */
export declare function singleLine(lx: Lexed, from: number, to: number): string | null;
/** Tipo em uma linha no formato canônico (null se houver comentário ou string multi-linha). */
export declare function typeTextOf(lx: Lexed, from: number, to: number): string | null;
/** Comentários (texto original) imediatamente antes de `tok`, depois de `afterOffset`. */
export declare function leadingComments(
  lx: Lexed,
  afterOffset: number,
  tok: number
): CommentRange[];
export declare const JOIN_OPENERS: Set<string>;
export declare const JOIN_CLOSERS: Set<string>;
/**
 * Texto dos tokens `[from, to]` em uma linha e sem comentários, no formato de
 * uma linha do `dart format`: um espaço onde havia separação, exceto junto de
 * `(`, `[`, `{`, `<` e fechamentos, e sem a vírgula final do formato "tall"
 * (`Function(\n  String a,\n)` → `Function(String a)`).
 */
export declare function joinTokens(lx: Lexed, from: number, to: number): string;
