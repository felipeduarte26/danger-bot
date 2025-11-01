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
 * HELPER: Executar múltiplos plugins
 */
export declare function runPlugins(plugins: DangerPlugin[]): Promise<void>;
