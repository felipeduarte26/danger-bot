"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DartDirective =
  exports.DartTypedef =
  exports.DartEnumValue =
  exports.DartConstructor =
  exports.DartInitializer =
  exports.DartMethod =
  exports.DartFunction =
  exports.DartTopLevelVariable =
  exports.DartField =
  exports.DartUnknownMember =
  exports.DartClass =
  exports.DartTypeParameter =
    void 0;
exports.buildTypeParameters = buildTypeParameters;
const enums_1 = require("./enums");
const type_1 = require("./type");
const nodes_1 = require("./nodes");
const lexer_1 = require("./internal/lexer");
const syntax_1 = require("./internal/syntax");
const toplevel_1 = require("./internal/toplevel");
const DECL_KIND = {
  class: enums_1.DartDeclarationKind.Class,
  enum: enums_1.DartDeclarationKind.Enum,
  mixin: enums_1.DartDeclarationKind.Mixin,
  extension: enums_1.DartDeclarationKind.Extension,
  extensionType: enums_1.DartDeclarationKind.ExtensionType,
  mixinApplication: enums_1.DartDeclarationKind.MixinApplication,
};
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
// Classe
// ═══════════════════════════════════════════════════════════════════════════
/** Declaração de tipo: class, enum, mixin, extension, extension type ou mixin application. */
class DartClass extends nodes_1.DartNodeBase {
  /** @internal */
  constructor(file, raw) {
    const { tokens } = file.lexed;
    super(file, ...(0, nodes_1.tokenSpan)(file, raw.headTok, raw.endTok));
    this.membersCache = null;
    this.fieldsCache = null;
    this.enumValuesCache = null;
    this.primaryBody = null;
    this.raw = raw;
    this.kind = DECL_KIND[raw.kind];
    this.name = raw.name;
    this.isPrivate = raw.name.startsWith("_");
    this.nameLine = raw.nameTok >= 0 ? file.lineAtOffset(tokens[raw.nameTok].start) : this.line;
    this.annotations = raw.annotations.map((a) => new nodes_1.DartAnnotation(file, a));
    this.doc = (0, nodes_1.docOf)(file, raw.firstTok, raw.headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[raw.firstTok].start);
    this.modifiers = new Set(raw.modifiers);
    this.isAbstract = this.modifiers.has(enums_1.DartClassModifier.Abstract);
    this.isBase = this.modifiers.has(enums_1.DartClassModifier.Base);
    this.isInterface = this.modifiers.has(enums_1.DartClassModifier.Interface);
    this.isFinal = this.modifiers.has(enums_1.DartClassModifier.Final);
    this.isSealed = this.modifiers.has(enums_1.DartClassModifier.Sealed);
    this.isMixinClass =
      this.kind === enums_1.DartDeclarationKind.Class &&
      this.modifiers.has(enums_1.DartClassModifier.Mixin);
    this.isAugmentation = raw.isAugmentation;
    this.typeParameters = buildTypeParameters(file, raw.typeParamsOpenTok, new Set());
    this.typeParamNames = new Set(this.typeParameters.map((t) => t.name));
    this.hasBody = raw.bodyOpenTok >= 0;
    this.lineCount = this.endLine - this.line + 1;
    const clauses = readClauses(file, raw.clausesStartTok, raw.clausesEndTok, this.typeParamNames);
    if (this.kind === enums_1.DartDeclarationKind.MixinApplication) {
      this.superclass = clauses.leading[0] ?? null;
    } else {
      this.superclass = clauses.extends[0] ?? null;
    }
    this.interfaces = clauses.implements;
    this.mixins = clauses.with;
    this.onTypes = this.kind === enums_1.DartDeclarationKind.Extension ? [] : clauses.on;
    this.extendedType =
      this.kind === enums_1.DartDeclarationKind.Extension ? (clauses.on[0] ?? null) : null;
    if (this.kind === enums_1.DartDeclarationKind.ExtensionType && raw.primaryParamsOpenTok >= 0) {
      const close = (0, lexer_1.matchClose)(tokens, raw.primaryParamsOpenTok);
      const params = (0, nodes_1.buildParameters)(
        file,
        raw.primaryParamsOpenTok,
        close,
        true,
        this.typeParamNames
      );
      this.extendedType = params?.[0]?.type ?? null;
    }
    this.header = buildHeader(file, raw);
  }
  // ─── Membros ───────────────────────────────────────────────────────────
  /** Todos os membros na ordem do arquivo, inclusive os não reconhecidos (`DartUnknownMember`). */
  get members() {
    if (this.membersCache === null) this.membersCache = this.parseMembers();
    return this.membersCache;
  }
  /** Campos do corpo + parâmetros declarantes do primary constructor (veja `origin`). */
  get fields() {
    if (this.fieldsCache === null) {
      const primary = this.primaryConstructor?.declaredFields ?? [];
      this.fieldsCache = [
        ...primary,
        ...this.members.filter((m) => m.memberKind === enums_1.DartMemberKind.Field),
      ];
    }
    return this.fieldsCache;
  }
  /** Construtores: o primary (se houver) e os do corpo, inclusive factories. */
  get constructors() {
    const body = this.members.filter((m) => m.memberKind === enums_1.DartMemberKind.Constructor);
    return this.primaryConstructor ? [this.primaryConstructor, ...body] : body;
  }
  /** Métodos, getters, setters e operadores (veja `memberKind`). */
  get methods() {
    return this.members.filter(
      (m) =>
        m.memberKind === enums_1.DartMemberKind.Method ||
        m.memberKind === enums_1.DartMemberKind.Getter ||
        m.memberKind === enums_1.DartMemberKind.Setter ||
        m.memberKind === enums_1.DartMemberKind.Operator
    );
  }
  /** Trechos do corpo que o parser não reconheceu. */
  get unknownMembers() {
    return this.members.filter((m) => m.memberKind === enums_1.DartMemberKind.Unknown);
  }
  /** Todo o corpo foi reconhecido (`unknownMembers` vazio). */
  get isComplete() {
    return this.unknownMembers.length === 0;
  }
  /** Primary constructor (cabeçalho `class Foo(...)` / representação da extension type). */
  get primaryConstructor() {
    if (this.primaryCache === undefined) {
      void this.members; // lê o corpo: o bloco `this ...;` complementa o primary constructor
      this.primaryCache = this.raw.hasPrimary
        ? new DartConstructor(this.file, this, null, this.primaryBody)
        : null;
    }
    return this.primaryCache;
  }
  /** Valores do enum (vazio nas outras declarações). */
  get enumValues() {
    if (this.enumValuesCache === null) void this.members;
    return this.enumValuesCache ?? [];
  }
  hasAnnotation(name) {
    return this.annotations.some((a) => a.name === name);
  }
  isIgnoredBy(plugin, linesAbove = 5) {
    return (0, nodes_1.ignoredBy)(
      this.file,
      this.raw.firstTok,
      this.raw.headTok,
      plugin,
      linesAbove
    );
  }
  /** `superclass.name` está em `names` (`State<Foo<T>>` casa com `"State"`). */
  extendsAny(...names) {
    return (
      this.superclass?.name !== null &&
      this.superclass?.name !== undefined &&
      names.includes(this.superclass.name)
    );
  }
  /** Algum tipo de `implements` tem o nome em `names`. */
  implementsAny(...names) {
    return this.interfaces.some((t) => t.name !== null && names.includes(t.name));
  }
  /** Algum tipo de `with` tem o nome em `names`. */
  mixesIn(...names) {
    return this.mixins.some((t) => t.name !== null && names.includes(t.name));
  }
  findField(name) {
    return this.fields.find((f) => f.name === name) ?? null;
  }
  findMethod(name, kind) {
    return (
      this.methods.find((m) => m.name === name && (kind === undefined || m.memberKind === kind)) ??
      null
    );
  }
  /** Construtor pelo nome (`null` = construtor sem nome). */
  findConstructor(constructorName) {
    return this.constructors.find((c) => c.constructorName === constructorName) ?? null;
  }
  /**
   * Existe membro (campo, método, getter, setter, construtor) com o nome?
   * `Absent` só quando a classe foi lida por inteiro; senão `Unknown`.
   */
  hasMember(name, kind) {
    const all = [
      ...this.fields,
      ...this.methods,
      ...this.constructors.map((c) => ({
        name: c.constructorName ?? this.name,
        memberKind: c.memberKind,
      })),
    ];
    if (all.some((m) => m.name === name && (kind === undefined || m.memberKind === kind)))
      return enums_1.Presence.Present;
    return this.isComplete ? enums_1.Presence.Absent : enums_1.Presence.Unknown;
  }
  /** Linha do arquivo dentro da classe? */
  containsLine(line) {
    return line >= this.line && line <= this.endLine;
  }
  parseMembers() {
    const { tokens } = this.file.lexed;
    const raw = this.raw;
    if (raw.bodyOpenTok < 0) return [];
    const limit = raw.endTok;
    let p = raw.bodyOpenTok + 1;
    const members = [];
    if (raw.kind === "enum") {
      const semi = (0, lexer_1.findAtDepth0)(tokens, p, limit, [";"]);
      const valuesEnd = semi < 0 ? limit - 1 : semi - 1;
      this.enumValuesCache = (0, lexer_1.splitTopLevelCommas)(tokens, p, valuesEnd).map(
        ([a, b]) => new DartEnumValue(this.file, this, a, b)
      );
      p = semi < 0 ? limit : semi + 1;
    }
    while (p < limit) {
      if ((0, lexer_1.isPunct)(tokens[p], ";")) {
        p++;
        continue;
      }
      // Bloco do primary constructor no corpo: `this;`, `this : ...;`, `this { ... }`
      let q = p;
      while ((0, lexer_1.isPunct)(tokens[q], "@")) {
        const close = (0, lexer_1.isPunct)(tokens[q + 2], "(")
          ? (0, lexer_1.matchClose)(tokens, q + 2)
          : -1;
        q = close >= 0 ? close + 1 : q + 2;
        while ((0, lexer_1.isPunct)(tokens[q], ".") && (0, lexer_1.isIdent)(tokens[q + 1])) q += 2;
      }
      if (
        raw.hasPrimary &&
        (0, lexer_1.isIdent)(tokens[q], "this") &&
        ((0, lexer_1.isPunct)(tokens[q + 1], ";") ||
          (0, lexer_1.isPunct)(tokens[q + 1], ":") ||
          (0, lexer_1.isPunct)(tokens[q + 1], "{"))
      ) {
        const colonTok = (0, lexer_1.isPunct)(tokens[q + 1], ":") ? q + 1 : -1;
        let end = -1;
        let bodyOpenTok = -1;
        if ((0, lexer_1.isPunct)(tokens[q + 1], ";")) end = q + 1;
        else {
          const stop = (0, lexer_1.findAtDepth0)(tokens, q + 1, limit, [";", "{"]);
          if (stop >= 0 && (0, lexer_1.isPunct)(tokens[stop], "{")) {
            bodyOpenTok = stop;
            end = (0, lexer_1.matchClose)(tokens, stop, limit);
          } else end = stop;
        }
        if (end >= 0) {
          this.primaryBody = { firstTok: p, startTok: q, endTok: end, colonTok, bodyOpenTok };
          p = end + 1;
          continue;
        }
      }
      const member = (0, syntax_1.parseMember)(this.file.lexed, p, limit, raw.name || "\0");
      if (member === null) {
        const end = Math.min((0, toplevel_1.skipUnknown)(this.file.lexed, p, limit), limit - 1);
        members.push(new DartUnknownMember(this.file, this, p, end));
        p = end + 1;
        continue;
      }
      if (member.kind === "field") {
        for (const v of member.vars)
          members.push(
            new DartField(
              this.file,
              this,
              fieldInit(member, v.nameTok, v.initStartTok, v.initEndTok, this.typeParamNames),
              enums_1.DartFieldOrigin.Body,
              null
            )
          );
      } else if (member.kind === "constructor") {
        members.push(new DartConstructor(this.file, this, member, null));
      } else {
        members.push(new DartMethod(this.file, this, member, this.typeParamNames));
      }
      p = member.endTok + 1;
    }
    return members;
  }
}
exports.DartClass = DartClass;
function fieldInit(member, nameTok, initStartTok, initEndTok, typeParams) {
  return {
    firstTok: member.startTok,
    headTok: member.headTok,
    nameTok,
    endTok: member.endTok,
    modifiers: member.modifiers,
    typeStartTok: member.typeStartTok,
    typeEndTok: member.typeEndTok,
    initStartTok,
    initEndTok,
    annotations: member.annotations,
    typeParams,
  };
}
/** Lê `extends A with B, C implements D on E` nos tokens `[from, to]`. */
function readClauses(file, from, to, typeParams) {
  const { tokens } = file.lexed;
  const result = { leading: [], extends: [], with: [], implements: [], on: [] };
  if (to < from) return result;
  const keywords = new Set(["extends", "with", "implements", "on"]);
  let current = "leading";
  let start = from;
  const flush = (end) => {
    if (end < start) return;
    for (const [a, b] of (0, lexer_1.splitTopLevelCommas)(tokens, start, end)) {
      const type = (0, type_1.parseDartType)(file.lexed, a, b, typeParams);
      if (type) result[current].push(type);
    }
  };
  let j = from;
  while (j <= to) {
    const t = tokens[j];
    if (t.kind === "punct" && (t.value === "(" || t.value === "[" || t.value === "{")) {
      const close = (0, lexer_1.matchClose)(tokens, j, to + 1);
      j = close < 0 ? to + 1 : close + 1;
      continue;
    }
    if ((0, lexer_1.isPunct)(t, "<") && j > from && (0, lexer_1.isIdent)(tokens[j - 1])) {
      const close = (0, lexer_1.matchTypeArgs)(tokens, j, to + 1);
      if (close > 0) {
        j = close + 1;
        continue;
      }
    }
    if (t.kind === "ident" && keywords.has(t.value) && !(0, lexer_1.isPunct)(tokens[j - 1], ".")) {
      flush(j - 1);
      current = t.value;
      start = j + 1;
    }
    j++;
  }
  flush(to);
  return result;
}
function buildHeader(file, raw) {
  const { tokens } = file.lexed;
  if (raw.kind === "mixinApplication")
    return (0, lexer_1.joinTokens)(file.lexed, raw.headTok, raw.endTok);
  const keyword = raw.kind === "extensionType" ? "extension type" : raw.kind;
  let text = [...raw.modifiers, keyword].join(" ");
  if (raw.name) text += ` ${raw.name}`;
  if (raw.typeParamsOpenTok >= 0) {
    const close = (0, lexer_1.matchTypeArgs)(tokens, raw.typeParamsOpenTok, tokens.length);
    if (close > 0) text += (0, lexer_1.joinTokens)(file.lexed, raw.typeParamsOpenTok, close);
  }
  if (raw.kind === "extensionType" && raw.primaryParamsOpenTok >= 0) {
    const close = (0, lexer_1.matchClose)(tokens, raw.primaryParamsOpenTok);
    if (close > 0) text += (0, lexer_1.joinTokens)(file.lexed, raw.primaryParamsOpenTok, close);
  }
  if (raw.clausesEndTok >= raw.clausesStartTok) {
    text += ` ${(0, lexer_1.joinTokens)(file.lexed, raw.clausesStartTok, raw.clausesEndTok)}`;
  }
  return `${text} {`;
}
// ═══════════════════════════════════════════════════════════════════════════
// Membros
// ═══════════════════════════════════════════════════════════════════════════
/** Trecho do corpo que o parser não reconheceu: o plugin deve pular. */
class DartUnknownMember extends nodes_1.DartNodeBase {
  /** @internal */
  constructor(file, owner, fromTok, toTok) {
    super(file, ...(0, nodes_1.tokenSpan)(file, fromTok, Math.max(fromTok, toTok)));
    this.memberKind = enums_1.DartMemberKind.Unknown;
    this.owner = owner;
  }
  /** @internal */
  expressionRanges() {
    return [];
  }
}
exports.DartUnknownMember = DartUnknownMember;
/** Campo de classe (corpo) ou parâmetro declarante do primary constructor. */
class DartField extends nodes_1.DartVariable {
  /** @internal */
  constructor(file, owner, init, origin, declaringParameter) {
    super(file, init);
    this.memberKind = enums_1.DartMemberKind.Field;
    this.owner = owner;
    this.origin = origin;
    this.declaringParameter = declaringParameter;
    this.isOverride = this.hasAnnotation("override");
  }
  /** @internal */
  expressionRanges() {
    return this.initializer ? [[this.initializer.fromTok, this.initializer.toTok]] : [];
  }
}
exports.DartField = DartField;
/** Variável de nível superior. */
class DartTopLevelVariable extends nodes_1.DartVariable {
  /** @internal */
  constructor(file, member, nameTok, initStartTok, initEndTok) {
    super(file, fieldInit(member, nameTok, initStartTok, initEndTok, new Set()));
  }
  /** @internal */
  expressionRanges() {
    return this.initializer ? [[this.initializer.fromTok, this.initializer.toTok]] : [];
  }
}
exports.DartTopLevelVariable = DartTopLevelVariable;
/** Função de nível superior (e base de `DartMethod`). */
class DartFunction extends nodes_1.DartNodeBase {
  /** @internal */
  constructor(file, raw, outerTypeParams) {
    const { tokens } = file.lexed;
    super(file, ...(0, nodes_1.tokenSpan)(file, raw.headTok, raw.endTok));
    this.rawMember = raw;
    const kindMap = {
      method: enums_1.DartMemberKind.Method,
      getter: enums_1.DartMemberKind.Getter,
      setter: enums_1.DartMemberKind.Setter,
      operator: enums_1.DartMemberKind.Operator,
    };
    this.memberKind = kindMap[raw.memberKind];
    const opEnd = raw.paramsOpenTok >= 0 ? raw.paramsOpenTok - 1 : raw.nameTok;
    this.name =
      raw.name ??
      (raw.memberKind === "operator"
        ? (0, lexer_1.joinTokens)(file.lexed, raw.nameTok, Math.max(raw.nameTok, opEnd))
        : "");
    this.isPrivate = this.name.startsWith("_");
    this.nameLine = file.lineAtOffset(tokens[raw.nameTok].start);
    this.annotations = raw.annotations.map((a) => new nodes_1.DartAnnotation(file, a));
    this.doc = (0, nodes_1.docOf)(file, raw.startTok, raw.headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[raw.startTok].start);
    this.typeParameters = buildTypeParameters(file, raw.typeParamsOpenTok, outerTypeParams);
    const typeParams = new Set([...outerTypeParams, ...this.typeParameters.map((t) => t.name)]);
    const returnEnd = raw.memberKind === "method" ? raw.nameTok - 1 : raw.nameTok - 2; // antes de get/set/operator
    this.returnType =
      returnEnd >= raw.declTok
        ? (0, type_1.parseDartType)(file.lexed, raw.declTok, returnEnd, typeParams)
        : null;
    const params =
      raw.paramsOpenTok >= 0
        ? (0, nodes_1.buildParameters)(
            file,
            raw.paramsOpenTok,
            raw.paramsCloseTok,
            false,
            typeParams
          )
        : [];
    this.parameters = params ?? [];
    this.isComplete = params !== null;
    const afterParams = raw.paramsCloseTok >= 0 ? raw.paramsCloseTok + 1 : raw.nameTok + 1;
    this.asyncKind = (0, nodes_1.readAsyncMarker)(tokens, afterParams)[0];
    this.isAsync =
      this.asyncKind === enums_1.DartAsyncKind.Async ||
      this.asyncKind === enums_1.DartAsyncKind.AsyncStar;
    this.isGenerator =
      this.asyncKind === enums_1.DartAsyncKind.SyncStar ||
      this.asyncKind === enums_1.DartAsyncKind.AsyncStar;
    this.isExternal = raw.modifiers.has("external");
    this.bodyKind = (0, lexer_1.isPunct)(tokens[raw.bodyTok], "{")
      ? enums_1.DartBodyKind.Block
      : (0, lexer_1.isPunct)(tokens[raw.bodyTok], "=>")
        ? enums_1.DartBodyKind.Arrow
        : enums_1.DartBodyKind.None;
    this.signature =
      raw.bodyTok - 1 >= raw.headTok
        ? (0, lexer_1.joinTokens)(file.lexed, raw.headTok, raw.bodyTok - 1)
        : "";
  }
  /** Corpo (calculado no primeiro acesso). `null` quando `bodyKind === None`. */
  get body() {
    if (this.bodyCache === undefined) {
      const raw = this.rawMember;
      this.bodyCache =
        this.bodyKind === enums_1.DartBodyKind.None
          ? null
          : new nodes_1.DartBody(this.file, this.bodyKind, raw.bodyTok, raw.endTok, this.asyncKind);
    }
    return this.bodyCache;
  }
  /** Quantidade de linhas, da assinatura ao fim do corpo. */
  get lineCount() {
    return this.endLine - this.line + 1;
  }
  /** @internal */
  expressionRanges() {
    const raw = this.rawMember;
    const ranges = [];
    if (raw.paramsOpenTok >= 0) ranges.push([raw.paramsOpenTok, raw.paramsCloseTok]);
    if (this.bodyKind !== enums_1.DartBodyKind.None) ranges.push([raw.bodyTok, raw.endTok]);
    return ranges;
  }
  hasAnnotation(name) {
    return this.annotations.some((a) => a.name === name);
  }
  isIgnoredBy(plugin, linesAbove = 5) {
    return (0, nodes_1.ignoredBy)(
      this.file,
      this.rawMember.startTok,
      this.rawMember.headTok,
      plugin,
      linesAbove
    );
  }
}
exports.DartFunction = DartFunction;
/** Método, getter, setter ou operador de uma classe. */
class DartMethod extends DartFunction {
  /** @internal */
  constructor(file, owner, raw, typeParams) {
    super(file, raw, typeParams);
    this.owner = owner;
    this.isStatic = raw.modifiers.has("static");
    this.isAbstract = this.bodyKind === enums_1.DartBodyKind.None && !this.isExternal;
    this.isOverride = this.hasAnnotation("override");
  }
}
exports.DartMethod = DartMethod;
/** Elemento do initializer list: `_x = x`, `super(...)`, `assert(...)`, `this.other(...)`. */
class DartInitializer extends nodes_1.DartNodeBase {
  /** @internal */
  constructor(file, raw) {
    super(file, ...(0, nodes_1.tokenSpan)(file, raw.startTok, raw.endTok));
    this.fieldName = raw.fieldName;
    this.isSuperCall = raw.kind === "super";
    this.isAssert = raw.kind === "assert";
    this.isRedirect = raw.kind === "redirect";
    this.value = new nodes_1.DartExpression(
      file,
      raw.kind === "field" ? raw.exprStartTok : raw.startTok,
      raw.endTok
    );
  }
}
exports.DartInitializer = DartInitializer;
/** Construtor: generativo, factory, redirecionante ou o primary constructor (Dart 3.13). */
class DartConstructor extends nodes_1.DartNodeBase {
  /**
   * @internal `raw === null`: primary constructor da classe `owner`
   * (`primaryBody`: o bloco `this ...` do corpo, se houver).
   */
  constructor(file, owner, raw, primaryBody) {
    super(file, ...DartConstructor.span(file, owner, raw));
    this.memberKind = enums_1.DartMemberKind.Constructor;
    this.declaredFieldsCache = null;
    const { tokens } = file.lexed;
    const typeParams = new Set(owner.typeParameters.map((t) => t.name));
    this.owner = owner;
    if (raw === null) {
      const decl = owner.raw;
      const close = (0, lexer_1.matchClose)(tokens, decl.primaryParamsOpenTok);
      this.isPrimary = true;
      this.constructorName = decl.primaryName;
      this.name = decl.primaryName ? `${owner.name}.${decl.primaryName}` : owner.name;
      this.isConst = decl.primaryIsConst;
      this.isFactory = false;
      this.isExternal = false;
      const params = (0, nodes_1.buildParameters)(
        file,
        decl.primaryParamsOpenTok,
        close,
        true,
        typeParams
      );
      this.parameters = params ?? [];
      this.isComplete = params !== null;
      this.firstTok = primaryBody?.firstTok ?? decl.headTok;
      this.headTok = primaryBody?.startTok ?? decl.headTok;
      this.annotations = [];
      this.doc = primaryBody
        ? (0, nodes_1.docOf)(file, primaryBody.firstTok, primaryBody.startTok)
        : null;
      this.nameLine = this.line;
      this.startLine = this.line;
      const inits = [];
      if (primaryBody && primaryBody.colonTok >= 0) {
        const initEnd =
          (primaryBody.bodyOpenTok >= 0 ? primaryBody.bodyOpenTok : primaryBody.endTok) - 1;
        for (const [a, b] of (0, lexer_1.splitTopLevelCommas)(
          tokens,
          primaryBody.colonTok + 1,
          initEnd
        )) {
          inits.push(new DartInitializer(file, classifyInit(tokens, a, b)));
        }
      }
      this.initializers = inits;
      this.isRedirecting = inits.some((i) => i.isRedirect);
      this.redirectTarget = null;
      this.bodyRange =
        primaryBody && primaryBody.bodyOpenTok >= 0
          ? [primaryBody.bodyOpenTok, primaryBody.endTok, enums_1.DartBodyKind.Block]
          : null;
      this.lineCount = this.endLine - this.line + 1;
      this.nameTokIndex = decl.nameTok;
      this.ranges = [[decl.primaryParamsOpenTok, close]];
      if (primaryBody && primaryBody.colonTok >= 0) {
        this.ranges.push([primaryBody.colonTok + 1, primaryBody.endTok]);
      } else if (primaryBody && primaryBody.bodyOpenTok >= 0) {
        this.ranges.push([primaryBody.bodyOpenTok, primaryBody.endTok]);
      }
      this.isPrivate = (decl.primaryName ?? "").startsWith("_");
      return;
    }
    this.isPrimary = false;
    this.firstTok = raw.startTok;
    this.headTok = raw.headTok;
    this.constructorName = raw.name === "new" ? null : raw.name;
    this.name = this.constructorName ? `${owner.name}.${this.constructorName}` : owner.name;
    this.isPrivate = (this.constructorName ?? "").startsWith("_");
    this.isConst = raw.isConst;
    this.isFactory = raw.isFactory;
    this.isExternal = raw.isExternal;
    this.annotations = raw.annotations.map((a) => new nodes_1.DartAnnotation(file, a));
    this.doc = (0, nodes_1.docOf)(file, raw.startTok, raw.headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[raw.startTok].start);
    const nameTok = raw.paramsOpenTok - 1;
    this.nameTokIndex = nameTok;
    this.ranges = [[raw.paramsOpenTok, raw.endTok]];
    this.nameLine = file.lineAtOffset(tokens[nameTok].start);
    const params =
      raw.params === null
        ? null
        : (0, nodes_1.buildParameters)(
            file,
            raw.paramsOpenTok,
            raw.paramsCloseTok,
            false,
            typeParams
          );
    this.parameters = params ?? [];
    this.isComplete = params !== null;
    this.initializers = raw.initializers.map((i) => new DartInitializer(file, i));
    let redirectTarget = null;
    let bodyRange = null;
    if (raw.isFactory) {
      const after = raw.paramsCloseTok + 1;
      const [, k] = (0, nodes_1.readAsyncMarker)(tokens, after);
      if ((0, lexer_1.isPunct)(tokens[k], "=")) {
        redirectTarget = (0, lexer_1.joinTokens)(file.lexed, k + 1, raw.endTok - 1);
      } else if ((0, lexer_1.isPunct)(tokens[k], "=>")) {
        bodyRange = [k, raw.endTok, enums_1.DartBodyKind.Arrow];
      } else if ((0, lexer_1.isPunct)(tokens[k], "{")) {
        bodyRange = [k, raw.endTok, enums_1.DartBodyKind.Block];
      }
    } else if (raw.bodyOpenTok >= 0) {
      bodyRange = [raw.bodyOpenTok, raw.bodyCloseTok, enums_1.DartBodyKind.Block];
    }
    this.redirectTarget = redirectTarget;
    this.isRedirecting = raw.isRedirecting || redirectTarget !== null;
    this.bodyRange = bodyRange;
    this.lineCount = this.endLine - this.line + 1;
  }
  static span(file, owner, raw) {
    if (raw !== null) return (0, nodes_1.tokenSpan)(file, raw.headTok, raw.endTok);
    const decl = owner.raw;
    const close = (0, lexer_1.matchClose)(file.lexed.tokens, decl.primaryParamsOpenTok);
    return (0, nodes_1.tokenSpan)(
      file,
      decl.nameTok >= 0 ? decl.nameTok : decl.headTok,
      Math.max(close, decl.headTok)
    );
  }
  /** Corpo `{ }` ou `=>` (factory); `null` sem corpo. */
  get body() {
    if (this.bodyCache === undefined) {
      this.bodyCache = this.bodyRange
        ? new nodes_1.DartBody(
            this.file,
            this.bodyRange[2],
            this.bodyRange[0],
            this.bodyRange[1],
            enums_1.DartAsyncKind.Sync
          )
        : null;
    }
    return this.bodyCache;
  }
  /** @internal */
  expressionRanges() {
    return this.ranges;
  }
  /** Campos declarados pelos parâmetros `final`/`var` do primary constructor. */
  get declaredFields() {
    if (!this.isPrimary) return [];
    if (this.declaredFieldsCache !== null) return this.declaredFieldsCache;
    this.declaredFieldsCache = this.parameters
      .filter((p) => p.source === enums_1.DartParameterSource.Declaring)
      .map((p) => {
        const raw = p.rawInfo;
        const modifiers = new Set();
        if (raw.modifier) modifiers.add(raw.modifier);
        if (raw.isCovariant) modifiers.add("covariant");
        const typeParams = new Set(this.owner.typeParameters.map((t) => t.name));
        return new DartField(
          this.file,
          this.owner,
          {
            firstTok: raw.startTok,
            headTok:
              raw.annotations.length > 0
                ? raw.annotations[raw.annotations.length - 1].endTok + 1
                : raw.startTok,
            nameTok: raw.nameTok,
            endTok: raw.defaultStartTok >= 0 ? raw.defaultStartTok - 2 : raw.endTok,
            modifiers,
            typeStartTok: raw.typeStartTok,
            typeEndTok: raw.typeEndTok,
            initStartTok: -1,
            initEndTok: -1,
            annotations: raw.annotations,
            typeParams,
          },
          enums_1.DartFieldOrigin.PrimaryConstructor,
          p
        );
      });
    return this.declaredFieldsCache;
  }
  hasAnnotation(name) {
    return this.annotations.some((a) => a.name === name);
  }
  isIgnoredBy(plugin, linesAbove = 5) {
    return (0, nodes_1.ignoredBy)(this.file, this.firstTok, this.headTok, plugin, linesAbove);
  }
}
exports.DartConstructor = DartConstructor;
/** Classifica um elemento de initializer list (mesma regra do parser de construtores). */
function classifyInit(tokens, from, to) {
  const t = tokens[from];
  const isI = (k, v) => tokens[k]?.kind === "ident" && tokens[k].value === v;
  const isP = (k, v) => tokens[k]?.kind === "punct" && tokens[k].value === v;
  if (isI(from, "super"))
    return { kind: "super", startTok: from, endTok: to, fieldName: null, exprStartTok: from };
  if (isI(from, "assert"))
    return { kind: "assert", startTok: from, endTok: to, fieldName: null, exprStartTok: from };
  let nameTok = from;
  if (t.value === "this" && isP(from + 1, ".")) nameTok = from + 2;
  if (tokens[nameTok]?.kind === "ident" && isP(nameTok + 1, "=")) {
    return {
      kind: "field",
      startTok: from,
      endTok: to,
      fieldName: tokens[nameTok].value,
      exprStartTok: nameTok + 2,
    };
  }
  if (t.value === "this")
    return { kind: "redirect", startTok: from, endTok: to, fieldName: null, exprStartTok: from };
  return { kind: "unknown", startTok: from, endTok: to, fieldName: null, exprStartTok: from };
}
/** Valor de enum: `active('A')`, `@Deprecated('x') legacy`. */
class DartEnumValue extends nodes_1.DartNodeBase {
  /** @internal */
  constructor(file, owner, from, to) {
    const { tokens } = file.lexed;
    let head = from;
    const annotations = [];
    while ((0, lexer_1.isPunct)(tokens[head], "@") && head <= to) {
      const ann = (0, syntax_1.parseAnnotation)(tokens, head);
      if (ann === null || ann.endTok >= to) break;
      annotations.push(new nodes_1.DartAnnotation(file, ann));
      head = ann.endTok + 1;
    }
    super(file, ...(0, nodes_1.tokenSpan)(file, Math.min(head, to), to));
    this.owner = owner;
    this.firstTok = from;
    this.headTok = Math.min(head, to);
    this.name = tokens[this.headTok].value;
    this.isPrivate = this.name.startsWith("_");
    this.nameLine = this.line;
    this.annotations = annotations;
    this.doc = (0, nodes_1.docOf)(file, from, this.headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[from].start);
    this.headTokIndex = this.headTok;
    this.endTokIndex = to;
    this.argsOpen = (0, lexer_1.findAtDepth0)(tokens, this.headTok, to + 1, ["("]);
    this.argsClose =
      this.argsOpen >= 0 ? (0, lexer_1.matchClose)(tokens, this.argsOpen, to + 1) : -1;
  }
  /** Argumentos do construtor do enum: `active('A')` → `['A']`. */
  get arguments() {
    if (this.argsOpen < 0 || this.argsClose < 0) return [];
    return (0, nodes_1.buildArguments)(this.file, this.argsOpen, this.argsClose);
  }
  /** @internal */
  expressionRanges() {
    return this.argsOpen >= 0 && this.argsClose >= 0 ? [[this.argsOpen, this.argsClose]] : [];
  }
  hasAnnotation(name) {
    return this.annotations.some((a) => a.name === name);
  }
  isIgnoredBy(plugin, linesAbove = 5) {
    return (0, nodes_1.ignoredBy)(this.file, this.firstTok, this.headTok, plugin, linesAbove);
  }
}
exports.DartEnumValue = DartEnumValue;
/** `typedef Callback = void Function(int);` */
class DartTypedef extends nodes_1.DartNodeBase {
  /** @internal */
  constructor(file, raw) {
    const { tokens } = file.lexed;
    super(file, ...(0, nodes_1.tokenSpan)(file, raw.headTok, raw.endTok));
    this.raw = raw;
    this.nameTokIndex = raw.nameTok;
    this.name = raw.name;
    this.isPrivate = raw.name.startsWith("_");
    this.nameLine = file.lineAtOffset(tokens[raw.nameTok].start);
    this.annotations = raw.annotations.map((a) => new nodes_1.DartAnnotation(file, a));
    this.doc = (0, nodes_1.docOf)(file, raw.firstTok, raw.headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[raw.firstTok].start);
    this.typeParameters = buildTypeParameters(file, raw.typeParamsOpenTok, new Set());
    this.aliasedType =
      raw.aliasStartTok >= 0
        ? (0, type_1.parseDartType)(
            file.lexed,
            raw.aliasStartTok,
            raw.aliasEndTok,
            new Set(this.typeParameters.map((t) => t.name))
          )
        : null;
  }
  hasAnnotation(name) {
    return this.annotations.some((a) => a.name === name);
  }
  isIgnoredBy(plugin, linesAbove = 5) {
    return (0, nodes_1.ignoredBy)(
      this.file,
      this.raw.firstTok,
      this.raw.headTok,
      plugin,
      linesAbove
    );
  }
}
exports.DartTypedef = DartTypedef;
/** `import`, `export`, `part`, `part of` ou `library`. */
class DartDirective extends nodes_1.DartNodeBase {
  /** @internal */
  constructor(file, raw) {
    super(file, ...(0, nodes_1.tokenSpan)(file, raw.startTok, raw.endTok));
    const { tokens } = file.lexed;
    const kinds = {
      library: enums_1.DartDirectiveKind.Library,
      import: enums_1.DartDirectiveKind.Import,
      export: enums_1.DartDirectiveKind.Export,
      part: enums_1.DartDirectiveKind.Part,
      partOf: enums_1.DartDirectiveKind.PartOf,
    };
    this.kind = kinds[raw.kind];
    let k = raw.startTok + (raw.kind === "partOf" ? 2 : 1);
    let uri = "";
    if (tokens[k]?.kind === "string") {
      uri = tokens[k].value.replace(/^r/, "").slice(1, -1);
      k++;
    } else {
      let end = k;
      while (
        end < raw.endTok &&
        ((0, lexer_1.isIdent)(tokens[end]) || (0, lexer_1.isPunct)(tokens[end], "."))
      )
        end++;
      uri = end > k ? (0, lexer_1.joinTokens)(file.lexed, k, end - 1) : "";
      k = end;
    }
    this.uri = uri;
    const isUriDirective =
      raw.kind === "import" ||
      raw.kind === "export" ||
      raw.kind === "part" ||
      (raw.kind === "partOf" && tokens[raw.startTok + 2]?.kind === "string");
    this.uriKind = !isUriDirective
      ? null
      : uri.startsWith("dart:")
        ? enums_1.DartUriKind.Dart
        : uri.startsWith("package:")
          ? enums_1.DartUriKind.Package
          : enums_1.DartUriKind.Relative;
    const pkg = /^package:([^/]+)\/(.*)$/.exec(uri);
    this.packageName = pkg ? pkg[1] : null;
    this.packagePath = pkg ? pkg[2] : null;
    let prefix = null;
    const show = [];
    const hide = [];
    let deferred = false;
    let configurations = false;
    let mode = null;
    for (let j = k; j < raw.endTok; j++) {
      const t = tokens[j];
      if ((0, lexer_1.isIdent)(t, "if") && (0, lexer_1.isPunct)(tokens[j + 1], "(")) {
        configurations = true;
        const close = (0, lexer_1.matchClose)(tokens, j + 1, raw.endTok);
        j = close < 0 ? j : close + 1;
        continue;
      }
      if ((0, lexer_1.isIdent)(t, "deferred")) deferred = true;
      else if ((0, lexer_1.isIdent)(t, "as") && (0, lexer_1.isIdent)(tokens[j + 1])) {
        prefix = tokens[j + 1].value;
        j++;
      } else if ((0, lexer_1.isIdent)(t, "show")) mode = "show";
      else if ((0, lexer_1.isIdent)(t, "hide")) mode = "hide";
      else if ((0, lexer_1.isIdent)(t) && mode === "show") show.push(t.value);
      else if ((0, lexer_1.isIdent)(t) && mode === "hide") hide.push(t.value);
    }
    this.prefix = prefix;
    this.show = show;
    this.hide = hide;
    this.isDeferred = deferred;
    this.hasConfigurations = configurations;
  }
}
exports.DartDirective = DartDirective;
