"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BRANDING = void 0;
exports.getBranding = getBranding;
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
const config_1 = require("./config");
/** Branding usado quando o `danger-bot.yaml` não define (ou define inválido) um campo. */
exports.DEFAULT_BRANDING = Object.freeze({
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
let cachedBranding = null;
/**
 * Nome, link e logo do bot, lidos do `danger-bot.yaml` (raiz do projeto) uma vez
 * por processo. Campos ausentes ou inválidos (nome vazio, URL que não começa com
 * `http://` ou `https://`, logo com aspas, `<`, `>` ou parênteses) caem no
 * {@link DEFAULT_BRANDING}.
 */
function getBranding() {
  if (cachedBranding) return cachedBranding;
  const branding = (0, config_1.readConfig)().branding ?? {};
  const name = typeof branding.name === "string" ? branding.name.trim() : "";
  const url = typeof branding.url === "string" ? branding.url.trim() : "";
  const logo = typeof branding.logo === "string" ? branding.logo.trim() : "";
  cachedBranding = {
    name: name || exports.DEFAULT_BRANDING.name,
    url: URL_PATTERN.test(url) ? url : exports.DEFAULT_BRANDING.url,
    logo: LOGO_PATTERN.test(logo) ? logo : exports.DEFAULT_BRANDING.logo,
  };
  return cachedBranding;
}
