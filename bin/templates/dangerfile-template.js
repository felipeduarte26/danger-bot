/**
 * DANGERFILE TEMPLATE
 * ===================
 * Template para geração de dangerfile
 */

/**
 * Gerar dangerfile de exemplo
 * @param {string[]} plugins - Lista de nomes dos plugins
 * @returns {string} - Conteúdo do dangerfile
 */
export function generateDangerfileTemplate(plugins) {
  return `/**
 * DANGER BOT - DANGERFILE
 * ========================
 * Auto-generated dangerfile with all available plugins
 */

// Import Danger types and functions
import { danger, message, warn, fail } from "danger";

// Import Danger Bot plugins
import {
  ${plugins.join(",\n  ")},
  runPlugins,
} from "@diletta/danger-bot";

// Configurar plugins ativos
const plugins = [
  ${plugins.join(",\n  ")},
];

// Executar análise
(async () => {
  try {
    const pr = danger.github?.pr || danger.bitbucket_cloud?.pr || danger.gitlab?.mr;
    
    if (pr) {
      message(
        \`🔍 **Danger CI** executando análise automática\\n\\n\` +
        \`**Título**: \${pr.title}\\n\` +
        \`📦 Plugins ativos: \${plugins.filter(p => p.config.enabled).length}/\${plugins.length}\`
      );
    }
    
    await runPlugins(plugins);
    message("✅ **Danger CI** - Análise concluída com sucesso!");

  } catch (error) {
    message("⚠️ **Erro no Danger CI**: Verifique os logs do CI.");
    throw error;
  }
})();
`;
}
