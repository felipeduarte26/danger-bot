/**
 * DANGER PLUGIN INTERFACE
 * =========================
 * Interface padronizada para todos os plugins de Danger
 *
 * Cada plugin deve implementar esta interface para garantir
 * consistência e facilitar manutenção
 */
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
export declare function createPlugin(
  config: DangerPluginConfig,
  runFn: () => Promise<void>
): DangerPlugin;
/**
 * HELPER: Execute list of plugins sequentially
 *
 * @param plugins - Array of plugins to run
 */
export declare function runPlugins(plugins: DangerPlugin[]): Promise<void>;
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
export declare function executeDangerBot(
  plugins: DangerPlugin[],
  callbacks?: DangerBotCallbacks
): void;
