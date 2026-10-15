/**
 * PLUGIN TEMPLATE
 * ===============
 * Template para criação de novos plugins, no padrão obrigatório das mensagens
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
  const headerDescription = description.replace(/\*\//g, "*\\/");

  return `/**
 * ${name}
 * ${headerDescription}
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

const PATTERN = /\\bpadraoProblematico\\(/;
const REPLACEMENT = "padraoCorreto(";

export default createPlugin(
  {
    name: "${kebabName}",
    description: ${JSON.stringify(description)},
    enabled: ${enabled},
  },
  async () => {
    const { git } = getDanger();

    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        fs.existsSync(f)
    );

    for (const file of dartFiles) {
      const lines = fs.readFileSync(file, "utf-8").split("\\n");

      for (let i = 0; i < lines.length; i++) {
        if (!PATTERN.test(lines[i])) continue;

        const wrong = lines[i].trim(); // código REAL do arquivo
        const fixed = wrong.replace(PATTERN, REPLACEMENT); // a mesma linha, já corrigida

        sendFormattedFail({
          title: "TITULO FIXO EM CAPS", // chave do resumo: sem dados variáveis
          description:
            "Por que \`padraoProblematico()\` é um problema (1-2 linhas, **negrito** no essencial).",
          problem: {
            wrong,
            correct: fixed,
            wrongLabel: "Efeito do código atual",
            correctLabel: "O que muda com a correção",
          },
          action: { text: "Substitua por:", code: fixed },
          objective: "Benefício da correção em uma frase.",
          reference: { text: "Nome da doc oficial", url: "https://api.flutter.dev/" },
          file,
          line: i + 1,
        });
      }
    }
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
