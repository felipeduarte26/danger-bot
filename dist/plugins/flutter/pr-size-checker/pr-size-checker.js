"use strict";
/**
 * 🔍 PR SIZE CHECKER PLUGIN
 * ========================
 * Verifica o tamanho do PR e alerta se está muito grande
 */
Object.defineProperty(exports, "__esModule", { value: true });
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)({
    name: "pr-size-checker",
    description: "Verifica se o PR não está muito grande",
    enabled: true,
}, async () => {
    const d = (0, _types_1.getDanger)();
    const { additions = 0, deletions = 0 } = d.github?.pr || d.bitbucket_cloud?.pr || {};
    const totalChanges = additions + deletions;
    // Configurações
    const LARGE_PR_THRESHOLD = 500;
    const VERY_LARGE_PR_THRESHOLD = 1000;
    if (totalChanges > VERY_LARGE_PR_THRESHOLD) {
        (0, _types_1.sendWarn)(`🚨 **PR MUITO GRANDE** (${totalChanges} linhas)\n\n` +
            `Este PR tem **${additions} adições** e **${deletions} deleções**.\n\n` +
            `**Recomendação**: Considere dividir em PRs menores para facilitar a revisão.\n\n` +
            `PRs menores são:\n` +
            `- ✅ Mais fáceis de revisar\n` +
            `- ✅ Menos propensos a bugs\n` +
            `- ✅ Mais rápidos para merge`);
    }
    else if (totalChanges > LARGE_PR_THRESHOLD) {
        (0, _types_1.sendWarn)(`⚠️ **PR Grande** (${totalChanges} linhas)\n\n` +
            `Este PR tem **${additions} adições** e **${deletions} deleções**.\n\n` +
            `Considere revisar se pode ser dividido em partes menores.`);
    }
    else {
        (0, _types_1.sendMessage)(`✅ **Tamanho do PR**: ${totalChanges} linhas (OK)`);
    }
});
