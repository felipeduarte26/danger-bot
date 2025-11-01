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
exports.executeDangerBot = executeDangerBot;
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
/**
 * Execute Danger Bot with plugins - Simplifies dangerfile.ts
 *
 * @param plugins - Array of plugins to run
 * @param callbacks - Optional callbacks for lifecycle hooks
 *
 * @example
 * executeDangerBot(allFlutterPlugins, {
 *   onBeforeRun: () => {
 *     message("Starting Danger CI...");
 *     return true;
 *   },
 *   onSuccess: () => message("✅ Success!"),
 *   onError: (error) => warn(`⚠️ Error: ${error.message}`)
 * });
 */
function executeDangerBot(plugins, callbacks) {
    (async () => {
        try {
            // Call onBeforeRun
            if (callbacks?.onBeforeRun) {
                const shouldContinue = await callbacks.onBeforeRun();
                if (shouldContinue === false) {
                    return;
                }
            }
            // Run all plugins
            await runPlugins(plugins);
            // Call onSuccess
            if (callbacks?.onSuccess) {
                await callbacks.onSuccess();
            }
        }
        catch (error) {
            // Call onError
            if (callbacks?.onError) {
                await callbacks.onError(error instanceof Error ? error : new Error(String(error)));
            }
            console.error("Danger Bot execution error:", error);
        }
        finally {
            // Call onFinally
            if (callbacks?.onFinally) {
                await callbacks.onFinally();
            }
        }
    })();
}
