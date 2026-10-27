/**
 * PLUGIN TEMPLATE
 * ===============
 * Templates para criação de novos plugins, sobre o modelo Dart e no padrão
 * obrigatório das mensagens. Cada tipo de regra tem um template em
 * templates/plugins/<tipo>.ts.tpl (docs/CRIANDO_PLUGINS.md).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { toKebabCase } from "../utils/string-helpers.js";

const TEMPLATES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "plugins");

/**
 * Tipos de regra do create-plugin: o template e as constantes de exemplo que
 * precisam ser trocadas pela regra real.
 */
export const PLUGIN_KINDS = [
  {
    id: "call",
    label: "Call",
    hint: "file.calls() — e.g. replace one API with another",
    replace: "WRONG_CALL, RIGHT_CALL",
  },
  {
    id: "class",
    label: "Class/structure",
    hint: "file.classes, cls.hasMember(), Presence — e.g. a model without a required method",
    replace: "TARGET_FOLDER, REQUIRED_MEMBER, the example member",
  },
  {
    id: "diff",
    label: "Text added in the PR",
    hint: "readWithDiff + file.strings (warn) — e.g. hardcoded text in Text()",
    replace: "TARGET_CALLEE, the fixed value",
  },
  {
    id: "path",
    label: "Path/file",
    hint: "file.path — e.g. a usecases file without the _usecase.dart suffix",
    replace: "TARGET_FOLDER, REQUIRED_SUFFIX",
  },
];

/**
 * Gerar o código do plugin
 * @param {string} name - Nome do plugin
 * @param {string} description - Descrição do plugin
 * @param {boolean} enabled - Se está habilitado por padrão
 * @param {string} [kind] - Tipo de regra (`PLUGIN_KINDS[].id`); padrão: `call`
 * @returns {string} - Código do plugin
 */
export function generatePluginTemplate(name, description, enabled, kind = "call") {
  const template = fs.readFileSync(path.join(TEMPLATES_DIR, `${kind}.ts.tpl`), "utf-8");
  const values = {
    __PLUGIN_TITLE__: name,
    __HEADER_DESCRIPTION__: description.replace(/\*\//g, "*\\/"),
    __PLUGIN_NAME__: toKebabCase(name),
    __DESCRIPTION_JSON__: JSON.stringify(description),
    __ENABLED__: String(enabled),
  };
  return template.replace(/__[A-Z_]+__/g, (key) => values[key] ?? key);
}

/**
 * Gerar barrel file do plugin
 * @param {string} kebabName - Nome do plugin em kebab-case
 * @returns {string} - Código do barrel file
 */
export function generatePluginBarrel(kebabName) {
  return `export { default } from "./${kebabName}";\n`;
}

/**
 * Gerar barrel file da plataforma
 * @param {string} platformName - Nome da plataforma
 * @returns {string} - Código do barrel file
 */
export function generatePlatformBarrel(platformName) {
  return `/**
 * ${platformName.toUpperCase()} PLUGINS - BARREL FILE
 * ${"=".repeat(platformName.length + 23)}
 * Exporta todos os plugins relacionados ao ${platformName}
 */

// Export all ${platformName} plugins
// Plugins will be automatically added here by CLI
`;
}
