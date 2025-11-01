"use strict";
/**
 * DANGER PLUGIN INTERFACE
 * =========================
 * Interface padronizada para todos os plugins de Danger
 *
 * Cada plugin deve implementar esta interface para garantir
 * consistência e facilitar manutenção
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlugin = createPlugin;
exports.runPlugins = runPlugins;
/**
 * HELPER: Criar plugin facilmente
 */
function createPlugin(config, runFn) {
    return {
        config,
        run: runFn,
    };
}
/**
 * HELPER: Executar múltiplos plugins
 */
async function runPlugins(plugins) {
    for (const plugin of plugins) {
        if (!plugin.config.enabled) {
            console.log(`⏭️  Plugin '${plugin.config.name}' está desabilitado`);
            continue;
        }
        try {
            console.log(`⚡ Executando plugin: ${plugin.config.name}`);
            await plugin.run();
            console.log(`✅ Plugin '${plugin.config.name}' executado com sucesso`);
        }
        catch (error) {
            console.error(`❌ Erro no plugin '${plugin.config.name}':`, error);
            throw error;
        }
    }
}
