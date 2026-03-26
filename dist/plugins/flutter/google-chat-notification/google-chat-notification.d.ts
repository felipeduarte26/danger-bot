/**
 * GOOGLE CHAT NOTIFICATION PLUGIN
 * ================================
 * Envia notificação no Google Chat via webhook quando o Danger Bot finaliza o code review.
 *
 * Configuração no danger-bot.yaml:
 *   settings:
 *     google_chat_webhook: "https://chat.googleapis.com/v1/spaces/..."
 *
 * Ou via env var: GOOGLE_CHAT_WEBHOOK
 *
 * IMPORTANTE: este plugin deve ser o ÚLTIMO a rodar para capturar todos os resultados.
 */
declare const _default: import("../../../types").DangerPlugin;
export default _default;
