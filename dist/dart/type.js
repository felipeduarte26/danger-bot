"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DartType = exports.DartFunctionTypeParameter = exports.DartRecordField = void 0;
exports.parseDartType = parseDartType;
/**
 * DartType: um tipo escrito no código (`List<int>?`, `bool Function(int)`,
 * `(int, String)`), com a forma canônica e atalhos (`isString`, `isBool`...).
 */
const enums_1 = require("./enums");
const lexer_1 = require("./internal/lexer");
const BUILTINS = new Set(Object.values(enums_1.DartBuiltinType));
/** Campo de um record: `(int, {String name})`. */
class DartRecordField {
  constructor(name, type, isNamed) {
    this.name = name;
    this.type = type;
    this.isNamed = isNamed;
  }
}
exports.DartRecordField = DartRecordField;
/** Parâmetro de um tipo de função: `void Function(int index, {bool force})`. */
class DartFunctionTypeParameter {
  constructor(name, type, kind, isRequired) {
    this.name = name;
    this.type = type;
    this.kind = kind;
    this.isRequired = isRequired;
  }
}
exports.DartFunctionTypeParameter = DartFunctionTypeParameter;
/** Um tipo escrito no código. Criado pelo modelo (campos, parâmetros, retornos...). */
class DartType {
  /** @internal Use os tipos expostos pelo modelo (`field.type`, `method.returnType`...). */
  constructor(init) {
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
      this.kind === enums_1.DartTypeKind.Named &&
      this.prefix === null &&
      this.name &&
      BUILTINS.has(this.name)
        ? this.name
        : null;
  }
  is(type) {
    return this.builtin === type;
  }
  get isString() {
    return this.is(enums_1.DartBuiltinType.String);
  }
  get isBool() {
    return this.is(enums_1.DartBuiltinType.Bool);
  }
  get isInt() {
    return this.is(enums_1.DartBuiltinType.Int);
  }
  /** Dart não tem `float`: ponto flutuante é `double`. */
  get isDouble() {
    return this.is(enums_1.DartBuiltinType.Double);
  }
  get isNum() {
    return this.is(enums_1.DartBuiltinType.Num);
  }
  /** `int`, `double` ou `num`. */
  get isNumeric() {
    return this.isInt || this.isDouble || this.isNum;
  }
  get isDateTime() {
    return this.is(enums_1.DartBuiltinType.DateTime);
  }
  get isDynamic() {
    return this.is(enums_1.DartBuiltinType.Dynamic);
  }
  get isVoid() {
    return this.is(enums_1.DartBuiltinType.Void);
  }
  get isObject() {
    return this.is(enums_1.DartBuiltinType.Object);
  }
  get isList() {
    return this.is(enums_1.DartBuiltinType.List);
  }
  get isMap() {
    return this.is(enums_1.DartBuiltinType.Map);
  }
  get isSet() {
    return this.is(enums_1.DartBuiltinType.Set);
  }
  get isIterable() {
    return this.is(enums_1.DartBuiltinType.Iterable);
  }
  get isFuture() {
    return this.is(enums_1.DartBuiltinType.Future);
  }
  get isFutureOr() {
    return this.is(enums_1.DartBuiltinType.FutureOr);
  }
  get isStream() {
    return this.is(enums_1.DartBuiltinType.Stream);
  }
  /** Tipo de função escrito com `Function(...)` (o tipo `Function` puro é `builtin`). */
  get isFunction() {
    return this.kind === enums_1.DartTypeKind.Function;
  }
  get isRecord() {
    return this.kind === enums_1.DartTypeKind.Record;
  }
  /** `Future<X>`/`FutureOr<X>` → `X`; qualquer outro tipo devolve ele mesmo. */
  unwrapFuture() {
    if ((this.isFuture || this.isFutureOr) && this.typeArguments.length === 1) {
      return this.typeArguments[0];
    }
    return this;
  }
  /** Compara a forma canônica (aceita o texto: `type.equals("List<int>")`). */
  equals(other) {
    const text =
      typeof other === "string" ? other.replace(/\s+/g, "") : other.canonical.replace(/\s+/g, "");
    return this.canonical.replace(/\s+/g, "") === text;
  }
  /** O próprio tipo ou algum tipo dentro dele (argumentos, retorno, parâmetros, record) satisfaz `predicate`. */
  some(predicate) {
    if (predicate(this)) return true;
    if (this.typeArguments.some((t) => t.some(predicate))) return true;
    if (this.returnType?.some(predicate)) return true;
    if (this.parameters.some((p) => p.type?.some(predicate))) return true;
    return this.recordFields.some((f) => f.type.some(predicate));
  }
  toString() {
    return this.canonical;
  }
}
exports.DartType = DartType;
/**
 * Tipo dos tokens `[from, to]`. `typeParams`: nomes de parâmetros de tipo
 * visíveis (classe/método), que ficam com `Nullability.Unknown`.
 * @internal
 */
function parseDartType(lx, from, to, typeParams = new Set()) {
  const { tokens } = lx;
  if (from < 0 || to < from || to >= tokens.length) return null;
  const text = lx.source.slice(tokens[from].start, tokens[to].end);
  const canonical = (0, lexer_1.joinTokens)(lx, from, to);
  const isNullable = (0, lexer_1.isPunct)(tokens[to], "?");
  const coreTo = isNullable ? to - 1 : to;
  if (coreTo < from) return null;
  const base = { text, canonical, isNullable };
  // Tipo de função: o último `Function` no nível 0 cuja lista de parâmetros fecha no fim.
  for (let k = coreTo; k >= from; k--) {
    if (!(0, lexer_1.isIdent)(tokens[k], "Function") || (0, lexer_1.isPunct)(tokens[k - 1], "."))
      continue;
    let open = k + 1;
    if ((0, lexer_1.isPunct)(tokens[open], "<")) {
      const close = (0, lexer_1.matchTypeArgs)(tokens, open, coreTo + 1);
      if (close < 0) continue;
      open = close + 1;
    }
    if (
      !(0, lexer_1.isPunct)(tokens[open], "(") ||
      (0, lexer_1.matchClose)(tokens, open, coreTo + 1) !== coreTo
    )
      continue;
    return new DartType({
      ...base,
      kind: enums_1.DartTypeKind.Function,
      nullability: isNullable ? enums_1.Nullability.Nullable : enums_1.Nullability.NonNullable,
      returnType: k > from ? parseDartType(lx, from, k - 1, typeParams) : null,
      parameters: parseFunctionTypeParams(lx, open, coreTo, typeParams),
    });
  }
  // Record: `( ... )`
  if (
    (0, lexer_1.isPunct)(tokens[from], "(") &&
    (0, lexer_1.matchClose)(tokens, from, coreTo + 1) === coreTo
  ) {
    return new DartType({
      ...base,
      kind: enums_1.DartTypeKind.Record,
      nullability: isNullable ? enums_1.Nullability.Nullable : enums_1.Nullability.NonNullable,
      recordFields: parseRecordFields(lx, from, coreTo, typeParams),
    });
  }
  // Nomeado: [prefixo.]Nome[<args>]
  let j = from;
  let prefix = null;
  if (
    (0, lexer_1.isIdent)(tokens[j]) &&
    (0, lexer_1.isPunct)(tokens[j + 1], ".") &&
    (0, lexer_1.isIdent)(tokens[j + 2])
  ) {
    prefix = tokens[j].value;
    j += 2;
  }
  const name = (0, lexer_1.isIdent)(tokens[j]) ? tokens[j].value : null;
  const typeArguments = [];
  if (name !== null && (0, lexer_1.isPunct)(tokens[j + 1], "<")) {
    const close = (0, lexer_1.matchTypeArgs)(tokens, j + 1, coreTo + 1);
    if (close > 0) {
      for (const [a, b] of (0, lexer_1.splitTopLevelCommas)(tokens, j + 2, close - 1)) {
        const arg = parseDartType(lx, a, b, typeParams);
        if (arg) typeArguments.push(arg);
      }
    }
  }
  let nullability = enums_1.Nullability.NonNullable;
  if (isNullable || name === "dynamic" || name === "Null")
    nullability = enums_1.Nullability.Nullable;
  else if (name === "void" || (prefix === null && name !== null && typeParams.has(name))) {
    nullability = enums_1.Nullability.Unknown;
  }
  return new DartType({
    ...base,
    kind: enums_1.DartTypeKind.Named,
    nullability,
    name,
    prefix,
    typeArguments,
  });
}
/** Parâmetros de `Function( ... )`: `open`/`close` são os parênteses. */
function parseFunctionTypeParams(lx, open, close, typeParams) {
  const { tokens } = lx;
  const result = [];
  const addChunk = (a, b, kind) => {
    let q = a;
    while ((0, lexer_1.isPunct)(tokens[q], "@") && q <= b) {
      q++;
      while (q <= b && ((0, lexer_1.isIdent)(tokens[q]) || (0, lexer_1.isPunct)(tokens[q], ".")))
        q++;
      if ((0, lexer_1.isPunct)(tokens[q], "(")) q = (0, lexer_1.matchClose)(tokens, q, b + 1) + 1;
      if (q <= 0) return;
    }
    let isRequired = kind === enums_1.DartParameterKind.RequiredPositional;
    if ((0, lexer_1.isIdent)(tokens[q], "required")) {
      isRequired = true;
      q++;
    }
    if ((0, lexer_1.isIdent)(tokens[q], "covariant")) q++;
    if (q > b) return;
    const last = tokens[b];
    const before = tokens[b - 1];
    const hasName =
      b > q &&
      (0, lexer_1.isIdent)(last) &&
      !(0, lexer_1.isPunct)(before, ".") &&
      ((0, lexer_1.isIdent)(before) ||
        (0, lexer_1.isPunct)(before, ">") ||
        (0, lexer_1.isPunct)(before, "?") ||
        (0, lexer_1.isPunct)(before, ")"));
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
    if ((0, lexer_1.isPunct)(tokens[q], "[") || (0, lexer_1.isPunct)(tokens[q], "{")) {
      const groupClose = (0, lexer_1.matchClose)(tokens, q, close);
      if (groupClose < 0) break;
      const kind =
        tokens[q].value === "["
          ? enums_1.DartParameterKind.OptionalPositional
          : enums_1.DartParameterKind.Named;
      for (const [a, b] of (0, lexer_1.splitTopLevelCommas)(tokens, q + 1, groupClose - 1))
        addChunk(a, b, kind);
      q = groupClose + 1;
      continue;
    }
    const comma = (0, lexer_1.findAtDepth0)(tokens, q, close, [","]);
    const end = comma < 0 ? close - 1 : comma - 1;
    if (end >= q) addChunk(q, end, enums_1.DartParameterKind.RequiredPositional);
    q = comma < 0 ? close : comma + 1;
  }
  return result;
}
function parseRecordFields(lx, open, close, typeParams) {
  const { tokens } = lx;
  const fields = [];
  const addChunk = (a, b, isNamed) => {
    const last = tokens[b];
    const hasName =
      b > a && (0, lexer_1.isIdent)(last) && !(0, lexer_1.isPunct)(tokens[b - 1], ".");
    const type = parseDartType(lx, a, hasName ? b - 1 : b, typeParams);
    if (type) fields.push(new DartRecordField(hasName ? last.value : null, type, isNamed));
  };
  let q = open + 1;
  while (q < close) {
    if ((0, lexer_1.isPunct)(tokens[q], "{")) {
      const groupClose = (0, lexer_1.matchClose)(tokens, q, close);
      if (groupClose < 0) break;
      for (const [a, b] of (0, lexer_1.splitTopLevelCommas)(tokens, q + 1, groupClose - 1))
        addChunk(a, b, true);
      q = groupClose + 1;
      continue;
    }
    const comma = (0, lexer_1.findAtDepth0)(tokens, q, close, [","]);
    const end = comma < 0 ? close - 1 : comma - 1;
    if (end >= q) addChunk(q, end, false);
    q = comma < 0 ? close : comma + 1;
  }
  return fields;
}
