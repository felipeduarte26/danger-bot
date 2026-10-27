/**
 * DartType: um tipo escrito no código (`List<int>?`, `bool Function(int)`,
 * `(int, String)`), com a forma canônica e atalhos (`isString`, `isBool`...).
 */
import { DartBuiltinType, DartParameterKind, DartTypeKind, Nullability } from "./enums";
import { Lexed } from "./internal/lexer";
/** Campo de um record: `(int, {String name})`. */
export declare class DartRecordField {
  /** `null` no campo posicional. */
  readonly name: string | null;
  readonly type: DartType;
  /** `true` no campo nomeado (`{...}`). */
  readonly isNamed: boolean;
  constructor(name: string | null, type: DartType, isNamed: boolean);
}
/** Parâmetro de um tipo de função: `void Function(int index, {bool force})`. */
export declare class DartFunctionTypeParameter {
  /** `null` quando o tipo de função não dá nome ao parâmetro (`void Function(int)`). */
  readonly name: string | null;
  readonly type: DartType | null;
  readonly kind: DartParameterKind;
  readonly isRequired: boolean;
  constructor(
    name: string | null,
    type: DartType | null,
    kind: DartParameterKind,
    isRequired: boolean
  );
}
/** Um tipo escrito no código. Criado pelo modelo (campos, parâmetros, retornos...). */
export declare class DartType {
  readonly kind: DartTypeKind;
  /** Texto original. */
  readonly text: string;
  /**
   * Forma do `dart format` em uma linha, sem comentários: `Map<String, dynamic>?`.
   * Duas grafias do mesmo tipo têm o mesmo `canonical` (é o que `equals` compara).
   */
  readonly canonical: string;
  /** `?` escrito no tipo. */
  readonly isNullable: boolean;
  /** `Nullable` também para `dynamic`/`Null`; `Unknown` para `void` e parâmetro de tipo (`T`). */
  readonly nullability: Nullability;
  /** Nome do tipo (`"Future"`, `"UserEntity"`); `null` em Function e Record. */
  readonly name: string | null;
  /** `p.User` → `"p"` */
  readonly prefix: string | null;
  /** `Map<String, int>` → `[String, int]` */
  readonly typeArguments: readonly DartType[];
  /** Tipo do `dart:core`/`dart:async` pelo nome, sem prefixo. */
  readonly builtin: DartBuiltinType | null;
  /** Function: tipo de retorno (`null` se omitido). */
  readonly returnType: DartType | null;
  /** Function: parâmetros. */
  readonly parameters: readonly DartFunctionTypeParameter[];
  /** Record: campos. */
  readonly recordFields: readonly DartRecordField[];
  /** @internal Use os tipos expostos pelo modelo (`field.type`, `method.returnType`...). */
  constructor(init: {
    kind: DartTypeKind;
    text: string;
    canonical: string;
    isNullable: boolean;
    nullability: Nullability;
    name?: string | null;
    prefix?: string | null;
    typeArguments?: DartType[];
    returnType?: DartType | null;
    parameters?: DartFunctionTypeParameter[];
    recordFields?: DartRecordField[];
  });
  private is;
  get isString(): boolean;
  get isBool(): boolean;
  get isInt(): boolean;
  /** Dart não tem `float`: ponto flutuante é `double`. */
  get isDouble(): boolean;
  get isNum(): boolean;
  /** `int`, `double` ou `num`. */
  get isNumeric(): boolean;
  get isDateTime(): boolean;
  get isDynamic(): boolean;
  get isVoid(): boolean;
  get isObject(): boolean;
  get isList(): boolean;
  get isMap(): boolean;
  get isSet(): boolean;
  get isIterable(): boolean;
  get isFuture(): boolean;
  get isFutureOr(): boolean;
  get isStream(): boolean;
  /** Tipo de função escrito com `Function(...)` (o tipo `Function` puro é `builtin`). */
  get isFunction(): boolean;
  get isRecord(): boolean;
  /** `Future<X>`/`FutureOr<X>` → `X`; qualquer outro tipo devolve ele mesmo. */
  unwrapFuture(): DartType;
  /** Compara a forma canônica (aceita o texto: `type.equals("List<int>")`). */
  equals(other: DartType | string): boolean;
  /** O próprio tipo ou algum tipo dentro dele (argumentos, retorno, parâmetros, record) satisfaz `predicate`. */
  some(predicate: (type: DartType) => boolean): boolean;
  toString(): string;
}
/**
 * Tipo dos tokens `[from, to]`. `typeParams`: nomes de parâmetros de tipo
 * visíveis (classe/método), que ficam com `Nullability.Unknown`.
 * @internal
 */
export declare function parseDartType(
  lx: Lexed,
  from: number,
  to: number,
  typeParams?: ReadonlySet<string>
): DartType | null;
