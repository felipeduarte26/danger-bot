/**
 * READLINE HELPER
 * ===============
 * Funções para interação com o usuário via terminal
 */

import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Fazer uma pergunta ao usuário
 * @param {string} query - Pergunta a ser feita
 * @returns {Promise<string>} - Resposta do usuário
 */
export function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * Fechar a interface readline
 */
export function closeReadline() {
  rl.close();
}
