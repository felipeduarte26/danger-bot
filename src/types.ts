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
export {
  getDanger,
  sendMessage,
  sendWarn,
  sendFail,
  sendMarkdown,
  scheduleTask,
  getAllChangedFiles,
  getDartFiles,
  getDartFilesInDirectory,
  getDomainDartFiles,
  getDataDartFiles,
  getPresentationDartFiles,
  getFilesMatching,
  getFilesByExtension,
  hasFilesMatching,
  getFileContent,
  fileContainsPattern,
  getPRDescription,
  getPRTitle,
  getLinesChanged,
  isInLayer,
  setIgnoredFiles,
  getIgnoredFiles,
  setVerbose,
  isVerbose,
  verboseLog,
} from "./helpers";

export { loadConfig, loadLocalPlugins } from "./config";
export type { DangerBotConfig } from "./config";

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
export function createPlugin(config: DangerPluginConfig, runFn: () => Promise<void>): DangerPlugin {
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
  const { isVerbose } = await import("./helpers");
  const verbose = isVerbose();
  const totalStart = Date.now();

  if (verbose) {
    const enabled = plugins.filter((p) => p.config.enabled).length;
    const disabled = plugins.length - enabled;
    console.log(
      `[verbose] 🔌 ${plugins.length} plugin(s) total — ${enabled} ativo(s), ${disabled} desabilitado(s)`
    );
  }

  for (const plugin of plugins) {
    if (!plugin.config.enabled) {
      console.log(`⏭️  Plugin '${plugin.config.name}' está desabilitado`);
      continue;
    }

    try {
      const pluginStart = Date.now();
      console.log(`⚡ Executando plugin: ${plugin.config.name}`);
      await plugin.run();
      const elapsed = Date.now() - pluginStart;
      if (verbose) {
        console.log(`[verbose] ✅ ${plugin.config.name} — ${elapsed}ms`);
      } else {
        console.log(`✅ Plugin '${plugin.config.name}' executado com sucesso`);
      }
    } catch (error) {
      console.error(`❌ Erro no plugin '${plugin.config.name}':`, error);
      throw error;
    }
  }

  if (verbose) {
    const totalElapsed = Date.now() - totalStart;
    console.log(`[verbose] ⏱️  Tempo total de execução: ${totalElapsed}ms`);
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
 * Carrega automaticamente o arquivo `danger-bot.yaml` da raiz do projeto.
 * - `ignore_files`: arquivos ignorados por todos os plugins
 * - `local_plugins`: plugins locais do projeto, carregados e executados junto com os plugins padrão
 *
 * @param plugins - Array of plugins to run
 * @param callbacks - Optional callbacks for lifecycle hooks
 *
 * @example
 * ```typescript
 * import { executeDangerBot, allFlutterPlugins } from "@felipeduarte26/danger-bot";
 *
 * executeDangerBot(allFlutterPlugins, {
 *   onBeforeRun: () => {
 *     sendMessage("Starting Danger CI...");
 *     return true;
 *   },
 *   onSuccess: () => sendMessage("✅ Success!"),
 *   onError: (error) => sendWarn(`⚠️ Error: ${error.message}`)
 * });
 * ```
 */
export function executeDangerBot(plugins: DangerPlugin[], callbacks?: DangerBotCallbacks): void {
  void (async () => {
    try {
      const { loadConfig, loadLocalPlugins } = await import("./config");
      const { setIgnoredFiles, setVerbose, verboseLog } = await import("./helpers");

      const config = loadConfig();
      const verbose = config.settings?.verbose ?? false;
      setVerbose(verbose);

      if (verbose) {
        console.log("[verbose] ═══════════════════════════════════════");
        console.log("[verbose] 🤖 Danger Bot — modo verbose ativo");
        console.log("[verbose] ═══════════════════════════════════════");
        verboseLog(`📦 ${plugins.length} plugin(s) do pacote`);
        verboseLog(`📂 local_plugins: ${config.local_plugins?.length ?? 0} caminho(s)`);
        verboseLog(`🚫 ignore_files: ${config.ignore_files?.length ?? 0} arquivo(s)`);
      }

      if (config.ignore_files?.length) {
        setIgnoredFiles(config.ignore_files);
      }

      let allPlugins = [...plugins];

      if (config.local_plugins?.length) {
        const localPlugins = await loadLocalPlugins(config.local_plugins);
        allPlugins = [...allPlugins, ...localPlugins];
      }

      if (verbose) {
        verboseLog(`🔌 Total de plugins para execução: ${allPlugins.length}`);
        console.log("[verbose] ───────────────────────────────────────");
      }

      if (callbacks?.onBeforeRun) {
        const shouldContinue = await callbacks.onBeforeRun();
        if (shouldContinue === false) {
          verboseLog("⛔ onBeforeRun retornou false — execução cancelada");
          return;
        }
      }

      await runPlugins(allPlugins);

      if (callbacks?.onSuccess) {
        await callbacks.onSuccess();
      }
    } catch (error) {
      if (callbacks?.onError) {
        await callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      console.error("Danger Bot execution error:", error);
    } finally {
      if (callbacks?.onFinally) {
        await callbacks.onFinally();
      }
    }
  })();
}
