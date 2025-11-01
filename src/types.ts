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
 * HELPER: Executar múltiplos plugins
 */
export async function runPlugins(
  plugins: DangerPlugin[]
): Promise<void> {
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

