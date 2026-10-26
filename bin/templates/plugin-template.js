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
import { DartFile, createPlugin, sendFormattedFail } from "@types";

// Leia o código pelo modelo Dart (docs/MODELO_DART.md): classes, campos, métodos,
// tipos, chamadas, strings e comentários já vêm prontos, sem regex sobre o texto.
const WRONG_CALL = "padraoProblematico";
const RIGHT_CALL = "padraoCorreto";

export default createPlugin(
  {
    name: "${kebabName}",
    description: ${JSON.stringify(description)},
    enabled: ${enabled},
  },
  async () => {
    // .dart criados/modificados no PR, sem testes e sem arquivos gerados
    for (const file of DartFile.changed()) {
      for (const call of file.calls()) {
        if (call.name !== WRONG_CALL) continue;

        const wrong = call.lineText; // código REAL do arquivo (a linha da chamada)
        const fixed = wrong.replace(\`\${WRONG_CALL}(\`, \`\${RIGHT_CALL}(\`); // a mesma linha, já corrigida

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
          file: file.path.path,
          line: call.line,
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
