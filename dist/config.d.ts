import type { DangerPlugin } from "./types";
export interface DangerBotConfig {
  /** Caminhos para plugins locais do projeto (arquivos .ts/.js ou diretórios) */
  local_plugins?: string[];
  /** Arquivos que devem ser ignorados por todos os plugins */
  ignore_files?: string[];
  /** Configurações gerais */
  settings?: {
    /** Se true, falha o CI ao encontrar erros (default: true) */
    fail_on_errors?: boolean;
    /** Se true, exibe logs detalhados (default: false) */
    verbose?: boolean;
    /** API keys do Google Gemini para o plugin ai-code-review (rotation automática) */
    gemini_api_keys?: string[];
  };
}
export declare function loadConfig(): DangerBotConfig;
export declare function loadLocalPlugins(pluginPaths: string[]): Promise<DangerPlugin[]>;
