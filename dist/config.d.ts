import type { DangerPlugin } from "./types";
export interface DangerBotConfig {
  /** Nome e link que identificam o bot nos comentários do PR e no status do build */
  branding?: {
    /** Nome exibido (default: "Danger Bot") */
    name?: string;
    /** Link do nome nas assinaturas e no status do build (default: repositório do Danger Bot) */
    url?: string;
  };
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
    /** URL do webhook do Google Chat para notificações */
    google_chat_webhook?: string;
  };
}
export declare function loadConfig(): DangerBotConfig;
/**
 * Lê o `danger-bot.yaml` sem logar nada e sem lançar erro.
 *
 * Para quem roda fora do fluxo dos plugins, como o branding que o
 * `scripts/patch-danger.cjs` injeta no Danger JS. Retorna `{}` se o arquivo não
 * existir ou for inválido.
 */
export declare function readConfig(): DangerBotConfig;
export declare function loadLocalPlugins(pluginPaths: string[]): Promise<DangerPlugin[]>;
