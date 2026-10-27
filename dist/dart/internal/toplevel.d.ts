/**
 * Leitura do nível superior de um arquivo Dart: diretivas, declarações de tipo
 * (class, enum, mixin, extension, extension type, mixin application), typedefs,
 * funções e variáveis. Um trecho não reconhecido vira `unknown` e a leitura
 * continua no próximo `;`/`}` do nível 0 — nunca lança exceção.
 */
import { Lexed } from "./lexer";
import { Annotation, FieldMember, OtherMember, TypeDecl } from "./syntax";
export type RawDeclKind =
  "class" | "enum" | "mixin" | "extension" | "extensionType" | "mixinApplication";
/** Declaração de tipo de nível superior. */
export interface RawTypeDecl {
  kind: RawDeclKind;
  /** `""` na extension sem nome. */
  name: string;
  /** -1 na extension sem nome. */
  nameTok: number;
  /** `class`/`enum`/`mixin`/`extension`. */
  keywordTok: number;
  /** Primeiro modificador (ou a palavra-chave). */
  headTok: number;
  /** Primeira anotação (ou `headTok`). */
  firstTok: number;
  modifiers: string[];
  annotations: Annotation[];
  isAugmentation: boolean;
  /** `<` dos parâmetros de tipo (-1 se não houver). */
  typeParamsOpenTok: number;
  /** `(` do primary constructor / representação da extension type (-1 se não houver). */
  primaryParamsOpenTok: number;
  primaryName: string | null;
  primaryIsConst: boolean;
  hasPrimary: boolean;
  /** Tokens das cláusulas (`extends`, `with`, `implements`, `on`); vazio se `end < start`. */
  clausesStartTok: number;
  clausesEndTok: number;
  /** `{` do corpo (-1 sem corpo). */
  bodyOpenTok: number;
  endTok: number;
}
export interface RawDirective {
  kind: "library" | "import" | "export" | "part" | "partOf";
  startTok: number;
  endTok: number;
}
export interface RawTypedef {
  name: string;
  nameTok: number;
  firstTok: number;
  headTok: number;
  annotations: Annotation[];
  typeParamsOpenTok: number;
  /** Tokens do tipo depois do `=` (-1 na sintaxe antiga `typedef void F(int x);`). */
  aliasStartTok: number;
  aliasEndTok: number;
  endTok: number;
}
export interface RawUnknown {
  startTok: number;
  endTok: number;
}
export interface TopLevel {
  directives: RawDirective[];
  types: RawTypeDecl[];
  typedefs: RawTypedef[];
  /** Funções, getters e setters de nível superior. */
  functions: OtherMember[];
  /** Declarações de variáveis de nível superior. */
  variables: FieldMember[];
  unknown: RawUnknown[];
}
/** Converte o `TypeDecl` do parser (class/enum) para a forma comum. */
export declare function fromTypeDecl(lx: Lexed, decl: TypeDecl): RawTypeDecl;
/** Fim de um trecho não reconhecido que começa em `from` (próximo `;` ou bloco `{}` do nível 0). */
export declare function skipUnknown(lx: Lexed, from: number, limit: number): number;
/** Lê todo o nível superior do arquivo. */
export declare function scanTopLevel(lx: Lexed): TopLevel;
