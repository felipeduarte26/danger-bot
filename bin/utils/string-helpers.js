/**
 * STRING HELPERS
 * ==============
 * Funções utilitárias para manipulação de strings
 */

/**
 * Converter para kebab-case
 * @param {string} str
 * @returns {string}
 */
export function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Converter para camelCase
 * @param {string} str
 * @returns {string}
 */
export function toCamelCase(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase());
}

/**
 * Converter para PascalCase
 * @param {string} str
 * @returns {string}
 */
export function toPascalCase(str) {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
