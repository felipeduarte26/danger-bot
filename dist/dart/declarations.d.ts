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
  DartUriKind,
  Presence,
} from "./enums";
import { DartType } from "./type";
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
} from "./nodes";
import { ConstructorMember, FieldMember, InitializerElement, OtherMember } from "./internal/syntax";
import { RawDirective, RawTypeDecl, RawTypedef } from "./internal/toplevel";
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
/** Declaração de tipo: class, enum, mixin, extension, extension type ou mixin application. */
export declare class DartClass extends DartNodeBase implements DartDeclaration {
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
  private readonly typeParamNames;
  private membersCache;
  private fieldsCache;
  private primaryCache;
  private enumValuesCache;
  private primaryBody;
  /** @internal */
  constructor(file: DartFile, raw: RawTypeDecl);
  /** Todos os membros na ordem do arquivo, inclusive os não reconhecidos (`DartUnknownMember`). */
  get members(): readonly DartMember[];
  /** Campos do corpo + parâmetros declarantes do primary constructor (veja `origin`). */
  get fields(): readonly DartField[];
  /** Construtores: o primary (se houver) e os do corpo, inclusive factories. */
  get constructors(): readonly DartConstructor[];
  /** Métodos, getters, setters e operadores (veja `memberKind`). */
  get methods(): readonly DartMethod[];
  /** Chamadas dentro da declaração (corpos, inicializadores, primary constructor), na ordem. */
  calls(): readonly DartCall[];
  /** Trechos do corpo que o parser não reconheceu. */
  get unknownMembers(): readonly DartUnknownMember[];
  /** Todo o corpo foi reconhecido (`unknownMembers` vazio). */
  get isComplete(): boolean;
  /** Primary constructor (cabeçalho `class Foo(...)` / representação da extension type). */
  get primaryConstructor(): DartConstructor | null;
  /** Valores do enum (vazio nas outras declarações). */
  get enumValues(): readonly DartEnumValue[];
  hasAnnotation(name: string): boolean;
  isIgnoredBy(plugin: string, linesAbove?: number): boolean;
  /** `superclass.name` está em `names` (`State<Foo<T>>` casa com `"State"`). */
  extendsAny(...names: string[]): boolean;
  /** Algum tipo de `implements` tem o nome em `names`. */
  implementsAny(...names: string[]): boolean;
  /** Algum tipo de `with` tem o nome em `names`. */
  mixesIn(...names: string[]): boolean;
  findField(name: string): DartField | null;
  findMethod(name: string, kind?: DartMemberKind): DartMethod | null;
  /** Construtor pelo nome (`null` = construtor sem nome). */
  findConstructor(constructorName: string | null): DartConstructor | null;
  /**
   * Existe membro (campo, método, getter, setter, construtor) com o nome?
   * `Absent` só quando a classe foi lida por inteiro; senão `Unknown`.
   */
  hasMember(name: string, kind?: DartMemberKind): Presence;
  /** Linha do arquivo dentro da classe? */
  containsLine(line: number): boolean;
  private parseMembers;
}
/** Trecho do corpo que o parser não reconheceu: o plugin deve pular. */
export declare class DartUnknownMember extends DartNodeBase implements DartClassMember {
  readonly memberKind: DartMemberKind.Unknown;
  readonly owner: DartClass;
  /** @internal */
  constructor(file: DartFile, owner: DartClass, fromTok: number, toTok: number);
  /** @internal */
  expressionRanges(): [number, number][];
}
/** Campo de classe (corpo) ou parâmetro declarante do primary constructor. */
export declare class DartField extends DartVariable implements DartClassMember {
  readonly memberKind: DartMemberKind.Field;
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
  );
  /** @internal */
  expressionRanges(): [number, number][];
}
/** Variável de nível superior. */
export declare class DartTopLevelVariable extends DartVariable {
  /** @internal */
  constructor(
    file: DartFile,
    member: FieldMember,
    nameTok: number,
    initStartTok: number,
    initEndTok: number
  );
  /** @internal */
  expressionRanges(): [number, number][];
}
/** Função de nível superior (e base de `DartMethod`). */
export declare class DartFunction extends DartNodeBase implements DartDeclaration {
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
  private bodyCache;
  /** @internal */
  constructor(file: DartFile, raw: OtherMember, outerTypeParams: ReadonlySet<string>);
  /** Corpo (calculado no primeiro acesso). `null` quando `bodyKind === None`. */
  get body(): DartBody | null;
  /** Quantidade de linhas, da assinatura ao fim do corpo. */
  get lineCount(): number;
  /** @internal */
  expressionRanges(): [number, number][];
  hasAnnotation(name: string): boolean;
  isIgnoredBy(plugin: string, linesAbove?: number): boolean;
}
/** Método, getter, setter ou operador de uma classe. */
export declare class DartMethod extends DartFunction implements DartClassMember {
  readonly owner: DartClass;
  readonly isStatic: boolean;
  /** Sem corpo e sem `external` (abstrato). */
  readonly isAbstract: boolean;
  /** Anotação `@override` do próprio método. */
  readonly isOverride: boolean;
  /** @internal */
  constructor(file: DartFile, owner: DartClass, raw: OtherMember, typeParams: ReadonlySet<string>);
}
/** Elemento do initializer list: `_x = x`, `super(...)`, `assert(...)`, `this.other(...)`. */
export declare class DartInitializer extends DartNodeBase {
  /** `_x = x` / `this._x = x` → `"_x"`; demais → `null`. */
  readonly fieldName: string | null;
  readonly isSuperCall: boolean;
  readonly isAssert: boolean;
  /** `: this.other(...)` (construtor redirecionante) */
  readonly isRedirect: boolean;
  /** Valor atribuído (`fieldName`) ou a chamada inteira (super/assert/redirect). */
  readonly value: DartExpression;
  /** @internal */
  constructor(file: DartFile, raw: InitializerElement);
}
/** Construtor: generativo, factory, redirecionante ou o primary constructor (Dart 3.13). */
export declare class DartConstructor
  extends DartNodeBase
  implements DartDeclaration, DartClassMember
{
  readonly memberKind: DartMemberKind.Constructor;
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
  private readonly bodyRange;
  private readonly firstTok;
  private readonly headTok;
  /** @internal Token do nome (`fromJson` em `Foo.fromJson`; o nome da classe sem nome). */
  readonly nameTokIndex: number;
  private readonly ranges;
  private bodyCache;
  private declaredFieldsCache;
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
  );
  private static span;
  /** Corpo `{ }` ou `=>` (factory); `null` sem corpo. */
  get body(): DartBody | null;
  /** @internal */
  expressionRanges(): [number, number][];
  /** Campos declarados pelos parâmetros `final`/`var` do primary constructor. */
  get declaredFields(): readonly DartField[];
  hasAnnotation(name: string): boolean;
  isIgnoredBy(plugin: string, linesAbove?: number): boolean;
}
/** Valor de enum: `active('A')`, `@Deprecated('x') legacy`. */
export declare class DartEnumValue extends DartNodeBase implements DartDeclaration {
  readonly owner: DartClass;
  readonly name: string;
  readonly isPrivate: boolean;
  readonly nameLine: number;
  readonly startLine: number;
  readonly annotations: readonly DartAnnotation[];
  readonly doc: DartDoc | null;
  private readonly firstTok;
  private readonly headTok;
  private readonly argsOpen;
  private readonly argsClose;
  /** @internal */
  readonly headTokIndex: number;
  /** @internal */
  readonly endTokIndex: number;
  /** @internal */
  constructor(file: DartFile, owner: DartClass, from: number, to: number);
  /** Argumentos do construtor do enum: `active('A')` → `['A']`. */
  get arguments(): readonly DartArgument[];
  /** @internal */
  expressionRanges(): [number, number][];
  hasAnnotation(name: string): boolean;
  isIgnoredBy(plugin: string, linesAbove?: number): boolean;
}
/** `typedef Callback = void Function(int);` */
export declare class DartTypedef extends DartNodeBase implements DartDeclaration {
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
  private readonly raw;
  /** @internal */
  constructor(file: DartFile, raw: RawTypedef);
  hasAnnotation(name: string): boolean;
  isIgnoredBy(plugin: string, linesAbove?: number): boolean;
}
/** `import`, `export`, `part`, `part of` ou `library`. */
export declare class DartDirective extends DartNodeBase {
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
  constructor(file: DartFile, raw: RawDirective);
}
