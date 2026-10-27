/**
 * Declarações do modelo Dart: classes (class, enum, mixin, extension,
 * extension type), seus membros, funções e variáveis de nível superior,
 * typedefs e diretivas.
 */
import type { DartFile } from "./file";
import {
  DartAsyncKind,
  DartBodyKind,
  DartClassModifier,
  DartDeclarationKind,
  DartDirectiveKind,
  DartFieldOrigin,
  DartMemberKind,
  DartParameterSource,
  DartUriKind,
  Presence,
} from "./enums";
import { DartType, functionTypeFromSignature, parseDartType } from "./type";
import {
  DartAnnotation,
  DartArgument,
  DartBody,
  DartCall,
  DartDeclaration,
  DartDoc,
  DartExpression,
  DartNodeBase,
  DartParameter,
  DartVariable,
  VariableInit,
  DartTypeParameter,
  buildArguments,
  buildParameters,
  buildTypeParameters,
  docOf,
  ignoredBy,
  readAsyncMarker,
  tokenSpan,
} from "./nodes";
import {
  findAtDepth0,
  isIdent,
  isPunct,
  joinTokens,
  matchClose,
  matchTypeArgs,
  splitTopLevelCommas,
} from "./internal/lexer";
import {
  ConstructorMember,
  FieldMember,
  InitializerElement,
  OtherMember,
  parseAnnotation,
  parseMember,
} from "./internal/syntax";
import { RawDirective, RawTypeDecl, RawTypedef, skipUnknown } from "./internal/toplevel";

const DECL_KIND: Record<RawTypeDecl["kind"], DartDeclarationKind> = {
  class: DartDeclarationKind.Class,
  enum: DartDeclarationKind.Enum,
  mixin: DartDeclarationKind.Mixin,
  extension: DartDeclarationKind.Extension,
  extensionType: DartDeclarationKind.ExtensionType,
  mixinApplication: DartDeclarationKind.MixinApplication,
};

/** Membro de classe: `memberKind` discrimina a união `DartMember`. */
export interface DartClassMember {
  readonly memberKind: DartMemberKind;
  readonly owner: DartClass;
  readonly line: number;
  readonly endLine: number;
  readonly startOffset: number;
  /** @internal Faixas de tokens com expressões (inicializador, parâmetros, corpo). */
  expressionRanges(): [number, number][];
}

export type DartMember = DartField | DartConstructor | DartMethod | DartUnknownMember;

// ═══════════════════════════════════════════════════════════════════════════
// Classe
// ═══════════════════════════════════════════════════════════════════════════

/** Declaração de tipo: class, enum, mixin, extension, extension type ou mixin application. */
export class DartClass extends DartNodeBase implements DartDeclaration {
  readonly kind: DartDeclarationKind;
  /** `""` na extension sem nome. */
  readonly name: string;
  readonly isPrivate: boolean;
  readonly nameLine: number;
  readonly startLine: number;
  readonly annotations: readonly DartAnnotation[];
  readonly doc: DartDoc | null;

  /** Modificadores escritos (`abstract`, `base`, `interface`, `final`, `sealed`, `mixin`). */
  readonly modifiers: ReadonlySet<DartClassModifier>;
  readonly isAbstract: boolean;
  readonly isBase: boolean;
  readonly isInterface: boolean;
  readonly isFinal: boolean;
  readonly isSealed: boolean;
  /** `mixin class` */
  readonly isMixinClass: boolean;
  /** `augment class ...` */
  readonly isAugmentation: boolean;

  readonly typeParameters: readonly DartTypeParameter[];
  /** `extends` (no mixin application, o tipo antes do `with`). */
  readonly superclass: DartType | null;
  /** `implements` */
  readonly interfaces: readonly DartType[];
  /** `with` */
  readonly mixins: readonly DartType[];
  /** `mixin M on A, B` */
  readonly onTypes: readonly DartType[];
  /** `extension E on T` → `T`; `extension type E(int x)` → `int`. */
  readonly extendedType: DartType | null;
  /** Cabeçalho clássico em uma linha, sem o primary constructor: `final class Foo<T> extends Bar {`. */
  readonly header: string;
  /** Tem `{ ... }` (mixin application e `class X(...);` não têm). */
  readonly hasBody: boolean;
  readonly lineCount: number;

  /** @internal */
  readonly raw: RawTypeDecl;
  private readonly typeParamNames: ReadonlySet<string>;
  private membersCache: DartMember[] | null = null;
  private fieldsCache: DartField[] | null = null;
  private primaryCache: DartConstructor | null | undefined;
  private enumValuesCache: DartEnumValue[] | null = null;
  private primaryBody: {
    firstTok: number;
    startTok: number;
    endTok: number;
    colonTok: number;
    bodyOpenTok: number;
  } | null = null;

  /** @internal */
  constructor(file: DartFile, raw: RawTypeDecl) {
    const { tokens } = file.lexed;
    super(file, ...tokenSpan(file, raw.headTok, raw.endTok));
    this.raw = raw;
    this.kind = DECL_KIND[raw.kind];
    this.name = raw.name;
    this.isPrivate = raw.name.startsWith("_");
    this.nameLine = raw.nameTok >= 0 ? file.lineAtOffset(tokens[raw.nameTok].start) : this.line;
    this.annotations = raw.annotations.map((a) => new DartAnnotation(file, a));
    this.doc = docOf(file, raw.firstTok, raw.headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[raw.firstTok].start);
    this.modifiers = new Set(raw.modifiers as DartClassModifier[]);
    this.isAbstract = this.modifiers.has(DartClassModifier.Abstract);
    this.isBase = this.modifiers.has(DartClassModifier.Base);
    this.isInterface = this.modifiers.has(DartClassModifier.Interface);
    this.isFinal = this.modifiers.has(DartClassModifier.Final);
    this.isSealed = this.modifiers.has(DartClassModifier.Sealed);
    this.isMixinClass =
      this.kind === DartDeclarationKind.Class && this.modifiers.has(DartClassModifier.Mixin);
    this.isAugmentation = raw.isAugmentation;
    this.typeParameters = buildTypeParameters(file, raw.typeParamsOpenTok, new Set());
    this.typeParamNames = new Set(this.typeParameters.map((t) => t.name));
    this.hasBody = raw.bodyOpenTok >= 0;
    this.lineCount = this.endLine - this.line + 1;

    const clauses = readClauses(file, raw.clausesStartTok, raw.clausesEndTok, this.typeParamNames);
    if (this.kind === DartDeclarationKind.MixinApplication) {
      this.superclass = clauses.leading[0] ?? null;
    } else {
      this.superclass = clauses.extends[0] ?? null;
    }
    this.interfaces = clauses.implements;
    this.mixins = clauses.with;
    this.onTypes = this.kind === DartDeclarationKind.Extension ? [] : clauses.on;
    this.extendedType =
      this.kind === DartDeclarationKind.Extension ? (clauses.on[0] ?? null) : null;
    if (this.kind === DartDeclarationKind.ExtensionType && raw.primaryParamsOpenTok >= 0) {
      const close = matchClose(tokens, raw.primaryParamsOpenTok);
      const params = buildParameters(
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
  get members(): readonly DartMember[] {
    if (this.membersCache === null) this.membersCache = this.parseMembers();
    return this.membersCache;
  }

  /** Campos do corpo + parâmetros declarantes do primary constructor (veja `origin`). */
  get fields(): readonly DartField[] {
    if (this.fieldsCache === null) {
      const primary = this.primaryConstructor?.declaredFields ?? [];
      this.fieldsCache = [
        ...primary,
        ...this.members.filter((m): m is DartField => m.memberKind === DartMemberKind.Field),
      ];
    }
    return this.fieldsCache;
  }

  /** Construtores: o primary (se houver) e os do corpo, inclusive factories. */
  get constructors(): readonly DartConstructor[] {
    const body = this.members.filter(
      (m): m is DartConstructor => m.memberKind === DartMemberKind.Constructor
    );
    return this.primaryConstructor ? [this.primaryConstructor, ...body] : body;
  }

  /** Métodos, getters, setters e operadores (veja `memberKind`). */
  get methods(): readonly DartMethod[] {
    return this.members.filter(
      (m): m is DartMethod =>
        m.memberKind === DartMemberKind.Method ||
        m.memberKind === DartMemberKind.Getter ||
        m.memberKind === DartMemberKind.Setter ||
        m.memberKind === DartMemberKind.Operator
    );
  }

  /** Chamadas dentro da declaração (corpos, inicializadores, primary constructor), na ordem. */
  calls(): readonly DartCall[] {
    return this.file.calls().filter((c) => this.contains(c));
  }

  /** Trechos do corpo que o parser não reconheceu. */
  get unknownMembers(): readonly DartUnknownMember[] {
    return this.members.filter(
      (m): m is DartUnknownMember => m.memberKind === DartMemberKind.Unknown
    );
  }

  /** Todo o corpo foi reconhecido (`unknownMembers` vazio). */
  get isComplete(): boolean {
    return this.unknownMembers.length === 0;
  }

  /** Primary constructor (cabeçalho `class Foo(...)` / representação da extension type). */
  get primaryConstructor(): DartConstructor | null {
    if (this.primaryCache === undefined) {
      void this.members; // lê o corpo: o bloco `this ...;` complementa o primary constructor
      this.primaryCache = this.raw.hasPrimary
        ? new DartConstructor(this.file, this, null, this.primaryBody)
        : null;
    }
    return this.primaryCache;
  }

  /** Valores do enum (vazio nas outras declarações). */
  get enumValues(): readonly DartEnumValue[] {
    if (this.enumValuesCache === null) void this.members;
    return this.enumValuesCache ?? [];
  }

  hasAnnotation(name: string): boolean {
    return this.annotations.some((a) => a.name === name);
  }

  isIgnoredBy(plugin: string, linesAbove = 5): boolean {
    return ignoredBy(this.file, this.raw.firstTok, this.raw.headTok, plugin, linesAbove);
  }

  /** `superclass.name` está em `names` (`State<Foo<T>>` casa com `"State"`). */
  extendsAny(...names: string[]): boolean {
    return (
      this.superclass?.name !== null &&
      this.superclass?.name !== undefined &&
      names.includes(this.superclass.name)
    );
  }

  /** Algum tipo de `implements` tem o nome em `names`. */
  implementsAny(...names: string[]): boolean {
    return this.interfaces.some((t) => t.name !== null && names.includes(t.name));
  }

  /** Algum tipo de `with` tem o nome em `names`. */
  mixesIn(...names: string[]): boolean {
    return this.mixins.some((t) => t.name !== null && names.includes(t.name));
  }

  findField(name: string): DartField | null {
    return this.fields.find((f) => f.name === name) ?? null;
  }

  findMethod(name: string, kind?: DartMemberKind): DartMethod | null {
    return (
      this.methods.find((m) => m.name === name && (kind === undefined || m.memberKind === kind)) ??
      null
    );
  }

  /** Construtor pelo nome (`null` = construtor sem nome). */
  findConstructor(constructorName: string | null): DartConstructor | null {
    return this.constructors.find((c) => c.constructorName === constructorName) ?? null;
  }

  /**
   * Existe membro (campo, método, getter, setter, construtor) com o nome?
   * `Absent` só quando a classe foi lida por inteiro; senão `Unknown`.
   */
  hasMember(name: string, kind?: DartMemberKind): Presence {
    const all: { name: string; memberKind: DartMemberKind }[] = [
      ...this.fields,
      ...this.methods,
      ...this.constructors.map((c) => ({
        name: c.constructorName ?? this.name,
        memberKind: c.memberKind,
      })),
    ];
    if (all.some((m) => m.name === name && (kind === undefined || m.memberKind === kind)))
      return Presence.Present;
    return this.isComplete ? Presence.Absent : Presence.Unknown;
  }

  /** Linha do arquivo dentro da classe? */
  containsLine(line: number): boolean {
    return line >= this.line && line <= this.endLine;
  }

  private parseMembers(): DartMember[] {
    const { tokens } = this.file.lexed;
    const raw = this.raw;
    if (raw.bodyOpenTok < 0) return [];
    const limit = raw.endTok;
    let p = raw.bodyOpenTok + 1;
    const members: DartMember[] = [];

    if (raw.kind === "enum") {
      const semi = findAtDepth0(tokens, p, limit, [";"]);
      const valuesEnd = semi < 0 ? limit - 1 : semi - 1;
      this.enumValuesCache = splitTopLevelCommas(tokens, p, valuesEnd).map(
        ([a, b]) => new DartEnumValue(this.file, this, a, b)
      );
      p = semi < 0 ? limit : semi + 1;
    }

    while (p < limit) {
      if (isPunct(tokens[p], ";")) {
        p++;
        continue;
      }
      // Bloco do primary constructor no corpo: `this;`, `this : ...;`, `this { ... }`
      let q = p;
      while (isPunct(tokens[q], "@")) {
        const close = isPunct(tokens[q + 2], "(") ? matchClose(tokens, q + 2) : -1;
        q = close >= 0 ? close + 1 : q + 2;
        while (isPunct(tokens[q], ".") && isIdent(tokens[q + 1])) q += 2;
      }
      if (
        raw.hasPrimary &&
        isIdent(tokens[q], "this") &&
        (isPunct(tokens[q + 1], ";") || isPunct(tokens[q + 1], ":") || isPunct(tokens[q + 1], "{"))
      ) {
        const colonTok = isPunct(tokens[q + 1], ":") ? q + 1 : -1;
        let end = -1;
        let bodyOpenTok = -1;
        if (isPunct(tokens[q + 1], ";")) end = q + 1;
        else {
          const stop = findAtDepth0(tokens, q + 1, limit, [";", "{"]);
          if (stop >= 0 && isPunct(tokens[stop], "{")) {
            bodyOpenTok = stop;
            end = matchClose(tokens, stop, limit);
          } else end = stop;
        }
        if (end >= 0) {
          this.primaryBody = { firstTok: p, startTok: q, endTok: end, colonTok, bodyOpenTok };
          p = end + 1;
          continue;
        }
      }
      const member = parseMember(this.file.lexed, p, limit, raw.name || "\0");
      if (member === null) {
        const end = Math.min(skipUnknown(this.file.lexed, p, limit), limit - 1);
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
              DartFieldOrigin.Body,
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

function fieldInit(
  member: FieldMember,
  nameTok: number,
  initStartTok: number,
  initEndTok: number,
  typeParams: ReadonlySet<string>
): VariableInit {
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

interface Clauses {
  leading: DartType[];
  extends: DartType[];
  with: DartType[];
  implements: DartType[];
  on: DartType[];
}

/** Lê `extends A with B, C implements D on E` nos tokens `[from, to]`. */
function readClauses(
  file: DartFile,
  from: number,
  to: number,
  typeParams: ReadonlySet<string>
): Clauses {
  const { tokens } = file.lexed;
  const result: Clauses = { leading: [], extends: [], with: [], implements: [], on: [] };
  if (to < from) return result;
  const keywords = new Set(["extends", "with", "implements", "on"]);
  let current: keyof Clauses = "leading";
  let start = from;
  const flush = (end: number): void => {
    if (end < start) return;
    for (const [a, b] of splitTopLevelCommas(tokens, start, end)) {
      const type = parseDartType(file.lexed, a, b, typeParams);
      if (type) result[current].push(type);
    }
  };
  let j = from;
  while (j <= to) {
    const t = tokens[j];
    if (t.kind === "punct" && (t.value === "(" || t.value === "[" || t.value === "{")) {
      const close = matchClose(tokens, j, to + 1);
      j = close < 0 ? to + 1 : close + 1;
      continue;
    }
    if (isPunct(t, "<") && j > from && isIdent(tokens[j - 1])) {
      const close = matchTypeArgs(tokens, j, to + 1);
      if (close > 0) {
        j = close + 1;
        continue;
      }
    }
    if (t.kind === "ident" && keywords.has(t.value) && !isPunct(tokens[j - 1], ".")) {
      flush(j - 1);
      current = t.value as keyof Clauses;
      start = j + 1;
    }
    j++;
  }
  flush(to);
  return result;
}

function buildHeader(file: DartFile, raw: RawTypeDecl): string {
  const { tokens } = file.lexed;
  if (raw.kind === "mixinApplication") return joinTokens(file.lexed, raw.headTok, raw.endTok);
  const keyword = raw.kind === "extensionType" ? "extension type" : raw.kind;
  let text = [...raw.modifiers, keyword].join(" ");
  if (raw.name) text += ` ${raw.name}`;
  if (raw.typeParamsOpenTok >= 0) {
    const close = matchTypeArgs(tokens, raw.typeParamsOpenTok, tokens.length);
    if (close > 0) text += joinTokens(file.lexed, raw.typeParamsOpenTok, close);
  }
  if (raw.kind === "extensionType" && raw.primaryParamsOpenTok >= 0) {
    const close = matchClose(tokens, raw.primaryParamsOpenTok);
    if (close > 0) text += joinTokens(file.lexed, raw.primaryParamsOpenTok, close);
  }
  if (raw.clausesEndTok >= raw.clausesStartTok) {
    text += ` ${joinTokens(file.lexed, raw.clausesStartTok, raw.clausesEndTok)}`;
  }
  return `${text} {`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Membros
// ═══════════════════════════════════════════════════════════════════════════

/** Trecho do corpo que o parser não reconheceu: o plugin deve pular. */
export class DartUnknownMember extends DartNodeBase implements DartClassMember {
  readonly memberKind = DartMemberKind.Unknown as const;
  readonly owner: DartClass;

  /** @internal */
  constructor(file: DartFile, owner: DartClass, fromTok: number, toTok: number) {
    super(file, ...tokenSpan(file, fromTok, Math.max(fromTok, toTok)));
    this.owner = owner;
  }

  /** @internal */
  expressionRanges(): [number, number][] {
    return [];
  }
}

/** Campo de classe (corpo) ou parâmetro declarante do primary constructor. */
export class DartField extends DartVariable implements DartClassMember {
  readonly memberKind = DartMemberKind.Field as const;
  readonly owner: DartClass;
  readonly origin: DartFieldOrigin;
  /** Parâmetro do primary constructor que declara o campo (`origin === PrimaryConstructor`). */
  readonly declaringParameter: DartParameter | null;
  /** Anotação `@override` do próprio campo. */
  readonly isOverride: boolean;

  /** @internal */
  constructor(
    file: DartFile,
    owner: DartClass,
    init: VariableInit,
    origin: DartFieldOrigin,
    declaringParameter: DartParameter | null
  ) {
    super(file, init);
    this.owner = owner;
    this.origin = origin;
    this.declaringParameter = declaringParameter;
    this.isOverride = this.hasAnnotation("override");
  }

  /** @internal */
  expressionRanges(): [number, number][] {
    return this.initializer ? [[this.initializer.fromTok, this.initializer.toTok]] : [];
  }
}

/** Variável de nível superior. */
export class DartTopLevelVariable extends DartVariable {
  /** @internal */
  constructor(
    file: DartFile,
    member: FieldMember,
    nameTok: number,
    initStartTok: number,
    initEndTok: number
  ) {
    super(file, fieldInit(member, nameTok, initStartTok, initEndTok, new Set()));
  }

  /** @internal */
  expressionRanges(): [number, number][] {
    return this.initializer ? [[this.initializer.fromTok, this.initializer.toTok]] : [];
  }
}

/** Função de nível superior (e base de `DartMethod`). */
export class DartFunction extends DartNodeBase implements DartDeclaration {
  /** `Method` (função), `Getter`, `Setter` ou `Operator` (só em classes). */
  readonly memberKind:
    DartMemberKind.Method | DartMemberKind.Getter | DartMemberKind.Setter | DartMemberKind.Operator;
  /** Nome; no operador, o símbolo (`==`, `[]`, `+`). */
  readonly name: string;
  readonly isPrivate: boolean;
  readonly nameLine: number;
  readonly startLine: number;
  readonly annotations: readonly DartAnnotation[];
  readonly doc: DartDoc | null;
  /** `null` quando omitido. */
  readonly returnType: DartType | null;
  readonly typeParameters: readonly DartTypeParameter[];
  /** Parâmetros (vazio no getter; vazio também quando a lista não foi reconhecida — veja `isComplete`). */
  readonly parameters: readonly DartParameter[];
  /** A lista de parâmetros foi reconhecida. */
  readonly isComplete: boolean;
  readonly asyncKind: DartAsyncKind;
  readonly isAsync: boolean;
  /** `sync*` / `async*` */
  readonly isGenerator: boolean;
  readonly isExternal: boolean;
  readonly bodyKind: DartBodyKind;
  /** Assinatura em uma linha, sem o corpo: `Future<void> load(String id) async`. */
  readonly signature: string;
  /** @internal */
  readonly rawMember: OtherMember;
  private bodyCache: DartBody | null | undefined;

  /** @internal */
  constructor(file: DartFile, raw: OtherMember, outerTypeParams: ReadonlySet<string>) {
    const { tokens } = file.lexed;
    super(file, ...tokenSpan(file, raw.headTok, raw.endTok));
    this.rawMember = raw;
    const kindMap = {
      method: DartMemberKind.Method,
      getter: DartMemberKind.Getter,
      setter: DartMemberKind.Setter,
      operator: DartMemberKind.Operator,
    } as const;
    this.memberKind = kindMap[raw.memberKind];
    const opEnd = raw.paramsOpenTok >= 0 ? raw.paramsOpenTok - 1 : raw.nameTok;
    this.name =
      raw.name ??
      (raw.memberKind === "operator"
        ? joinTokens(file.lexed, raw.nameTok, Math.max(raw.nameTok, opEnd))
        : "");
    this.isPrivate = this.name.startsWith("_");
    this.nameLine = file.lineAtOffset(tokens[raw.nameTok].start);
    this.annotations = raw.annotations.map((a) => new DartAnnotation(file, a));
    this.doc = docOf(file, raw.startTok, raw.headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[raw.startTok].start);
    this.typeParameters = buildTypeParameters(file, raw.typeParamsOpenTok, outerTypeParams);
    const typeParams = new Set([...outerTypeParams, ...this.typeParameters.map((t) => t.name)]);
    const returnEnd = raw.memberKind === "method" ? raw.nameTok - 1 : raw.nameTok - 2; // antes de get/set/operator
    this.returnType =
      returnEnd >= raw.declTok
        ? parseDartType(file.lexed, raw.declTok, returnEnd, typeParams)
        : null;
    const params =
      raw.paramsOpenTok >= 0
        ? buildParameters(file, raw.paramsOpenTok, raw.paramsCloseTok, false, typeParams)
        : [];
    this.parameters = params ?? [];
    this.isComplete = params !== null;
    const afterParams = raw.paramsCloseTok >= 0 ? raw.paramsCloseTok + 1 : raw.nameTok + 1;
    this.asyncKind = readAsyncMarker(tokens, afterParams)[0];
    this.isAsync =
      this.asyncKind === DartAsyncKind.Async || this.asyncKind === DartAsyncKind.AsyncStar;
    this.isGenerator =
      this.asyncKind === DartAsyncKind.SyncStar || this.asyncKind === DartAsyncKind.AsyncStar;
    this.isExternal = raw.modifiers.has("external");
    this.bodyKind = isPunct(tokens[raw.bodyTok], "{")
      ? DartBodyKind.Block
      : isPunct(tokens[raw.bodyTok], "=>")
        ? DartBodyKind.Arrow
        : DartBodyKind.None;
    this.signature =
      raw.bodyTok - 1 >= raw.headTok ? joinTokens(file.lexed, raw.headTok, raw.bodyTok - 1) : "";
  }

  /** Corpo (calculado no primeiro acesso). `null` quando `bodyKind === None`. */
  get body(): DartBody | null {
    if (this.bodyCache === undefined) {
      const raw = this.rawMember;
      this.bodyCache =
        this.bodyKind === DartBodyKind.None
          ? null
          : new DartBody(this.file, this.bodyKind, raw.bodyTok, raw.endTok, this.asyncKind);
    }
    return this.bodyCache;
  }

  /** Quantidade de linhas, da assinatura ao fim do corpo. */
  get lineCount(): number {
    return this.endLine - this.line + 1;
  }

  /** @internal */
  expressionRanges(): [number, number][] {
    const raw = this.rawMember;
    const ranges: [number, number][] = [];
    // por dentro dos parênteses: `(int a) => ...` não é uma closure
    if (raw.paramsOpenTok >= 0) ranges.push([raw.paramsOpenTok + 1, raw.paramsCloseTok - 1]);
    if (this.bodyKind !== DartBodyKind.None) ranges.push([raw.bodyTok, raw.endTok]);
    return ranges;
  }

  hasAnnotation(name: string): boolean {
    return this.annotations.some((a) => a.name === name);
  }

  isIgnoredBy(plugin: string, linesAbove = 5): boolean {
    return ignoredBy(
      this.file,
      this.rawMember.startTok,
      this.rawMember.headTok,
      plugin,
      linesAbove
    );
  }
}

/** Método, getter, setter ou operador de uma classe. */
export class DartMethod extends DartFunction implements DartClassMember {
  readonly owner: DartClass;
  readonly isStatic: boolean;
  /** Sem corpo e sem `external` (abstrato). */
  readonly isAbstract: boolean;
  /** Anotação `@override` do próprio método. */
  readonly isOverride: boolean;

  /** @internal */
  constructor(file: DartFile, owner: DartClass, raw: OtherMember, typeParams: ReadonlySet<string>) {
    super(file, raw, typeParams);
    this.owner = owner;
    this.isStatic = raw.modifiers.has("static");
    this.isAbstract = this.bodyKind === DartBodyKind.None && !this.isExternal;
    this.isOverride = this.hasAnnotation("override");
  }
}

/** Elemento do initializer list: `_x = x`, `super(...)`, `assert(...)`, `this.other(...)`. */
export class DartInitializer extends DartNodeBase {
  /** `_x = x` / `this._x = x` → `"_x"`; demais → `null`. */
  readonly fieldName: string | null;
  readonly isSuperCall: boolean;
  readonly isAssert: boolean;
  /** `: this.other(...)` (construtor redirecionante) */
  readonly isRedirect: boolean;
  /** Valor atribuído (`fieldName`) ou a chamada inteira (super/assert/redirect). */
  readonly value: DartExpression;

  /** @internal */
  constructor(file: DartFile, raw: InitializerElement) {
    super(file, ...tokenSpan(file, raw.startTok, raw.endTok));
    this.fieldName = raw.fieldName;
    this.isSuperCall = raw.kind === "super";
    this.isAssert = raw.kind === "assert";
    this.isRedirect = raw.kind === "redirect";
    this.value = new DartExpression(
      file,
      raw.kind === "field" ? raw.exprStartTok : raw.startTok,
      raw.endTok
    );
  }
}

/** Construtor: generativo, factory, redirecionante ou o primary constructor (Dart 3.13). */
export class DartConstructor extends DartNodeBase implements DartDeclaration, DartClassMember {
  readonly memberKind = DartMemberKind.Constructor as const;
  readonly owner: DartClass;
  /** Como escrito: `Foo` ou `Foo.fromJson`. */
  readonly name: string;
  /** `fromJson`; `null` no construtor sem nome. */
  readonly constructorName: string | null;
  readonly isPrivate: boolean;
  readonly nameLine: number;
  readonly startLine: number;
  readonly annotations: readonly DartAnnotation[];
  readonly doc: DartDoc | null;
  readonly isConst: boolean;
  readonly isFactory: boolean;
  readonly isExternal: boolean;
  /** Declarado no cabeçalho da classe (`class const Point(final int x)`). */
  readonly isPrimary: boolean;
  /** `: this.other(...)` ou `factory X() = Y;` */
  readonly isRedirecting: boolean;
  /** `factory X() = Y;` → `"Y"` */
  readonly redirectTarget: string | null;
  readonly parameters: readonly DartParameter[];
  /** A lista de parâmetros foi reconhecida. */
  readonly isComplete: boolean;
  readonly initializers: readonly DartInitializer[];
  readonly lineCount: number;
  private readonly bodyRange: [number, number, DartBodyKind] | null;
  private readonly firstTok: number;
  private readonly headTok: number;
  /** @internal Token do nome (`fromJson` em `Foo.fromJson`; o nome da classe sem nome). */
  readonly nameTokIndex: number;
  private readonly ranges: [number, number][];
  private bodyCache: DartBody | null | undefined;
  private declaredFieldsCache: DartField[] | null = null;

  /**
   * @internal `raw === null`: primary constructor da classe `owner`
   * (`primaryBody`: o bloco `this ...` do corpo, se houver).
   */
  constructor(
    file: DartFile,
    owner: DartClass,
    raw: ConstructorMember | null,
    primaryBody: {
      firstTok: number;
      startTok: number;
      endTok: number;
      colonTok: number;
      bodyOpenTok: number;
    } | null
  ) {
    super(file, ...DartConstructor.span(file, owner, raw));
    const { tokens } = file.lexed;
    const typeParams = new Set(owner.typeParameters.map((t) => t.name));
    this.owner = owner;
    if (raw === null) {
      const decl = owner.raw;
      const close = matchClose(tokens, decl.primaryParamsOpenTok);
      this.isPrimary = true;
      this.constructorName = decl.primaryName;
      this.name = decl.primaryName ? `${owner.name}.${decl.primaryName}` : owner.name;
      this.isConst = decl.primaryIsConst;
      this.isFactory = false;
      this.isExternal = false;
      const params = buildParameters(file, decl.primaryParamsOpenTok, close, true, typeParams);
      this.parameters = params ?? [];
      this.isComplete = params !== null;
      this.firstTok = primaryBody?.firstTok ?? decl.headTok;
      this.headTok = primaryBody?.startTok ?? decl.headTok;
      this.annotations = [];
      this.doc = primaryBody ? docOf(file, primaryBody.firstTok, primaryBody.startTok) : null;
      this.nameLine = this.line;
      this.startLine = this.line;
      const inits: DartInitializer[] = [];
      if (primaryBody && primaryBody.colonTok >= 0) {
        const initEnd =
          (primaryBody.bodyOpenTok >= 0 ? primaryBody.bodyOpenTok : primaryBody.endTok) - 1;
        for (const [a, b] of splitTopLevelCommas(tokens, primaryBody.colonTok + 1, initEnd)) {
          inits.push(new DartInitializer(file, classifyInit(tokens, a, b)));
        }
      }
      this.initializers = inits;
      this.isRedirecting = inits.some((i) => i.isRedirect);
      this.redirectTarget = null;
      this.bodyRange =
        primaryBody && primaryBody.bodyOpenTok >= 0
          ? [primaryBody.bodyOpenTok, primaryBody.endTok, DartBodyKind.Block]
          : null;
      this.lineCount = this.endLine - this.line + 1;
      this.nameTokIndex = decl.nameTok;
      // por dentro dos parênteses: a lista de parâmetros não é uma closure
      this.ranges = [[decl.primaryParamsOpenTok + 1, close - 1]];
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
    this.annotations = raw.annotations.map((a) => new DartAnnotation(file, a));
    this.doc = docOf(file, raw.startTok, raw.headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[raw.startTok].start);
    const nameTok = raw.paramsOpenTok - 1;
    this.nameTokIndex = nameTok;
    // parâmetros por dentro dos parênteses (a lista não é uma closure) + initializers/corpo
    this.ranges = [
      [raw.paramsOpenTok + 1, raw.paramsCloseTok - 1],
      [raw.paramsCloseTok + 1, raw.endTok],
    ];
    this.nameLine = file.lineAtOffset(tokens[nameTok].start);
    const params =
      raw.params === null
        ? null
        : buildParameters(file, raw.paramsOpenTok, raw.paramsCloseTok, false, typeParams);
    this.parameters = params ?? [];
    this.isComplete = params !== null;
    this.initializers = raw.initializers.map((i) => new DartInitializer(file, i));
    let redirectTarget: string | null = null;
    let bodyRange: [number, number, DartBodyKind] | null = null;
    if (raw.isFactory) {
      const after = raw.paramsCloseTok + 1;
      const [, k] = readAsyncMarker(tokens, after);
      if (isPunct(tokens[k], "=")) {
        redirectTarget = joinTokens(file.lexed, k + 1, raw.endTok - 1);
      } else if (isPunct(tokens[k], "=>")) {
        bodyRange = [k, raw.endTok, DartBodyKind.Arrow];
      } else if (isPunct(tokens[k], "{")) {
        bodyRange = [k, raw.endTok, DartBodyKind.Block];
      }
    } else if (raw.bodyOpenTok >= 0) {
      bodyRange = [raw.bodyOpenTok, raw.bodyCloseTok, DartBodyKind.Block];
    }
    this.redirectTarget = redirectTarget;
    this.isRedirecting = raw.isRedirecting || redirectTarget !== null;
    this.bodyRange = bodyRange;
    this.lineCount = this.endLine - this.line + 1;
  }

  private static span(
    file: DartFile,
    owner: DartClass,
    raw: ConstructorMember | null
  ): [number, number] {
    if (raw !== null) return tokenSpan(file, raw.headTok, raw.endTok);
    const decl = owner.raw;
    const close = matchClose(file.lexed.tokens, decl.primaryParamsOpenTok);
    return tokenSpan(
      file,
      decl.nameTok >= 0 ? decl.nameTok : decl.headTok,
      Math.max(close, decl.headTok)
    );
  }

  /** Corpo `{ }` ou `=>` (factory); `null` sem corpo. */
  get body(): DartBody | null {
    if (this.bodyCache === undefined) {
      this.bodyCache = this.bodyRange
        ? new DartBody(
            this.file,
            this.bodyRange[2],
            this.bodyRange[0],
            this.bodyRange[1],
            DartAsyncKind.Sync
          )
        : null;
    }
    return this.bodyCache;
  }

  /** @internal */
  expressionRanges(): [number, number][] {
    return this.ranges;
  }

  /** Campos declarados pelos parâmetros `final`/`var` do primary constructor. */
  get declaredFields(): readonly DartField[] {
    if (!this.isPrimary) return [];
    if (this.declaredFieldsCache !== null) return this.declaredFieldsCache;
    this.declaredFieldsCache = this.parameters
      .filter((p) => p.source === DartParameterSource.Declaring)
      .map((p) => {
        const raw = p.rawInfo;
        const modifiers = new Set<string>();
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
          DartFieldOrigin.PrimaryConstructor,
          p
        );
      });
    return this.declaredFieldsCache;
  }

  hasAnnotation(name: string): boolean {
    return this.annotations.some((a) => a.name === name);
  }

  isIgnoredBy(plugin: string, linesAbove = 5): boolean {
    return ignoredBy(this.file, this.firstTok, this.headTok, plugin, linesAbove);
  }
}

/** Classifica um elemento de initializer list (mesma regra do parser de construtores). */
function classifyInit(
  tokens: { kind: string; value: string }[],
  from: number,
  to: number
): InitializerElement {
  const t = tokens[from];
  const isI = (k: number, v: string): boolean =>
    tokens[k]?.kind === "ident" && tokens[k].value === v;
  const isP = (k: number, v: string): boolean =>
    tokens[k]?.kind === "punct" && tokens[k].value === v;
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
export class DartEnumValue extends DartNodeBase implements DartDeclaration {
  readonly owner: DartClass;
  readonly name: string;
  readonly isPrivate: boolean;
  readonly nameLine: number;
  readonly startLine: number;
  readonly annotations: readonly DartAnnotation[];
  readonly doc: DartDoc | null;
  private readonly firstTok: number;
  private readonly headTok: number;
  private readonly argsOpen: number;
  private readonly argsClose: number;
  /** @internal */
  readonly headTokIndex: number;
  /** @internal */
  readonly endTokIndex: number;

  /** @internal */
  constructor(file: DartFile, owner: DartClass, from: number, to: number) {
    const { tokens } = file.lexed;
    let head = from;
    const annotations: DartAnnotation[] = [];
    while (isPunct(tokens[head], "@") && head <= to) {
      const ann = parseAnnotation(tokens, head);
      if (ann === null || ann.endTok >= to) break;
      annotations.push(new DartAnnotation(file, ann));
      head = ann.endTok + 1;
    }
    super(file, ...tokenSpan(file, Math.min(head, to), to));
    this.owner = owner;
    this.firstTok = from;
    this.headTok = Math.min(head, to);
    this.name = tokens[this.headTok].value;
    this.isPrivate = this.name.startsWith("_");
    this.nameLine = this.line;
    this.annotations = annotations;
    this.doc = docOf(file, from, this.headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[from].start);
    this.headTokIndex = this.headTok;
    this.endTokIndex = to;
    this.argsOpen = findAtDepth0(tokens, this.headTok, to + 1, ["("]);
    this.argsClose = this.argsOpen >= 0 ? matchClose(tokens, this.argsOpen, to + 1) : -1;
  }

  /** Argumentos do construtor do enum: `active('A')` → `['A']`. */
  get arguments(): readonly DartArgument[] {
    if (this.argsOpen < 0 || this.argsClose < 0) return [];
    return buildArguments(this.file, this.argsOpen, this.argsClose);
  }

  /** @internal */
  expressionRanges(): [number, number][] {
    return this.argsOpen >= 0 && this.argsClose >= 0 ? [[this.argsOpen, this.argsClose]] : [];
  }

  hasAnnotation(name: string): boolean {
    return this.annotations.some((a) => a.name === name);
  }

  isIgnoredBy(plugin: string, linesAbove = 5): boolean {
    return ignoredBy(this.file, this.firstTok, this.headTok, plugin, linesAbove);
  }
}

/** `typedef Callback = void Function(int);` */
export class DartTypedef extends DartNodeBase implements DartDeclaration {
  readonly name: string;
  readonly isPrivate: boolean;
  readonly nameLine: number;
  readonly startLine: number;
  readonly annotations: readonly DartAnnotation[];
  readonly doc: DartDoc | null;
  readonly typeParameters: readonly DartTypeParameter[];
  /** Tipo depois do `=` (`null` na sintaxe antiga). */
  readonly aliasedType: DartType | null;
  /** @internal */
  readonly nameTokIndex: number;
  private readonly raw: RawTypedef;

  /** @internal */
  constructor(file: DartFile, raw: RawTypedef) {
    const { tokens } = file.lexed;
    super(file, ...tokenSpan(file, raw.headTok, raw.endTok));
    this.raw = raw;
    this.nameTokIndex = raw.nameTok;
    this.name = raw.name;
    this.isPrivate = raw.name.startsWith("_");
    this.nameLine = file.lineAtOffset(tokens[raw.nameTok].start);
    this.annotations = raw.annotations.map((a) => new DartAnnotation(file, a));
    this.doc = docOf(file, raw.firstTok, raw.headTok);
    this.startLine = this.doc?.line ?? file.lineAtOffset(tokens[raw.firstTok].start);
    if (raw.aliasStartTok >= 0) {
      this.typeParameters = buildTypeParameters(file, raw.typeParamsOpenTok, new Set());
      const typeParams = new Set(this.typeParameters.map((t) => t.name));
      this.aliasedType = parseDartType(file.lexed, raw.aliasStartTok, raw.aliasEndTok, typeParams);
    } else {
      // sintaxe antiga: `typedef void Callback<T>(T value);`
      let open = raw.nameTok + 1;
      const typeParamsOpen = isPunct(tokens[open], "<") ? open : -1;
      if (typeParamsOpen >= 0) open = matchTypeArgs(tokens, open, raw.endTok) + 1;
      this.typeParameters = buildTypeParameters(file, typeParamsOpen, new Set());
      const typeParams = new Set(this.typeParameters.map((t) => t.name));
      const close = isPunct(tokens[open], "(") ? matchClose(tokens, open, raw.endTok) : -1;
      let typedefTok = raw.headTok;
      while (typedefTok < raw.nameTok && !isIdent(tokens[typedefTok], "typedef")) typedefTok++;
      this.aliasedType =
        close > 0
          ? functionTypeFromSignature(
              file.lexed,
              typedefTok + 1,
              raw.nameTok - 1,
              open,
              close,
              typeParams
            )
          : null;
    }
  }

  hasAnnotation(name: string): boolean {
    return this.annotations.some((a) => a.name === name);
  }

  isIgnoredBy(plugin: string, linesAbove = 5): boolean {
    return ignoredBy(this.file, this.raw.firstTok, this.raw.headTok, plugin, linesAbove);
  }
}

/** `import`, `export`, `part`, `part of` ou `library`. */
export class DartDirective extends DartNodeBase {
  readonly kind: DartDirectiveKind;
  /** URI sem aspas (`package:app/x.dart`); em `part of nome;`/`library nome;`, o nome. `""` em `library;`. */
  readonly uri: string;
  readonly uriKind: DartUriKind | null;
  /** `app` em `package:app/...` */
  readonly packageName: string | null;
  /** `features/x/x.dart` em `package:app/features/x/x.dart` */
  readonly packagePath: string | null;
  /** `as p` */
  readonly prefix: string | null;
  readonly show: readonly string[];
  readonly hide: readonly string[];
  readonly isDeferred: boolean;
  /** Tem `if (dart.library.x) 'uri'` (import/export condicional). */
  readonly hasConfigurations: boolean;

  /** @internal */
  constructor(file: DartFile, raw: RawDirective) {
    super(file, ...tokenSpan(file, raw.startTok, raw.endTok));
    const { tokens } = file.lexed;
    const kinds = {
      library: DartDirectiveKind.Library,
      import: DartDirectiveKind.Import,
      export: DartDirectiveKind.Export,
      part: DartDirectiveKind.Part,
      partOf: DartDirectiveKind.PartOf,
    } as const;
    this.kind = kinds[raw.kind];
    let k = raw.startTok + (raw.kind === "partOf" ? 2 : 1);
    let uri = "";
    if (tokens[k]?.kind === "string") {
      uri = tokens[k].value.replace(/^r/, "").slice(1, -1);
      k++;
    } else {
      let end = k;
      while (end < raw.endTok && (isIdent(tokens[end]) || isPunct(tokens[end], "."))) end++;
      uri = end > k ? joinTokens(file.lexed, k, end - 1) : "";
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
        ? DartUriKind.Dart
        : uri.startsWith("package:")
          ? DartUriKind.Package
          : DartUriKind.Relative;
    const pkg = /^package:([^/]+)\/(.*)$/.exec(uri);
    this.packageName = pkg ? pkg[1] : null;
    this.packagePath = pkg ? pkg[2] : null;
    let prefix: string | null = null;
    const show: string[] = [];
    const hide: string[] = [];
    let deferred = false;
    let configurations = false;
    let mode: "show" | "hide" | null = null;
    for (let j = k; j < raw.endTok; j++) {
      const t = tokens[j];
      if (isIdent(t, "if") && isPunct(tokens[j + 1], "(")) {
        configurations = true;
        const close = matchClose(tokens, j + 1, raw.endTok);
        j = close < 0 ? j : close + 1;
        continue;
      }
      if (isIdent(t, "deferred")) deferred = true;
      else if (isIdent(t, "as") && isIdent(tokens[j + 1])) {
        prefix = tokens[j + 1].value;
        j++;
      } else if (isIdent(t, "show")) mode = "show";
      else if (isIdent(t, "hide")) mode = "hide";
      else if (isIdent(t) && mode === "show") show.push(t.value);
      else if (isIdent(t) && mode === "hide") hide.push(t.value);
    }
    this.prefix = prefix;
    this.show = show;
    this.hide = hide;
    this.isDeferred = deferred;
    this.hasConfigurations = configurations;
  }
}
