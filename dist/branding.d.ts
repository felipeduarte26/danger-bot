export interface DangerBotBranding {
  /** Nome exibido nos comentários e no status do build */
  name: string;
  /** Link do nome nas assinaturas e no status do build */
  url: string;
}
/** Branding usado quando o `danger-bot.yaml` não define (ou define inválido) um campo. */
export declare const DEFAULT_BRANDING: Readonly<DangerBotBranding>;
/**
 * Nome e link do bot, lidos do `danger-bot.yaml` (raiz do projeto) uma vez por
 * processo. Campos ausentes ou inválidos (nome vazio, URL que não começa com
 * `http://` ou `https://`) caem no {@link DEFAULT_BRANDING}.
 */
export declare function getBranding(): DangerBotBranding;
