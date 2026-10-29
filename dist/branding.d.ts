export interface DangerBotBranding {
  /** Nome exibido nos comentários e no status do build */
  name: string;
  /** Link do nome nas assinaturas e no status do build */
  url: string;
  /**
   * URL pública da imagem que aparece no lugar do emoji no rodapé do comentário e no
   * card do Google Chat. `null` sem logo configurado.
   */
  logo: string | null;
}
/** Branding usado quando o `danger-bot.yaml` não define (ou define inválido) um campo. */
export declare const DEFAULT_BRANDING: Readonly<DangerBotBranding>;
/**
 * Nome, link e logo do bot, lidos do `danger-bot.yaml` (raiz do projeto) uma vez
 * por processo. Campos ausentes ou inválidos (nome vazio, URL que não começa com
 * `http://` ou `https://`, logo com aspas, `<`, `>` ou parênteses) caem no
 * {@link DEFAULT_BRANDING}.
 */
export declare function getBranding(): DangerBotBranding;
