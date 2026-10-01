/**
 * READLINE HELPER
 * ===============
 * Funções para interação com o usuário via terminal
 */

import readline from "readline";

/**
 * Interface criada só na primeira pergunta: aberta no import, ela segurava o
 * stdin e os comandos que não perguntam nada (dry-run, list, info...) não
 * terminavam sozinhos num terminal.
 * @type {readline.Interface | null}
 */
let rl = null;

/**
 * Fazer uma pergunta ao usuário
 * @param {string} query - Pergunta a ser feita
 * @returns {Promise<string>} - Resposta do usuário
 */
export function question(query) {
  rl ??= readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * Fechar a interface readline
 */
export function closeReadline() {
  rl?.close();
  rl = null;
}
