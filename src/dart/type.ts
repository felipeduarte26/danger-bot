/**
 * DartType: um tipo escrito no código (`List<int>?`, `bool Function(int)`,
 * `(int, String)`), com a forma canônica e atalhos (`isString`, `isBool`...).
 */
import { DartBuiltinType, DartParameterKind, DartTypeKind, Nullability } from "./enums";
import {
  Lexed,
  findAtDepth0,
  isIdent,
  isPunct,
  joinTokens,
  matchClose,
  matchTypeArgs,
  splitTopLevelCommas,
} from "./internal/lexer";

const BUILTINS = new Set<string>(Object.values(DartBuiltinType));

/** Campo de um record: `(int, {String name})`. */
export class DartRecordField {
  /** `null` no campo posicional. */
  readonly name: string | null;
  readonly type: DartType;
  /** `true` no campo nomeado (`{...}`). */
  readonly isNamed: boolean;

  constructor(name: string | null, type: DartType, isNamed: boolean) {
    this.name = name;
    this.type = type;
    this.isNamed = isNamed;
  }
}

/** Parâmetro de um tipo de função: `void Function(int index, {bool force})`. */
export class DartFunctionTypeParameter {
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
  ) {
    this.name = name;
    this.type = type;
    this.kind = kind;
    this.isRequired = isRequired;
  }
}

/** Um tipo escrito no código. Criado pelo modelo (campos, parâmetros, retornos...). */
export class DartType {
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
  }) {
    this.kind = init.kind;
    this.text = init.text;
    this.canonical = init.canonical;
    this.isNullable = init.isNullable;
    this.nullability = init.nullability;
    this.name = init.name ?? null;
    this.prefix = init.prefix ?? null;
    this.typeArguments = init.typeArguments ?? [];
    this.returnType = init.returnType ?? null;
    this.parameters = init.parameters ?? [];
    this.recordFields = init.recordFields ?? [];
    this.builtin =
      this.kind === DartTypeKind.Named &&
      this.prefix === null &&
      this.name &&
      BUILTINS.has(this.name)
        ? (this.name as DartBuiltinType)
        : null;
  }

  private is(type: DartBuiltinType): boolean {
    return this.builtin === type;
  }

  get isString(): boolean {
    return this.is(DartBuiltinType.String);
  }
  get isBool(): boolean {
    return this.is(DartBuiltinType.Bool);
  }
  get isInt(): boolean {
    return this.is(DartBuiltinType.Int);
  }
  /** Dart não tem `float`: ponto flutuante é `double`. */
  get isDouble(): boolean {
    return this.is(DartBuiltinType.Double);
  }
  get isNum(): boolean {
    return this.is(DartBuiltinType.Num);
  }
  /** `int`, `double` ou `num`. */
  get isNumeric(): boolean {
    return this.isInt || this.isDouble || this.isNum;
  }
  get isDateTime(): boolean {
    return this.is(DartBuiltinType.DateTime);
  }
  get isDynamic(): boolean {
    return this.is(DartBuiltinType.Dynamic);
  }
  get isVoid(): boolean {
    return this.is(DartBuiltinType.Void);
  }
  get isObject(): boolean {
    return this.is(DartBuiltinType.Object);
  }
  get isList(): boolean {
    return this.is(DartBuiltinType.List);
  }
  get isMap(): boolean {
    return this.is(DartBuiltinType.Map);
  }
  get isSet(): boolean {
    return this.is(DartBuiltinType.Set);
  }
  get isIterable(): boolean {
    return this.is(DartBuiltinType.Iterable);
  }
  get isFuture(): boolean {
    return this.is(DartBuiltinType.Future);
  }
  get isFutureOr(): boolean {
    return this.is(DartBuiltinType.FutureOr);
  }
  get isStream(): boolean {
    return this.is(DartBuiltinType.Stream);
  }
  /** Tipo de função escrito com `Function(...)` (o tipo `Function` puro é `builtin`). */
  get isFunction(): boolean {
    return this.kind === DartTypeKind.Function;
  }
  get isRecord(): boolean {
    return this.kind === DartTypeKind.Record;
  }

  /** `Future<X>`/`FutureOr<X>` → `X`; qualquer outro tipo devolve ele mesmo. */
  unwrapFuture(): DartType {
    if ((this.isFuture || this.isFutureOr) && this.typeArguments.length === 1) {
      return this.typeArguments[0];
    }
    return this;
  }

  /** Compara a forma canônica (aceita o texto: `type.equals("List<int>")`). */
  equals(other: DartType | string): boolean {
    const text =
      typeof other === "string" ? other.replace(/\s+/g, "") : other.canonical.replace(/\s+/g, "");
    return this.canonical.replace(/\s+/g, "") === text;
  }

  /** O próprio tipo ou algum tipo dentro dele (argumentos, retorno, parâmetros, record) satisfaz `predicate`. */
  some(predicate: (type: DartType) => boolean): boolean {
    if (predicate(this)) return true;
    if (this.typeArguments.some((t) => t.some(predicate))) return true;
    if (this.returnType?.some(predicate)) return true;
    if (this.parameters.some((p) => p.type?.some(predicate))) return true;
    return this.recordFields.some((f) => f.type.some(predicate));
  }

  toString(): string {
    return this.canonical;
  }
}

/**
 * Tipo dos tokens `[from, to]`. `typeParams`: nomes de parâmetros de tipo
 * visíveis (classe/método), que ficam com `Nullability.Unknown`.
 * @internal
 */
export function parseDartType(
  lx: Lexed,
  from: number,
  to: number,
  typeParams: ReadonlySet<string> = new Set()
): DartType | null {
  const { tokens } = lx;
  if (from < 0 || to < from || to >= tokens.length) return null;
  const text = lx.source.slice(tokens[from].start, tokens[to].end);
  const canonical = joinTokens(lx, from, to);
  const isNullable = isPunct(tokens[to], "?");
  const coreTo = isNullable ? to - 1 : to;
  if (coreTo < from) return null;
  const base = { text, canonical, isNullable };

  // Tipo de função: o último `Function` no nível 0 cuja lista de parâmetros fecha no fim.
  for (let k = coreTo; k >= from; k--) {
    if (!isIdent(tokens[k], "Function") || isPunct(tokens[k - 1], ".")) continue;
    let open = k + 1;
    if (isPunct(tokens[open], "<")) {
      const close = matchTypeArgs(tokens, open, coreTo + 1);
      if (close < 0) continue;
      open = close + 1;
    }
    if (!isPunct(tokens[open], "(") || matchClose(tokens, open, coreTo + 1) !== coreTo) continue;
    return new DartType({
      ...base,
      kind: DartTypeKind.Function,
      nullability: isNullable ? Nullability.Nullable : Nullability.NonNullable,
      returnType: k > from ? parseDartType(lx, from, k - 1, typeParams) : null,
      parameters: parseFunctionTypeParams(lx, open, coreTo, typeParams),
    });
  }

  // Record: `( ... )`
  if (isPunct(tokens[from], "(") && matchClose(tokens, from, coreTo + 1) === coreTo) {
    return new DartType({
      ...base,
      kind: DartTypeKind.Record,
      nullability: isNullable ? Nullability.Nullable : Nullability.NonNullable,
      recordFields: parseRecordFields(lx, from, coreTo, typeParams),
    });
  }

  // Nomeado: [prefixo.]Nome[<args>]
  let j = from;
  let prefix: string | null = null;
  if (isIdent(tokens[j]) && isPunct(tokens[j + 1], ".") && isIdent(tokens[j + 2])) {
    prefix = tokens[j].value;
    j += 2;
  }
  const name = isIdent(tokens[j]) ? tokens[j].value : null;
  const typeArguments: DartType[] = [];
  if (name !== null && isPunct(tokens[j + 1], "<")) {
    const close = matchTypeArgs(tokens, j + 1, coreTo + 1);
    if (close > 0) {
      for (const [a, b] of splitTopLevelCommas(tokens, j + 2, close - 1)) {
        const arg = parseDartType(lx, a, b, typeParams);
        if (arg) typeArguments.push(arg);
      }
    }
  }
  let nullability = Nullability.NonNullable;
  if (isNullable || name === "dynamic" || name === "Null") nullability = Nullability.Nullable;
  else if (name === "void" || (prefix === null && name !== null && typeParams.has(name))) {
    nullability = Nullability.Unknown;
  }
  return new DartType({
    ...base,
    kind: DartTypeKind.Named,
    nullability,
    name,
    prefix,
    typeArguments,
  });
}

/** Parâmetros de `Function( ... )`: `open`/`close` são os parênteses. */
function parseFunctionTypeParams(
  lx: Lexed,
  open: number,
  close: number,
  typeParams: ReadonlySet<string>
): DartFunctionTypeParameter[] {
  const { tokens } = lx;
  const result: DartFunctionTypeParameter[] = [];
  const addChunk = (a: number, b: number, kind: DartParameterKind): void => {
    let q = a;
    while (isPunct(tokens[q], "@") && q <= b) {
      q++;
      while (q <= b && (isIdent(tokens[q]) || isPunct(tokens[q], "."))) q++;
      if (isPunct(tokens[q], "(")) q = matchClose(tokens, q, b + 1) + 1;
      if (q <= 0) return;
    }
    let isRequired = kind === DartParameterKind.RequiredPositional;
    if (isIdent(tokens[q], "required")) {
      isRequired = true;
      q++;
    }
    if (isIdent(tokens[q], "covariant")) q++;
    if (q > b) return;
    const last = tokens[b];
    const before = tokens[b - 1];
    const hasName =
      b > q &&
      isIdent(last) &&
      !isPunct(before, ".") &&
      (isIdent(before) || isPunct(before, ">") || isPunct(before, "?") || isPunct(before, ")"));
    const typeEnd = hasName ? b - 1 : b;
    result.push(
      new DartFunctionTypeParameter(
        hasName ? last.value : null,
        parseDartType(lx, q, typeEnd, typeParams),
        kind,
        isRequired
      )
    );
  };
  let q = open + 1;
  while (q < close) {
    if (isPunct(tokens[q], "[") || isPunct(tokens[q], "{")) {
      const groupClose = matchClose(tokens, q, close);
      if (groupClose < 0) break;
      const kind =
        tokens[q].value === "[" ? DartParameterKind.OptionalPositional : DartParameterKind.Named;
      for (const [a, b] of splitTopLevelCommas(tokens, q + 1, groupClose - 1)) addChunk(a, b, kind);
      q = groupClose + 1;
      continue;
    }
    const comma = findAtDepth0(tokens, q, close, [","]);
    const end = comma < 0 ? close - 1 : comma - 1;
    if (end >= q) addChunk(q, end, DartParameterKind.RequiredPositional);
    q = comma < 0 ? close : comma + 1;
  }
  return result;
}

function parseRecordFields(
  lx: Lexed,
  open: number,
  close: number,
  typeParams: ReadonlySet<string>
): DartRecordField[] {
  const { tokens } = lx;
  const fields: DartRecordField[] = [];
  const addChunk = (a: number, b: number, isNamed: boolean): void => {
    const last = tokens[b];
    const hasName = b > a && isIdent(last) && !isPunct(tokens[b - 1], ".");
    const type = parseDartType(lx, a, hasName ? b - 1 : b, typeParams);
    if (type) fields.push(new DartRecordField(hasName ? last.value : null, type, isNamed));
  };
  let q = open + 1;
  while (q < close) {
    if (isPunct(tokens[q], "{")) {
      const groupClose = matchClose(tokens, q, close);
      if (groupClose < 0) break;
      for (const [a, b] of splitTopLevelCommas(tokens, q + 1, groupClose - 1)) addChunk(a, b, true);
      q = groupClose + 1;
      continue;
    }
    const comma = findAtDepth0(tokens, q, close, [","]);
    const end = comma < 0 ? close - 1 : comma - 1;
    if (end >= q) addChunk(q, end, false);
    q = comma < 0 ? close : comma + 1;
  }
  return fields;
}
