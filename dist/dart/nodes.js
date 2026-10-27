"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DartBody =
  exports.DartStatement =
  exports.DartTry =
  exports.DartCatch =
  exports.DartReturn =
  exports.DartAwait =
  exports.DartClosure =
  exports.DartCall =
  exports.DartArgument =
  exports.DartExpression =
  exports.DartLocalVariable =
  exports.DartVariable =
  exports.DartParameter =
  exports.DartTypeParameter =
  exports.DartString =
  exports.DartDoc =
  exports.DartComment =
  exports.DartAnnotation =
  exports.DartNodeBase =
    void 0;
exports.tokenSpan = tokenSpan;
exports.compactText = compactText;
exports.oneLineText = oneLineText;
exports.leadingTrivia = leadingTrivia;
exports.docOf = docOf;
exports.ignoredBy = ignoredBy;
exports.buildTypeParameters = buildTypeParameters;
exports.buildParameters = buildParameters;
exports.buildArguments = buildArguments;
exports.buildCall = buildCall;
exports.scanCalls = scanCalls;
exports.readAsyncMarker = readAsyncMarker;
exports.scanClosures = scanClosures;
exports.scanBody = scanBody;
exports.readStatements = readStatements;
const enums_1 = require("./enums");
const type_1 = require("./type");
const lexer_1 = require("./internal/lexer");
const syntax_1 = require("./internal/syntax");
/** Base dos nós: posição calculada a partir dos offsets no texto do arquivo. */
class DartNodeBase {
  constructor(file, startOffset, endOffset) {
    this.file = file;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.line = file.lineAtOffset(startOffset);
    this.endLine = file.lineAtOffset(Math.max(startOffset, endOffset - 1));
    this.column = file.columnAtOffset(startOffset);
  }
  get text() {
    return this.file.source.slice(this.startOffset, this.endOffset);
  }
  get lineText() {
    return (this.file.lines[this.line - 1] ?? "").trim();
  }
  /** O nó `other` (do mesmo arquivo) está dentro deste: `method.contains(call)`. */
  contains(other) {
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
  get compact() {
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
exports.DartNodeBase = DartNodeBase;
/** Offsets `[início, fim)` dos tokens `[from, to]`. */
function tokenSpan(file, from, to) {
  const { tokens } = file.lexed;
  return [tokens[from].start, tokens[to].end];
}
/**
 * Texto compacto dos tokens `[from, to]` (sem quebras de linha nem comentários):
 * espaço só entre duas palavras e depois de vírgula, sem a vírgula final que o
 * `dart format` coloca ao quebrar argumentos. `widget\n  .controller` → `widget.controller`.
 */
function compactText(file, from, to) {
  const { tokens } = file.lexed;
  let out = "";
  let prev = null;
  for (let k = from; k <= to; k++) {
    const t = tokens[k];
    if (k < to && isTrailingComma(tokens, k, from)) continue;
    if (prev !== null) {
      const word = (x) => x.kind !== "punct";
      // `as`/`is` sempre separados: `(json['id'] as num?).toInt`
      const operatorWord = (x) => (0, lexer_1.isIdent)(x, "as") || (0, lexer_1.isIdent)(x, "is");
      if (
        (0, lexer_1.isPunct)(prev, ",") ||
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
function oneLineText(file, from, to) {
  const { tokens } = file.lexed;
  const { source } = file;
  // `<`/`>` de argumentos de tipo (não comparação): sem espaço por dentro
  const typeArgBrackets = new Set();
  for (let k = from; k <= to; k++) {
    if (
      (0, lexer_1.isPunct)(tokens[k], "<") &&
      k > 0 &&
      (0, lexer_1.startsTypeArgs)(tokens[k - 1])
    ) {
      const close = (0, lexer_1.matchTypeArgs)(tokens, k, to + 1);
      if (close > 0) {
        typeArgBrackets.add(k);
        typeArgBrackets.add(close);
      }
    }
  }
  let out = "";
  let prev = null;
  let prevIndex = -1;
  for (let k = from; k <= to; k++) {
    const t = tokens[k];
    if (k < to && isTrailingComma(tokens, k, from)) continue;
    if ((0, lexer_1.isPunct)(t, ",") && typeArgBrackets.has(k + 1)) continue; // `Map<String, int,>`
    if (prev !== null) {
      const gap = source.slice(prev.end, t.start);
      // acesso a membro (`a.b`, `a?.b`, `a..b`): nunca tem espaço; o ponto do
      // dot shorthand (`borderRadius: .circular(8)`) vem depois de `:`/`(`/`,` e mantém
      const memberAccess =
        (prev.kind === "punct" && MEMBER_DOTS.has(prev.value)) ||
        (t.kind === "punct" && MEMBER_DOTS.has(t.value) && (0, lexer_1.isExpressionEnd)(prev));
      if (gap.length > 0 && !memberAccess) {
        const lineBreak = gap.includes("\n") || gap.trim().length > 0;
        const glued =
          (prev.kind === "punct" && NO_SPACE_AFTER.has(prev.value)) ||
          (t.kind === "punct" && NO_SPACE_BEFORE.has(t.value)) ||
          (typeArgBrackets.has(prevIndex) && (0, lexer_1.isPunct)(prev, "<")) ||
          (typeArgBrackets.has(k) && (0, lexer_1.isPunct)(t, ">")) ||
          ((0, lexer_1.isPunct)(t, "!") && (0, lexer_1.isExpressionEnd)(prev)); // `x!` (pós-fixo), não `!x`
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
function isTrailingComma(tokens, comma, lower) {
  if ((0, lexer_1.isRemovableTrailingComma)(tokens, comma, lower)) return true;
  if (!(0, lexer_1.isPunct)(tokens[comma], ",") || !(0, lexer_1.isPunct)(tokens[comma + 1], ")"))
    return false;
  // `f!(x,)` e `lista[0](x,)`: argumentos de chamada
  const open = (0, lexer_1.matchOpenBackward)(tokens, comma + 1, lower);
  if (
    open > lower &&
    ((0, lexer_1.isPunct)(tokens[open - 1], "!") || (0, lexer_1.isPunct)(tokens[open - 1], "]"))
  )
    return true;
  const [, after] = readAsyncMarker(tokens, comma + 2);
  return (0, lexer_1.isPunct)(tokens[after], "{") || (0, lexer_1.isPunct)(tokens[after], "=>");
}
// ═══════════════════════════════════════════════════════════════════════════
// Anotações, docs e comentários
// ═══════════════════════════════════════════════════════════════════════════
/** `@override`, `@JsonKey(name: 'x')`, `@p.Annotation()`. */
class DartAnnotation extends DartNodeBase {
  /** @internal */
  constructor(file, raw) {
    super(file, ...tokenSpan(file, raw.startTok, raw.endTok));
    this.argumentsCache = null;
    const { tokens } = file.lexed;
    this.name = raw.name;
    this.prefix =
      (0, lexer_1.isIdent)(tokens[raw.startTok + 1]) &&
      (0, lexer_1.isPunct)(tokens[raw.startTok + 2], ".")
        ? tokens[raw.startTok + 1].value
        : null;
    this.closeParenTok = (0, lexer_1.isPunct)(tokens[raw.endTok], ")") ? raw.endTok : -1;
    this.openParenTok =
      this.closeParenTok >= 0
        ? (0, lexer_1.matchOpenBackward)(tokens, raw.endTok, raw.startTok)
        : -1;
  }
  /** Argumentos (`name: 'x'` → rótulo `name`). Vazio sem parênteses. */
  get arguments() {
    if (this.argumentsCache === null) {
      this.argumentsCache =
        this.openParenTok >= 0
          ? buildArguments(this.file, this.openParenTok, this.closeParenTok)
          : [];
    }
    return this.argumentsCache;
  }
  /** Argumento pelo rótulo (`@JsonKey(name: ...)` → `argument("name")`). */
  argument(label) {
    return this.arguments.find((a) => a.label === label) ?? null;
  }
}
exports.DartAnnotation = DartAnnotation;
/** Comentário do código. */
class DartComment extends DartNodeBase {
  /** @internal */
  constructor(file, range, isTrailing) {
    super(file, range.start, range.end);
    const raw = file.source.slice(range.start, range.end);
    if (raw.startsWith("///")) this.kind = enums_1.DartCommentKind.Doc;
    else if (raw.startsWith("//")) this.kind = enums_1.DartCommentKind.Line;
    else if (raw.startsWith("/**") && !raw.startsWith("/**/"))
      this.kind = enums_1.DartCommentKind.DocBlock;
    else this.kind = enums_1.DartCommentKind.Block;
    this.content =
      this.kind === enums_1.DartCommentKind.Doc
        ? raw.slice(3).trim()
        : this.kind === enums_1.DartCommentKind.Line
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
  get isDoc() {
    return (
      this.kind === enums_1.DartCommentKind.Doc || this.kind === enums_1.DartCommentKind.DocBlock
    );
  }
}
exports.DartComment = DartComment;
function commentDirective(kind, content) {
  if (kind !== enums_1.DartCommentKind.Line) return [null, []];
  const split = (s) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  let m = /^ignore_for_file\s*:\s*(.*)$/.exec(content);
  if (m) return [enums_1.DartCommentDirective.IgnoreForFile, split(m[1])];
  m = /^ignore\s*:\s*(.*)$/.exec(content);
  if (m) return [enums_1.DartCommentDirective.Ignore, split(m[1])];
  if (/^danger:ignore\b/.test(content)) return [enums_1.DartCommentDirective.DangerIgnore, []];
  if (content.startsWith("coverage:ignore"))
    return [enums_1.DartCommentDirective.CoverageIgnore, []];
  if (/^dart\s+format\s+(off|on)\b/.test(content)) return [enums_1.DartCommentDirective.Format, []];
  if (/^@dart\s*=/.test(content)) return [enums_1.DartCommentDirective.LanguageVersion, []];
  if (/^TODO\b/.test(content)) return [enums_1.DartCommentDirective.Todo, []];
  if (/^FIXME\b/.test(content)) return [enums_1.DartCommentDirective.Fixme, []];
  return [null, []];
}
/** Documentação (`///` ou bloco de doc) logo acima de uma declaração. */
class DartDoc extends DartNodeBase {
  /** @internal */
  constructor(file, comments) {
    super(file, comments[0].startOffset, comments[comments.length - 1].endOffset);
    this.comments = comments;
    this.lines = comments.flatMap((c) => c.content.split("\n"));
  }
  /** Texto completo (linhas unidas por `\n`). */
  get content() {
    return this.lines.join("\n");
  }
  /** `{@macro nome}` usados. */
  get macros() {
    return [...this.content.matchAll(/\{@macro\s+([\w.-]+)\s*\}/g)].map((m) => m[1]);
  }
  /** `{@template nome}` definidos. */
  get templates() {
    return [...this.content.matchAll(/\{@template\s+([\w.-]+)\s*\}/g)].map((m) => m[1]);
  }
  /** Só `{@macro x}` (sem texto próprio). */
  get isMacroOnly() {
    const rest = this.lines.filter((l) => l.trim().length > 0);
    return rest.length > 0 && rest.every((l) => /^\{@macro\s+[\w.-]+\s*\}$/.test(l.trim()));
  }
}
exports.DartDoc = DartDoc;
/**
 * Doc e comentários antes do token `firstTok` (anotações incluídas),
 * depois do token anterior.
 * @internal
 */
function leadingTrivia(file, firstTok, headTok = firstTok) {
  const { tokens } = file.lexed;
  const from = firstTok > 0 ? tokens[firstTok - 1].end : 0;
  const to = tokens[headTok]?.start ?? file.source.length;
  return file.comments.filter((c) => c.startOffset >= from && c.endOffset <= to && !c.isTrailing);
}
/** @internal */
function docOf(file, firstTok, headTok = firstTok) {
  const trivia = leadingTrivia(file, firstTok, headTok);
  const docs = [];
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
function ignoredBy(file, firstTok, headTok, plugin, linesAbove) {
  const { tokens } = file.lexed;
  const line = file.lineAtOffset(tokens[headTok].start);
  const candidates = [
    ...leadingTrivia(file, firstTok, headTok),
    ...file.comments.filter((c) => c.isTrailing && c.line === line),
  ];
  return candidates.some(
    (c) =>
      c.line >= line - linesAbove &&
      ((c.directive === enums_1.DartCommentDirective.Ignore && c.directiveArgs.includes(plugin)) ||
        c.directive === enums_1.DartCommentDirective.DangerIgnore)
  );
}
// ═══════════════════════════════════════════════════════════════════════════
// Strings
// ═══════════════════════════════════════════════════════════════════════════
/** String literal do código (cada pedaço de `'a' 'b'` é uma DartString). */
class DartString extends DartNodeBase {
  /** @internal */
  constructor(file, tokenIndex, role, enclosingCallee, argumentLabel) {
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
  get valueWithoutInterpolation() {
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
  get hasInterpolation() {
    return !this.isRaw && /\$[{A-Za-z_]/.test(this.value.replace(/\\\$/g, ""));
  }
}
exports.DartString = DartString;
/** Parâmetro de tipo: `T extends Comparable<T>`. */
class DartTypeParameter {
  /** @internal */
  constructor(name, bound, line, nameTokIndex) {
    this.name = name;
    this.bound = bound;
    this.line = line;
    this.nameTokIndex = nameTokIndex;
  }
}
exports.DartTypeParameter = DartTypeParameter;
/** @internal Parâmetros de tipo de `<` em `open`. */
function buildTypeParameters(file, open, outer) {
  const { tokens } = file.lexed;
  if (open < 0 || !(0, lexer_1.isPunct)(tokens[open], "<")) return [];
  const close = (0, lexer_1.matchTypeArgs)(tokens, open, tokens.length);
  if (close < 0) return [];
  const names = new Set(outer);
  const chunks = (0, lexer_1.splitTopLevelCommas)(tokens, open + 1, close - 1);
  for (const [a] of chunks) {
    const nameTok = (0, lexer_1.isPunct)(tokens[a], "@") ? findNameAfterAnnotations(tokens, a) : a;
    if ((0, lexer_1.isIdent)(tokens[nameTok])) names.add(tokens[nameTok].value);
  }
  return chunks.map(([a, b]) => {
    const nameTok = (0, lexer_1.isPunct)(tokens[a], "@") ? findNameAfterAnnotations(tokens, a) : a;
    const bound = (0, lexer_1.isIdent)(tokens[nameTok + 1], "extends")
      ? (0, type_1.parseDartType)(file.lexed, nameTok + 2, b, names)
      : null;
    return new DartTypeParameter(
      tokens[nameTok]?.value ?? "",
      bound,
      file.lineAtOffset(tokens[nameTok]?.start ?? 0),
      nameTok
    );
  });
}
function findNameAfterAnnotations(tokens, a) {
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
class DartParameter extends DartNodeBase {
  /** @internal */
  constructor(file, raw, inPrimary, typeParams) {
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
        ? enums_1.DartParameterKind.Named
        : raw.section === "optional"
          ? enums_1.DartParameterKind.OptionalPositional
          : enums_1.DartParameterKind.RequiredPositional;
    this.publicName =
      this.kind === enums_1.DartParameterKind.Named && raw.name.startsWith("_")
        ? raw.name.replace(/^_+/, "")
        : raw.name;
    this.isPrivate = raw.name.startsWith("_");
    this.nameLine = file.lineAtOffset(tokens[raw.nameTok].start);
    this.annotations = raw.annotations.map((a) => new DartAnnotation(file, a));
    this.doc = docOf(file, raw.startTok, headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[raw.startTok].start);
    this.type =
      raw.typeStartTok >= 0 && !raw.functionTyped
        ? (0, type_1.parseDartType)(file.lexed, raw.typeStartTok, raw.typeEndTok, typeParams)
        : null;
    this.nullability = this.type?.nullability ?? enums_1.Nullability.Unknown;
    this.source =
      raw.kind === "this"
        ? enums_1.DartParameterSource.This
        : raw.kind === "super"
          ? enums_1.DartParameterSource.Super
          : inPrimary && (raw.modifier === "final" || raw.modifier === "var")
            ? enums_1.DartParameterSource.Declaring
            : enums_1.DartParameterSource.Plain;
    this.isRequired = this.kind === enums_1.DartParameterKind.RequiredPositional || raw.isRequired;
    this.isFinal = raw.modifier === "final";
    this.isCovariant = raw.isCovariant;
    this.isFunctionTyped = raw.functionTyped;
    this.defaultValue =
      raw.defaultStartTok >= 0 ? new DartExpression(file, raw.defaultStartTok, raw.endTok) : null;
  }
  hasAnnotation(name) {
    return this.annotations.some((a) => a.name === name);
  }
  isIgnoredBy(plugin, linesAbove = 5) {
    return ignoredBy(this.file, this.firstTok, this.headTok, plugin, linesAbove);
  }
}
exports.DartParameter = DartParameter;
/** @internal Parâmetros de `(` `open` a `)` `close`; `null` se a lista não foi reconhecida. */
function buildParameters(file, open, close, inPrimary, typeParams) {
  if (open < 0 || close < 0) return [];
  const raw = (0, syntax_1.parseParams)(file.lexed, open, close);
  return raw === null ? null : raw.map((p) => new DartParameter(file, p, inPrimary, typeParams));
}
/** Base de campo, variável de nível superior e variável local. */
class DartVariable extends DartNodeBase {
  constructor(file, init) {
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
        ? (0, type_1.parseDartType)(file.lexed, init.typeStartTok, init.typeEndTok, init.typeParams)
        : null;
    this.nullability = this.type?.nullability ?? enums_1.Nullability.Unknown;
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
  hasAnnotation(name) {
    return this.annotations.some((a) => a.name === name);
  }
  isIgnoredBy(plugin, linesAbove = 5) {
    return ignoredBy(this.file, this.firstTok, this.headTok, plugin, linesAbove);
  }
  /** Comentário `//` no fim da última linha da declaração. */
  get trailingComment() {
    return this.file.comments.find((c) => c.isTrailing && c.line === this.endLine) ?? null;
  }
}
exports.DartVariable = DartVariable;
/**
 * Variável declarada dentro de um corpo: statement, cabeçalho de `for` (também o `for` de
 * coleção) ou pattern. Nunca aparece em `DartClass.fields`.
 */
class DartLocalVariable extends DartVariable {
  /** @internal */
  constructor(file, init, isLoopVariable, insideClosure, isPatternVariable = false) {
    super(file, init);
    this.isLoopVariable = isLoopVariable;
    this.isPatternVariable = isPatternVariable;
    this.insideClosure = insideClosure;
  }
}
exports.DartLocalVariable = DartLocalVariable;
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
class DartExpression extends DartNodeBase {
  /** @internal */
  constructor(file, fromTok, toTok) {
    super(file, ...tokenSpan(file, fromTok, Math.max(fromTok, toTok)));
    this.elementsCache = null;
    this.fromTok = fromTok;
    this.toTok = Math.max(fromTok, toTok);
    this.kind = classifyExpression(file, this.fromTok, this.toTok);
  }
  /** A chamada, quando `kind === Call` (a mais externa: `a.b(c).d(e)` → `d`). */
  get call() {
    if (this.callCache === undefined) {
      this.callCache = null;
      if (this.kind === enums_1.DartExpressionKind.Call) {
        const { tokens } = this.file.lexed;
        const open = (0, lexer_1.matchOpenBackward)(tokens, this.toTok, this.fromTok);
        let nameTok = open - 1;
        if ((0, lexer_1.isPunct)(tokens[nameTok], ">")) {
          let depth = 0;
          for (let k = nameTok; k >= this.fromTok; k--) {
            if ((0, lexer_1.isPunct)(tokens[k], ">")) depth++;
            if ((0, lexer_1.isPunct)(tokens[k], "<") && --depth === 0) {
              nameTok = k - 1;
              break;
            }
          }
        }
        if (nameTok >= this.fromTok && (0, lexer_1.isIdent)(tokens[nameTok])) {
          this.callCache = buildCall(this.file, nameTok, this.fromTok, null);
        }
      }
    }
    return this.callCache;
  }
  /** Elementos de list/set literal (`children: [...]`). Vazio nos outros tipos. */
  get elements() {
    if (this.elementsCache === null) {
      this.elementsCache = [];
      if (
        this.kind === enums_1.DartExpressionKind.ListLiteral ||
        this.kind === enums_1.DartExpressionKind.SetLiteral
      ) {
        const { tokens } = this.file.lexed;
        const open = this.toTok;
        const start = (0, lexer_1.matchOpenBackward)(tokens, open, this.fromTok);
        for (const [a, b] of (0, lexer_1.splitTopLevelCommas)(tokens, start + 1, this.toTok - 1)) {
          this.elementsCache.push(new DartExpression(this.file, a, b));
        }
      }
    }
    return this.elementsCache;
  }
  /** Valor de `NumberLiteral` (`-8.5` → -8.5), senão `null`. */
  get numberValue() {
    if (this.kind !== enums_1.DartExpressionKind.NumberLiteral) return null;
    const value = Number(compactText(this.file, this.fromTok, this.toTok).replace(/[_\s]/g, ""));
    return Number.isNaN(value) ? null : value;
  }
  /** Strings de `StringLiteral` (`'a' 'b'` → duas). */
  get strings() {
    if (this.kind !== enums_1.DartExpressionKind.StringLiteral) return [];
    const out = [];
    for (let k = this.fromTok; k <= this.toTok; k++) {
      const s = this.file.stringAtToken(k);
      if (s) out.push(s);
    }
    return out;
  }
  /** Usa `this` ou `widget` (identificador solto, não `x.widget`). */
  get usesThis() {
    const { tokens } = this.file.lexed;
    for (let k = this.fromTok; k <= this.toTok; k++) {
      const t = tokens[k];
      if ((0, lexer_1.isIdent)(t, "this")) return true;
      if ((0, lexer_1.isIdent)(t, "widget") && !MEMBER_ACCESS.has(tokens[k - 1]?.value ?? ""))
        return true;
    }
    return false;
  }
  /** Texto em uma linha (ver `DartNodeBase.compact`). */
  get compact() {
    return oneLineText(this.file, this.fromTok, this.toTok);
  }
  /** Chamadas dentro da expressão (inclusive aninhadas e em closures). */
  get calls() {
    return scanCalls(this.file, this.fromTok, this.toTok, []);
  }
  /** Closures dentro da expressão (`final onTap = (bool reload) {}`), inclusive aninhadas. */
  get closures() {
    return scanClosures(this.file, this.fromTok, this.toTok);
  }
}
exports.DartExpression = DartExpression;
function classifyExpression(file, from, to) {
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
  if (allStrings) return enums_1.DartExpressionKind.StringLiteral;
  if (from === to) {
    if (first.kind === "number") return enums_1.DartExpressionKind.NumberLiteral;
    if ((0, lexer_1.isIdent)(first, "true") || (0, lexer_1.isIdent)(first, "false"))
      return enums_1.DartExpressionKind.BoolLiteral;
    if ((0, lexer_1.isIdent)(first, "null")) return enums_1.DartExpressionKind.NullLiteral;
    if (first.kind === "ident") return enums_1.DartExpressionKind.Identifier;
  }
  if (to === from + 1 && (0, lexer_1.isPunct)(first, "-") && last.kind === "number") {
    return enums_1.DartExpressionKind.NumberLiteral;
  }
  // Closure: (params) [async|sync*] { ... } | => expr
  if ((0, lexer_1.isPunct)(first, "(")) {
    const close = (0, lexer_1.matchClose)(tokens, from, to + 1);
    if (close > 0 && close < to) {
      let k = close + 1;
      while (
        (0, lexer_1.isIdent)(tokens[k], "async") ||
        (0, lexer_1.isIdent)(tokens[k], "sync") ||
        (0, lexer_1.isPunct)(tokens[k], "*")
      )
        k++;
      if ((0, lexer_1.isPunct)(tokens[k], "=>")) return enums_1.DartExpressionKind.Closure;
      if ((0, lexer_1.isPunct)(tokens[k], "{") && (0, lexer_1.matchClose)(tokens, k, to + 1) === to)
        return enums_1.DartExpressionKind.Closure;
    }
  }
  // Literais de coleção: [const] [<T>] [ ... ] / { ... }
  let k = from;
  if ((0, lexer_1.isIdent)(tokens[k], "const")) k++;
  if ((0, lexer_1.isPunct)(tokens[k], "<")) {
    const close = (0, lexer_1.matchTypeArgs)(tokens, k, to + 1);
    if (close > 0) k = close + 1;
  }
  if ((0, lexer_1.isPunct)(tokens[k], "[") && (0, lexer_1.matchClose)(tokens, k, to + 1) === to)
    return enums_1.DartExpressionKind.ListLiteral;
  if ((0, lexer_1.isPunct)(tokens[k], "{") && (0, lexer_1.matchClose)(tokens, k, to + 1) === to) {
    if (k + 1 === to) return enums_1.DartExpressionKind.MapLiteral;
    return (0, lexer_1.findAtDepth0)(tokens, k + 1, to, [":"]) >= 0
      ? enums_1.DartExpressionKind.MapLiteral
      : enums_1.DartExpressionKind.SetLiteral;
  }
  // Condicional no nível 0: a ? b : c
  if (
    (0, lexer_1.findAtDepth0)(tokens, from, to + 1, ["?"]) >= 0 &&
    (0, lexer_1.findAtDepth0)(tokens, from, to + 1, [":"]) >= 0
  ) {
    return enums_1.DartExpressionKind.Conditional;
  }
  // Chamada: termina em `)` de uma lista de argumentos
  if ((0, lexer_1.isPunct)(last, ")")) {
    const open = (0, lexer_1.matchOpenBackward)(tokens, to, from);
    const before = tokens[open - 1];
    if (
      open > from &&
      (before?.kind === "ident" || (0, lexer_1.isPunct)(before, ">")) &&
      !NOT_CALLEE.has(before.value)
    ) {
      return enums_1.DartExpressionKind.Call;
    }
  }
  // a.b.c (sem chamada)
  let access = true;
  for (let j = from; j <= to; j++) {
    const t = tokens[j];
    const expectIdent = (j - from) % 2 === 0;
    if (
      expectIdent
        ? t.kind !== "ident"
        : !((0, lexer_1.isPunct)(t, ".") || (0, lexer_1.isPunct)(t, "?."))
    ) {
      access = false;
      break;
    }
  }
  if (access && to > from) return enums_1.DartExpressionKind.PropertyAccess;
  return enums_1.DartExpressionKind.Other;
}
/** Argumento de uma chamada ou anotação. */
class DartArgument extends DartNodeBase {
  /** @internal */
  constructor(file, from, to) {
    const { tokens } = file.lexed;
    super(file, ...tokenSpan(file, from, to));
    const labeled =
      (0, lexer_1.isIdent)(tokens[from]) &&
      (0, lexer_1.isPunct)(tokens[from + 1], ":") &&
      from + 2 <= to;
    this.label = labeled ? tokens[from].value : null;
    this.value = new DartExpression(file, labeled ? from + 2 : from, to);
  }
}
exports.DartArgument = DartArgument;
/** @internal */
function buildArguments(file, open, close) {
  if (close <= open + 1) return [];
  return (0, lexer_1.splitTopLevelCommas)(file.lexed.tokens, open + 1, close - 1).map(
    ([a, b]) => new DartArgument(file, a, b)
  );
}
/** Uma chamada: `print(x)`, `MediaQuery.of(context)`, `_controller.dispose()`, `..addListener(f)`. */
class DartCall extends DartNodeBase {
  /** @internal */
  constructor(file, init) {
    super(file, ...tokenSpan(file, init.startTok, init.closeParenTok));
    this.argumentsCache = null;
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
  get arguments() {
    if (this.argumentsCache === null) {
      this.argumentsCache = buildArguments(this.file, this.openParenTok, this.closeParenTok);
    }
    return this.argumentsCache;
  }
  /** Argumento nomeado pelo rótulo (`call.argument("children")`). */
  argument(label) {
    return this.arguments.find((a) => a.label === label) ?? null;
  }
  /** Argumentos posicionais, em ordem. */
  get positionalArguments() {
    return this.arguments.filter((a) => a.label === null);
  }
}
exports.DartCall = DartCall;
/** Início da expressão-receptor que termina em `end` (cadeia `a.b(c)[d]!.e`). */
function receiverStart(tokens, end, lower) {
  let j = end;
  let start = end + 1;
  while (j >= lower) {
    const t = tokens[j];
    if ((0, lexer_1.isPunct)(t, "!")) {
      j--;
      continue;
    }
    if ((0, lexer_1.isPunct)(t, ")") || (0, lexer_1.isPunct)(t, "]")) {
      const open = (0, lexer_1.matchOpenBackward)(tokens, j, lower);
      if (open < 0) break;
      start = open;
      j = open - 1;
      if ((0, lexer_1.isPunct)(tokens[j], ">")) {
        let depth = 0;
        for (let k = j; k >= lower; k--) {
          if ((0, lexer_1.isPunct)(tokens[k], ">")) depth++;
          else if ((0, lexer_1.isPunct)(tokens[k], "<") && --depth === 0) {
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
        (tokens[j].kind === "ident" ||
          (0, lexer_1.isPunct)(tokens[j], ")") ||
          (0, lexer_1.isPunct)(tokens[j], "]"))
      ) {
        continue;
      }
    } else if (t.kind === "ident" || t.kind === "string" || t.kind === "number") {
      start = j;
      j--;
    } else {
      break;
    }
    if (
      j >= lower &&
      ((0, lexer_1.isPunct)(tokens[j], ".") || (0, lexer_1.isPunct)(tokens[j], "?."))
    ) {
      j--;
      continue;
    }
    if (j >= lower && (0, lexer_1.isPunct)(tokens[j], "!")) continue;
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
function cascadeTargetOf(file, sep, lower) {
  const { tokens } = file.lexed;
  let j = sep - 1;
  while (j >= lower) {
    const t = tokens[j];
    if (
      (0, lexer_1.isPunct)(t, ")") ||
      (0, lexer_1.isPunct)(t, "]") ||
      (0, lexer_1.isPunct)(t, "}")
    ) {
      const open = (0, lexer_1.matchOpenBackward)(tokens, j, lower);
      if (open < 0) return null;
      j = open - 1;
      continue;
    }
    if (
      (t.kind === "punct" && CASCADE_BOUNDARY.has(t.value)) ||
      (0, lexer_1.isIdent)(t, "return") ||
      (0, lexer_1.isIdent)(t, "await")
    )
      break;
    j--;
  }
  const start = j + 1;
  let end = start;
  while (
    end < sep &&
    !((0, lexer_1.isPunct)(tokens[end], "..") || (0, lexer_1.isPunct)(tokens[end], "?.."))
  ) {
    if (
      (0, lexer_1.isPunct)(tokens[end], "(") ||
      (0, lexer_1.isPunct)(tokens[end], "[") ||
      (0, lexer_1.isPunct)(tokens[end], "{")
    ) {
      end = (0, lexer_1.matchClose)(tokens, end, sep);
      if (end < 0) return null;
    }
    end++;
  }
  return end > start ? compactText(file, start, end - 1) : null;
}
/** Chamada cujo nome está em `nameTok`; `lower` limita a busca do receptor. @internal */
function buildCall(file, nameTok, lower, insideClosure) {
  const { tokens } = file.lexed;
  let open = nameTok + 1;
  const typeArguments = [];
  if ((0, lexer_1.isPunct)(tokens[open], "<")) {
    const close = (0, lexer_1.matchTypeArgs)(tokens, open, tokens.length);
    if (close < 0) return null;
    for (const [a, b] of (0, lexer_1.splitTopLevelCommas)(tokens, open + 1, close - 1)) {
      const type = (0, type_1.parseDartType)(file.lexed, a, b);
      if (type) typeArguments.push(type);
    }
    open = close + 1;
  }
  if (!(0, lexer_1.isPunct)(tokens[open], "(")) return null;
  const close = (0, lexer_1.matchClose)(tokens, open);
  if (close < 0) return null;
  const sep = tokens[nameTok - 1];
  const hasSep = nameTok - 1 >= lower && sep?.kind === "punct" && MEMBER_ACCESS.has(sep.value);
  const isCascade = hasSep && (sep.value === ".." || sep.value === "?..");
  let startTok = nameTok;
  let receiver = null;
  if (hasSep && !isCascade && nameTok - 2 >= lower) {
    const rs = receiverStart(tokens, nameTok - 2, lower);
    if (rs <= nameTok - 2) {
      receiver = compactText(file, rs, nameTok - 2);
      startTok = rs;
    }
  }
  if (isCascade) startTok = nameTok - 1;
  const prevOfStart = tokens[startTok - 1];
  const isConst =
    (0, lexer_1.isIdent)(prevOfStart, "const") || (0, lexer_1.isIdent)(prevOfStart, "new");
  let postfixMember = null;
  if (
    ((0, lexer_1.isPunct)(tokens[close + 1], ".") ||
      (0, lexer_1.isPunct)(tokens[close + 1], "?.")) &&
    (0, lexer_1.isIdent)(tokens[close + 2]) &&
    !(0, lexer_1.isPunct)(tokens[close + 3], "(") &&
    !(0, lexer_1.isPunct)(tokens[close + 3], "<")
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
function isCallAt(tokens, k, lower) {
  const t = tokens[k];
  if (t.kind !== "ident" || NOT_CALLEE.has(t.value)) return false;
  let open = k + 1;
  if ((0, lexer_1.isPunct)(tokens[open], "<")) {
    const close = (0, lexer_1.matchTypeArgs)(tokens, open, tokens.length);
    if (close < 0) return false;
    open = close + 1;
  }
  if (!(0, lexer_1.isPunct)(tokens[open], "(")) return false;
  if (k - 1 < lower) return true;
  const prev = tokens[k - 1];
  if ((0, lexer_1.isPunct)(prev, "@")) return false;
  if (prev.kind === "ident") return CALL_PREFIX_WORDS.has(prev.value);
  if ((0, lexer_1.isPunct)(prev, ">")) {
    // `Future<void> foo(` é declaração; `a > foo()` é raro e fica de fora.
    let depth = 0;
    for (let j = k - 1; j >= lower; j--) {
      if ((0, lexer_1.isPunct)(tokens[j], ">")) depth++;
      else if ((0, lexer_1.isPunct)(tokens[j], "<") && --depth === 0)
        return !(tokens[j - 1]?.kind === "ident");
      else if (!(
        tokens[j].kind === "ident" || [",", ".", "?", "(", ")", "{", "}"].includes(tokens[j].value)
      )) {
        return true;
      }
    }
    return true;
  }
  if (
    (0, lexer_1.isPunct)(prev, "?") &&
    (tokens[k - 2]?.kind === "ident" || (0, lexer_1.isPunct)(tokens[k - 2], ">"))
  ) {
    // `int? foo() {` é declaração; `c ? foo() : x` é chamada.
    const close = (0, lexer_1.matchClose)(tokens, open);
    const after = tokens[close + 1];
    return !(
      (0, lexer_1.isPunct)(after, "{") ||
      (0, lexer_1.isPunct)(after, "=>") ||
      (0, lexer_1.isIdent)(after, "async") ||
      (0, lexer_1.isIdent)(after, "sync")
    );
  }
  if ((0, lexer_1.isPunct)(prev, ")")) {
    // `void Function(int) foo(` é declaração; `if (x) foo();` é chamada.
    const o = (0, lexer_1.matchOpenBackward)(tokens, k - 1, lower);
    return !(o > 0 && (0, lexer_1.isIdent)(tokens[o - 1], "Function"));
  }
  return true;
}
/** Chamadas nos tokens `[from, to]`. `closures`: para preencher `insideClosure`. @internal */
function scanCalls(file, from, to, closures) {
  const { tokens } = file.lexed;
  const calls = [];
  for (let k = from; k <= to; k++) {
    if (tokens[k].kind !== "ident" || !isCallAt(tokens, k, from)) continue;
    const call = buildCall(file, k, from, innermost(closures, k));
    if (call && call.closeParenTok <= to) calls.push(call);
  }
  return calls;
}
function innermost(closures, tok) {
  let best = null;
  for (const c of closures) {
    if (tok > c.openTok && tok <= c.endTok && (best === null || c.openTok > best.openTok)) best = c;
  }
  return best;
}
// ═══════════════════════════════════════════════════════════════════════════
// Corpos
// ═══════════════════════════════════════════════════════════════════════════
/** Função anônima (`(x) => ...`, `() async { ... }`) ou função local (`void f() { ... }`). */
class DartClosure extends DartNodeBase {
  /** @internal */
  constructor(file, init) {
    super(file, ...tokenSpan(file, init.startTok, init.endTok));
    this.parametersCache = null;
    this.bodyCache = null;
    this.name = init.name;
    this.typeParameters = buildTypeParameters(file, init.typeParamsOpen, new Set());
    this.returnType =
      init.returnTo >= init.returnFrom && init.returnFrom >= 0
        ? (0, type_1.parseDartType)(
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
      init.asyncKind === enums_1.DartAsyncKind.Async ||
      init.asyncKind === enums_1.DartAsyncKind.AsyncStar;
  }
  get parameters() {
    if (this.parametersCache === null) {
      const typeParams = new Set(this.typeParameters.map((t) => t.name));
      this.parametersCache =
        buildParameters(this.file, this.paramsOpen, this.paramsClose, false, typeParams) ?? [];
    }
    return this.parametersCache;
  }
  get body() {
    if (this.bodyCache === null) {
      const { tokens } = this.file.lexed;
      this.bodyCache = (0, lexer_1.isPunct)(tokens[this.bodyTok], "{")
        ? new DartBody(
            this.file,
            enums_1.DartBodyKind.Block,
            this.bodyTok,
            this.endTok,
            this.asyncKind
          )
        : new DartBody(
            this.file,
            enums_1.DartBodyKind.Arrow,
            this.bodyTok,
            this.endTok,
            this.asyncKind
          );
    }
    return this.bodyCache;
  }
}
exports.DartClosure = DartClosure;
/** `async`/`async*`/`sync*` a partir de `k`; devolve o tipo e o primeiro token depois. */
function readAsyncMarker(tokens, k) {
  if ((0, lexer_1.isIdent)(tokens[k], "async")) {
    return (0, lexer_1.isPunct)(tokens[k + 1], "*")
      ? [enums_1.DartAsyncKind.AsyncStar, k + 2]
      : [enums_1.DartAsyncKind.Async, k + 1];
  }
  if ((0, lexer_1.isIdent)(tokens[k], "sync") && (0, lexer_1.isPunct)(tokens[k + 1], "*"))
    return [enums_1.DartAsyncKind.SyncStar, k + 2];
  return [enums_1.DartAsyncKind.Sync, k];
}
/** Fim de um corpo `=>` que começa em `arrow` (até o fim da expressão, sem o terminador). */
function arrowEnd(tokens, arrow, limit) {
  let j = arrow + 1;
  while (j <= limit) {
    const t = tokens[j];
    if (t.kind === "punct") {
      if (t.value === "(" || t.value === "[" || t.value === "{") {
        const close = (0, lexer_1.matchClose)(tokens, j, limit + 1);
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
function typeArgsOpenBackward(tokens, close, lower) {
  let depth = 0;
  for (let j = close; j >= lower; j--) {
    if ((0, lexer_1.isPunct)(tokens[j], ">")) depth++;
    else if ((0, lexer_1.isPunct)(tokens[j], "<")) {
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
function returnTypeStart(tokens, nameTok, lower) {
  let j = nameTok - 1;
  let start = nameTok;
  while (j >= lower) {
    const t = tokens[j];
    if ((0, lexer_1.isPunct)(t, ">")) {
      const lt = typeArgsOpenBackward(tokens, j, lower);
      if (lt < 0) break;
      j = lt - 1;
      continue;
    }
    if ((0, lexer_1.isPunct)(t, ")") && j > lower) {
      // `void Function(int)` como tipo de retorno
      const open = (0, lexer_1.matchOpenBackward)(tokens, j, lower);
      if (open > lower && (0, lexer_1.isIdent)(tokens[open - 1], "Function")) {
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
    if ((0, lexer_1.isPunct)(t, "?") || (0, lexer_1.isPunct)(t, ".")) {
      j--;
      continue;
    }
    break;
  }
  return start;
}
/** Closures e funções locais nos tokens `[from, to]` (também genéricas: `<T>(T x) {}`, `T f<T>() {}`). @internal */
function scanClosures(file, from, to) {
  const { tokens } = file.lexed;
  const out = [];
  for (let k = from; k <= to; k++) {
    if (!(0, lexer_1.isPunct)(tokens[k], "(")) continue;
    let prevIndex = k - 1;
    let typeParamsOpen = -1;
    // `...<T>(`: parâmetros de tipo antes da lista de parâmetros
    if (prevIndex >= from && (0, lexer_1.isPunct)(tokens[prevIndex], ">")) {
      const lt = typeArgsOpenBackward(tokens, prevIndex, from);
      if (lt < 0) continue;
      typeParamsOpen = lt;
      prevIndex = lt - 1;
    }
    const prev = tokens[prevIndex];
    let name = null;
    let startTok = typeParamsOpen >= 0 ? typeParamsOpen : k;
    let nameTok = -1;
    if (prevIndex >= from && prev.kind === "ident" && !CALL_PREFIX_WORDS.has(prev.value)) {
      // Função local: `[tipo] nome[<T>](...) {` — o nome vem depois de um tipo.
      const before = tokens[prevIndex - 1];
      const declared =
        prevIndex - 1 >= from &&
        !NOT_CALLEE.has(prev.value) &&
        (before.kind === "ident" ||
          (0, lexer_1.isPunct)(before, ">") ||
          (0, lexer_1.isPunct)(before, "?") ||
          (0, lexer_1.isPunct)(before, ")")) &&
        !CALL_PREFIX_WORDS.has(before.value);
      if (!declared) continue;
      if ((0, lexer_1.isPunct)(before, ")")) {
        const open = (0, lexer_1.matchOpenBackward)(tokens, prevIndex - 1, from);
        if (!(open > from && (0, lexer_1.isIdent)(tokens[open - 1], "Function"))) continue;
      }
      name = prev.value;
      nameTok = prevIndex;
      startTok = prevIndex;
    } else if (
      prevIndex >= from &&
      ((0, lexer_1.isPunct)(prev, ">") ||
        (0, lexer_1.isPunct)(prev, ")") ||
        (0, lexer_1.isPunct)(prev, "]"))
    ) {
      continue;
    }
    const close = (0, lexer_1.matchClose)(tokens, k, to + 1);
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
    if ((0, lexer_1.isPunct)(tokens[after], "{")) {
      const end = (0, lexer_1.matchClose)(tokens, after, to + 1);
      if (end < 0) continue;
      out.push(new DartClosure(file, { ...common, endTok: end }));
    } else if ((0, lexer_1.isPunct)(tokens[after], "=>")) {
      out.push(new DartClosure(file, { ...common, endTok: arrowEnd(tokens, after, to) }));
    }
  }
  return out;
}
/** `await` em um corpo. */
class DartAwait extends DartNodeBase {
  /** @internal */
  constructor(file, tok, insideClosure) {
    const t = file.lexed.tokens[tok];
    super(file, t.start, t.end);
    this.insideClosure = insideClosure;
  }
}
exports.DartAwait = DartAwait;
/** `return` em um corpo. */
class DartReturn extends DartNodeBase {
  /** @internal */
  constructor(file, tok, endTok, insideClosure) {
    super(file, ...tokenSpan(file, tok, endTok));
    this.insideClosure = insideClosure;
    this.isEmpty = endTok === tok + 1;
  }
}
exports.DartReturn = DartReturn;
/** Um `catch`/`on` de um try. */
class DartCatch extends DartNodeBase {
  /** @internal */
  constructor(file, init) {
    super(file, ...tokenSpan(file, init.startTok, init.bodyClose));
    this.variableTokens = init.variableTokens;
    this.onType = init.onType;
    this.exceptionName = init.exceptionName;
    this.stackTraceName = init.stackTraceName;
    this.body = new DartBody(
      file,
      enums_1.DartBodyKind.Block,
      init.bodyOpen,
      init.bodyClose,
      enums_1.DartAsyncKind.Sync
    );
    this.isEmpty = init.bodyClose === init.bodyOpen + 1;
  }
}
exports.DartCatch = DartCatch;
/** `try { } on X catch (e) { } finally { }`. */
class DartTry extends DartNodeBase {
  /** @internal */
  constructor(file, init) {
    super(file, ...tokenSpan(file, init.tryTok, init.endTok));
    this.body = new DartBody(
      file,
      enums_1.DartBodyKind.Block,
      init.bodyOpen,
      init.bodyClose,
      enums_1.DartAsyncKind.Sync
    );
    this.catches = init.catches;
    this.finallyBody =
      init.finallyOpen >= 0
        ? new DartBody(
            file,
            enums_1.DartBodyKind.Block,
            init.finallyOpen,
            init.finallyClose,
            enums_1.DartAsyncKind.Sync
          )
        : null;
    this.insideClosure = init.insideClosure;
  }
}
exports.DartTry = DartTry;
/** Lê um `try` em `tryTok`. @internal */
function parseTry(file, tryTok, limit, insideClosure) {
  const { tokens } = file.lexed;
  const bodyOpen = tryTok + 1;
  if (!(0, lexer_1.isPunct)(tokens[bodyOpen], "{")) return null;
  const bodyClose = (0, lexer_1.matchClose)(tokens, bodyOpen, limit + 1);
  if (bodyClose < 0) return null;
  const catches = [];
  let j = bodyClose + 1;
  let finallyOpen = -1;
  let finallyClose = -1;
  while (j <= limit) {
    const start = j;
    let onType = null;
    if ((0, lexer_1.isIdent)(tokens[j], "on")) {
      const typeEnd = (0, lexer_1.findAtDepth0)(tokens, j + 1, limit + 1, ["{"]);
      const catchTok = (() => {
        for (let k = j + 1; k < (typeEnd < 0 ? limit : typeEnd); k++)
          if ((0, lexer_1.isIdent)(tokens[k], "catch")) return k;
        return -1;
      })();
      const end = catchTok >= 0 ? catchTok - 1 : typeEnd - 1;
      onType = end > j ? (0, type_1.parseDartType)(file.lexed, j + 1, end) : null;
      j = catchTok >= 0 ? catchTok : typeEnd;
      if (j < 0) break;
    }
    let exceptionName = null;
    let stackTraceName = null;
    const variableTokens = [];
    if ((0, lexer_1.isIdent)(tokens[j], "catch") && (0, lexer_1.isPunct)(tokens[j + 1], "(")) {
      const close = (0, lexer_1.matchClose)(tokens, j + 1, limit + 1);
      if (close < 0) break;
      for (const [a] of (0, lexer_1.splitTopLevelCommas)(tokens, j + 2, close - 1))
        variableTokens.push(a);
      exceptionName = variableTokens[0] !== undefined ? tokens[variableTokens[0]].value : null;
      stackTraceName = variableTokens[1] !== undefined ? tokens[variableTokens[1]].value : null;
      j = close + 1;
    } else if (start === j) {
      if ((0, lexer_1.isIdent)(tokens[j], "finally") && (0, lexer_1.isPunct)(tokens[j + 1], "{")) {
        finallyOpen = j + 1;
        finallyClose = (0, lexer_1.matchClose)(tokens, finallyOpen, limit + 1);
        if (finallyClose < 0) {
          finallyOpen = -1;
          break;
        }
        j = finallyClose + 1;
      }
      break;
    }
    if (!(0, lexer_1.isPunct)(tokens[j], "{")) break;
    const close = (0, lexer_1.matchClose)(tokens, j, limit + 1);
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
class DartStatement extends DartNodeBase {
  /** @internal */
  constructor(file, kind, fromTok, toTok, children) {
    super(file, ...tokenSpan(file, fromTok, toTok));
    this.kind = kind;
    this.fromTok = fromTok;
    this.toTok = toTok;
    this.children = children;
  }
  /** Expressão de um statement `Expression`/`Return`/`Throw` (sem o `;`). */
  get expression() {
    const { tokens } = this.file.lexed;
    let from = this.fromTok;
    let to = this.toTok;
    if (
      this.kind === enums_1.DartStatementKind.Return ||
      this.kind === enums_1.DartStatementKind.Throw
    )
      from++;
    else if (this.kind !== enums_1.DartStatementKind.Expression) return null;
    if ((0, lexer_1.isPunct)(tokens[to], ";")) to--;
    return to >= from ? new DartExpression(this.file, from, to) : null;
  }
}
exports.DartStatement = DartStatement;
const SIMPLE_STATEMENTS = {
  return: enums_1.DartStatementKind.Return,
  throw: enums_1.DartStatementKind.Throw,
  rethrow: enums_1.DartStatementKind.Rethrow,
  yield: enums_1.DartStatementKind.Yield,
  break: enums_1.DartStatementKind.Break,
  continue: enums_1.DartStatementKind.Continue,
  assert: enums_1.DartStatementKind.Assert,
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
function looksLikeType(tokens, from, to) {
  if (to < from) return false;
  if (tokens[from].kind === "ident" && NOT_TYPE_START.has(tokens[from].value)) return false;
  let j = from;
  while (j <= to) {
    const t = tokens[j];
    if (t.kind === "ident") {
      j++;
      continue;
    }
    if ((0, lexer_1.isPunct)(t, "<")) {
      const close = (0, lexer_1.matchTypeArgs)(tokens, j, to + 1);
      if (close < 0) return false;
      j = close + 1;
      continue;
    }
    if ((0, lexer_1.isPunct)(t, "(")) {
      const close = (0, lexer_1.matchClose)(tokens, j, to + 1);
      if (close < 0) return false;
      j = close + 1;
      continue;
    }
    if ((0, lexer_1.isPunct)(t, "?") || (0, lexer_1.isPunct)(t, ".")) {
      j++;
      continue;
    }
    return false;
  }
  return !(0, lexer_1.isPunct)(tokens[to], ".");
}
/** Lê um statement a partir de `j` (até `limit`). @internal */
function readStatement(file, j, limit) {
  const { tokens } = file.lexed;
  const t = tokens[j];
  const endAtSemicolon = (from) => {
    const semi = (0, lexer_1.findAtDepth0)(tokens, from, limit + 1, [";"]);
    return semi < 0 ? limit : semi;
  };
  // corpo de `if`/`for`/`while`/`else`: bloco ou um statement
  const sub = (from) => {
    if (from > limit) return { end: limit, children: [] };
    if ((0, lexer_1.isPunct)(tokens[from], "{")) {
      const close = (0, lexer_1.matchClose)(tokens, from, limit + 1);
      const end = close < 0 ? limit : close;
      return { end, children: [[from, end]] };
    }
    const inner = readStatement(file, from, limit);
    return { end: inner.end, children: inner.children };
  };
  const afterParens = (k) => {
    if (!(0, lexer_1.isPunct)(tokens[k], "(")) return k;
    const close = (0, lexer_1.matchClose)(tokens, k, limit + 1);
    return close < 0 ? limit + 1 : close + 1;
  };
  if ((0, lexer_1.isPunct)(t, ";"))
    return { kind: enums_1.DartStatementKind.Empty, end: j, children: [] };
  if ((0, lexer_1.isPunct)(t, "{")) {
    const close = (0, lexer_1.matchClose)(tokens, j, limit + 1);
    const end = close < 0 ? limit : close;
    return { kind: enums_1.DartStatementKind.Block, end, children: [[j, end]] };
  }
  if (t.kind === "ident") {
    if (
      (0, lexer_1.isPunct)(tokens[j + 1], ":") &&
      !NOT_TYPE_START.has(t.value) &&
      t.value !== "default"
    ) {
      const inner = readStatement(file, j + 2, limit); // rótulo
      return { ...inner, start: inner.start ?? j + 2 };
    }
    // `case <pattern> [when <guarda>]:` e `default:` do switch: rótulos do statement seguinte
    if (t.value === "case" || (t.value === "default" && (0, lexer_1.isPunct)(tokens[j + 1], ":"))) {
      let colon = t.value === "default" ? j + 1 : patternEnd(tokens, j + 1, limit);
      if (colon > 0 && (0, lexer_1.isIdent)(tokens[colon], "when")) {
        colon = (0, lexer_1.findAtDepth0)(tokens, colon + 1, limit + 1, [":"]);
      }
      if (colon > 0 && (0, lexer_1.isPunct)(tokens[colon], ":")) {
        if (colon + 1 > limit)
          return { kind: enums_1.DartStatementKind.Empty, end: colon, children: [] };
        const inner = readStatement(file, colon + 1, limit);
        return { ...inner, start: inner.start ?? colon + 1 };
      }
    }
    const simple = SIMPLE_STATEMENTS[t.value];
    if (simple !== undefined && !(0, lexer_1.isPunct)(tokens[j + 1], ".")) {
      return { kind: simple, end: endAtSemicolon(j), children: [] };
    }
    if (t.value === "if" && (0, lexer_1.isPunct)(tokens[j + 1], "(")) {
      const body = sub(afterParens(j + 1));
      const children = [...body.children];
      let end = body.end;
      if ((0, lexer_1.isIdent)(tokens[end + 1], "else")) {
        const other = sub(end + 2);
        children.push(...other.children);
        end = other.end;
      }
      return { kind: enums_1.DartStatementKind.If, end, children };
    }
    if (t.value === "for" || (t.value === "await" && (0, lexer_1.isIdent)(tokens[j + 1], "for"))) {
      const forTok = t.value === "await" ? j + 1 : j;
      if ((0, lexer_1.isPunct)(tokens[forTok + 1], "(")) {
        const body = sub(afterParens(forTok + 1));
        return { kind: enums_1.DartStatementKind.For, end: body.end, children: body.children };
      }
    }
    if (t.value === "while" && (0, lexer_1.isPunct)(tokens[j + 1], "(")) {
      const body = sub(afterParens(j + 1));
      return { kind: enums_1.DartStatementKind.While, end: body.end, children: body.children };
    }
    if (t.value === "do") {
      const body = sub(j + 1);
      return {
        kind: enums_1.DartStatementKind.Do,
        end: endAtSemicolon(body.end + 1),
        children: body.children,
      };
    }
    if (t.value === "switch" && (0, lexer_1.isPunct)(tokens[j + 1], "(")) {
      const open = afterParens(j + 1);
      if ((0, lexer_1.isPunct)(tokens[open], "{")) {
        const close = (0, lexer_1.matchClose)(tokens, open, limit + 1);
        const end = close < 0 ? limit : close;
        return {
          kind: enums_1.DartStatementKind.Switch,
          end: (0, lexer_1.isPunct)(tokens[end + 1], ";") ? end + 1 : end,
          children: [[open, end]],
        };
      }
    }
    if (t.value === "try" && (0, lexer_1.isPunct)(tokens[j + 1], "{")) {
      const parsed = parseTry(file, j, limit, null);
      if (parsed) {
        const children = [];
        const span = (b) => [b.openTok, b.closeTok];
        children.push(span(parsed.body));
        for (const c of parsed.catches) children.push(span(c.body));
        if (parsed.finallyBody) children.push(span(parsed.finallyBody));
        const last = children[children.length - 1][1];
        return { kind: enums_1.DartStatementKind.Try, end: last, children };
      }
    }
  }
  // Função local: `[tipo] nome(...) [async] { ... }` ou `... => expr;`
  const local = localFunctionAt(tokens, j, limit);
  if (local !== null)
    return { kind: enums_1.DartStatementKind.LocalFunction, end: local, children: [] };
  const end = endAtSemicolon(j);
  return {
    kind: isVariableDeclaration(tokens, j, end)
      ? enums_1.DartStatementKind.VariableDeclaration
      : enums_1.DartStatementKind.Expression,
    end,
    children: [],
  };
}
/** Fim da função local que começa em `j`, ou `null`. */
function localFunctionAt(tokens, j, limit) {
  let k = j;
  while (k <= limit) {
    const t = tokens[k];
    if (t.kind === "ident") {
      // `T primeiro<T>(...)`: parâmetros de tipo entre o nome e os parâmetros
      let open = k + 1;
      if ((0, lexer_1.isPunct)(tokens[open], "<") && k > j) {
        const typeClose = (0, lexer_1.matchTypeArgs)(tokens, open, limit + 1);
        if (typeClose > 0 && (0, lexer_1.isPunct)(tokens[typeClose + 1], "(")) open = typeClose + 1;
      }
      if (
        (0, lexer_1.isPunct)(tokens[open], "(") &&
        k > j &&
        !(0, lexer_1.isIdent)(t, "Function")
      ) {
        if (!looksLikeType(tokens, j, k - 1)) return null;
        const close = (0, lexer_1.matchClose)(tokens, open, limit + 1);
        if (close < 0) return null;
        const [, after] = readAsyncMarker(tokens, close + 1);
        if ((0, lexer_1.isPunct)(tokens[after], "{")) {
          const end = (0, lexer_1.matchClose)(tokens, after, limit + 1);
          return end < 0 ? null : end;
        }
        if ((0, lexer_1.isPunct)(tokens[after], "=>")) {
          const semi = (0, lexer_1.findAtDepth0)(tokens, after, limit + 1, [";"]);
          return semi < 0 ? null : semi;
        }
        return null;
      }
      k++;
      continue;
    }
    if ((0, lexer_1.isPunct)(t, "<")) {
      const close = (0, lexer_1.matchTypeArgs)(tokens, k, limit + 1);
      if (close < 0) return null;
      k = close + 1;
      continue;
    }
    if ((0, lexer_1.isPunct)(t, "(") && (0, lexer_1.isIdent)(tokens[k - 1], "Function")) {
      const close = (0, lexer_1.matchClose)(tokens, k, limit + 1);
      if (close < 0) return null;
      k = close + 1;
      continue;
    }
    if ((0, lexer_1.isPunct)(t, "?") || (0, lexer_1.isPunct)(t, ".")) {
      k++;
      continue;
    }
    return null;
  }
  return null;
}
const DECL_START = new Set(["final", "var", "late", "const"]);
function isVariableDeclaration(tokens, from, end) {
  const first = tokens[from];
  if ((0, lexer_1.isIdent)(first) && DECL_START.has(first.value)) {
    if (first.value !== "const") return true;
    // `const x = ...` / `const Tipo x = ...` (e não `const Foo();`)
    const eq = (0, lexer_1.findAtDepth0)(tokens, from + 1, end + 1, ["=", ";"]);
    return (
      eq > from + 1 &&
      (0, lexer_1.isIdent)(tokens[eq - 1]) &&
      looksLikeType(tokens, from + 1, eq - 1)
    );
  }
  const stop = (0, lexer_1.findAtDepth0)(tokens, from, end + 1, ["=", ";", ","]);
  if (stop <= from + 1) return false;
  const nameTok = stop - 1;
  if (!(0, lexer_1.isIdent)(tokens[nameTok]) || NOT_TYPE_START.has(tokens[nameTok].value))
    return false;
  return looksLikeType(tokens, from, nameTok - 1);
}
/** Corpo de método, função, construtor, closure, catch... */
class DartBody extends DartNodeBase {
  /** @internal */
  constructor(file, kind, openTok, closeTok, asyncKind) {
    super(file, ...tokenSpan(file, openTok, Math.max(openTok, closeTok)));
    this.scanCache = null;
    this.statementsCache = null;
    this.kind = kind;
    this.openTok = openTok;
    this.closeTok = Math.max(openTok, closeTok);
    this.asyncKind = asyncKind;
    this.isAsync =
      asyncKind === enums_1.DartAsyncKind.Async || asyncKind === enums_1.DartAsyncKind.AsyncStar;
  }
  /** Tokens do conteúdo (sem `{`/`}` nem `=>`, sem o `;` final do arrow). */
  get inner() {
    const { tokens } = this.file.lexed;
    let to = this.kind === enums_1.DartBodyKind.Block ? this.closeTok - 1 : this.closeTok;
    if (this.kind === enums_1.DartBodyKind.Arrow && (0, lexer_1.isPunct)(tokens[to], ";")) to--;
    return [this.openTok + 1, to];
  }
  get scan() {
    if (this.scanCache === null) {
      const [from, to] = this.inner;
      this.scanCache = scanBody(this.file, from, to);
    }
    return this.scanCache;
  }
  /** Statements de nível 1 (bloco). No corpo `=>`, vazio: use `expression`. */
  get statements() {
    if (this.statementsCache === null) {
      this.statementsCache = [];
      if (this.kind === enums_1.DartBodyKind.Block) {
        const [from, to] = this.inner;
        this.statementsCache = readStatements(this.file, from, to);
      }
    }
    return this.statementsCache;
  }
  /** Expressão do corpo `=>` (`null` no bloco). */
  get expression() {
    if (this.kind !== enums_1.DartBodyKind.Arrow) return null;
    const [from, to] = this.inner;
    return to >= from ? new DartExpression(this.file, from, to) : null;
  }
  /** Bloco sem nenhum statement (comentários não contam). */
  get isEmpty() {
    const [from, to] = this.inner;
    return to < from;
  }
  /** Comentários dentro do corpo. */
  get comments() {
    return this.file.comments.filter(
      (c) => c.startOffset >= this.startOffset && c.endOffset <= this.endOffset
    );
  }
  /** Todas as chamadas do corpo, inclusive aninhadas e dentro de closures (`insideClosure`). */
  get calls() {
    return this.scan.calls;
  }
  get awaits() {
    return this.scan.awaits;
  }
  get returns() {
    return this.scan.returns;
  }
  /** Closures e funções locais (todas, inclusive aninhadas). */
  get closures() {
    return this.scan.closures;
  }
  /** Todos os `try` do corpo (inclusive aninhados e em closures). */
  get tryStatements() {
    return this.scan.tries;
  }
  /** Variáveis declaradas no corpo (todas, inclusive em blocos internos, closures e `for`). */
  get localVariables() {
    return this.scan.locals;
  }
  /** Linha do primeiro `return` fora de closures/funções locais. */
  get firstTopLevelReturnLine() {
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
  memberAccesses(target) {
    const { tokens } = this.file.lexed;
    const [from, to] = this.inner;
    const out = [];
    for (let k = from; k < to; k++) {
      if (!(0, lexer_1.isIdent)(tokens[k], target)) continue;
      const prev = tokens[k - 1];
      const afterDot = prev?.kind === "punct" && MEMBER_ACCESS.has(prev.value);
      if (
        afterDot &&
        !((0, lexer_1.isPunct)(prev, ".") && (0, lexer_1.isIdent)(tokens[k - 2], "this"))
      )
        continue;
      const dot = tokens[k + 1];
      if (
        !((0, lexer_1.isPunct)(dot, ".") || (0, lexer_1.isPunct)(dot, "?.")) ||
        !(0, lexer_1.isIdent)(tokens[k + 2])
      )
        continue;
      out.push({ member: tokens[k + 2].value, line: this.file.lineAtOffset(tokens[k + 2].start) });
    }
    return out;
  }
  references(name, options = {}) {
    const { tokens } = this.file.lexed;
    const [from, to] = this.inner;
    const lines = [];
    for (let k = from; k <= to; k++) {
      if (!(0, lexer_1.isIdent)(tokens[k], name)) continue;
      const afterDot = tokens[k - 1]?.kind === "punct" && MEMBER_ACCESS.has(tokens[k - 1].value);
      if (afterDot && !options.includeMemberAccess) continue;
      lines.push(this.file.lineAtOffset(tokens[k].start));
    }
    return lines;
  }
}
exports.DartBody = DartBody;
/** @internal */
function scanBody(file, from, to) {
  const { tokens } = file.lexed;
  const closures = to >= from ? scanClosures(file, from, to) : [];
  const calls = to >= from ? scanCalls(file, from, to, closures) : [];
  const awaits = [];
  const returns = [];
  const tries = [];
  for (let k = from; k <= to; k++) {
    const t = tokens[k];
    if (t.kind !== "ident" || (0, lexer_1.isPunct)(tokens[k - 1], ".")) continue;
    if (t.value === "await") awaits.push(new DartAwait(file, k, innermost(closures, k)));
    else if (t.value === "return") {
      const semi = (0, lexer_1.findAtDepth0)(tokens, k, to + 2, [";"]);
      returns.push(new DartReturn(file, k, semi < 0 ? k : semi, innermost(closures, k)));
    } else if (t.value === "try" && (0, lexer_1.isPunct)(tokens[k + 1], "{")) {
      const parsed = parseTry(file, k, to, innermost(closures, k));
      if (parsed) tries.push(parsed);
    }
  }
  return { closures, calls, awaits, returns, tries, locals: scanLocals(file, from, to, closures) };
}
/** Statements de nível 1 dos tokens `[from, to]`. @internal */
function readStatements(file, from, to) {
  const out = [];
  let j = from;
  while (j <= to) {
    const s = readStatement(file, j, to);
    const end = Math.max(j, Math.min(s.end, to));
    const children = s.children.map(
      ([a, b]) => new DartBody(file, enums_1.DartBodyKind.Block, a, b, enums_1.DartAsyncKind.Sync)
    );
    out.push(new DartStatement(file, s.kind, j, end, children));
    j = end + 1;
  }
  return out;
}
/** Variáveis locais (statements de declaração e cabeçalhos de `for`) em `[from, to]`. */
function scanLocals(file, from, to, closures) {
  const { tokens } = file.lexed;
  const out = [];
  const visit = (a, b) => {
    let j = a;
    while (j <= b) {
      const s = readStatement(file, j, b);
      const end = Math.max(j, Math.min(s.end, b));
      const start = s.start ?? j; // depois dos rótulos (`case X:`, `loop:`)
      if (s.kind === enums_1.DartStatementKind.VariableDeclaration) {
        addDeclaration(start, end, false);
      } else if (s.kind === enums_1.DartStatementKind.For) {
        addForHeader((0, lexer_1.isIdent)(tokens[start], "await") ? start + 1 : start, b);
      }
      for (const [ca, cb] of s.children) visit(ca + 1, cb - 1);
      j = end + 1;
    }
  };
  // `for (final x in xs)` ou `for (var i = 0; ...; ...)` — statement ou `for` de coleção
  const forHeaders = new Set();
  const addForHeader = (forTok, b) => {
    if (forHeaders.has(forTok)) return;
    forHeaders.add(forTok);
    const close = (0, lexer_1.matchClose)(tokens, forTok + 1, b + 1);
    if (close < 0) return;
    let inWord = -1;
    for (let k = forTok + 2; k < close && inWord < 0; k++) {
      if ((0, lexer_1.isIdent)(tokens[k], "in")) inWord = k;
    }
    const firstSemi = (0, lexer_1.findAtDepth0)(tokens, forTok + 2, close, [";"]);
    if (inWord > 0) addLoopVariable(forTok + 2, inWord - 1);
    else if (firstSemi > forTok + 2 && isVariableDeclaration(tokens, forTok + 2, firstSemi)) {
      addDeclaration(forTok + 2, firstSemi, true);
    }
  };
  const addPattern = (a, b, declaration, outer, isLoop) => {
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
  const addDeclaration = (a, end, isLoop) => {
    const modifiers = new Set();
    let p = a;
    while (
      (0, lexer_1.isIdent)(tokens[p]) &&
      ["final", "var", "late", "const"].includes(tokens[p].value)
    ) {
      modifiers.add(tokens[p].value);
      p++;
    }
    if (!(0, lexer_1.isPunct)(tokens[end], ";")) return;
    const patternClose = declarationPatternEnd(tokens, p, end);
    if (patternClose > 0) {
      addPattern(p, patternClose, true, modifiers, isLoop); // `final (a, b) = ...;`
      return;
    }
    const field = (0, syntax_1.parseField)(file.lexed, a, a, p, end + 1, modifiers, []);
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
  const addLoopVariable = (a, b) => {
    const modifiers = new Set();
    let p = a;
    while ((0, lexer_1.isIdent)(tokens[p]) && ["final", "var"].includes(tokens[p].value)) {
      modifiers.add(tokens[p].value);
      p++;
    }
    if (b >= p && isClosing(tokens[b])) {
      addPattern(p, b, true, modifiers, true); // `for (final (k, v) in ...)`
      return;
    }
    if (!(0, lexer_1.isIdent)(tokens[b]) || b < p) return;
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
    if ((0, lexer_1.isPunct)(tk[c.body.openTok], "{"))
      visit(c.body.openTok + 1, c.body.closeTok - 1);
  }
  // Fora dos statements: `for` de coleção, patterns de `case` (switch e if-case) e braços de
  // switch expression. Os `for` de statement já foram lidos (`forHeaders`).
  for (let k = from; k <= to; k++) {
    const t = tokens[k];
    if (t.kind !== "ident" || (0, lexer_1.isPunct)(tokens[k - 1], ".")) continue;
    if (t.value === "for" && (0, lexer_1.isPunct)(tokens[k + 1], "(")) {
      addForHeader(k, to);
    } else if (t.value === "case") {
      const end = patternEnd(tokens, k + 1, to);
      if (end > k + 1) addPattern(k + 1, end - 1, false, new Set(), false);
    } else if (t.value === "switch" && (0, lexer_1.isPunct)(tokens[k + 1], "(")) {
      for (const [a, b] of switchExpressionPatterns(tokens, k, to)) {
        addPattern(a, b, false, new Set(), false);
      }
    }
  }
  return out;
}
function isClosing(t) {
  return (
    t !== undefined &&
    ((0, lexer_1.isPunct)(t, ")") || (0, lexer_1.isPunct)(t, "]") || (0, lexer_1.isPunct)(t, "}"))
  );
}
/**
 * Fim (exclusivo) do pattern que começa em `from`: o primeiro `:`, `=>`, `when` ou `=` fora de
 * parênteses/colchetes/chaves, ou o fechamento que não abriu dentro dele (`if (x case P)`).
 * `-1` se chegar a `limit` sem achar.
 */
function patternEnd(tokens, from, limit) {
  for (let k = from; k <= limit; k++) {
    const t = tokens[k];
    if (t === undefined) return -1;
    if (
      (0, lexer_1.isPunct)(t, "(") ||
      (0, lexer_1.isPunct)(t, "[") ||
      (0, lexer_1.isPunct)(t, "{")
    ) {
      const close = (0, lexer_1.matchClose)(tokens, k, limit + 1);
      if (close < 0) return -1;
      k = close;
      continue;
    }
    if (
      isClosing(t) ||
      (0, lexer_1.isPunct)(t, ":") ||
      (0, lexer_1.isPunct)(t, "=>") ||
      (0, lexer_1.isPunct)(t, "=") ||
      (0, lexer_1.isPunct)(t, ";")
    ) {
      return k;
    }
    if ((0, lexer_1.isIdent)(t, "when")) return k;
  }
  return -1;
}
/**
 * `(a, b)`, `[a, b]`, `{'k': v}` ou `Point(:x)` logo antes do `=` de uma declaração
 * (`final (a, b) = ...`): devolve o último token do pattern, ou -1 (declaração comum, inclusive
 * com tipo record: `final (int, String) par = ...`).
 */
function declarationPatternEnd(tokens, p, end) {
  let open = p;
  if ((0, lexer_1.isIdent)(tokens[p])) {
    // object pattern: `Tipo(...)` ou `Tipo<T>(...)`
    open = p + 1;
    if ((0, lexer_1.isPunct)(tokens[open], "<")) {
      const close = (0, lexer_1.matchTypeArgs)(tokens, open, end + 1);
      if (close < 0) return -1;
      open = close + 1;
    }
    if (!(0, lexer_1.isPunct)(tokens[open], "(")) return -1;
  } else if (!(
    (0, lexer_1.isPunct)(tokens[p], "(") ||
    (0, lexer_1.isPunct)(tokens[p], "[") ||
    (0, lexer_1.isPunct)(tokens[p], "{")
  )) {
    return -1;
  }
  const close = (0, lexer_1.matchClose)(tokens, open, end + 1);
  return close > 0 && (0, lexer_1.isPunct)(tokens[close + 1], "=") ? close : -1;
}
/** Patterns dos braços de uma switch expression (`switch (x) { P when g => v, ... }`). */
function switchExpressionPatterns(tokens, switchTok, limit) {
  const parenClose = (0, lexer_1.matchClose)(tokens, switchTok + 1, limit + 1);
  const open = parenClose + 1;
  if (parenClose < 0 || !(0, lexer_1.isPunct)(tokens[open], "{")) return [];
  const first = tokens[open + 1];
  // switch statement (`case`/`default`) ou vazio
  if (
    (0, lexer_1.isIdent)(first, "case") ||
    (0, lexer_1.isIdent)(first, "default") ||
    (0, lexer_1.isPunct)(first, "}")
  )
    return [];
  const close = (0, lexer_1.matchClose)(tokens, open, limit + 1);
  if (close < 0) return [];
  const out = [];
  let a = open + 1;
  while (a < close) {
    const end = patternEnd(tokens, a, close);
    if (
      end < 0 ||
      !((0, lexer_1.isPunct)(tokens[end], "=>") || (0, lexer_1.isIdent)(tokens[end], "when"))
    )
      break;
    if (end > a) out.push([a, end - 1]);
    const comma = (0, lexer_1.findAtDepth0)(tokens, end, close, [","]);
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
/**
 * Variáveis declaradas no pattern `[a, b]`. Em contexto de declaração (`final (a, b) = ...`,
 * `for (final [a, b] in ...)`) todo nome em posição de valor declara. Em contexto de matching
 * (`case`, if-case, switch expression) só declara com `var`/`final`/tipo (`case [var a, final b]`,
 * `String nome`, `:final x`); nome solto é constante (`case [a, b]`).
 */
function patternBindings(tokens, a, b, declaration) {
  const out = [];
  for (let k = a; k <= b; k++) {
    const t = tokens[k];
    // argumentos de tipo (`List<int> xs`, `Map<String, int> m`) não declaram nada
    if (
      (0, lexer_1.isPunct)(t, "<") &&
      k > a &&
      (0, lexer_1.isIdent)(tokens[k - 1]) &&
      !PATTERN_WORDS.has(tokens[k - 1].value)
    ) {
      const close = (0, lexer_1.matchTypeArgs)(tokens, k, b + 1);
      if (close > 0) k = close;
      continue;
    }
    if (t.kind !== "ident" || PATTERN_WORDS.has(t.value)) continue;
    const prev = tokens[k - 1];
    const next = k < b ? tokens[k + 1] : undefined;
    if ((0, lexer_1.isPunct)(prev, ".") || (0, lexer_1.isPunct)(prev, "?.")) continue; // `Status.ativo`
    if (next !== undefined) {
      // nome de tipo (`Point(`, `p.User`, `String nome`, `String? nome`) ou chave (`nome: ...`)
      if (
        (0, lexer_1.isPunct)(next, ".") ||
        (0, lexer_1.isPunct)(next, "(") ||
        (0, lexer_1.isPunct)(next, "<") ||
        (0, lexer_1.isPunct)(next, ":")
      )
        continue;
      if ((0, lexer_1.isIdent)(next) && next.value !== "as") continue;
      if (
        (0, lexer_1.isPunct)(next, "?") &&
        (0, lexer_1.isIdent)(tokens[k + 2]) &&
        tokens[k + 2].value !== "as"
      )
        continue;
      const terminal =
        isClosing(next) ||
        [",", "!", "?", "&&", "||"].some((v) => (0, lexer_1.isPunct)(next, v)) ||
        (0, lexer_1.isIdent)(next, "as");
      if (!terminal) continue;
    }
    if ((0, lexer_1.isIdent)(prev, "var") || (0, lexer_1.isIdent)(prev, "final")) {
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
        (0, lexer_1.isIdent)(tokens[typeStart - 1], "final") && typeStart - 1 >= a
          ? typeStart - 1
          : -1;
      out.push({
        startTok: finalTok >= 0 ? finalTok : typeStart,
        nameTok: k,
        typeStartTok: typeStart,
        typeEndTok: k - 1,
        modifiers: finalTok >= 0 ? ["final"] : [],
      });
      continue;
    }
    const valuePosition =
      k === a || ["(", "[", ",", ":", "..."].some((v) => (0, lexer_1.isPunct)(prev, v));
    if (declaration && valuePosition) {
      out.push({ startTok: k, nameTok: k, typeStartTok: -1, typeEndTok: -1, modifiers: [] });
    }
  }
  return out;
}
/** Início do tipo que termina em `end` dentro de um pattern (`String`, `List<int>?`, `p.User`), ou -1. */
function patternTypeStart(tokens, end, lower) {
  let j = end;
  if (j >= lower && (0, lexer_1.isPunct)(tokens[j], "?")) j--;
  if (j >= lower && (0, lexer_1.isPunct)(tokens[j], ">")) {
    const lt = typeArgsOpenBackward(tokens, j, lower);
    if (lt < 0) return -1;
    j = lt - 1;
  }
  if (j < lower || !(0, lexer_1.isIdent)(tokens[j]) || PATTERN_WORDS.has(tokens[j].value))
    return -1;
  let start = j;
  while (
    start - 2 >= lower &&
    (0, lexer_1.isPunct)(tokens[start - 1], ".") &&
    (0, lexer_1.isIdent)(tokens[start - 2])
  ) {
    start -= 2;
  }
  return start;
}
