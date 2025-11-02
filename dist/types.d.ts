/**
 * DANGER PLUGIN INTERFACE
 * =========================
 * Interface padronizada para todos os plugins de Danger
 *
 * Cada plugin deve implementar esta interface para garantir
 * consistência e facilitar manutenção
 */
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
export declare function createPlugin(config: DangerPluginConfig, runFn: () => Promise<void>): DangerPlugin;
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
export declare function executeDangerBot(plugins: DangerPlugin[], callbacks?: DangerBotCallbacks): void;
