/**
 * Utilitários de texto compartilhados pelos plugins (nomes, palavras, distância).
 */
/** Utilitários estáticos de texto para identificadores Dart. */
export declare class DartText {
  private constructor();
  /**
   * Palavras de um identificador, em minúsculas: `getUserHTTPData` →
   * `["get", "user", "http", "data"]`, `user_name` → `["user", "name"]`.
   * `_` inicial é ignorado.
   */
  static splitWords(identifier: string): string[];
  /** `UserEntity` → `user_entity`, `HTTPClient` → `http_client`. */
  static toSnakeCase(name: string): string;
  /** `user_entity` → `UserEntity`. */
  static toPascalCase(name: string): string;
  /** `user_entity` → `userEntity`. */
  static toCamelCase(name: string): string;
  /** Distância de edição (inserção, remoção, troca). */
  static levenshtein(a: string, b: string): number;
  /** `ação` → `acao`. */
  static stripAccents(text: string): string;
  /** Sigla escrita em maiúsculas (`HTTP`, `CNPJ`, `ID`): 2 ou mais letras, todas maiúsculas. */
  static isLikelyAcronym(word: string): boolean;
}
