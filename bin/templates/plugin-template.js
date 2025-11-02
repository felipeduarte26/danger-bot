/**
 * PLUGIN TEMPLATE
 * ===============
 * Template para criação de novos plugins
 */

import { toKebabCase } from "../utils/string-helpers.js";

/**
 * Gerar template de plugin
 * @param {string} name - Nome do plugin
 * @param {string} description - Descrição do plugin
 * @param {boolean} enabled - Se está habilitado por padrão
 * @returns {string} - Código do plugin
 */
export function generatePluginTemplate(name, description, enabled) {
  const kebabName = toKebabCase(name);

  return `/**
 * ${name.toUpperCase()} PLUGIN
 * ${"=".repeat(name.length + 7)}
 * ${description}
 */

import { createPlugin, getDanger, sendMessage, sendWarn, sendFail } from "@types";

export default createPlugin(
  {
    name: "${kebabName}",
    description: "${description}",
    enabled: ${enabled},
  },
  async () => {
    // TODO: Implement plugin logic
    
    // Acessar dados do Danger
    const d = getDanger();
    const modifiedFiles = d.git.modified_files;
    const createdFiles = d.git.created_files;
    const allFiles = [...modifiedFiles, ...createdFiles];
    
    // Enviar mensagens (com suporte a file e line opcionais)
    sendMessage(\`✅ Plugin ${kebabName} executed successfully!\`);
    
    // Exemplos com arquivo e linha específicos:
    // sendMessage("Mensagem específica", "path/to/file.dart", 42);
    // sendWarn("⚠️ Warning message", "path/to/file.dart", 100);
    // sendFail("❌ Error message", "path/to/file.dart", 200);
    
    // Outras opções:
    // sendWarn("⚠️ Warning message");
    // sendFail("❌ This will fail the build");
  }
);
`;
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
