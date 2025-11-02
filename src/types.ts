/**
 * DANGER PLUGIN INTERFACE
 * =========================
 * Interface padronizada para todos os plugins de Danger
 *
 * Cada plugin deve implementar esta interface para garantir
 * consistência e facilitar manutenção
 */

// Não importar tipos do Danger - usar 'any' para evitar problemas de ESM
// O Danger JS injeta o objeto 'danger' em runtime

// Re-exportar helpers para facilitar imports
export { getDanger, sendMessage, sendWarn, sendFail, sendMarkdown, scheduleTask } from "./helpers";

export interface DangerPluginConfig {
  /** Nome do plugin para identificação em logs */
  name: string;
  /** Descrição do que o plugin faz */
  description: string;
  /** Se o plugin está ativo (permite desabilitar temporariamente) */
  enabled: boolean;
}

export interface DangerPlugin {
  /** Configuração do plugin */
  config: DangerPluginConfig;

  /**
   * Método principal que executa a lógica do plugin
   * @returns Promise que resolve quando a execução termina
   */
  run(): Promise<void>;
}

/**
 * HELPER: Criar plugin facilmente
 */
export function createPlugin(
  config: DangerPluginConfig,
  runFn: () => Promise<void>
): DangerPlugin {
  return {
    config,
    run: runFn,
  };
}

/**
 * HELPER: Execute list of plugins sequentially
 *
 * @param plugins - Array of plugins to run
 */
export async function runPlugins(plugins: DangerPlugin[]): Promise<void> {
  for (const plugin of plugins) {
    if (!plugin.config.enabled) {
      console.log(`⏭️  Plugin '${plugin.config.name}' está desabilitado`);
      continue;
    }

    try {
      console.log(`⚡ Executando plugin: ${plugin.config.name}`);
      await plugin.run();
      console.log(`✅ Plugin '${plugin.config.name}' executado com sucesso`);
    } catch (error) {
      console.error(`❌ Erro no plugin '${plugin.config.name}':`, error);
      throw error;
    }
  }
}

/**
 * Callback options for executeDangerBot
 */
export interface DangerBotCallbacks {
  /**
   * Called before running plugins
   * Return false to cancel execution
   */
  onBeforeRun?: () => boolean | Promise<boolean>;

  /**
   * Called after all plugins run successfully
   */
  onSuccess?: () => void | Promise<void>;

  /**
   * Called if any error occurs
   */
  onError?: (error: Error) => void | Promise<void>;

  /**
   * Called after everything (success or error)
   */
  onFinally?: () => void | Promise<void>;
}

/**
 * Execute Danger Bot with plugins - Simplifies dangerfile.ts
 *
 * @param plugins - Array of plugins to run
 * @param callbacks - Optional callbacks for lifecycle hooks
 *
 * @example
 * import { executeDangerBot, getDanger, sendMessage, sendWarn } from "@diletta/danger-bot";
 * 
 * executeDangerBot([pluginTestPlugin], {
 *   onBeforeRun: () => {
 *     const pr = getDanger().github?.pr;
 *     sendMessage("Starting Danger CI...");
 *     return true;
 *   },
 *   onSuccess: () => sendMessage("✅ Success!"),
 *   onError: (error) => sendWarn(`⚠️ Error: ${error.message}`)
 * });
 */
export function executeDangerBot(
  plugins: DangerPlugin[],
  callbacks?: DangerBotCallbacks
): void {
  (async () => {
    try {
      if (callbacks?.onBeforeRun) {
        const shouldContinue = await callbacks.onBeforeRun();
        if (shouldContinue === false) {
          return;
        }
      }

      await runPlugins(plugins);

      if (callbacks?.onSuccess) {
        await callbacks.onSuccess();
      }
    } catch (error) {
      if (callbacks?.onError) {
        await callbacks.onError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
      console.error("Danger Bot execution error:", error);
    } finally {
      if (callbacks?.onFinally) {
        await callbacks.onFinally();
      }
    }
  })();
}
