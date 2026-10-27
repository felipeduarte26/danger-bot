/**
 * Modelo Dart compartilhado pelos plugins: leia o arquivo com
 * `DartFile.read(caminho)` e trabalhe com as propriedades (classes, campos,
 * métodos, tipos, chamadas...), sem regex sobre o texto.
 *
 * Guia completo: docs/MODELO_DART.md
 */
export * from "./enums";
export { DartText } from "./text";
export { DartPath, DartPackage, GENERATED_SUFFIXES, GENERATED_DIRS, TEST_DIRS } from "./path";
export { DartType, DartRecordField, DartFunctionTypeParameter } from "./type";
export type { DartRange, DartNode, DartDeclaration } from "./nodes";
export {
  DartNodeBase,
  DartAnnotation,
  DartComment,
  DartDoc,
  DartString,
  DartParameter,
  DartVariable,
  DartLocalVariable,
  DartExpression,
  DartArgument,
  DartCall,
  DartClosure,
  DartAwait,
  DartReturn,
  DartTry,
  DartCatch,
  DartStatement,
  DartBody,
  DartTypeParameter,
} from "./nodes";
export type { DartMember, DartClassMember } from "./declarations";
export {
  DartClass,
  DartUnknownMember,
  DartField,
  DartTopLevelVariable,
  DartFunction,
  DartMethod,
  DartInitializer,
  DartConstructor,
  DartEnumValue,
  DartTypedef,
  DartDirective,
} from "./declarations";
export { DartFile, DartIdentifier, DartParseError } from "./file";
