"use strict";
/**
 * Utilitários de texto compartilhados pelos plugins (nomes, palavras, distância).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DartText = void 0;
/** Utilitários estáticos de texto para identificadores Dart. */
class DartText {
  constructor() {
    // só métodos estáticos
  }
  /**
   * Palavras de um identificador, em minúsculas: `getUserHTTPData` →
   * `["get", "user", "http", "data"]`, `user_name` → `["user", "name"]`.
   * `_` inicial é ignorado.
   */
  static splitWords(identifier) {
    return DartText.toSnakeCase(identifier.replace(/^[_$]+/, ""))
      .split(/[_$]+/)
      .filter((w) => w.length > 0);
  }
  /** `UserEntity` → `user_entity`, `HTTPClient` → `http_client`. */
  static toSnakeCase(name) {
    return name
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
      .toLowerCase();
  }
  /** `user_entity` → `UserEntity`. */
  static toPascalCase(name) {
    return name
      .split(/[_\-\s]+/)
      .filter((w) => w.length > 0)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join("");
  }
  /** `user_entity` → `userEntity`. */
  static toCamelCase(name) {
    const pascal = DartText.toPascalCase(name);
    return pascal.length > 0 ? pascal[0].toLowerCase() + pascal.slice(1) : pascal;
  }
  /** Distância de edição (inserção, remoção, troca). */
  static levenshtein(a, b) {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const current = [i];
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      }
      previous = current;
    }
    return previous[b.length];
  }
  /** `ação` → `acao`. */
  static stripAccents(text) {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  /** Sigla escrita em maiúsculas (`HTTP`, `CNPJ`, `ID`): 2 ou mais letras, todas maiúsculas. */
  static isLikelyAcronym(word) {
    return /^[A-Z][A-Z0-9]+$/.test(word);
  }
}
exports.DartText = DartText;
