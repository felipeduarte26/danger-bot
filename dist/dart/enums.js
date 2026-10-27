"use strict";
/**
 * Enums do modelo Dart.
 *
 * Todos são string enums: o valor é o texto que aparece no caminho ou no código
 * (`DartLayer.Domain === "domain"`). Plugin local em `.js` pode comparar com a
 * string; em `.ts` o compilador aceita `layer === "domain"` e rejeita erro de
 * digitação (`"domian"`).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DartIdentifierKind =
  exports.DartExpressionKind =
  exports.DartStatementKind =
  exports.DartStringRole =
  exports.DartCommentDirective =
  exports.DartCommentKind =
  exports.DartUriKind =
  exports.DartDirectiveKind =
  exports.DartAsyncKind =
  exports.DartBodyKind =
  exports.DartParameterSource =
  exports.DartParameterKind =
  exports.DartBuiltinType =
  exports.DartTypeKind =
  exports.DartFieldOrigin =
  exports.DartMemberKind =
  exports.DartClassModifier =
  exports.DartDeclarationKind =
  exports.Nullability =
  exports.Presence =
  exports.GeneratedReason =
  exports.FileCategory =
  exports.DartLayerFolder =
  exports.DartLayer =
    void 0;
/** Camada da Clean Architecture. O valor é o nome da pasta: `inLayer(Domain)` = `includes("/domain/")`. */
var DartLayer;
(function (DartLayer) {
  DartLayer["Domain"] = "domain";
  DartLayer["Data"] = "data";
  DartLayer["Presentation"] = "presentation";
  DartLayer["Core"] = "core";
})(DartLayer || (exports.DartLayer = DartLayer = {}));
/**
 * Pasta de papel arquitetural. O valor é o nome EXATO da pasta, sem sinônimos:
 * `usecase` (singular) não é `UseCases` — para ela, use `inFolder("usecase")`.
 */
var DartLayerFolder;
(function (DartLayerFolder) {
  DartLayerFolder["Entities"] = "entities";
  DartLayerFolder["Models"] = "models";
  DartLayerFolder["Repositories"] = "repositories";
  DartLayerFolder["UseCases"] = "usecases";
  DartLayerFolder["DataSources"] = "datasources";
  DartLayerFolder["Failures"] = "failures";
  DartLayerFolder["ViewModels"] = "viewmodels";
})(DartLayerFolder || (exports.DartLayerFolder = DartLayerFolder = {}));
/** Categoria do arquivo no PR (a ordem de avaliação é a ordem abaixo). */
var FileCategory;
(function (FileCategory) {
  FileCategory["Generated"] = "generated";
  FileCategory["Test"] = "test";
  FileCategory["Dart"] = "dart";
  FileCategory["Config"] = "config";
  FileCategory["Asset"] = "asset";
  FileCategory["Docs"] = "docs";
  FileCategory["Other"] = "other";
})(FileCategory || (exports.FileCategory = FileCategory = {}));
/** Por que o arquivo é considerado gerado. */
var GeneratedReason;
(function (GeneratedReason) {
  /** `.g.dart`, `.freezed.dart`, `.mocks.dart`... */
  GeneratedReason["FileSuffix"] = "fileSuffix";
  /** Pasta `generated/`, `.dart_tool/` ou `build/`. */
  GeneratedReason["Directory"] = "directory";
  /** `part 'x.g.dart';` no próprio arquivo. */
  GeneratedReason["GeneratedPart"] = "generatedPart";
  /** Comentário de cabeçalho como `// GENERATED CODE - DO NOT MODIFY BY HAND`. */
  GeneratedReason["GeneratedHeader"] = "generatedHeader";
})(GeneratedReason || (exports.GeneratedReason = GeneratedReason = {}));
/** Resposta de "existe?" quando o parser pode não ter reconhecido tudo. */
var Presence;
(function (Presence) {
  Presence["Present"] = "present";
  Presence["Absent"] = "absent";
  /** A declaração tem trecho não reconhecido: não dá para afirmar ausência. */
  Presence["Unknown"] = "unknown";
})(Presence || (exports.Presence = Presence = {}));
/** Se o valor aceita `null`. */
var Nullability;
(function (Nullability) {
  Nullability["Nullable"] = "nullable";
  Nullability["NonNullable"] = "nonNullable";
  /** Sem tipo escrito (`var x`, `final x = ...`), `void` ou parâmetro de tipo (`T`). */
  Nullability["Unknown"] = "unknown";
})(Nullability || (exports.Nullability = Nullability = {}));
var DartDeclarationKind;
(function (DartDeclarationKind) {
  DartDeclarationKind["Class"] = "class";
  DartDeclarationKind["Enum"] = "enum";
  DartDeclarationKind["Mixin"] = "mixin";
  DartDeclarationKind["Extension"] = "extension";
  DartDeclarationKind["ExtensionType"] = "extensionType";
  /** `class A = B with C;` */
  DartDeclarationKind["MixinApplication"] = "mixinApplication";
})(DartDeclarationKind || (exports.DartDeclarationKind = DartDeclarationKind = {}));
var DartClassModifier;
(function (DartClassModifier) {
  DartClassModifier["Abstract"] = "abstract";
  DartClassModifier["Base"] = "base";
  DartClassModifier["Interface"] = "interface";
  DartClassModifier["Final"] = "final";
  DartClassModifier["Sealed"] = "sealed";
  DartClassModifier["Mixin"] = "mixin";
})(DartClassModifier || (exports.DartClassModifier = DartClassModifier = {}));
var DartMemberKind;
(function (DartMemberKind) {
  DartMemberKind["Field"] = "field";
  DartMemberKind["Constructor"] = "constructor";
  DartMemberKind["Method"] = "method";
  DartMemberKind["Getter"] = "getter";
  DartMemberKind["Setter"] = "setter";
  DartMemberKind["Operator"] = "operator";
  /** Trecho do corpo que o parser não reconheceu. */
  DartMemberKind["Unknown"] = "unknown";
})(DartMemberKind || (exports.DartMemberKind = DartMemberKind = {}));
/** De onde vem o campo: corpo da classe ou parâmetro declarante do primary constructor (Dart 3.13). */
var DartFieldOrigin;
(function (DartFieldOrigin) {
  DartFieldOrigin["Body"] = "body";
  DartFieldOrigin["PrimaryConstructor"] = "primaryConstructor";
})(DartFieldOrigin || (exports.DartFieldOrigin = DartFieldOrigin = {}));
var DartTypeKind;
(function (DartTypeKind) {
  /** `String`, `List<int>?`, `p.User`, `T` */
  DartTypeKind["Named"] = "named";
  /** `bool Function(int)` — nunca é `isBool`. */
  DartTypeKind["Function"] = "function";
  /** `(int, String)`, `({int x})` */
  DartTypeKind["Record"] = "record";
})(DartTypeKind || (exports.DartTypeKind = DartTypeKind = {}));
/** Tipos de `dart:core`/`dart:async` reconhecidos pelo nome (sem prefixo de import). */
var DartBuiltinType;
(function (DartBuiltinType) {
  DartBuiltinType["String"] = "String";
  DartBuiltinType["Bool"] = "bool";
  DartBuiltinType["Int"] = "int";
  DartBuiltinType["Double"] = "double";
  DartBuiltinType["Num"] = "num";
  DartBuiltinType["BigInt"] = "BigInt";
  DartBuiltinType["DateTime"] = "DateTime";
  DartBuiltinType["Duration"] = "Duration";
  DartBuiltinType["Uri"] = "Uri";
  DartBuiltinType["Object"] = "Object";
  DartBuiltinType["Dynamic"] = "dynamic";
  DartBuiltinType["Void"] = "void";
  DartBuiltinType["Never"] = "Never";
  DartBuiltinType["Null"] = "Null";
  DartBuiltinType["List"] = "List";
  DartBuiltinType["Map"] = "Map";
  DartBuiltinType["Set"] = "Set";
  DartBuiltinType["Iterable"] = "Iterable";
  DartBuiltinType["Future"] = "Future";
  DartBuiltinType["FutureOr"] = "FutureOr";
  DartBuiltinType["Stream"] = "Stream";
  DartBuiltinType["Function"] = "Function";
})(DartBuiltinType || (exports.DartBuiltinType = DartBuiltinType = {}));
var DartParameterKind;
(function (DartParameterKind) {
  DartParameterKind["RequiredPositional"] = "requiredPositional";
  /** `[int x]` */
  DartParameterKind["OptionalPositional"] = "optionalPositional";
  /** `{int x}` / `{required int x}` */
  DartParameterKind["Named"] = "named";
})(DartParameterKind || (exports.DartParameterKind = DartParameterKind = {}));
var DartParameterSource;
(function (DartParameterSource) {
  DartParameterSource["Plain"] = "plain";
  /** `this.x` */
  DartParameterSource["This"] = "this";
  /** `super.x` */
  DartParameterSource["Super"] = "super";
  /** `final int x` / `var int x` no primary constructor: declara o campo. */
  DartParameterSource["Declaring"] = "declaring";
})(DartParameterSource || (exports.DartParameterSource = DartParameterSource = {}));
var DartBodyKind;
(function (DartBodyKind) {
  /** `{ ... }` */
  DartBodyKind["Block"] = "block";
  /** `=> expr;` */
  DartBodyKind["Arrow"] = "arrow";
  /** Abstrato, `external` ou só `;`. */
  DartBodyKind["None"] = "none";
})(DartBodyKind || (exports.DartBodyKind = DartBodyKind = {}));
var DartAsyncKind;
(function (DartAsyncKind) {
  DartAsyncKind["Sync"] = "sync";
  DartAsyncKind["Async"] = "async";
  DartAsyncKind["SyncStar"] = "syncStar";
  DartAsyncKind["AsyncStar"] = "asyncStar";
})(DartAsyncKind || (exports.DartAsyncKind = DartAsyncKind = {}));
var DartDirectiveKind;
(function (DartDirectiveKind) {
  DartDirectiveKind["Library"] = "library";
  DartDirectiveKind["Import"] = "import";
  DartDirectiveKind["Export"] = "export";
  DartDirectiveKind["Part"] = "part";
  DartDirectiveKind["PartOf"] = "partOf";
})(DartDirectiveKind || (exports.DartDirectiveKind = DartDirectiveKind = {}));
var DartUriKind;
(function (DartUriKind) {
  /** `dart:async` */
  DartUriKind["Dart"] = "dart";
  /** `package:app/...` */
  DartUriKind["Package"] = "package";
  /** `../x.dart` */
  DartUriKind["Relative"] = "relative";
})(DartUriKind || (exports.DartUriKind = DartUriKind = {}));
var DartCommentKind;
(function (DartCommentKind) {
  /** `// ...` */
  DartCommentKind["Line"] = "line";
  /** `/// ...` */
  DartCommentKind["Doc"] = "doc";
  /** Comentário de bloco (aninhável). */
  DartCommentKind["Block"] = "block";
  /** Comentário de bloco de documentação (começa com barra e dois asteriscos). */
  DartCommentKind["DocBlock"] = "docBlock";
})(DartCommentKind || (exports.DartCommentKind = DartCommentKind = {}));
/** Comentários que são instrução para ferramenta, e não texto. */
var DartCommentDirective;
(function (DartCommentDirective) {
  /** `// ignore: regra` */
  DartCommentDirective["Ignore"] = "ignore";
  /** `// ignore_for_file: regra` */
  DartCommentDirective["IgnoreForFile"] = "ignoreForFile";
  DartCommentDirective["Todo"] = "todo";
  DartCommentDirective["Fixme"] = "fixme";
  /** `// danger:ignore` */
  DartCommentDirective["DangerIgnore"] = "dangerIgnore";
  /** `// coverage:ignore-line` e afins */
  DartCommentDirective["CoverageIgnore"] = "coverageIgnore";
  /** `// dart format off` / `on` */
  DartCommentDirective["Format"] = "format";
  /** `// @dart=3.x` */
  DartCommentDirective["LanguageVersion"] = "languageVersion";
})(DartCommentDirective || (exports.DartCommentDirective = DartCommentDirective = {}));
/**
 * Papel sintático de uma string. Só é atribuído quando os tokens não deixam
 * dúvida; senão `Value` (o padrão) — o plugin que usa o papel para PULAR a
 * string decide como tratar o resto.
 */
var DartStringRole;
(function (DartStringRole) {
  /** URI de import/export/part */
  DartStringRole["DirectiveUri"] = "directiveUri";
  /** Dentro dos argumentos de uma anotação: `@JsonKey(name: 'x')` */
  DartStringRole["AnnotationArgument"] = "annotationArgument";
  /** Chave de map literal: `{'x': 1}` (não confunde com `c ? 'a' : 'b'`) */
  DartStringRole["MapKey"] = "mapKey";
  /** Índice: `json['x']` */
  DartStringRole["IndexKey"] = "indexKey";
  /** `case 'x':` */
  DartStringRole["CaseLabel"] = "caseLabel";
  /** Argumento de chamada: ver `DartString.enclosingCallee` */
  DartStringRole["CallArgument"] = "callArgument";
  /** Valor de variável, retorno, elemento de coleção... */
  DartStringRole["Value"] = "value";
})(DartStringRole || (exports.DartStringRole = DartStringRole = {}));
var DartStatementKind;
(function (DartStatementKind) {
  DartStatementKind["Expression"] = "expression";
  DartStatementKind["VariableDeclaration"] = "variableDeclaration";
  DartStatementKind["LocalFunction"] = "localFunction";
  DartStatementKind["Return"] = "return";
  DartStatementKind["If"] = "if";
  DartStatementKind["For"] = "for";
  DartStatementKind["While"] = "while";
  DartStatementKind["Do"] = "do";
  DartStatementKind["Switch"] = "switch";
  DartStatementKind["Try"] = "try";
  DartStatementKind["Throw"] = "throw";
  DartStatementKind["Rethrow"] = "rethrow";
  DartStatementKind["Yield"] = "yield";
  DartStatementKind["Break"] = "break";
  DartStatementKind["Continue"] = "continue";
  DartStatementKind["Assert"] = "assert";
  DartStatementKind["Block"] = "block";
  DartStatementKind["Empty"] = "empty";
})(DartStatementKind || (exports.DartStatementKind = DartStatementKind = {}));
var DartExpressionKind;
(function (DartExpressionKind) {
  DartExpressionKind["Call"] = "call";
  DartExpressionKind["ListLiteral"] = "listLiteral";
  DartExpressionKind["MapLiteral"] = "mapLiteral";
  DartExpressionKind["SetLiteral"] = "setLiteral";
  DartExpressionKind["StringLiteral"] = "stringLiteral";
  DartExpressionKind["NumberLiteral"] = "numberLiteral";
  DartExpressionKind["BoolLiteral"] = "boolLiteral";
  DartExpressionKind["NullLiteral"] = "nullLiteral";
  /** `x` */
  DartExpressionKind["Identifier"] = "identifier";
  /** `a.b.c` (sem chamada) */
  DartExpressionKind["PropertyAccess"] = "propertyAccess";
  /** `(x) => ...` / `() { ... }` */
  DartExpressionKind["Closure"] = "closure";
  /** `c ? a : b` */
  DartExpressionKind["Conditional"] = "conditional";
  DartExpressionKind["Other"] = "other";
})(DartExpressionKind || (exports.DartExpressionKind = DartExpressionKind = {}));
/** Tipo de declaração de um identificador. */
var DartIdentifierKind;
(function (DartIdentifierKind) {
  DartIdentifierKind["Class"] = "class";
  DartIdentifierKind["Enum"] = "enum";
  DartIdentifierKind["EnumValue"] = "enumValue";
  DartIdentifierKind["Mixin"] = "mixin";
  DartIdentifierKind["Extension"] = "extension";
  DartIdentifierKind["ExtensionType"] = "extensionType";
  DartIdentifierKind["Typedef"] = "typedef";
  DartIdentifierKind["TypeParameter"] = "typeParameter";
  DartIdentifierKind["Function"] = "function";
  DartIdentifierKind["Method"] = "method";
  DartIdentifierKind["Getter"] = "getter";
  DartIdentifierKind["Setter"] = "setter";
  DartIdentifierKind["Constructor"] = "constructor";
  DartIdentifierKind["Field"] = "field";
  DartIdentifierKind["TopLevelVariable"] = "topLevelVariable";
  DartIdentifierKind["LocalVariable"] = "localVariable";
  DartIdentifierKind["LocalFunction"] = "localFunction";
  DartIdentifierKind["Parameter"] = "parameter";
  DartIdentifierKind["CatchVariable"] = "catchVariable";
})(DartIdentifierKind || (exports.DartIdentifierKind = DartIdentifierKind = {}));
