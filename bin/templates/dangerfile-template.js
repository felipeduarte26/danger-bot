/**
 * DANGERFILE TEMPLATE
 * ===================
 * Template para geração de dangerfile
 */

/**
 * Gerar dangerfile de exemplo
 * @returns {string} - Conteúdo do dangerfile
 */
export function generateDangerfileTemplate() {
  return `/**
 * DANGER BOT - DANGERFILE
 * ========================
 * Auto-generated dangerfile with all available plugins
 */

import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins);
`;
}
