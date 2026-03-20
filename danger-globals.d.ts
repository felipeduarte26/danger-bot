/**
 * Declarações globais do Danger JS
 *
 * O Danger JS injeta essas variáveis automaticamente no runtime.
 * Este arquivo permite que o TypeScript reconheça essas variáveis globais
 * sem precisar importá-las (o que causaria conflito com o Danger JS).
 *
 * Quando você instala @felipeduarte26/danger-bot, este arquivo é incluído
 * automaticamente e o TypeScript reconhece as variáveis globais.
 *
 * @see https://danger.systems/js/usage/culture.html
 */

declare global {
  const danger: any;
  const message: (...args: any[]) => void;
  const warn: (...args: any[]) => void;
  const fail: (...args: any[]) => void;
  const markdown: (...args: any[]) => void;
  const schedule: (fn: () => Promise<void>) => void;
}

export {};
