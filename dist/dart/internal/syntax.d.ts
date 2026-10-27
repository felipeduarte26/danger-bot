/**
 * Parser das declarações Dart (classes, enums, membros, parâmetros) sobre os
 * tokens do lexer. Uso interno do modelo em `src/dart` e do primary-constructors.
 */
import { Token, Lexed } from "./lexer";
export interface Annotation {
  name: string;
  startTok: number;
  endTok: number;
}
export interface TypeDecl {
  kind: "class" | "enum";
  name: string;
  firstTok: number;
  keywordTok: number;
  nameTok: number;
  typeParamsText: string;
  modifiers: string[];
  annotations: Annotation[];
  hasPrimary: boolean;
  isMixinApplication: boolean;
  /** `(` da lista de parâmetros do primary constructor no cabeçalho (-1 se não houver). */
  primaryParamsOpenTok: number;
  /** Nome do primary constructor (`Classe.nome`), null quando sem nome. */
  primaryName: string | null;
  primaryIsConst: boolean;
  clausesText: string;
  bodyOpenTok: number;
  endTok: number;
}
export interface FieldVar {
  name: string;
  /** Token do nome. */
  nameTok: number;
  initStartTok: number;
  initEndTok: number;
}
export interface FieldMember {
  kind: "field";
  startTok: number;
  endTok: number;
  headTok: number;
  annotations: Annotation[];
  modifiers: Set<string>;
  typeText: string | null;
  /** Intervalo de tokens do tipo declarado (-1 quando não há tipo). */
  typeStartTok: number;
  typeEndTok: number;
  vars: FieldVar[];
}
export interface InitializerElement {
  kind: "field" | "assert" | "super" | "redirect" | "unknown";
  startTok: number;
  endTok: number;
  fieldName: string | null;
  exprStartTok: number;
}
export interface ParamInfo {
  section: "positional" | "optional" | "named";
  startTok: number;
  endTok: number;
  annotations: Annotation[];
  isRequired: boolean;
  isCovariant: boolean;
  modifier: string | null;
  kind: "this" | "super" | "plain";
  typeText: string | null;
  /** Intervalo de tokens do tipo declarado (-1 quando não há tipo). */
  typeStartTok: number;
  typeEndTok: number;
  name: string;
  nameTok: number;
  /** Primeiro token do valor padrão (-1 quando não há `= valor`). */
  defaultStartTok: number;
  functionTyped: boolean;
}
export interface ConstructorMember {
  kind: "constructor";
  startTok: number;
  endTok: number;
  headTok: number;
  annotations: Annotation[];
  isConst: boolean;
  isExternal: boolean;
  isFactory: boolean;
  name: string | null;
  paramsOpenTok: number;
  paramsCloseTok: number;
  params: ParamInfo[] | null;
  initializers: InitializerElement[];
  isRedirecting: boolean;
  bodyOpenTok: number;
  bodyCloseTok: number;
}
export interface OtherMember {
  kind: "method";
  startTok: number;
  endTok: number;
  headTok: number;
  annotations: Annotation[];
  /** Nome do método/getter/setter (null para operadores). */
  name: string | null;
  /** Método comum, getter, setter ou operador. */
  memberKind: "method" | "getter" | "setter" | "operator";
  modifiers: Set<string>;
  /** Primeiro token depois dos modificadores: início do tipo de retorno. */
  declTok: number;
  /** Token do nome (no operador, o primeiro token do símbolo). */
  nameTok: number;
  /** `<` dos parâmetros de tipo do método (-1 se não houver). */
  typeParamsOpenTok: number;
  /** `(` e `)` da lista de parâmetros (-1 no getter). */
  paramsOpenTok: number;
  paramsCloseTok: number;
  /** `{` do corpo, `=>` do corpo de expressão ou `;` (sem corpo). */
  bodyTok: number;
}
/** Dados do cabeçalho de um método já identificados pelo `parseMember`. */
interface MethodHead {
  memberKind: OtherMember["memberKind"];
  modifiers: Set<string>;
  declTok: number;
  nameTok: number;
  typeParamsOpenTok: number;
}
export type Member = FieldMember | ConstructorMember | OtherMember;
export interface ParsedBody {
  members: Member[];
  /** Token `;` que encerra os valores do enum (-1 se não houver). */
  entriesEndTok: number;
}
export declare const DECL_MODIFIERS: Set<string>;
export declare const MEMBER_MODIFIERS: Set<string>;
export declare function parseAnnotation(tokens: Token[], at: number): Annotation | null;
/** Encontra as declarações `class` e `enum` de nível superior. */
export declare function scanTypeDeclarations(lx: Lexed): TypeDecl[];
export declare function parseTypeDecl(
  lx: Lexed,
  keywordTok: number,
  declStart: number
): TypeDecl | null;
export declare function parseBody(lx: Lexed, decl: TypeDecl): ParsedBody | null;
export declare function parseMember(
  lx: Lexed,
  startTok: number,
  limit: number,
  className: string
): Member | null;
/**
 * Métodos, getters, setters e operadores: onde terminam, a lista de parâmetros
 * (o primeiro `(` depois do nome) e o início do corpo.
 */
export declare function parseMethodLike(
  lx: Lexed,
  startTok: number,
  headTok: number,
  from: number,
  limit: number,
  annotations: Annotation[],
  name: string | null,
  head: MethodHead
): OtherMember | null;
export declare function parseField(
  lx: Lexed,
  startTok: number,
  headTok: number,
  declTok: number,
  limit: number,
  modifiers: Set<string>,
  annotations: Annotation[]
): FieldMember | null;
export declare function parseConstructor(
  lx: Lexed,
  startTok: number,
  headTok: number,
  at: number,
  limit: number,
  modifiers: Set<string>,
  annotations: Annotation[],
  className: string
): ConstructorMember | null;
export declare function classifyInitializer(
  tokens: Token[],
  from: number,
  to: number
): InitializerElement;
export declare function parseParams(lx: Lexed, open: number, close: number): ParamInfo[] | null;
export declare function parseParam(
  lx: Lexed,
  from: number,
  to: number,
  section: ParamInfo["section"]
): ParamInfo | null;
export {};
