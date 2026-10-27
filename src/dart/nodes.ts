/**
 * Nós do modelo Dart que aparecem em qualquer nível: anotações, docs,
 * comentários, strings, parâmetros, variáveis e tudo o que existe dentro de
 * corpos (statements, chamadas, closures, try/catch, awaits).
 *
 * As declarações de nível de classe/arquivo (DartClass, DartMethod...) ficam em
 * `declarations.ts`; o arquivo (DartFile) em `file.ts`.
 */
import type { DartFile } from "./file";
import {
  DartAsyncKind,
  DartBodyKind,
  DartCommentDirective,
  DartCommentKind,
  DartExpressionKind,
  DartParameterKind,
  DartParameterSource,
  DartStatementKind,
  DartStringRole,
  Nullability,
} from "./enums";
import { DartType, parseDartType } from "./type";
import {
  CommentRange,
  Token,
  findAtDepth0,
  isExpressionEnd,
  isIdent,
  isPunct,
  isRemovableTrailingComma,
  matchClose,
  matchOpenBackward,
  matchTypeArgs,
  splitTopLevelCommas,
  startsTypeArgs,
} from "./internal/lexer";
import { Annotation, ParamInfo, parseField, parseParams } from "./internal/syntax";

// ═══════════════════════════════════════════════════════════════════════════
// Contratos comuns
// ═══════════════════════════════════════════════════════════════════════════

/** Posição no arquivo. Linhas e colunas começam em 1, como no comentário inline. */
export interface DartRange {
  /** Linha onde o nó começa (sem doc e anotações, nas declarações). */
  readonly line: number;
  readonly endLine: number;
  readonly column: number;
}

/** Qualquer trecho do arquivo que um plugin pode apontar. */
export interface DartNode extends DartRange {
  readonly file: DartFile;
  /** Texto ORIGINAL do nó (para `problem.wrong`). */
  readonly text: string;
  /** Linha `line` do arquivo sem espaços nas pontas: o `lines[i].trim()` dos plugins. */
  readonly lineText: string;
}

/** Nó com nome, doc e anotações: classe, campo, método, construtor, parâmetro, função. */
export interface DartDeclaration extends DartNode {
  readonly name: string;
  /** Linha do nome (difere de `line` quando o cabeçalho quebra a linha). */
  readonly nameLine: number;
  /** Primeira linha contando doc e anotações. */
  readonly startLine: number;
  readonly isPrivate: boolean;
  readonly annotations: readonly DartAnnotation[];
  readonly doc: DartDoc | null;
  hasAnnotation(name: string): boolean;
  isIgnoredBy(plugin: string, linesAbove?: number): boolean;
}

/** Base dos nós: posição calculada a partir dos offsets no texto do arquivo. */
export abstract class DartNodeBase implements DartNode {
  readonly file: DartFile;
  /** Offset (caracteres) do início do nó no `file.source`. */
  readonly startOffset: number;
  /** Offset (caracteres) logo depois do fim do nó. */
  readonly endOffset: number;
  readonly line: number;
  readonly endLine: number;
  readonly column: number;

  protected constructor(file: DartFile, startOffset: number, endOffset: number) {
    this.file = file;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.line = file.lineAtOffset(startOffset);
    this.endLine = file.lineAtOffset(Math.max(startOffset, endOffset - 1));
    this.column = file.columnAtOffset(startOffset);
  }

  get text(): string {
    return this.file.source.slice(this.startOffset, this.endOffset);
  }

  get lineText(): string {
    return (this.file.lines[this.line - 1] ?? "").trim();
  }

  /** O nó `other` (do mesmo arquivo) está dentro deste: `method.contains(call)`. */
  contains(other: DartNodeBase): boolean {
    return (
      other.file === this.file &&
      other.startOffset >= this.startOffset &&
      other.endOffset <= this.endOffset
    );
  }

  /**
   * Texto do nó em uma linha, sem comentários nem a vírgula final do formato
   * "tall": `required final String createdAt = 'a' 'b'` mesmo quando o código
   * quebra a declaração em várias linhas. Nó sem tokens (comentário): `text`.
   */
  get compact(): string {
    const { tokens } = this.file.lexed;
    let lo = 0;
    let hi = tokens.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tokens[mid].start < this.startOffset) lo = mid + 1;
      else hi = mid;
    }
    if (lo >= tokens.length || tokens[lo].start >= this.endOffset) return this.text.trim();
    let last = lo;
    while (last + 1 < tokens.length && tokens[last + 1].end <= this.endOffset) last++;
    return oneLineText(this.file, lo, last);
  }
}

/** Offsets `[início, fim)` dos tokens `[from, to]`. */
export function tokenSpan(file: DartFile, from: number, to: number): [number, number] {
  const { tokens } = file.lexed;
  return [tokens[from].start, tokens[to].end];
}

/**
 * Texto compacto dos tokens `[from, to]` (sem quebras de linha nem comentários):
 * espaço só entre duas palavras e depois de vírgula, sem a vírgula final que o
 * `dart format` coloca ao quebrar argumentos. `widget\n  .controller` → `widget.controller`.
 */
export function compactText(file: DartFile, from: number, to: number): string {
  const { tokens } = file.lexed;
  let out = "";
  let prev: Token | null = null;
  for (let k = from; k <= to; k++) {
    const t = tokens[k];
    if (k < to && isTrailingComma(tokens, k, from)) continue;
    if (prev !== null) {
      const word = (x: Token): boolean => x.kind !== "punct";
      // `as`/`is` sempre separados: `(json['id'] as num?).toInt`
      const operatorWord = (x: Token): boolean => isIdent(x, "as") || isIdent(x, "is");
      if (
        isPunct(prev, ",") ||
        (word(prev) && word(t) && t.start > prev.end) ||
        ((operatorWord(prev) || operatorWord(t)) && t.start > prev.end)
      ) {
        out += " ";
      }
    }
    out += t.value;
    prev = t;
  }
  return out;
}

const NO_SPACE_BEFORE = new Set([")", "]", "}", ",", ";"]);
const NO_SPACE_AFTER = new Set(["(", "[", "{", "@"]);
const MEMBER_DOTS = new Set([".", "?.", "..", "?.."]);

/**
 * Texto dos tokens `[from, to]` em uma linha, sem comentários: mantém um
 * espaço onde a linha tinha espaço; numa quebra de linha, põe um espaço, exceto
 * depois de `(`/`[`/`{`/`.` e antes de fechamento, `,`, `;`, `.` e `!`.
 * Remove a vírgula final do formato "tall". Usado em `node.compact`.
 */
export function oneLineText(file: DartFile, from: number, to: number): string {
  const { tokens } = file.lexed;
  const { source } = file;
  // `<`/`>` de argumentos de tipo (não comparação): sem espaço por dentro
  const typeArgBrackets = new Set<number>();
  for (let k = from; k <= to; k++) {
    if (isPunct(tokens[k], "<") && k > 0 && startsTypeArgs(tokens[k - 1])) {
      const close = matchTypeArgs(tokens, k, to + 1);
      if (close > 0) {
        typeArgBrackets.add(k);
        typeArgBrackets.add(close);
      }
    }
  }
  let out = "";
  let prev: Token | null = null;
  let prevIndex = -1;
  for (let k = from; k <= to; k++) {
    const t = tokens[k];
    if (k < to && isTrailingComma(tokens, k, from)) continue;
    if (isPunct(t, ",") && typeArgBrackets.has(k + 1)) continue; // `Map<String, int,>`
    if (prev !== null) {
      const gap = source.slice(prev.end, t.start);
      // acesso a membro (`a.b`, `a?.b`, `a..b`): nunca tem espaço; o ponto do
      // dot shorthand (`borderRadius: .circular(8)`) vem depois de `:`/`(`/`,` e mantém
      const memberAccess =
        (prev.kind === "punct" && MEMBER_DOTS.has(prev.value)) ||
        (t.kind === "punct" && MEMBER_DOTS.has(t.value) && isExpressionEnd(prev));
      if (gap.length > 0 && !memberAccess) {
        const lineBreak = gap.includes("\n") || gap.trim().length > 0;
        const glued =
          (prev.kind === "punct" && NO_SPACE_AFTER.has(prev.value)) ||
          (t.kind === "punct" && NO_SPACE_BEFORE.has(t.value)) ||
          (typeArgBrackets.has(prevIndex) && isPunct(prev, "<")) ||
          (typeArgBrackets.has(k) && isPunct(t, ">")) ||
          (isPunct(t, "!") && isExpressionEnd(prev)); // `x!` (pós-fixo), não `!x`
        if (!lineBreak || !glued) out += " ";
      }
    }
    out += t.value;
    prev = t;
    prevIndex = k;
  }
  return out;
}

/**
 * Vírgula final removível: a regra do lexer (argumentos, listas) e também a da
 * lista de parâmetros de uma closure `(T x,) {`, que não é um record.
 */
function isTrailingComma(tokens: Token[], comma: number, lower: number): boolean {
  if (isRemovableTrailingComma(tokens, comma, lower)) return true;
  if (!isPunct(tokens[comma], ",") || !isPunct(tokens[comma + 1], ")")) return false;
  // `f!(x,)` e `lista[0](x,)`: argumentos de chamada
  const open = matchOpenBackward(tokens, comma + 1, lower);
  if (open > lower && (isPunct(tokens[open - 1], "!") || isPunct(tokens[open - 1], "]")))
    return true;
  const [, after] = readAsyncMarker(tokens, comma + 2);
  return isPunct(tokens[after], "{") || isPunct(tokens[after], "=>");
}

// ═══════════════════════════════════════════════════════════════════════════
// Anotações, docs e comentários
// ═══════════════════════════════════════════════════════════════════════════

/** `@override`, `@JsonKey(name: 'x')`, `@p.Annotation()`. */
export class DartAnnotation extends DartNodeBase {
  /** Último segmento do nome: `@JsonKey(...)` → `"JsonKey"`, `@override` → `"override"`. */
  readonly name: string;
  /** `@p.JsonKey` → `"p"` */
  readonly prefix: string | null;
  private readonly openParenTok: number;
  private readonly closeParenTok: number;
  private argumentsCache: DartArgument[] | null = null;

  /** @internal */
  constructor(file: DartFile, raw: Annotation) {
    super(file, ...tokenSpan(file, raw.startTok, raw.endTok));
    const { tokens } = file.lexed;
    this.name = raw.name;
    this.prefix =
      isIdent(tokens[raw.startTok + 1]) && isPunct(tokens[raw.startTok + 2], ".")
        ? tokens[raw.startTok + 1].value
        : null;
    this.closeParenTok = isPunct(tokens[raw.endTok], ")") ? raw.endTok : -1;
    this.openParenTok =
      this.closeParenTok >= 0 ? matchOpenBackward(tokens, raw.endTok, raw.startTok) : -1;
  }

  /** Argumentos (`name: 'x'` → rótulo `name`). Vazio sem parênteses. */
  get arguments(): readonly DartArgument[] {
    if (this.argumentsCache === null) {
      this.argumentsCache =
        this.openParenTok >= 0
          ? buildArguments(this.file, this.openParenTok, this.closeParenTok)
          : [];
    }
    return this.argumentsCache;
  }

  /** Argumento pelo rótulo (`@JsonKey(name: ...)` → `argument("name")`). */
  argument(label: string): DartArgument | null {
    return this.arguments.find((a) => a.label === label) ?? null;
  }
}

/** Comentário do código. */
export class DartComment extends DartNodeBase {
  readonly kind: DartCommentKind;
  /** Texto sem os marcadores (`//`, `///`, delimitadores e `*` de margem dos blocos), sem espaços nas pontas. */
  readonly content: string;
  /** Há código antes do comentário na mesma linha. */
  readonly isTrailing: boolean;
  readonly directive: DartCommentDirective | null;
  /** `// ignore: a, b` → `["a", "b"]`; `// ignore_for_file: x` → `["x"]`. */
  readonly directiveArgs: readonly string[];

  /** @internal */
  constructor(file: DartFile, range: CommentRange, isTrailing: boolean) {
    super(file, range.start, range.end);
    const raw = file.source.slice(range.start, range.end);
    if (raw.startsWith("///")) this.kind = DartCommentKind.Doc;
    else if (raw.startsWith("//")) this.kind = DartCommentKind.Line;
    else if (raw.startsWith("/**") && !raw.startsWith("/**/")) this.kind = DartCommentKind.DocBlock;
    else this.kind = DartCommentKind.Block;
    this.content =
      this.kind === DartCommentKind.Doc
        ? raw.slice(3).trim()
        : this.kind === DartCommentKind.Line
          ? raw.slice(2).trim()
          : raw
              .replace(/^\/\*+/, "")
              .replace(/\*+\/$/, "")
              .split("\n")
              .map((l) => l.replace(/^\s*\*\s?/, "").trimEnd())
              .join("\n")
              .trim();
    this.isTrailing = isTrailing;
    const [directive, args] = commentDirective(this.kind, this.content);
    this.directive = directive;
    this.directiveArgs = args;
  }

  /** `true` em `///` e comentário de bloco de documentação. */
  get isDoc(): boolean {
    return this.kind === DartCommentKind.Doc || this.kind === DartCommentKind.DocBlock;
  }
}

function commentDirective(
  kind: DartCommentKind,
  content: string
): [DartCommentDirective | null, string[]] {
  if (kind !== DartCommentKind.Line) return [null, []];
  const split = (s: string): string[] =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  let m = /^ignore_for_file\s*:\s*(.*)$/.exec(content);
  if (m) return [DartCommentDirective.IgnoreForFile, split(m[1])];
  m = /^ignore\s*:\s*(.*)$/.exec(content);
  if (m) return [DartCommentDirective.Ignore, split(m[1])];
  if (/^danger:ignore\b/.test(content)) return [DartCommentDirective.DangerIgnore, []];
  if (content.startsWith("coverage:ignore")) return [DartCommentDirective.CoverageIgnore, []];
  if (/^dart\s+format\s+(off|on)\b/.test(content)) return [DartCommentDirective.Format, []];
  if (/^@dart\s*=/.test(content)) return [DartCommentDirective.LanguageVersion, []];
  if (/^TODO\b/.test(content)) return [DartCommentDirective.Todo, []];
  if (/^FIXME\b/.test(content)) return [DartCommentDirective.Fixme, []];
  return [null, []];
}

/** Documentação (`///` ou bloco de doc) logo acima de uma declaração. */
export class DartDoc extends DartNodeBase {
  /** Linhas do texto, sem os marcadores. */
  readonly lines: readonly string[];
  readonly comments: readonly DartComment[];

  /** @internal */
  constructor(file: DartFile, comments: DartComment[]) {
    super(file, comments[0].startOffset, comments[comments.length - 1].endOffset);
    this.comments = comments;
    this.lines = comments.flatMap((c) => c.content.split("\n"));
  }

  /** Texto completo (linhas unidas por `\n`). */
  get content(): string {
    return this.lines.join("\n");
  }

  /** `{@macro nome}` usados. */
  get macros(): readonly string[] {
    return [...this.content.matchAll(/\{@macro\s+([\w.-]+)\s*\}/g)].map((m) => m[1]);
  }

  /** `{@template nome}` definidos. */
  get templates(): readonly string[] {
    return [...this.content.matchAll(/\{@template\s+([\w.-]+)\s*\}/g)].map((m) => m[1]);
  }

  /** Só `{@macro x}` (sem texto próprio). */
  get isMacroOnly(): boolean {
    const rest = this.lines.filter((l) => l.trim().length > 0);
    return rest.length > 0 && rest.every((l) => /^\{@macro\s+[\w.-]+\s*\}$/.test(l.trim()));
  }
}

/**
 * Doc e comentários antes do token `firstTok` (anotações incluídas),
 * depois do token anterior.
 * @internal
 */
export function leadingTrivia(file: DartFile, firstTok: number, headTok = firstTok): DartComment[] {
  const { tokens } = file.lexed;
  const from = firstTok > 0 ? tokens[firstTok - 1].end : 0;
  const to = tokens[headTok]?.start ?? file.source.length;
  return file.comments.filter((c) => c.startOffset >= from && c.endOffset <= to && !c.isTrailing);
}

/** @internal */
export function docOf(file: DartFile, firstTok: number, headTok = firstTok): DartDoc | null {
  const trivia = leadingTrivia(file, firstTok, headTok);
  const docs: DartComment[] = [];
  for (let k = trivia.length - 1; k >= 0; k--) {
    if (!trivia[k].isDoc) {
      if (docs.length > 0) break;
      continue;
    }
    docs.unshift(trivia[k]);
  }
  return docs.length > 0 ? new DartDoc(file, docs) : null;
}

/**
 * `// ignore: <plugin>` ou `// danger:ignore` acima do nó (até `linesAbove`
 * linhas), entre ele e o código anterior, ou no fim da linha do nó.
 * @internal
 */
export function ignoredBy(
  file: DartFile,
  firstTok: number,
  headTok: number,
  plugin: string,
  linesAbove: number
): boolean {
  const { tokens } = file.lexed;
  const line = file.lineAtOffset(tokens[headTok].start);
  const candidates = [
    ...leadingTrivia(file, firstTok, headTok),
    ...file.comments.filter((c) => c.isTrailing && c.line === line),
  ];
  return candidates.some(
    (c) =>
      c.line >= line - linesAbove &&
      ((c.directive === DartCommentDirective.Ignore && c.directiveArgs.includes(plugin)) ||
        c.directive === DartCommentDirective.DangerIgnore)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Strings
// ═══════════════════════════════════════════════════════════════════════════

/** String literal do código (cada pedaço de `'a' 'b'` é uma DartString). */
export class DartString extends DartNodeBase {
  /** Conteúdo sem `r` e sem as aspas (escapes mantidos). */
  readonly value: string;
  readonly isRaw: boolean;
  /** Aspas triplas. */
  readonly isMultiline: boolean;
  /** `'` ou `"` */
  readonly quote: string;
  readonly role: DartStringRole;
  /** Chamada que recebe a string como argumento: `Text`, `print`, `RegExp`, `Key`, `l10n.translate`... */
  readonly enclosingCallee: string | null;
  /** Rótulo do argumento: `Text(semanticsLabel: 'x')` → `"semanticsLabel"`. */
  readonly argumentLabel: string | null;
  /** @internal Índice do token. */
  readonly tokenIndex: number;

  /** @internal */
  constructor(
    file: DartFile,
    tokenIndex: number,
    role: DartStringRole,
    enclosingCallee: string | null,
    argumentLabel: string | null
  ) {
    const t = file.lexed.tokens[tokenIndex];
    super(file, t.start, t.end);
    this.tokenIndex = tokenIndex;
    this.isRaw = t.value.startsWith("r");
    const body = this.isRaw ? t.value.slice(1) : t.value;
    this.quote = body[0];
    this.isMultiline = body.startsWith(this.quote.repeat(3));
    const q = this.isMultiline ? 3 : 1;
    const closed = body.length >= 2 * q && body.endsWith(this.quote.repeat(q));
    this.value = body.slice(q, closed ? body.length - q : body.length);
    this.role = role;
    this.enclosingCallee = enclosingCallee;
    this.argumentLabel = argumentLabel;
  }

  /** Conteúdo com cada `$x`/`${...}` trocado por espaços (mesmo comprimento). */
  get valueWithoutInterpolation(): string {
    if (this.isRaw) return this.value;
    const s = this.value;
    let out = "";
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === "\\") {
        out += s.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (c === "$" && s[i + 1] === "{") {
        let depth = 1;
        let j = i + 2;
        while (j < s.length && depth > 0) {
          if (s[j] === "{") depth++;
          else if (s[j] === "}") depth--;
          j++;
        }
        out += " ".repeat(j - i);
        i = j;
        continue;
      }
      if (c === "$" && /[A-Za-z_]/.test(s[i + 1] ?? "")) {
        let j = i + 1;
        while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
        out += " ".repeat(j - i);
        i = j;
        continue;
      }
      out += c;
      i++;
    }
    return out;
  }

  /** Tem `$x` ou `${...}`. */
  get hasInterpolation(): boolean {
    return !this.isRaw && /\$[{A-Za-z_]/.test(this.value.replace(/\\\$/g, ""));
  }
}

/** Parâmetro de tipo: `T extends Comparable<T>`. */
export class DartTypeParameter {
  readonly name: string;
  /** `T extends Comparable<T>` → `Comparable<T>` */
  readonly bound: DartType | null;
  readonly line: number;
  /** @internal */
  readonly nameTokIndex: number;

  /** @internal */
  constructor(name: string, bound: DartType | null, line: number, nameTokIndex: number) {
    this.name = name;
    this.bound = bound;
    this.line = line;
    this.nameTokIndex = nameTokIndex;
  }
}

/** @internal Parâmetros de tipo de `<` em `open`. */
export function buildTypeParameters(
  file: DartFile,
  open: number,
  outer: ReadonlySet<string>
): DartTypeParameter[] {
  const { tokens } = file.lexed;
  if (open < 0 || !isPunct(tokens[open], "<")) return [];
  const close = matchTypeArgs(tokens, open, tokens.length);
  if (close < 0) return [];
  const names = new Set(outer);
  const chunks = splitTopLevelCommas(tokens, open + 1, close - 1);
  for (const [a] of chunks) {
    const nameTok = isPunct(tokens[a], "@") ? findNameAfterAnnotations(tokens, a) : a;
    if (isIdent(tokens[nameTok])) names.add(tokens[nameTok].value);
  }
  return chunks.map(([a, b]) => {
    const nameTok = isPunct(tokens[a], "@") ? findNameAfterAnnotations(tokens, a) : a;
    const bound = isIdent(tokens[nameTok + 1], "extends")
      ? parseDartType(file.lexed, nameTok + 2, b, names)
      : null;
    return new DartTypeParameter(
      tokens[nameTok]?.value ?? "",
      bound,
      file.lineAtOffset(tokens[nameTok]?.start ?? 0),
      nameTok
    );
  });
}

function findNameAfterAnnotations(tokens: { kind: string; value: string }[], a: number): number {
  let k = a;
  while (
    k < tokens.length &&
    !(tokens[k].kind === "ident" && tokens[k - 1]?.value !== "@" && tokens[k - 1]?.value !== ".")
  )
    k++;
  return k;
}

// ═══════════════════════════════════════════════════════════════════════════
// Parâmetros e variáveis
// ═══════════════════════════════════════════════════════════════════════════

/** Parâmetro de método, função, construtor ou closure. */
export class DartParameter extends DartNodeBase implements DartDeclaration {
  /** Como escrito: `_repository`, `onTap`. */
  readonly name: string;
  /** Nome usado na chamada: parâmetro nomeado `this._repository` → `repository`. */
  readonly publicName: string;
  readonly isPrivate: boolean;
  readonly nameLine: number;
  readonly startLine: number;
  readonly annotations: readonly DartAnnotation[];
  readonly doc: DartDoc | null;
  /** `null` em `this.x`/`super.x` sem tipo e em parâmetro de closure sem tipo. */
  readonly type: DartType | null;
  readonly nullability: Nullability;
  readonly kind: DartParameterKind;
  readonly source: DartParameterSource;
  /** Posicional obrigatório ou nomeado com `required`. */
  readonly isRequired: boolean;
  /** `final`/`var` escrito no parâmetro. */
  readonly isFinal: boolean;
  readonly isCovariant: boolean;
  /** `void callback(int x)` (sintaxe antiga de parâmetro função). */
  readonly isFunctionTyped: boolean;
  readonly defaultValue: DartExpression | null;
  /** @internal */
  readonly rawInfo: ParamInfo;
  /** @internal Token do nome. */
  readonly nameTokIndex: number;
  private readonly firstTok: number;
  private readonly headTok: number;

  /** @internal */
  constructor(file: DartFile, raw: ParamInfo, inPrimary: boolean, typeParams: ReadonlySet<string>) {
    const { tokens } = file.lexed;
    const headTok =
      raw.annotations.length > 0
        ? raw.annotations[raw.annotations.length - 1].endTok + 1
        : raw.startTok;
    super(file, tokens[headTok].start, tokens[raw.endTok].end);
    this.firstTok = raw.startTok;
    this.headTok = headTok;
    this.rawInfo = raw;
    this.nameTokIndex = raw.nameTok;
    this.name = raw.name;
    this.kind =
      raw.section === "named"
        ? DartParameterKind.Named
        : raw.section === "optional"
          ? DartParameterKind.OptionalPositional
          : DartParameterKind.RequiredPositional;
    this.publicName =
      this.kind === DartParameterKind.Named && raw.name.startsWith("_")
        ? raw.name.replace(/^_+/, "")
        : raw.name;
    this.isPrivate = raw.name.startsWith("_");
    this.nameLine = file.lineAtOffset(tokens[raw.nameTok].start);
    this.annotations = raw.annotations.map((a) => new DartAnnotation(file, a));
    this.doc = docOf(file, raw.startTok, headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[raw.startTok].start);
    this.type =
      raw.typeStartTok >= 0 && !raw.functionTyped
        ? parseDartType(file.lexed, raw.typeStartTok, raw.typeEndTok, typeParams)
        : null;
    this.nullability = this.type?.nullability ?? Nullability.Unknown;
    this.source =
      raw.kind === "this"
        ? DartParameterSource.This
        : raw.kind === "super"
          ? DartParameterSource.Super
          : inPrimary && (raw.modifier === "final" || raw.modifier === "var")
            ? DartParameterSource.Declaring
            : DartParameterSource.Plain;
    this.isRequired = this.kind === DartParameterKind.RequiredPositional || raw.isRequired;
    this.isFinal = raw.modifier === "final";
    this.isCovariant = raw.isCovariant;
    this.isFunctionTyped = raw.functionTyped;
    this.defaultValue =
      raw.defaultStartTok >= 0 ? new DartExpression(file, raw.defaultStartTok, raw.endTok) : null;
  }

  hasAnnotation(name: string): boolean {
    return this.annotations.some((a) => a.name === name);
  }

  isIgnoredBy(plugin: string, linesAbove = 5): boolean {
    return ignoredBy(this.file, this.firstTok, this.headTok, plugin, linesAbove);
  }
}

/** @internal Parâmetros de `(` `open` a `)` `close`; `null` se a lista não foi reconhecida. */
export function buildParameters(
  file: DartFile,
  open: number,
  close: number,
  inPrimary: boolean,
  typeParams: ReadonlySet<string>
): DartParameter[] | null {
  if (open < 0 || close < 0) return [];
  const raw = parseParams(file.lexed, open, close);
  return raw === null ? null : raw.map((p) => new DartParameter(file, p, inPrimary, typeParams));
}

/** Dados de uma variável já identificados pelo parser. @internal */
export interface VariableInit {
  firstTok: number;
  headTok: number;
  nameTok: number;
  endTok: number;
  modifiers: ReadonlySet<string>;
  typeStartTok: number;
  typeEndTok: number;
  initStartTok: number;
  initEndTok: number;
  annotations: Annotation[];
  typeParams: ReadonlySet<string>;
}

/** Base de campo, variável de nível superior e variável local. */
export abstract class DartVariable extends DartNodeBase implements DartDeclaration {
  readonly name: string;
  readonly isPrivate: boolean;
  readonly nameLine: number;
  readonly startLine: number;
  readonly annotations: readonly DartAnnotation[];
  readonly doc: DartDoc | null;
  /** `null` quando não há tipo escrito (`var x`, `final x = 1`). */
  readonly type: DartType | null;
  /** `Unknown` quando `type` é `null`. */
  readonly nullability: Nullability;
  readonly isFinal: boolean;
  readonly isConst: boolean;
  readonly isLate: boolean;
  /** `var` escrito */
  readonly isVar: boolean;
  readonly isStatic: boolean;
  readonly isCovariant: boolean;
  readonly isExternal: boolean;
  readonly isAbstract: boolean;
  readonly initializer: DartExpression | null;
  /** @internal Token do nome. */
  readonly nameTokIndex: number;
  /** @internal */
  protected readonly firstTok: number;
  /** @internal */
  protected readonly headTok: number;

  protected constructor(file: DartFile, init: VariableInit) {
    const { tokens } = file.lexed;
    super(file, tokens[init.headTok].start, tokens[init.endTok].end);
    this.firstTok = init.firstTok;
    this.headTok = init.headTok;
    this.nameTokIndex = init.nameTok;
    this.name = tokens[init.nameTok].value;
    this.isPrivate = this.name.startsWith("_");
    this.nameLine = file.lineAtOffset(tokens[init.nameTok].start);
    this.annotations = init.annotations.map((a) => new DartAnnotation(file, a));
    this.doc = docOf(file, init.firstTok, init.headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[init.firstTok].start);
    this.type =
      init.typeStartTok >= 0
        ? parseDartType(file.lexed, init.typeStartTok, init.typeEndTok, init.typeParams)
        : null;
    this.nullability = this.type?.nullability ?? Nullability.Unknown;
    const m = init.modifiers;
    this.isFinal = m.has("final");
    this.isConst = m.has("const");
    this.isLate = m.has("late");
    this.isVar = m.has("var");
    this.isStatic = m.has("static");
    this.isCovariant = m.has("covariant");
    this.isExternal = m.has("external");
    this.isAbstract = m.has("abstract");
    this.initializer =
      init.initStartTok >= 0 ? new DartExpression(file, init.initStartTok, init.initEndTok) : null;
  }

  hasAnnotation(name: string): boolean {
    return this.annotations.some((a) => a.name === name);
  }

  isIgnoredBy(plugin: string, linesAbove = 5): boolean {
    return ignoredBy(this.file, this.firstTok, this.headTok, plugin, linesAbove);
  }

  /** Comentário `//` no fim da última linha da declaração. */
  get trailingComment(): DartComment | null {
    return this.file.comments.find((c) => c.isTrailing && c.line === this.endLine) ?? null;
  }
}

/**
 * Variável declarada dentro de um corpo: statement, cabeçalho de `for` (também o `for` de
 * coleção) ou pattern. Nunca aparece em `DartClass.fields`.
 */
export class DartLocalVariable extends DartVariable {
  /** Declarada no cabeçalho de um `for` (statement ou `[for (final x in xs) x]`). */
  readonly isLoopVariable: boolean;
  /**
   * Declarada por um pattern: `final (a, b) = ...`, `case Foo(:final x)`, `if (o case String s)`,
   * braço de switch expression, `for (final (k, v) in ...)`. Não tem `initializer`.
   */
  readonly isPatternVariable: boolean;
  /** Closure (ou função local) mais interna que contém a declaração. */
  readonly insideClosure: DartClosure | null;

  /** @internal */
  constructor(
    file: DartFile,
    init: VariableInit,
    isLoopVariable: boolean,
    insideClosure: DartClosure | null,
    isPatternVariable = false
  ) {
    super(file, init);
    this.isLoopVariable = isLoopVariable;
    this.isPatternVariable = isPatternVariable;
    this.insideClosure = insideClosure;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Expressões e chamadas
// ═══════════════════════════════════════════════════════════════════════════

/** Palavras que não são nome de função quando seguidas de `(`. */
const NOT_CALLEE = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "return",
  "await",
  "yield",
  "throw",
  "assert",
  "else",
  "in",
  "is",
  "as",
  "case",
  "when",
  "new",
  "const",
  "final",
  "var",
  "late",
  "required",
  "covariant",
  "Function",
  "typedef",
  "sync",
  "async",
  "do",
  "try",
  "on",
  "operator",
  "get",
  "set",
  "static",
  "factory",
  "external",
  "super",
  "this",
]);

/** Palavras que podem vir antes de uma chamada (e não são um tipo). */
const CALL_PREFIX_WORDS = new Set([
  "return",
  "await",
  "new",
  "const",
  "throw",
  "yield",
  "else",
  "in",
  "case",
  "is",
  "as",
  "when",
  "do",
  "assert",
]);

const MEMBER_ACCESS = new Set([".", "?.", "..", "?.."]);

/** Uma expressão (inicializador, argumento, valor padrão, elemento de lista...). */
export class DartExpression extends DartNodeBase {
  readonly kind: DartExpressionKind;
  /** @internal */
  readonly fromTok: number;
  /** @internal */
  readonly toTok: number;
  private callCache: DartCall | null | undefined;
  private elementsCache: DartExpression[] | null = null;

  /** @internal */
  constructor(file: DartFile, fromTok: number, toTok: number) {
    super(file, ...tokenSpan(file, fromTok, Math.max(fromTok, toTok)));
    this.fromTok = fromTok;
    this.toTok = Math.max(fromTok, toTok);
    this.kind = classifyExpression(file, this.fromTok, this.toTok);
  }

  /** A chamada, quando `kind === Call` (a mais externa: `a.b(c).d(e)` → `d`). */
  get call(): DartCall | null {
    if (this.callCache === undefined) {
      this.callCache = null;
      if (this.kind === DartExpressionKind.Call) {
        const { tokens } = this.file.lexed;
        const open = matchOpenBackward(tokens, this.toTok, this.fromTok);
        let nameTok = open - 1;
        if (isPunct(tokens[nameTok], ">")) {
          let depth = 0;
          for (let k = nameTok; k >= this.fromTok; k--) {
            if (isPunct(tokens[k], ">")) depth++;
            if (isPunct(tokens[k], "<") && --depth === 0) {
              nameTok = k - 1;
              break;
            }
          }
        }
        if (nameTok >= this.fromTok && isIdent(tokens[nameTok])) {
          this.callCache = buildCall(this.file, nameTok, this.fromTok, null);
        }
      }
    }
    return this.callCache;
  }

  /** Elementos de list/set literal (`children: [...]`). Vazio nos outros tipos. */
  get elements(): readonly DartExpression[] {
    if (this.elementsCache === null) {
      this.elementsCache = [];
      if (
        this.kind === DartExpressionKind.ListLiteral ||
        this.kind === DartExpressionKind.SetLiteral
      ) {
        const { tokens } = this.file.lexed;
        const open = this.toTok;
        const start = matchOpenBackward(tokens, open, this.fromTok);
        for (const [a, b] of splitTopLevelCommas(tokens, start + 1, this.toTok - 1)) {
          this.elementsCache.push(new DartExpression(this.file, a, b));
        }
      }
    }
    return this.elementsCache;
  }

  /** Valor de `NumberLiteral` (`-8.5` → -8.5), senão `null`. */
  get numberValue(): number | null {
    if (this.kind !== DartExpressionKind.NumberLiteral) return null;
    const value = Number(compactText(this.file, this.fromTok, this.toTok).replace(/[_\s]/g, ""));
    return Number.isNaN(value) ? null : value;
  }

  /** Strings de `StringLiteral` (`'a' 'b'` → duas). */
  get strings(): readonly DartString[] {
    if (this.kind !== DartExpressionKind.StringLiteral) return [];
    const out: DartString[] = [];
    for (let k = this.fromTok; k <= this.toTok; k++) {
      const s = this.file.stringAtToken(k);
      if (s) out.push(s);
    }
    return out;
  }

  /** Usa `this` ou `widget` (identificador solto, não `x.widget`). */
  get usesThis(): boolean {
    const { tokens } = this.file.lexed;
    for (let k = this.fromTok; k <= this.toTok; k++) {
      const t = tokens[k];
      if (isIdent(t, "this")) return true;
      if (isIdent(t, "widget") && !MEMBER_ACCESS.has(tokens[k - 1]?.value ?? "")) return true;
    }
    return false;
  }

  /** Texto em uma linha (ver `DartNodeBase.compact`). */
  get compact(): string {
    return oneLineText(this.file, this.fromTok, this.toTok);
  }

  /** Chamadas dentro da expressão (inclusive aninhadas e em closures). */
  get calls(): readonly DartCall[] {
    return scanCalls(this.file, this.fromTok, this.toTok, []);
  }

  /** Closures dentro da expressão (`final onTap = (bool reload) {}`), inclusive aninhadas. */
  get closures(): readonly DartClosure[] {
    return scanClosures(this.file, this.fromTok, this.toTok);
  }
}

function classifyExpression(file: DartFile, from: number, to: number): DartExpressionKind {
  const { tokens } = file.lexed;
  const first = tokens[from];
  const last = tokens[to];
  let allStrings = true;
  for (let k = from; k <= to; k++) {
    if (tokens[k].kind !== "string") {
      allStrings = false;
      break;
    }
  }
  if (allStrings) return DartExpressionKind.StringLiteral;
  if (from === to) {
    if (first.kind === "number") return DartExpressionKind.NumberLiteral;
    if (isIdent(first, "true") || isIdent(first, "false")) return DartExpressionKind.BoolLiteral;
    if (isIdent(first, "null")) return DartExpressionKind.NullLiteral;
    if (first.kind === "ident") return DartExpressionKind.Identifier;
  }
  if (to === from + 1 && isPunct(first, "-") && last.kind === "number") {
    return DartExpressionKind.NumberLiteral;
  }
  // Closure: (params) [async|sync*] { ... } | => expr
  if (isPunct(first, "(")) {
    const close = matchClose(tokens, from, to + 1);
    if (close > 0 && close < to) {
      let k = close + 1;
      while (isIdent(tokens[k], "async") || isIdent(tokens[k], "sync") || isPunct(tokens[k], "*"))
        k++;
      if (isPunct(tokens[k], "=>")) return DartExpressionKind.Closure;
      if (isPunct(tokens[k], "{") && matchClose(tokens, k, to + 1) === to)
        return DartExpressionKind.Closure;
    }
  }
  // Literais de coleção: [const] [<T>] [ ... ] / { ... }
  let k = from;
  if (isIdent(tokens[k], "const")) k++;
  if (isPunct(tokens[k], "<")) {
    const close = matchTypeArgs(tokens, k, to + 1);
    if (close > 0) k = close + 1;
  }
  if (isPunct(tokens[k], "[") && matchClose(tokens, k, to + 1) === to)
    return DartExpressionKind.ListLiteral;
  if (isPunct(tokens[k], "{") && matchClose(tokens, k, to + 1) === to) {
    if (k + 1 === to) return DartExpressionKind.MapLiteral;
    return findAtDepth0(tokens, k + 1, to, [":"]) >= 0
      ? DartExpressionKind.MapLiteral
      : DartExpressionKind.SetLiteral;
  }
  // Condicional no nível 0: a ? b : c
  if (
    findAtDepth0(tokens, from, to + 1, ["?"]) >= 0 &&
    findAtDepth0(tokens, from, to + 1, [":"]) >= 0
  ) {
    return DartExpressionKind.Conditional;
  }
  // Chamada: termina em `)` de uma lista de argumentos
  if (isPunct(last, ")")) {
    const open = matchOpenBackward(tokens, to, from);
    const before = tokens[open - 1];
    if (
      open > from &&
      (before?.kind === "ident" || isPunct(before, ">")) &&
      !NOT_CALLEE.has(before.value)
    ) {
      return DartExpressionKind.Call;
    }
  }
  // a.b.c (sem chamada)
  let access = true;
  for (let j = from; j <= to; j++) {
    const t = tokens[j];
    const expectIdent = (j - from) % 2 === 0;
    if (expectIdent ? t.kind !== "ident" : !(isPunct(t, ".") || isPunct(t, "?."))) {
      access = false;
      break;
    }
  }
  if (access && to > from) return DartExpressionKind.PropertyAccess;
  return DartExpressionKind.Other;
}

/** Argumento de uma chamada ou anotação. */
export class DartArgument extends DartNodeBase {
  /** `height: 8` → `"height"`; posicional → `null`. */
  readonly label: string | null;
  readonly value: DartExpression;

  /** @internal */
  constructor(file: DartFile, from: number, to: number) {
    const { tokens } = file.lexed;
    super(file, ...tokenSpan(file, from, to));
    const labeled = isIdent(tokens[from]) && isPunct(tokens[from + 1], ":") && from + 2 <= to;
    this.label = labeled ? tokens[from].value : null;
    this.value = new DartExpression(file, labeled ? from + 2 : from, to);
  }
}

/** @internal */
export function buildArguments(file: DartFile, open: number, close: number): DartArgument[] {
  if (close <= open + 1) return [];
  return splitTopLevelCommas(file.lexed.tokens, open + 1, close - 1).map(
    ([a, b]) => new DartArgument(file, a, b)
  );
}

/** Uma chamada: `print(x)`, `MediaQuery.of(context)`, `_controller.dispose()`, `..addListener(f)`. */
export class DartCall extends DartNodeBase {
  /** Receptor e nome: `MediaQuery.of`, `_controller.dispose`, `print`. Em cascata, só o nome. */
  readonly callee: string;
  /** Nome chamado: `of`, `dispose`, `print`. */
  readonly name: string;
  /** Texto do receptor (`MediaQuery`, `widget.controller`); `null` sem receptor ou em cascata. */
  readonly receiver: string | null;
  /** Alvo da cascata: `_controller..addListener(f)..dispose()` → `_controller`. */
  readonly cascadeTarget: string | null;
  /** `..dispose()` / `?..dispose()` */
  readonly isCascade: boolean;
  /** `?.dispose()` / `?..dispose()` */
  readonly isNullAware: boolean;
  /** `const Foo()` / `new Foo()` */
  readonly isConst: boolean;
  readonly typeArguments: readonly DartType[];
  /** Linha do nome chamado. */
  readonly nameLine: number;
  /** Acesso logo depois do `)`: `MediaQuery.of(context).size` → `"size"`. */
  readonly postfixMember: string | null;
  /** Closure mais interna que contém a chamada. */
  readonly insideClosure: DartClosure | null;
  /** @internal */
  readonly nameTok: number;
  /** @internal */
  readonly openParenTok: number;
  /** @internal */
  readonly closeParenTok: number;
  private argumentsCache: DartArgument[] | null = null;

  /** @internal */
  constructor(
    file: DartFile,
    init: {
      startTok: number;
      nameTok: number;
      openParenTok: number;
      closeParenTok: number;
      receiver: string | null;
      cascadeTarget: string | null;
      isCascade: boolean;
      isNullAware: boolean;
      isConst: boolean;
      typeArguments: DartType[];
      postfixMember: string | null;
      insideClosure: DartClosure | null;
    }
  ) {
    super(file, ...tokenSpan(file, init.startTok, init.closeParenTok));
    const { tokens } = file.lexed;
    this.nameTok = init.nameTok;
    this.openParenTok = init.openParenTok;
    this.closeParenTok = init.closeParenTok;
    this.name = tokens[init.nameTok].value;
    this.receiver = init.receiver;
    this.callee = init.receiver ? `${init.receiver}.${this.name}` : this.name;
    this.cascadeTarget = init.cascadeTarget;
    this.isCascade = init.isCascade;
    this.isNullAware = init.isNullAware;
    this.isConst = init.isConst;
    this.typeArguments = init.typeArguments;
    this.nameLine = file.lineAtOffset(tokens[init.nameTok].start);
    this.postfixMember = init.postfixMember;
    this.insideClosure = init.insideClosure;
  }

  get arguments(): readonly DartArgument[] {
    if (this.argumentsCache === null) {
      this.argumentsCache = buildArguments(this.file, this.openParenTok, this.closeParenTok);
    }
    return this.argumentsCache;
  }

  /** Argumento nomeado pelo rótulo (`call.argument("children")`). */
  argument(label: string): DartArgument | null {
    return this.arguments.find((a) => a.label === label) ?? null;
  }

  /** Argumentos posicionais, em ordem. */
  get positionalArguments(): readonly DartArgument[] {
    return this.arguments.filter((a) => a.label === null);
  }
}

/** Início da expressão-receptor que termina em `end` (cadeia `a.b(c)[d]!.e`). */
function receiverStart(tokens: Token[], end: number, lower: number): number {
  let j = end;
  let start = end + 1;
  while (j >= lower) {
    const t = tokens[j];
    if (isPunct(t, "!")) {
      j--;
      continue;
    }
    if (isPunct(t, ")") || isPunct(t, "]")) {
      const open = matchOpenBackward(tokens, j, lower);
      if (open < 0) break;
      start = open;
      j = open - 1;
      if (isPunct(tokens[j], ">")) {
        let depth = 0;
        for (let k = j; k >= lower; k--) {
          if (isPunct(tokens[k], ">")) depth++;
          else if (isPunct(tokens[k], "<") && --depth === 0) {
            j = k - 1;
            break;
          }
        }
      }
      if (t.value === ")" && tokens[j]?.kind === "ident" && !NOT_CALLEE.has(tokens[j].value)) {
        start = j;
        j--;
      } else if (
        t.value === "]" &&
        j >= lower &&
        (tokens[j].kind === "ident" || isPunct(tokens[j], ")") || isPunct(tokens[j], "]"))
      ) {
        continue;
      }
    } else if (t.kind === "ident" || t.kind === "string" || t.kind === "number") {
      start = j;
      j--;
    } else {
      break;
    }
    if (j >= lower && (isPunct(tokens[j], ".") || isPunct(tokens[j], "?."))) {
      j--;
      continue;
    }
    if (j >= lower && isPunct(tokens[j], "!")) continue;
    break;
  }
  return start;
}

const CASCADE_BOUNDARY = new Set([
  ";",
  "{",
  "}",
  "(",
  "[",
  ",",
  "=",
  "=>",
  ":",
  "?",
  "??",
  "&&",
  "||",
]);

/** Alvo da cascata que contém o `..` em `sep`. */
function cascadeTargetOf(file: DartFile, sep: number, lower: number): string | null {
  const { tokens } = file.lexed;
  let j = sep - 1;
  while (j >= lower) {
    const t = tokens[j];
    if (isPunct(t, ")") || isPunct(t, "]") || isPunct(t, "}")) {
      const open = matchOpenBackward(tokens, j, lower);
      if (open < 0) return null;
      j = open - 1;
      continue;
    }
    if (
      (t.kind === "punct" && CASCADE_BOUNDARY.has(t.value)) ||
      isIdent(t, "return") ||
      isIdent(t, "await")
    )
      break;
    j--;
  }
  const start = j + 1;
  let end = start;
  while (end < sep && !(isPunct(tokens[end], "..") || isPunct(tokens[end], "?.."))) {
    if (isPunct(tokens[end], "(") || isPunct(tokens[end], "[") || isPunct(tokens[end], "{")) {
      end = matchClose(tokens, end, sep);
      if (end < 0) return null;
    }
    end++;
  }
  return end > start ? compactText(file, start, end - 1) : null;
}

/** Chamada cujo nome está em `nameTok`; `lower` limita a busca do receptor. @internal */
export function buildCall(
  file: DartFile,
  nameTok: number,
  lower: number,
  insideClosure: DartClosure | null
): DartCall | null {
  const { tokens } = file.lexed;
  let open = nameTok + 1;
  const typeArguments: DartType[] = [];
  if (isPunct(tokens[open], "<")) {
    const close = matchTypeArgs(tokens, open, tokens.length);
    if (close < 0) return null;
    for (const [a, b] of splitTopLevelCommas(tokens, open + 1, close - 1)) {
      const type = parseDartType(file.lexed, a, b);
      if (type) typeArguments.push(type);
    }
    open = close + 1;
  }
  if (!isPunct(tokens[open], "(")) return null;
  const close = matchClose(tokens, open);
  if (close < 0) return null;

  const sep = tokens[nameTok - 1];
  const hasSep = nameTok - 1 >= lower && sep?.kind === "punct" && MEMBER_ACCESS.has(sep.value);
  const isCascade = hasSep && (sep.value === ".." || sep.value === "?..");
  let startTok = nameTok;
  let receiver: string | null = null;
  if (hasSep && !isCascade && nameTok - 2 >= lower) {
    const rs = receiverStart(tokens, nameTok - 2, lower);
    if (rs <= nameTok - 2) {
      receiver = compactText(file, rs, nameTok - 2);
      startTok = rs;
    }
  }
  if (isCascade) startTok = nameTok - 1;
  const prevOfStart = tokens[startTok - 1];
  const isConst = isIdent(prevOfStart, "const") || isIdent(prevOfStart, "new");

  let postfixMember: string | null = null;
  if (
    (isPunct(tokens[close + 1], ".") || isPunct(tokens[close + 1], "?.")) &&
    isIdent(tokens[close + 2]) &&
    !isPunct(tokens[close + 3], "(") &&
    !isPunct(tokens[close + 3], "<")
  ) {
    postfixMember = tokens[close + 2].value;
  }
  return new DartCall(file, {
    startTok,
    nameTok,
    openParenTok: open,
    closeParenTok: close,
    receiver,
    cascadeTarget: isCascade ? cascadeTargetOf(file, nameTok - 1, lower) : null,
    isCascade,
    isNullAware: hasSep && (sep.value === "?." || sep.value === "?.."),
    isConst,
    typeArguments,
    postfixMember,
    insideClosure,
  });
}

/** O identificador em `k` seguido de `(` é uma chamada (e não uma declaração)? */
function isCallAt(tokens: Token[], k: number, lower: number): boolean {
  const t = tokens[k];
  if (t.kind !== "ident" || NOT_CALLEE.has(t.value)) return false;
  let open = k + 1;
  if (isPunct(tokens[open], "<")) {
    const close = matchTypeArgs(tokens, open, tokens.length);
    if (close < 0) return false;
    open = close + 1;
  }
  if (!isPunct(tokens[open], "(")) return false;
  if (k - 1 < lower) return true;
  const prev = tokens[k - 1];
  if (isPunct(prev, "@")) return false;
  if (prev.kind === "ident") return CALL_PREFIX_WORDS.has(prev.value);
  if (isPunct(prev, ">")) {
    // `Future<void> foo(` é declaração; `a > foo()` é raro e fica de fora.
    let depth = 0;
    for (let j = k - 1; j >= lower; j--) {
      if (isPunct(tokens[j], ">")) depth++;
      else if (isPunct(tokens[j], "<") && --depth === 0) return !(tokens[j - 1]?.kind === "ident");
      else if (!(
        tokens[j].kind === "ident" || [",", ".", "?", "(", ")", "{", "}"].includes(tokens[j].value)
      )) {
        return true;
      }
    }
    return true;
  }
  if (isPunct(prev, "?") && (tokens[k - 2]?.kind === "ident" || isPunct(tokens[k - 2], ">"))) {
    // `int? foo() {` é declaração; `c ? foo() : x` é chamada.
    const close = matchClose(tokens, open);
    const after = tokens[close + 1];
    return !(
      isPunct(after, "{") ||
      isPunct(after, "=>") ||
      isIdent(after, "async") ||
      isIdent(after, "sync")
    );
  }
  if (isPunct(prev, ")")) {
    // `void Function(int) foo(` é declaração; `if (x) foo();` é chamada.
    const o = matchOpenBackward(tokens, k - 1, lower);
    return !(o > 0 && isIdent(tokens[o - 1], "Function"));
  }
  return true;
}

/** Chamadas nos tokens `[from, to]`. `closures`: para preencher `insideClosure`. @internal */
export function scanCalls(
  file: DartFile,
  from: number,
  to: number,
  closures: readonly DartClosure[]
): DartCall[] {
  const { tokens } = file.lexed;
  const calls: DartCall[] = [];
  for (let k = from; k <= to; k++) {
    if (tokens[k].kind !== "ident" || !isCallAt(tokens, k, from)) continue;
    const call = buildCall(file, k, from, innermost(closures, k));
    if (call && call.closeParenTok <= to) calls.push(call);
  }
  return calls;
}

function innermost(closures: readonly DartClosure[], tok: number): DartClosure | null {
  let best: DartClosure | null = null;
  for (const c of closures) {
    if (tok > c.openTok && tok <= c.endTok && (best === null || c.openTok > best.openTok)) best = c;
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════════════
// Corpos
// ═══════════════════════════════════════════════════════════════════════════

/** Função anônima (`(x) => ...`, `() async { ... }`) ou função local (`void f() { ... }`). */
export class DartClosure extends DartNodeBase {
  /** Nome da função local; `null` na função anônima. */
  readonly name: string | null;
  readonly asyncKind: DartAsyncKind;
  readonly isAsync: boolean;
  /** @internal `(` dos parâmetros (ou o nome, na função local). */
  readonly openTok: number;
  /** @internal Último token do corpo. */
  readonly endTok: number;
  /** Tipo de retorno escrito da função local (`Future<int> buscar() async`); `null` na anônima ou sem tipo. */
  readonly returnType: DartType | null;
  /** `<T>(T valor) {}` / `T primeiro<T>(List<T> xs) {}` */
  readonly typeParameters: readonly DartTypeParameter[];
  private readonly paramsOpen: number;
  private readonly paramsClose: number;
  private readonly bodyTok: number;
  private parametersCache: DartParameter[] | null = null;
  private bodyCache: DartBody | null = null;

  /** @internal */
  constructor(
    file: DartFile,
    init: {
      startTok: number;
      name: string | null;
      paramsOpen: number;
      paramsClose: number;
      bodyTok: number;
      endTok: number;
      asyncKind: DartAsyncKind;
      typeParamsOpen: number;
      returnFrom: number;
      returnTo: number;
    }
  ) {
    super(file, ...tokenSpan(file, init.startTok, init.endTok));
    this.name = init.name;
    this.typeParameters = buildTypeParameters(file, init.typeParamsOpen, new Set());
    this.returnType =
      init.returnTo >= init.returnFrom && init.returnFrom >= 0
        ? parseDartType(
            file.lexed,
            init.returnFrom,
            init.returnTo,
            new Set(this.typeParameters.map((t) => t.name))
          )
        : null;
    this.openTok = init.startTok;
    this.endTok = init.endTok;
    this.paramsOpen = init.paramsOpen;
    this.paramsClose = init.paramsClose;
    this.bodyTok = init.bodyTok;
    this.asyncKind = init.asyncKind;
    this.isAsync =
      init.asyncKind === DartAsyncKind.Async || init.asyncKind === DartAsyncKind.AsyncStar;
  }

  get parameters(): readonly DartParameter[] {
    if (this.parametersCache === null) {
      const typeParams = new Set(this.typeParameters.map((t) => t.name));
      this.parametersCache =
        buildParameters(this.file, this.paramsOpen, this.paramsClose, false, typeParams) ?? [];
    }
    return this.parametersCache;
  }

  get body(): DartBody {
    if (this.bodyCache === null) {
      const { tokens } = this.file.lexed;
      this.bodyCache = isPunct(tokens[this.bodyTok], "{")
        ? new DartBody(this.file, DartBodyKind.Block, this.bodyTok, this.endTok, this.asyncKind)
        : new DartBody(this.file, DartBodyKind.Arrow, this.bodyTok, this.endTok, this.asyncKind);
    }
    return this.bodyCache;
  }
}

/** `async`/`async*`/`sync*` a partir de `k`; devolve o tipo e o primeiro token depois. */
export function readAsyncMarker(tokens: Token[], k: number): [DartAsyncKind, number] {
  if (isIdent(tokens[k], "async")) {
    return isPunct(tokens[k + 1], "*")
      ? [DartAsyncKind.AsyncStar, k + 2]
      : [DartAsyncKind.Async, k + 1];
  }
  if (isIdent(tokens[k], "sync") && isPunct(tokens[k + 1], "*"))
    return [DartAsyncKind.SyncStar, k + 2];
  return [DartAsyncKind.Sync, k];
}

/** Fim de um corpo `=>` que começa em `arrow` (até o fim da expressão, sem o terminador). */
function arrowEnd(tokens: Token[], arrow: number, limit: number): number {
  let j = arrow + 1;
  while (j <= limit) {
    const t = tokens[j];
    if (t.kind === "punct") {
      if (t.value === "(" || t.value === "[" || t.value === "{") {
        const close = matchClose(tokens, j, limit + 1);
        if (close < 0) return limit;
        j = close + 1;
        continue;
      }
      if (
        t.value === "," ||
        t.value === ")" ||
        t.value === "]" ||
        t.value === "}" ||
        t.value === ";"
      ) {
        return j - 1;
      }
    }
    j++;
  }
  return limit;
}

/** `<` que abre os argumentos de tipo fechados no `>` em `close` (ou -1). */
function typeArgsOpenBackward(tokens: Token[], close: number, lower: number): number {
  let depth = 0;
  for (let j = close; j >= lower; j--) {
    if (isPunct(tokens[j], ">")) depth++;
    else if (isPunct(tokens[j], "<")) {
      if (--depth === 0) return j;
    } else if (!(
      tokens[j].kind === "ident" || [",", ".", "?", "(", ")", "{", "}"].includes(tokens[j].value)
    )) {
      return -1;
    }
  }
  return -1;
}

/** Início do tipo de retorno escrito antes do token `nameTok` (ou `nameTok` se não houver). */
function returnTypeStart(tokens: Token[], nameTok: number, lower: number): number {
  let j = nameTok - 1;
  let start = nameTok;
  while (j >= lower) {
    const t = tokens[j];
    if (isPunct(t, ">")) {
      const lt = typeArgsOpenBackward(tokens, j, lower);
      if (lt < 0) break;
      j = lt - 1;
      continue;
    }
    if (isPunct(t, ")") && j > lower) {
      // `void Function(int)` como tipo de retorno
      const open = matchOpenBackward(tokens, j, lower);
      if (open > lower && isIdent(tokens[open - 1], "Function")) {
        j = open - 1;
        continue;
      }
      break;
    }
    if (t.kind === "ident" && !CALL_PREFIX_WORDS.has(t.value) && !NOT_TYPE_START.has(t.value)) {
      start = j;
      j--;
      continue;
    }
    if (isPunct(t, "?") || isPunct(t, ".")) {
      j--;
      continue;
    }
    break;
  }
  return start;
}

/** Closures e funções locais nos tokens `[from, to]` (também genéricas: `<T>(T x) {}`, `T f<T>() {}`). @internal */
export function scanClosures(file: DartFile, from: number, to: number): DartClosure[] {
  const { tokens } = file.lexed;
  const out: DartClosure[] = [];
  for (let k = from; k <= to; k++) {
    if (!isPunct(tokens[k], "(")) continue;
    let prevIndex = k - 1;
    let typeParamsOpen = -1;
    // `...<T>(`: parâmetros de tipo antes da lista de parâmetros
    if (prevIndex >= from && isPunct(tokens[prevIndex], ">")) {
      const lt = typeArgsOpenBackward(tokens, prevIndex, from);
      if (lt < 0) continue;
      typeParamsOpen = lt;
      prevIndex = lt - 1;
    }
    const prev = tokens[prevIndex];
    let name: string | null = null;
    let startTok = typeParamsOpen >= 0 ? typeParamsOpen : k;
    let nameTok = -1;
    if (prevIndex >= from && prev.kind === "ident" && !CALL_PREFIX_WORDS.has(prev.value)) {
      // Função local: `[tipo] nome[<T>](...) {` — o nome vem depois de um tipo.
      const before = tokens[prevIndex - 1];
      const declared =
        prevIndex - 1 >= from &&
        !NOT_CALLEE.has(prev.value) &&
        (before.kind === "ident" ||
          isPunct(before, ">") ||
          isPunct(before, "?") ||
          isPunct(before, ")")) &&
        !CALL_PREFIX_WORDS.has(before.value);
      if (!declared) continue;
      if (isPunct(before, ")")) {
        const open = matchOpenBackward(tokens, prevIndex - 1, from);
        if (!(open > from && isIdent(tokens[open - 1], "Function"))) continue;
      }
      name = prev.value;
      nameTok = prevIndex;
      startTok = prevIndex;
    } else if (
      prevIndex >= from &&
      (isPunct(prev, ">") || isPunct(prev, ")") || isPunct(prev, "]"))
    ) {
      continue;
    }
    const close = matchClose(tokens, k, to + 1);
    if (close < 0) continue;
    const [asyncKind, after] = readAsyncMarker(tokens, close + 1);
    const returnFrom = nameTok >= 0 ? returnTypeStart(tokens, nameTok, from) : -1;
    const common = {
      startTok,
      name,
      paramsOpen: k,
      paramsClose: close,
      bodyTok: after,
      asyncKind,
      typeParamsOpen,
      returnFrom,
      returnTo: nameTok - 1,
    };
    if (isPunct(tokens[after], "{")) {
      const end = matchClose(tokens, after, to + 1);
      if (end < 0) continue;
      out.push(new DartClosure(file, { ...common, endTok: end }));
    } else if (isPunct(tokens[after], "=>")) {
      out.push(new DartClosure(file, { ...common, endTok: arrowEnd(tokens, after, to) }));
    }
  }
  return out;
}

/** `await` em um corpo. */
export class DartAwait extends DartNodeBase {
  readonly insideClosure: DartClosure | null;
  /** @internal */
  constructor(file: DartFile, tok: number, insideClosure: DartClosure | null) {
    const t = file.lexed.tokens[tok];
    super(file, t.start, t.end);
    this.insideClosure = insideClosure;
  }
}

/** `return` em um corpo. */
export class DartReturn extends DartNodeBase {
  readonly insideClosure: DartClosure | null;
  /** `return;` sem valor. */
  readonly isEmpty: boolean;
  /** @internal */
  constructor(file: DartFile, tok: number, endTok: number, insideClosure: DartClosure | null) {
    super(file, ...tokenSpan(file, tok, endTok));
    this.insideClosure = insideClosure;
    this.isEmpty = endTok === tok + 1;
  }
}

/** Um `catch`/`on` de um try. */
export class DartCatch extends DartNodeBase {
  /** `on FormatException` → o tipo; `catch (e)` puro → `null`. */
  readonly onType: DartType | null;
  readonly exceptionName: string | null;
  readonly stackTraceName: string | null;
  readonly body: DartBody;
  /** Sem nenhum statement no bloco (comentários não contam). */
  readonly isEmpty: boolean;
  /** @internal Tokens dos nomes `e` e `s` de `catch (e, s)`. */
  readonly variableTokens: readonly number[];
  /** @internal */
  constructor(
    file: DartFile,
    init: {
      startTok: number;
      onType: DartType | null;
      exceptionName: string | null;
      stackTraceName: string | null;
      bodyOpen: number;
      bodyClose: number;
      variableTokens: number[];
    }
  ) {
    super(file, ...tokenSpan(file, init.startTok, init.bodyClose));
    this.variableTokens = init.variableTokens;
    this.onType = init.onType;
    this.exceptionName = init.exceptionName;
    this.stackTraceName = init.stackTraceName;
    this.body = new DartBody(
      file,
      DartBodyKind.Block,
      init.bodyOpen,
      init.bodyClose,
      DartAsyncKind.Sync
    );
    this.isEmpty = init.bodyClose === init.bodyOpen + 1;
  }
}

/** `try { } on X catch (e) { } finally { }`. */
export class DartTry extends DartNodeBase {
  readonly body: DartBody;
  readonly catches: readonly DartCatch[];
  readonly finallyBody: DartBody | null;
  readonly insideClosure: DartClosure | null;
  /** @internal */
  constructor(
    file: DartFile,
    init: {
      tryTok: number;
      endTok: number;
      bodyOpen: number;
      bodyClose: number;
      catches: DartCatch[];
      finallyOpen: number;
      finallyClose: number;
      insideClosure: DartClosure | null;
    }
  ) {
    super(file, ...tokenSpan(file, init.tryTok, init.endTok));
    this.body = new DartBody(
      file,
      DartBodyKind.Block,
      init.bodyOpen,
      init.bodyClose,
      DartAsyncKind.Sync
    );
    this.catches = init.catches;
    this.finallyBody =
      init.finallyOpen >= 0
        ? new DartBody(
            file,
            DartBodyKind.Block,
            init.finallyOpen,
            init.finallyClose,
            DartAsyncKind.Sync
          )
        : null;
    this.insideClosure = init.insideClosure;
  }
}

/** Lê um `try` em `tryTok`. @internal */
function parseTry(
  file: DartFile,
  tryTok: number,
  limit: number,
  insideClosure: DartClosure | null
): DartTry | null {
  const { tokens } = file.lexed;
  const bodyOpen = tryTok + 1;
  if (!isPunct(tokens[bodyOpen], "{")) return null;
  const bodyClose = matchClose(tokens, bodyOpen, limit + 1);
  if (bodyClose < 0) return null;
  const catches: DartCatch[] = [];
  let j = bodyClose + 1;
  let finallyOpen = -1;
  let finallyClose = -1;
  while (j <= limit) {
    const start = j;
    let onType: DartType | null = null;
    if (isIdent(tokens[j], "on")) {
      const typeEnd = findAtDepth0(tokens, j + 1, limit + 1, ["{"]);
      const catchTok = (() => {
        for (let k = j + 1; k < (typeEnd < 0 ? limit : typeEnd); k++)
          if (isIdent(tokens[k], "catch")) return k;
        return -1;
      })();
      const end = catchTok >= 0 ? catchTok - 1 : typeEnd - 1;
      onType = end > j ? parseDartType(file.lexed, j + 1, end) : null;
      j = catchTok >= 0 ? catchTok : typeEnd;
      if (j < 0) break;
    }
    let exceptionName: string | null = null;
    let stackTraceName: string | null = null;
    const variableTokens: number[] = [];
    if (isIdent(tokens[j], "catch") && isPunct(tokens[j + 1], "(")) {
      const close = matchClose(tokens, j + 1, limit + 1);
      if (close < 0) break;
      for (const [a] of splitTopLevelCommas(tokens, j + 2, close - 1)) variableTokens.push(a);
      exceptionName = variableTokens[0] !== undefined ? tokens[variableTokens[0]].value : null;
      stackTraceName = variableTokens[1] !== undefined ? tokens[variableTokens[1]].value : null;
      j = close + 1;
    } else if (start === j) {
      if (isIdent(tokens[j], "finally") && isPunct(tokens[j + 1], "{")) {
        finallyOpen = j + 1;
        finallyClose = matchClose(tokens, finallyOpen, limit + 1);
        if (finallyClose < 0) {
          finallyOpen = -1;
          break;
        }
        j = finallyClose + 1;
      }
      break;
    }
    if (!isPunct(tokens[j], "{")) break;
    const close = matchClose(tokens, j, limit + 1);
    if (close < 0) break;
    catches.push(
      new DartCatch(file, {
        startTok: start,
        onType,
        exceptionName,
        stackTraceName,
        bodyOpen: j,
        bodyClose: close,
        variableTokens,
      })
    );
    j = close + 1;
  }
  const endTok = finallyClose >= 0 ? finallyClose : catches.length > 0 ? j - 1 : bodyClose;
  return new DartTry(file, {
    tryTok,
    endTok: Math.max(endTok, bodyClose),
    bodyOpen,
    bodyClose,
    catches,
    finallyOpen,
    finallyClose,
    insideClosure,
  });
}

/** Um statement de nível 1 de um bloco. */
export class DartStatement extends DartNodeBase {
  readonly kind: DartStatementKind;
  /** Blocos filhos: corpo do `if`/`else`, do `for`, do `try`... */
  readonly children: readonly DartBody[];
  /** @internal */
  readonly fromTok: number;
  /** @internal */
  readonly toTok: number;
  /** @internal */
  constructor(
    file: DartFile,
    kind: DartStatementKind,
    fromTok: number,
    toTok: number,
    children: DartBody[]
  ) {
    super(file, ...tokenSpan(file, fromTok, toTok));
    this.kind = kind;
    this.fromTok = fromTok;
    this.toTok = toTok;
    this.children = children;
  }

  /** Expressão de um statement `Expression`/`Return`/`Throw` (sem o `;`). */
  get expression(): DartExpression | null {
    const { tokens } = this.file.lexed;
    let from = this.fromTok;
    let to = this.toTok;
    if (this.kind === DartStatementKind.Return || this.kind === DartStatementKind.Throw) from++;
    else if (this.kind !== DartStatementKind.Expression) return null;
    if (isPunct(tokens[to], ";")) to--;
    return to >= from ? new DartExpression(this.file, from, to) : null;
  }
}

const SIMPLE_STATEMENTS: Record<string, DartStatementKind> = {
  return: DartStatementKind.Return,
  throw: DartStatementKind.Throw,
  rethrow: DartStatementKind.Rethrow,
  yield: DartStatementKind.Yield,
  break: DartStatementKind.Break,
  continue: DartStatementKind.Continue,
  assert: DartStatementKind.Assert,
};

const NOT_TYPE_START = new Set([
  ...CALL_PREFIX_WORDS,
  "this",
  "super",
  "if",
  "for",
  "while",
  "switch",
  "try",
  "return",
  "throw",
  "rethrow",
  "yield",
  "break",
  "continue",
  "true",
  "false",
  "null",
]);

/** Tokens `[from, to]` formam um tipo (`int`, `List<int>?`, `p.User`, `void Function()`, `(int, String)`)? */
function looksLikeType(tokens: Token[], from: number, to: number): boolean {
  if (to < from) return false;
  if (tokens[from].kind === "ident" && NOT_TYPE_START.has(tokens[from].value)) return false;
  let j = from;
  while (j <= to) {
    const t = tokens[j];
    if (t.kind === "ident") {
      j++;
      continue;
    }
    if (isPunct(t, "<")) {
      const close = matchTypeArgs(tokens, j, to + 1);
      if (close < 0) return false;
      j = close + 1;
      continue;
    }
    if (isPunct(t, "(")) {
      const close = matchClose(tokens, j, to + 1);
      if (close < 0) return false;
      j = close + 1;
      continue;
    }
    if (isPunct(t, "?") || isPunct(t, ".")) {
      j++;
      continue;
    }
    return false;
  }
  return !isPunct(tokens[to], ".");
}

/** Lê um statement a partir de `j` (até `limit`). @internal */
function readStatement(
  file: DartFile,
  j: number,
  limit: number
): { kind: DartStatementKind; end: number; children: [number, number][]; start?: number } {
  const { tokens } = file.lexed;
  const t = tokens[j];
  const endAtSemicolon = (from: number): number => {
    const semi = findAtDepth0(tokens, from, limit + 1, [";"]);
    return semi < 0 ? limit : semi;
  };
  // corpo de `if`/`for`/`while`/`else`: bloco ou um statement
  const sub = (from: number): { end: number; children: [number, number][] } => {
    if (from > limit) return { end: limit, children: [] };
    if (isPunct(tokens[from], "{")) {
      const close = matchClose(tokens, from, limit + 1);
      const end = close < 0 ? limit : close;
      return { end, children: [[from, end]] };
    }
    const inner = readStatement(file, from, limit);
    return { end: inner.end, children: inner.children };
  };
  const afterParens = (k: number): number => {
    if (!isPunct(tokens[k], "(")) return k;
    const close = matchClose(tokens, k, limit + 1);
    return close < 0 ? limit + 1 : close + 1;
  };

  if (isPunct(t, ";")) return { kind: DartStatementKind.Empty, end: j, children: [] };
  if (isPunct(t, "{")) {
    const close = matchClose(tokens, j, limit + 1);
    const end = close < 0 ? limit : close;
    return { kind: DartStatementKind.Block, end, children: [[j, end]] };
  }
  if (t.kind === "ident") {
    if (isPunct(tokens[j + 1], ":") && !NOT_TYPE_START.has(t.value) && t.value !== "default") {
      const inner = readStatement(file, j + 2, limit); // rótulo
      return { ...inner, start: inner.start ?? j + 2 };
    }
    // `case <pattern> [when <guarda>]:` e `default:` do switch: rótulos do statement seguinte
    if (t.value === "case" || (t.value === "default" && isPunct(tokens[j + 1], ":"))) {
      let colon = t.value === "default" ? j + 1 : patternEnd(tokens, j + 1, limit);
      if (colon > 0 && isIdent(tokens[colon], "when")) {
        colon = findAtDepth0(tokens, colon + 1, limit + 1, [":"]);
      }
      if (colon > 0 && isPunct(tokens[colon], ":")) {
        if (colon + 1 > limit) return { kind: DartStatementKind.Empty, end: colon, children: [] };
        const inner = readStatement(file, colon + 1, limit);
        return { ...inner, start: inner.start ?? colon + 1 };
      }
    }
    const simple = SIMPLE_STATEMENTS[t.value];
    if (simple !== undefined && !isPunct(tokens[j + 1], ".")) {
      return { kind: simple, end: endAtSemicolon(j), children: [] };
    }
    if (t.value === "if" && isPunct(tokens[j + 1], "(")) {
      const body = sub(afterParens(j + 1));
      const children = [...body.children];
      let end = body.end;
      if (isIdent(tokens[end + 1], "else")) {
        const other = sub(end + 2);
        children.push(...other.children);
        end = other.end;
      }
      return { kind: DartStatementKind.If, end, children };
    }
    if (t.value === "for" || (t.value === "await" && isIdent(tokens[j + 1], "for"))) {
      const forTok = t.value === "await" ? j + 1 : j;
      if (isPunct(tokens[forTok + 1], "(")) {
        const body = sub(afterParens(forTok + 1));
        return { kind: DartStatementKind.For, end: body.end, children: body.children };
      }
    }
    if (t.value === "while" && isPunct(tokens[j + 1], "(")) {
      const body = sub(afterParens(j + 1));
      return { kind: DartStatementKind.While, end: body.end, children: body.children };
    }
    if (t.value === "do") {
      const body = sub(j + 1);
      return {
        kind: DartStatementKind.Do,
        end: endAtSemicolon(body.end + 1),
        children: body.children,
      };
    }
    if (t.value === "switch" && isPunct(tokens[j + 1], "(")) {
      const open = afterParens(j + 1);
      if (isPunct(tokens[open], "{")) {
        const close = matchClose(tokens, open, limit + 1);
        const end = close < 0 ? limit : close;
        return {
          kind: DartStatementKind.Switch,
          end: isPunct(tokens[end + 1], ";") ? end + 1 : end,
          children: [[open, end]],
        };
      }
    }
    if (t.value === "try" && isPunct(tokens[j + 1], "{")) {
      const parsed = parseTry(file, j, limit, null);
      if (parsed) {
        const children: [number, number][] = [];
        const span = (b: DartBody): [number, number] => [b.openTok, b.closeTok];
        children.push(span(parsed.body));
        for (const c of parsed.catches) children.push(span(c.body));
        if (parsed.finallyBody) children.push(span(parsed.finallyBody));
        const last = children[children.length - 1][1];
        return { kind: DartStatementKind.Try, end: last, children };
      }
    }
  }
  // Função local: `[tipo] nome(...) [async] { ... }` ou `... => expr;`
  const local = localFunctionAt(tokens, j, limit);
  if (local !== null) return { kind: DartStatementKind.LocalFunction, end: local, children: [] };
  const end = endAtSemicolon(j);
  return {
    kind: isVariableDeclaration(tokens, j, end)
      ? DartStatementKind.VariableDeclaration
      : DartStatementKind.Expression,
    end,
    children: [],
  };
}

/** Fim da função local que começa em `j`, ou `null`. */
function localFunctionAt(tokens: Token[], j: number, limit: number): number | null {
  let k = j;
  while (k <= limit) {
    const t = tokens[k];
    if (t.kind === "ident") {
      // `T primeiro<T>(...)`: parâmetros de tipo entre o nome e os parâmetros
      let open = k + 1;
      if (isPunct(tokens[open], "<") && k > j) {
        const typeClose = matchTypeArgs(tokens, open, limit + 1);
        if (typeClose > 0 && isPunct(tokens[typeClose + 1], "(")) open = typeClose + 1;
      }
      if (isPunct(tokens[open], "(") && k > j && !isIdent(t, "Function")) {
        if (!looksLikeType(tokens, j, k - 1)) return null;
        const close = matchClose(tokens, open, limit + 1);
        if (close < 0) return null;
        const [, after] = readAsyncMarker(tokens, close + 1);
        if (isPunct(tokens[after], "{")) {
          const end = matchClose(tokens, after, limit + 1);
          return end < 0 ? null : end;
        }
        if (isPunct(tokens[after], "=>")) {
          const semi = findAtDepth0(tokens, after, limit + 1, [";"]);
          return semi < 0 ? null : semi;
        }
        return null;
      }
      k++;
      continue;
    }
    if (isPunct(t, "<")) {
      const close = matchTypeArgs(tokens, k, limit + 1);
      if (close < 0) return null;
      k = close + 1;
      continue;
    }
    if (isPunct(t, "(") && isIdent(tokens[k - 1], "Function")) {
      const close = matchClose(tokens, k, limit + 1);
      if (close < 0) return null;
      k = close + 1;
      continue;
    }
    if (isPunct(t, "?") || isPunct(t, ".")) {
      k++;
      continue;
    }
    return null;
  }
  return null;
}

const DECL_START = new Set(["final", "var", "late", "const"]);

function isVariableDeclaration(tokens: Token[], from: number, end: number): boolean {
  const first = tokens[from];
  if (isIdent(first) && DECL_START.has(first.value)) {
    if (first.value !== "const") return true;
    // `const x = ...` / `const Tipo x = ...` (e não `const Foo();`)
    const eq = findAtDepth0(tokens, from + 1, end + 1, ["=", ";"]);
    return eq > from + 1 && isIdent(tokens[eq - 1]) && looksLikeType(tokens, from + 1, eq - 1);
  }
  const stop = findAtDepth0(tokens, from, end + 1, ["=", ";", ","]);
  if (stop <= from + 1) return false;
  const nameTok = stop - 1;
  if (!isIdent(tokens[nameTok]) || NOT_TYPE_START.has(tokens[nameTok].value)) return false;
  return looksLikeType(tokens, from, nameTok - 1);
}

/** Corpo de método, função, construtor, closure, catch... */
export class DartBody extends DartNodeBase {
  readonly kind: DartBodyKind;
  readonly asyncKind: DartAsyncKind;
  readonly isAsync: boolean;
  /** @internal `{` do bloco ou `=>`. */
  readonly openTok: number;
  /** @internal `}` do bloco ou último token da expressão (o `;` do membro, se houver). */
  readonly closeTok: number;
  private scanCache: BodyScan | null = null;
  private statementsCache: DartStatement[] | null = null;

  /** @internal */
  constructor(
    file: DartFile,
    kind: DartBodyKind,
    openTok: number,
    closeTok: number,
    asyncKind: DartAsyncKind
  ) {
    super(file, ...tokenSpan(file, openTok, Math.max(openTok, closeTok)));
    this.kind = kind;
    this.openTok = openTok;
    this.closeTok = Math.max(openTok, closeTok);
    this.asyncKind = asyncKind;
    this.isAsync = asyncKind === DartAsyncKind.Async || asyncKind === DartAsyncKind.AsyncStar;
  }

  /** Tokens do conteúdo (sem `{`/`}` nem `=>`, sem o `;` final do arrow). */
  private get inner(): [number, number] {
    const { tokens } = this.file.lexed;
    let to = this.kind === DartBodyKind.Block ? this.closeTok - 1 : this.closeTok;
    if (this.kind === DartBodyKind.Arrow && isPunct(tokens[to], ";")) to--;
    return [this.openTok + 1, to];
  }

  private get scan(): BodyScan {
    if (this.scanCache === null) {
      const [from, to] = this.inner;
      this.scanCache = scanBody(this.file, from, to);
    }
    return this.scanCache;
  }

  /** Statements de nível 1 (bloco). No corpo `=>`, vazio: use `expression`. */
  get statements(): readonly DartStatement[] {
    if (this.statementsCache === null) {
      this.statementsCache = [];
      if (this.kind === DartBodyKind.Block) {
        const [from, to] = this.inner;
        this.statementsCache = readStatements(this.file, from, to);
      }
    }
    return this.statementsCache;
  }

  /** Expressão do corpo `=>` (`null` no bloco). */
  get expression(): DartExpression | null {
    if (this.kind !== DartBodyKind.Arrow) return null;
    const [from, to] = this.inner;
    return to >= from ? new DartExpression(this.file, from, to) : null;
  }

  /** Bloco sem nenhum statement (comentários não contam). */
  get isEmpty(): boolean {
    const [from, to] = this.inner;
    return to < from;
  }

  /** Comentários dentro do corpo. */
  get comments(): readonly DartComment[] {
    return this.file.comments.filter(
      (c) => c.startOffset >= this.startOffset && c.endOffset <= this.endOffset
    );
  }

  /** Todas as chamadas do corpo, inclusive aninhadas e dentro de closures (`insideClosure`). */
  get calls(): readonly DartCall[] {
    return this.scan.calls;
  }

  get awaits(): readonly DartAwait[] {
    return this.scan.awaits;
  }

  get returns(): readonly DartReturn[] {
    return this.scan.returns;
  }

  /** Closures e funções locais (todas, inclusive aninhadas). */
  get closures(): readonly DartClosure[] {
    return this.scan.closures;
  }

  /** Todos os `try` do corpo (inclusive aninhados e em closures). */
  get tryStatements(): readonly DartTry[] {
    return this.scan.tries;
  }

  /** Variáveis declaradas no corpo (todas, inclusive em blocos internos, closures e `for`). */
  get localVariables(): readonly DartLocalVariable[] {
    return this.scan.locals;
  }

  /** Linha do primeiro `return` fora de closures/funções locais. */
  get firstTopLevelReturnLine(): number | null {
    return this.returns.find((r) => r.insideClosure === null)?.line ?? null;
  }

  /**
   * Linhas onde `name` é usado como identificador (fora de strings e comentários).
   * Por padrão `x.name` não conta; com `includeMemberAccess` conta também
   * (`context.mounted`, `this.mounted`).
   */
  /**
   * Acessos `target.membro` / `target?.membro` no corpo (também `this.target.membro`), na ordem:
   * `body.memberAccesses("context")` → `[{ member: "mounted", line: 12 }, ...]`.
   */
  memberAccesses(target: string): readonly { member: string; line: number }[] {
    const { tokens } = this.file.lexed;
    const [from, to] = this.inner;
    const out: { member: string; line: number }[] = [];
    for (let k = from; k < to; k++) {
      if (!isIdent(tokens[k], target)) continue;
      const prev = tokens[k - 1];
      const afterDot = prev?.kind === "punct" && MEMBER_ACCESS.has(prev.value);
      if (afterDot && !(isPunct(prev, ".") && isIdent(tokens[k - 2], "this"))) continue;
      const dot = tokens[k + 1];
      if (!(isPunct(dot, ".") || isPunct(dot, "?.")) || !isIdent(tokens[k + 2])) continue;
      out.push({ member: tokens[k + 2].value, line: this.file.lineAtOffset(tokens[k + 2].start) });
    }
    return out;
  }

  references(name: string, options: { includeMemberAccess?: boolean } = {}): readonly number[] {
    const { tokens } = this.file.lexed;
    const [from, to] = this.inner;
    const lines: number[] = [];
    for (let k = from; k <= to; k++) {
      if (!isIdent(tokens[k], name)) continue;
      const afterDot = tokens[k - 1]?.kind === "punct" && MEMBER_ACCESS.has(tokens[k - 1].value);
      if (afterDot && !options.includeMemberAccess) continue;
      lines.push(this.file.lineAtOffset(tokens[k].start));
    }
    return lines;
  }
}

/** @internal */
export interface BodyScan {
  closures: DartClosure[];
  calls: DartCall[];
  awaits: DartAwait[];
  returns: DartReturn[];
  tries: DartTry[];
  locals: DartLocalVariable[];
}

/** @internal */
export function scanBody(file: DartFile, from: number, to: number): BodyScan {
  const { tokens } = file.lexed;
  const closures = to >= from ? scanClosures(file, from, to) : [];
  const calls = to >= from ? scanCalls(file, from, to, closures) : [];
  const awaits: DartAwait[] = [];
  const returns: DartReturn[] = [];
  const tries: DartTry[] = [];
  for (let k = from; k <= to; k++) {
    const t = tokens[k];
    if (t.kind !== "ident" || isPunct(tokens[k - 1], ".")) continue;
    if (t.value === "await") awaits.push(new DartAwait(file, k, innermost(closures, k)));
    else if (t.value === "return") {
      const semi = findAtDepth0(tokens, k, to + 2, [";"]);
      returns.push(new DartReturn(file, k, semi < 0 ? k : semi, innermost(closures, k)));
    } else if (t.value === "try" && isPunct(tokens[k + 1], "{")) {
      const parsed = parseTry(file, k, to, innermost(closures, k));
      if (parsed) tries.push(parsed);
    }
  }
  return { closures, calls, awaits, returns, tries, locals: scanLocals(file, from, to, closures) };
}

/** Statements de nível 1 dos tokens `[from, to]`. @internal */
export function readStatements(file: DartFile, from: number, to: number): DartStatement[] {
  const out: DartStatement[] = [];
  let j = from;
  while (j <= to) {
    const s = readStatement(file, j, to);
    const end = Math.max(j, Math.min(s.end, to));
    const children = s.children.map(
      ([a, b]) => new DartBody(file, DartBodyKind.Block, a, b, DartAsyncKind.Sync)
    );
    out.push(new DartStatement(file, s.kind, j, end, children));
    j = end + 1;
  }
  return out;
}

/** Variáveis locais (statements de declaração e cabeçalhos de `for`) em `[from, to]`. */
function scanLocals(
  file: DartFile,
  from: number,
  to: number,
  closures: readonly DartClosure[]
): DartLocalVariable[] {
  const { tokens } = file.lexed;
  const out: DartLocalVariable[] = [];
  const visit = (a: number, b: number): void => {
    let j = a;
    while (j <= b) {
      const s = readStatement(file, j, b);
      const end = Math.max(j, Math.min(s.end, b));
      const start = s.start ?? j; // depois dos rótulos (`case X:`, `loop:`)
      if (s.kind === DartStatementKind.VariableDeclaration) {
        addDeclaration(start, end, false);
      } else if (s.kind === DartStatementKind.For) {
        addForHeader(isIdent(tokens[start], "await") ? start + 1 : start, b);
      }
      for (const [ca, cb] of s.children) visit(ca + 1, cb - 1);
      j = end + 1;
    }
  };
  // `for (final x in xs)` ou `for (var i = 0; ...; ...)` — statement ou `for` de coleção
  const forHeaders = new Set<number>();
  const addForHeader = (forTok: number, b: number): void => {
    if (forHeaders.has(forTok)) return;
    forHeaders.add(forTok);
    const close = matchClose(tokens, forTok + 1, b + 1);
    if (close < 0) return;
    let inWord = -1;
    for (let k = forTok + 2; k < close && inWord < 0; k++) {
      if (isIdent(tokens[k], "in")) inWord = k;
    }
    const firstSemi = findAtDepth0(tokens, forTok + 2, close, [";"]);
    if (inWord > 0) addLoopVariable(forTok + 2, inWord - 1);
    else if (firstSemi > forTok + 2 && isVariableDeclaration(tokens, forTok + 2, firstSemi)) {
      addDeclaration(forTok + 2, firstSemi, true);
    }
  };
  const addPattern = (
    a: number,
    b: number,
    declaration: boolean,
    outer: ReadonlySet<string>,
    isLoop: boolean
  ): void => {
    for (const v of patternBindings(tokens, a, b, declaration)) {
      const modifiers = new Set([...outer, ...v.modifiers]);
      out.push(
        new DartLocalVariable(
          file,
          {
            firstTok: v.startTok,
            headTok: v.startTok,
            nameTok: v.nameTok,
            endTok: v.nameTok,
            modifiers,
            typeStartTok: v.typeStartTok,
            typeEndTok: v.typeEndTok,
            initStartTok: -1,
            initEndTok: -1,
            annotations: [],
            typeParams: new Set(),
          },
          isLoop,
          innermost(closures, v.nameTok),
          true
        )
      );
    }
  };
  const addDeclaration = (a: number, end: number, isLoop: boolean): void => {
    const modifiers = new Set<string>();
    let p = a;
    while (isIdent(tokens[p]) && ["final", "var", "late", "const"].includes(tokens[p].value)) {
      modifiers.add(tokens[p].value);
      p++;
    }
    if (!isPunct(tokens[end], ";")) return;
    const patternClose = declarationPatternEnd(tokens, p, end);
    if (patternClose > 0) {
      addPattern(p, patternClose, true, modifiers, isLoop); // `final (a, b) = ...;`
      return;
    }
    const field = parseField(file.lexed, a, a, p, end + 1, modifiers, []);
    if (!field) return;
    for (const v of field.vars) {
      out.push(
        new DartLocalVariable(
          file,
          {
            firstTok: a,
            headTok: a,
            nameTok: v.nameTok,
            endTok: end,
            modifiers,
            typeStartTok: field.typeStartTok,
            typeEndTok: field.typeEndTok,
            initStartTok: v.initStartTok,
            initEndTok: v.initEndTok,
            annotations: [],
            typeParams: new Set(),
          },
          isLoop,
          innermost(closures, a)
        )
      );
    }
  };
  const addLoopVariable = (a: number, b: number): void => {
    const modifiers = new Set<string>();
    let p = a;
    while (isIdent(tokens[p]) && ["final", "var"].includes(tokens[p].value)) {
      modifiers.add(tokens[p].value);
      p++;
    }
    if (b >= p && isClosing(tokens[b])) {
      addPattern(p, b, true, modifiers, true); // `for (final (k, v) in ...)`
      return;
    }
    if (!isIdent(tokens[b]) || b < p) return;
    out.push(
      new DartLocalVariable(
        file,
        {
          firstTok: a,
          headTok: a,
          nameTok: b,
          endTok: b,
          modifiers,
          typeStartTok: b > p ? p : -1,
          typeEndTok: b > p ? b - 1 : -1,
          initStartTok: -1,
          initEndTok: -1,
          annotations: [],
          typeParams: new Set(),
        },
        true,
        innermost(closures, a)
      )
    );
  };
  if (to >= from) visit(from, to);
  for (const c of closures) {
    const { tokens: tk } = file.lexed;
    if (isPunct(tk[c.body.openTok], "{")) visit(c.body.openTok + 1, c.body.closeTok - 1);
  }
  // Fora dos statements: `for` de coleção, patterns de `case` (switch e if-case) e braços de
  // switch expression. Os `for` de statement já foram lidos (`forHeaders`).
  for (let k = from; k <= to; k++) {
    const t = tokens[k];
    if (t.kind !== "ident" || isPunct(tokens[k - 1], ".")) continue;
    if (t.value === "for" && isPunct(tokens[k + 1], "(")) {
      addForHeader(k, to);
    } else if (t.value === "case") {
      const end = patternEnd(tokens, k + 1, to);
      if (end > k + 1) addPattern(k + 1, end - 1, false, new Set(), false);
    } else if (t.value === "switch" && isPunct(tokens[k + 1], "(")) {
      for (const [a, b] of switchExpressionPatterns(tokens, k, to)) {
        addPattern(a, b, false, new Set(), false);
      }
    }
  }
  return out;
}

function isClosing(t: Token | undefined): boolean {
  return t !== undefined && (isPunct(t, ")") || isPunct(t, "]") || isPunct(t, "}"));
}

/**
 * Fim (exclusivo) do pattern que começa em `from`: o primeiro `:`, `=>`, `when` ou `=` fora de
 * parênteses/colchetes/chaves, ou o fechamento que não abriu dentro dele (`if (x case P)`).
 * `-1` se chegar a `limit` sem achar.
 */
function patternEnd(tokens: Token[], from: number, limit: number): number {
  for (let k = from; k <= limit; k++) {
    const t = tokens[k];
    if (t === undefined) return -1;
    if (isPunct(t, "(") || isPunct(t, "[") || isPunct(t, "{")) {
      const close = matchClose(tokens, k, limit + 1);
      if (close < 0) return -1;
      k = close;
      continue;
    }
    if (isClosing(t) || isPunct(t, ":") || isPunct(t, "=>") || isPunct(t, "=") || isPunct(t, ";")) {
      return k;
    }
    if (isIdent(t, "when")) return k;
  }
  return -1;
}

/**
 * `(a, b)`, `[a, b]`, `{'k': v}` ou `Point(:x)` logo antes do `=` de uma declaração
 * (`final (a, b) = ...`): devolve o último token do pattern, ou -1 (declaração comum, inclusive
 * com tipo record: `final (int, String) par = ...`).
 */
function declarationPatternEnd(tokens: Token[], p: number, end: number): number {
  let open = p;
  if (isIdent(tokens[p])) {
    // object pattern: `Tipo(...)` ou `Tipo<T>(...)`
    open = p + 1;
    if (isPunct(tokens[open], "<")) {
      const close = matchTypeArgs(tokens, open, end + 1);
      if (close < 0) return -1;
      open = close + 1;
    }
    if (!isPunct(tokens[open], "(")) return -1;
  } else if (!(isPunct(tokens[p], "(") || isPunct(tokens[p], "[") || isPunct(tokens[p], "{"))) {
    return -1;
  }
  const close = matchClose(tokens, open, end + 1);
  return close > 0 && isPunct(tokens[close + 1], "=") ? close : -1;
}

/** Patterns dos braços de uma switch expression (`switch (x) { P when g => v, ... }`). */
function switchExpressionPatterns(
  tokens: Token[],
  switchTok: number,
  limit: number
): [number, number][] {
  const parenClose = matchClose(tokens, switchTok + 1, limit + 1);
  const open = parenClose + 1;
  if (parenClose < 0 || !isPunct(tokens[open], "{")) return [];
  const first = tokens[open + 1];
  // switch statement (`case`/`default`) ou vazio
  if (isIdent(first, "case") || isIdent(first, "default") || isPunct(first, "}")) return [];
  const close = matchClose(tokens, open, limit + 1);
  if (close < 0) return [];
  const out: [number, number][] = [];
  let a = open + 1;
  while (a < close) {
    const end = patternEnd(tokens, a, close);
    if (end < 0 || !(isPunct(tokens[end], "=>") || isIdent(tokens[end], "when"))) break;
    if (end > a) out.push([a, end - 1]);
    const comma = findAtDepth0(tokens, end, close, [","]);
    if (comma < 0) break;
    a = comma + 1;
  }
  return out;
}

const PATTERN_WORDS = new Set([
  "var",
  "final",
  "as",
  "when",
  "const",
  "null",
  "true",
  "false",
  "case",
  "_",
  "in",
]);

interface PatternBinding {
  startTok: number;
  nameTok: number;
  typeStartTok: number;
  typeEndTok: number;
  modifiers: string[];
}

/**
 * Variáveis declaradas no pattern `[a, b]`. Em contexto de declaração (`final (a, b) = ...`,
 * `for (final [a, b] in ...)`) todo nome em posição de valor declara. Em contexto de matching
 * (`case`, if-case, switch expression) só declara com `var`/`final`/tipo (`case [var a, final b]`,
 * `String nome`, `:final x`); nome solto é constante (`case [a, b]`).
 */
function patternBindings(
  tokens: Token[],
  a: number,
  b: number,
  declaration: boolean
): PatternBinding[] {
  const out: PatternBinding[] = [];
  for (let k = a; k <= b; k++) {
    const t = tokens[k];
    // argumentos de tipo (`List<int> xs`, `Map<String, int> m`) não declaram nada
    if (
      isPunct(t, "<") &&
      k > a &&
      isIdent(tokens[k - 1]) &&
      !PATTERN_WORDS.has(tokens[k - 1].value)
    ) {
      const close = matchTypeArgs(tokens, k, b + 1);
      if (close > 0) k = close;
      continue;
    }
    if (t.kind !== "ident" || PATTERN_WORDS.has(t.value)) continue;
    const prev = tokens[k - 1];
    const next = k < b ? tokens[k + 1] : undefined;
    if (isPunct(prev, ".") || isPunct(prev, "?.")) continue; // `Status.ativo`
    if (next !== undefined) {
      // nome de tipo (`Point(`, `p.User`, `String nome`, `String? nome`) ou chave (`nome: ...`)
      if (isPunct(next, ".") || isPunct(next, "(") || isPunct(next, "<") || isPunct(next, ":"))
        continue;
      if (isIdent(next) && next.value !== "as") continue;
      if (isPunct(next, "?") && isIdent(tokens[k + 2]) && tokens[k + 2].value !== "as") continue;
      const terminal =
        isClosing(next) ||
        [",", "!", "?", "&&", "||"].some((v) => isPunct(next, v)) ||
        isIdent(next, "as");
      if (!terminal) continue;
    }
    if (isIdent(prev, "var") || isIdent(prev, "final")) {
      out.push({
        startTok: k - 1,
        nameTok: k,
        typeStartTok: -1,
        typeEndTok: -1,
        modifiers: [prev.value],
      });
      continue;
    }
    const typeStart = patternTypeStart(tokens, k - 1, a);
    if (typeStart >= 0) {
      const finalTok =
        isIdent(tokens[typeStart - 1], "final") && typeStart - 1 >= a ? typeStart - 1 : -1;
      out.push({
        startTok: finalTok >= 0 ? finalTok : typeStart,
        nameTok: k,
        typeStartTok: typeStart,
        typeEndTok: k - 1,
        modifiers: finalTok >= 0 ? ["final"] : [],
      });
      continue;
    }
    const valuePosition = k === a || ["(", "[", ",", ":", "..."].some((v) => isPunct(prev, v));
    if (declaration && valuePosition) {
      out.push({ startTok: k, nameTok: k, typeStartTok: -1, typeEndTok: -1, modifiers: [] });
    }
  }
  return out;
}

/** Início do tipo que termina em `end` dentro de um pattern (`String`, `List<int>?`, `p.User`), ou -1. */
function patternTypeStart(tokens: Token[], end: number, lower: number): number {
  let j = end;
  if (j >= lower && isPunct(tokens[j], "?")) j--;
  if (j >= lower && isPunct(tokens[j], ">")) {
    const lt = typeArgsOpenBackward(tokens, j, lower);
    if (lt < 0) return -1;
    j = lt - 1;
  }
  if (j < lower || !isIdent(tokens[j]) || PATTERN_WORDS.has(tokens[j].value)) return -1;
  let start = j;
  while (start - 2 >= lower && isPunct(tokens[start - 1], ".") && isIdent(tokens[start - 2])) {
    start -= 2;
  }
  return start;
}
