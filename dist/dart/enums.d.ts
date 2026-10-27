/**
 * Enums do modelo Dart.
 *
 * Todos são string enums: o valor é o texto que aparece no caminho ou no código
 * (`DartLayer.Domain === "domain"`). Plugin local em `.js` pode comparar com a
 * string; em `.ts` o compilador aceita `layer === "domain"` e rejeita erro de
 * digitação (`"domian"`).
 */
/** Camada da Clean Architecture. O valor é o nome da pasta: `inLayer(Domain)` = `includes("/domain/")`. */
export declare enum DartLayer {
  Domain = "domain",
  Data = "data",
  Presentation = "presentation",
  Core = "core",
}
/**
 * Pasta de papel arquitetural. O valor é o nome EXATO da pasta, sem sinônimos:
 * `usecase` (singular) não é `UseCases` — para ela, use `inFolder("usecase")`.
 */
export declare enum DartLayerFolder {
  Entities = "entities",
  Models = "models",
  Repositories = "repositories",
  UseCases = "usecases",
  DataSources = "datasources",
  Failures = "failures",
  ViewModels = "viewmodels",
}
/** Categoria do arquivo no PR (a ordem de avaliação é a ordem abaixo). */
export declare enum FileCategory {
  Generated = "generated",
  Test = "test",
  Dart = "dart",
  Config = "config",
  Asset = "asset",
  Docs = "docs",
  Other = "other",
}
/** Por que o arquivo é considerado gerado. */
export declare enum GeneratedReason {
  /** `.g.dart`, `.freezed.dart`, `.mocks.dart`... */
  FileSuffix = "fileSuffix",
  /** Pasta `generated/`, `.dart_tool/` ou `build/`. */
  Directory = "directory",
  /** `part 'x.g.dart';` no próprio arquivo. */
  GeneratedPart = "generatedPart",
  /** Comentário de cabeçalho como `// GENERATED CODE - DO NOT MODIFY BY HAND`. */
  GeneratedHeader = "generatedHeader",
}
/** Resposta de "existe?" quando o parser pode não ter reconhecido tudo. */
export declare enum Presence {
  Present = "present",
  Absent = "absent",
  /** A declaração tem trecho não reconhecido: não dá para afirmar ausência. */
  Unknown = "unknown",
}
/** Se o valor aceita `null`. */
export declare enum Nullability {
  Nullable = "nullable",
  NonNullable = "nonNullable",
  /** Sem tipo escrito (`var x`, `final x = ...`), `void` ou parâmetro de tipo (`T`). */
  Unknown = "unknown",
}
export declare enum DartDeclarationKind {
  Class = "class",
  Enum = "enum",
  Mixin = "mixin",
  Extension = "extension",
  ExtensionType = "extensionType",
  /** `class A = B with C;` */
  MixinApplication = "mixinApplication",
}
export declare enum DartClassModifier {
  Abstract = "abstract",
  Base = "base",
  Interface = "interface",
  Final = "final",
  Sealed = "sealed",
  Mixin = "mixin",
}
export declare enum DartMemberKind {
  Field = "field",
  Constructor = "constructor",
  Method = "method",
  Getter = "getter",
  Setter = "setter",
  Operator = "operator",
  /** Trecho do corpo que o parser não reconheceu. */
  Unknown = "unknown",
}
/** De onde vem o campo: corpo da classe ou parâmetro declarante do primary constructor (Dart 3.13). */
export declare enum DartFieldOrigin {
  Body = "body",
  PrimaryConstructor = "primaryConstructor",
}
export declare enum DartTypeKind {
  /** `String`, `List<int>?`, `p.User`, `T` */
  Named = "named",
  /** `bool Function(int)` — nunca é `isBool`. */
  Function = "function",
  /** `(int, String)`, `({int x})` */
  Record = "record",
}
/** Tipos de `dart:core`/`dart:async` reconhecidos pelo nome (sem prefixo de import). */
export declare enum DartBuiltinType {
  String = "String",
  Bool = "bool",
  Int = "int",
  Double = "double",
  Num = "num",
  BigInt = "BigInt",
  DateTime = "DateTime",
  Duration = "Duration",
  Uri = "Uri",
  Object = "Object",
  Dynamic = "dynamic",
  Void = "void",
  Never = "Never",
  Null = "Null",
  List = "List",
  Map = "Map",
  Set = "Set",
  Iterable = "Iterable",
  Future = "Future",
  FutureOr = "FutureOr",
  Stream = "Stream",
  Function = "Function",
}
export declare enum DartParameterKind {
  RequiredPositional = "requiredPositional",
  /** `[int x]` */
  OptionalPositional = "optionalPositional",
  /** `{int x}` / `{required int x}` */
  Named = "named",
}
export declare enum DartParameterSource {
  Plain = "plain",
  /** `this.x` */
  This = "this",
  /** `super.x` */
  Super = "super",
  /** `final int x` / `var int x` no primary constructor: declara o campo. */
  Declaring = "declaring",
}
export declare enum DartBodyKind {
  /** `{ ... }` */
  Block = "block",
  /** `=> expr;` */
  Arrow = "arrow",
  /** Abstrato, `external` ou só `;`. */
  None = "none",
}
export declare enum DartAsyncKind {
  Sync = "sync",
  Async = "async",
  SyncStar = "syncStar",
  AsyncStar = "asyncStar",
}
export declare enum DartDirectiveKind {
  Library = "library",
  Import = "import",
  Export = "export",
  Part = "part",
  PartOf = "partOf",
}
export declare enum DartUriKind {
  /** `dart:async` */
  Dart = "dart",
  /** `package:app/...` */
  Package = "package",
  /** `../x.dart` */
  Relative = "relative",
}
export declare enum DartCommentKind {
  /** `// ...` */
  Line = "line",
  /** `/// ...` */
  Doc = "doc",
  /** Comentário de bloco (aninhável). */
  Block = "block",
  /** Comentário de bloco de documentação (começa com barra e dois asteriscos). */
  DocBlock = "docBlock",
}
/** Comentários que são instrução para ferramenta, e não texto. */
export declare enum DartCommentDirective {
  /** `// ignore: regra` */
  Ignore = "ignore",
  /** `// ignore_for_file: regra` */
  IgnoreForFile = "ignoreForFile",
  Todo = "todo",
  Fixme = "fixme",
  /** `// danger:ignore` */
  DangerIgnore = "dangerIgnore",
  /** `// coverage:ignore-line` e afins */
  CoverageIgnore = "coverageIgnore",
  /** `// dart format off` / `on` */
  Format = "format",
  /** `// @dart=3.x` */
  LanguageVersion = "languageVersion",
}
/**
 * Papel sintático de uma string. Só é atribuído quando os tokens não deixam
 * dúvida; senão `Value` (o padrão) — o plugin que usa o papel para PULAR a
 * string decide como tratar o resto.
 */
export declare enum DartStringRole {
  /** URI de import/export/part */
  DirectiveUri = "directiveUri",
  /** Dentro dos argumentos de uma anotação: `@JsonKey(name: 'x')` */
  AnnotationArgument = "annotationArgument",
  /** Chave de map literal: `{'x': 1}` (não confunde com `c ? 'a' : 'b'`) */
  MapKey = "mapKey",
  /** Índice: `json['x']` */
  IndexKey = "indexKey",
  /** `case 'x':` */
  CaseLabel = "caseLabel",
  /** Argumento de chamada: ver `DartString.enclosingCallee` */
  CallArgument = "callArgument",
  /** Valor de variável, retorno, elemento de coleção... */
  Value = "value",
}
export declare enum DartStatementKind {
  Expression = "expression",
  VariableDeclaration = "variableDeclaration",
  LocalFunction = "localFunction",
  Return = "return",
  If = "if",
  For = "for",
  While = "while",
  Do = "do",
  Switch = "switch",
  Try = "try",
  Throw = "throw",
  Rethrow = "rethrow",
  Yield = "yield",
  Break = "break",
  Continue = "continue",
  Assert = "assert",
  Block = "block",
  Empty = "empty",
}
export declare enum DartExpressionKind {
  Call = "call",
  ListLiteral = "listLiteral",
  MapLiteral = "mapLiteral",
  SetLiteral = "setLiteral",
  StringLiteral = "stringLiteral",
  NumberLiteral = "numberLiteral",
  BoolLiteral = "boolLiteral",
  NullLiteral = "nullLiteral",
  /** `x` */
  Identifier = "identifier",
  /** `a.b.c` (sem chamada) */
  PropertyAccess = "propertyAccess",
  /** `(x) => ...` / `() { ... }` */
  Closure = "closure",
  /** `c ? a : b` */
  Conditional = "conditional",
  Other = "other",
}
/** Tipo de declaração de um identificador. */
export declare enum DartIdentifierKind {
  Class = "class",
  Enum = "enum",
  EnumValue = "enumValue",
  Mixin = "mixin",
  Extension = "extension",
  ExtensionType = "extensionType",
  Typedef = "typedef",
  TypeParameter = "typeParameter",
  Function = "function",
  Method = "method",
  Getter = "getter",
  Setter = "setter",
  Constructor = "constructor",
  Field = "field",
  TopLevelVariable = "topLevelVariable",
  LocalVariable = "localVariable",
  LocalFunction = "localFunction",
  Parameter = "parameter",
  CatchVariable = "catchVariable",
}
