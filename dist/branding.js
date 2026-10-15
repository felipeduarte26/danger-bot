"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BRANDING = void 0;
exports.getBranding = getBranding;
/**
 * DANGER BOT - BRANDING
 * =====================
 * Nome e link que identificam o bot nos comentários do PR e no status do build,
 * configuráveis na seção `branding` do `danger-bot.yaml`:
 *
 *   branding:
 *     name: "Minha Empresa"
 *     url: "https://minhaempresa.com"
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
});
let cachedBranding = null;
/**
 * Nome e link do bot, lidos do `danger-bot.yaml` (raiz do projeto) uma vez por
 * processo. Campos ausentes ou inválidos (nome vazio, URL que não começa com
 * `http://` ou `https://`) caem no {@link DEFAULT_BRANDING}.
 */
function getBranding() {
  if (cachedBranding) return cachedBranding;
  const branding = (0, config_1.readConfig)().branding ?? {};
  const name = typeof branding.name === "string" ? branding.name.trim() : "";
  const url = typeof branding.url === "string" ? branding.url.trim() : "";
  cachedBranding = {
    name: name || exports.DEFAULT_BRANDING.name,
    url: /^https?:\/\/\S+$/i.test(url) ? url : exports.DEFAULT_BRANDING.url,
  };
  return cachedBranding;
}
