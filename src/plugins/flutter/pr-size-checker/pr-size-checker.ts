/**
 * 🔍 PR SIZE CHECKER PLUGIN
 * ========================
 * Verifica o tamanho do PR e alerta se está muito grande
 */

import { createPlugin } from "@types";

export default createPlugin(
  {
    name: "pr-size-checker",
    description: "Verifica se o PR não está muito grande",
    enabled: true,
  },
  async () => {
    const { additions = 0, deletions = 0 } = danger.github?.pr || danger.bitbucket_cloud?.pr || {};
    const totalChanges = additions + deletions;

    // Configurações
    const LARGE_PR_THRESHOLD = 500;
    const VERY_LARGE_PR_THRESHOLD = 1000;

    if (totalChanges > VERY_LARGE_PR_THRESHOLD) {
      warn(
        `🚨 **PR MUITO GRANDE** (${totalChanges} linhas)\n\n` +
        `Este PR tem **${additions} adições** e **${deletions} deleções**.\n\n` +
        `**Recomendação**: Considere dividir em PRs menores para facilitar a revisão.\n\n` +
        `PRs menores são:\n` +
        `- ✅ Mais fáceis de revisar\n` +
        `- ✅ Menos propensos a bugs\n` +
        `- ✅ Mais rápidos para merge`
      );
    } else if (totalChanges > LARGE_PR_THRESHOLD) {
      warn(
        `⚠️ **PR Grande** (${totalChanges} linhas)\n\n` +
        `Este PR tem **${additions} adições** e **${deletions} deleções**.\n\n` +
        `Considere revisar se pode ser dividido em partes menores.`
      );
    } else {
      message(`✅ **Tamanho do PR**: ${totalChanges} linhas (OK)`);
    }
  }
);

