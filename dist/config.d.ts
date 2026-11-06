import type { DangerPlugin } from "./types";
export interface DangerBotConfig {
  /** Nome e link que identificam o bot nos comentários do PR e no status do build */
  branding?: {
    /** Nome exibido (default: "Danger Bot") */
    name?: string;
    /** Link do nome nas assinaturas e no status do build (default: repositório do Danger Bot) */
    url?: string;
    /** URL pública da imagem no lugar do emoji do rodapé e no card do Google Chat (default: nenhuma) */
    logo?: string;
  };
  /** Caminhos para plugins locais do projeto (arquivos .ts/.js ou diretórios) */
  local_plugins?: string[];
  /** Arquivos que devem ser ignorados por todos os plugins */
  ignore_files?: string[];
  /** Pastas da arquitetura do projeto, lidas pelo modelo Dart (`DartPath`) */
  paths?: {
    /**
     * Pastas que agrupam as features (ou módulos): a pasta logo abaixo é o `DartPath.feature`.
     * Cada item é um caminho (`lib/modules`) ou um nome de pasta (`modules`), achado em
     * qualquer ponto do caminho (também em monorepo). Default: `[features]`.
     */
    features?: string[];
  };
  /** Configurações gerais */
  settings?: {
    /** Se true, exibe logs detalhados (default: false) */
    verbose?: boolean;
    blame?: boolean;
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
