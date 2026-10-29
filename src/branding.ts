/**
 * DANGER BOT - BRANDING
 * =====================
 * Nome, link e logo que identificam o bot nos comentários do PR e no status do build,
 * configuráveis na seção `branding` do `danger-bot.yaml`:
 *
 *   branding:
 *     name: "Minha Empresa"
 *     url: "https://minhaempresa.com"
 *     logo: "https://minhaempresa.com/logo.png"
 *
 * Usado pelos plugins e pelos trechos que o `scripts/patch-danger.cjs` injeta no
 * Danger JS (assinatura, links dos comentários e status do build). Como o Danger
 * chama `getBranding()` ao montar os comentários, mudar o YAML vale na próxima
 * execução, sem reinstalar.
 */
import { readConfig } from "./config";

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
export const DEFAULT_BRANDING: Readonly<DangerBotBranding> = Object.freeze({
  name: "Danger Bot",
  url: "https://github.com/felipeduarte26/danger-bot",
  logo: null,
});

/** Link http(s) sem espaço. */
const URL_PATTERN = /^https?:\/\/\S+$/i;

/**
 * O logo vai dentro de um atributo HTML (`<img src="...">`) e de um link markdown
 * (`![](...)`): aspas, `<`, `>` e parênteses quebrariam o comentário.
 */
const LOGO_PATTERN = /^https?:\/\/[^\s"'<>()]+$/i;

let cachedBranding: DangerBotBranding | null = null;

/**
 * Nome, link e logo do bot, lidos do `danger-bot.yaml` (raiz do projeto) uma vez
 * por processo. Campos ausentes ou inválidos (nome vazio, URL que não começa com
 * `http://` ou `https://`, logo com aspas, `<`, `>` ou parênteses) caem no
 * {@link DEFAULT_BRANDING}.
 */
export function getBranding(): DangerBotBranding {
  if (cachedBranding) return cachedBranding;

  const branding = readConfig().branding ?? {};
  const name = typeof branding.name === "string" ? branding.name.trim() : "";
  const url = typeof branding.url === "string" ? branding.url.trim() : "";
  const logo = typeof branding.logo === "string" ? branding.logo.trim() : "";

  cachedBranding = {
    name: name || DEFAULT_BRANDING.name,
    url: URL_PATTERN.test(url) ? url : DEFAULT_BRANDING.url,
    logo: LOGO_PATTERN.test(logo) ? logo : DEFAULT_BRANDING.logo,
  };
  return cachedBranding;
}
