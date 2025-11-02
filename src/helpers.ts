/**
 * DANGER HELPERS
 * ==============
 * Funções helper que encapsulam as chamadas ao Danger JS
 * Isso evita conflitos com o sistema de remoção de imports do Danger
 */

/**
 * Get the danger object
 * Acessa o objeto danger que o Danger JS injeta globalmente
 */
export function getDanger(): any {
  return (global as any).danger || (globalThis as any).danger;
}

/**
 * Send a message to the PR
 * Envia uma mensagem no PR
 */
export function sendMessage(msg: string): void {
  const messageFn = (global as any).message || (globalThis as any).message;
  if (messageFn) messageFn(msg);
}

/**
 * Send a warning to the PR
 * Envia um warning no PR
 */
export function sendWarn(msg: string): void {
  const warnFn = (global as any).warn || (globalThis as any).warn;
  if (warnFn) warnFn(msg);
}

/**
 * Send a fail message to the PR (fails the build)
 * Envia um fail no PR (falha o build)
 */
export function sendFail(msg: string): void {
  const failFn = (global as any).fail || (globalThis as any).fail;
  if (failFn) failFn(msg);
}

/**
 * Send markdown to the PR
 * Envia markdown no PR
 */
export function sendMarkdown(msg: string): void {
  const markdownFn = (global as any).markdown || (globalThis as any).markdown;
  if (markdownFn) markdownFn(msg);
}

/**
 * Schedule an async task
 * Agenda uma tarefa assíncrona
 */
export function scheduleTask(fn: () => Promise<void>): void {
  const scheduleFn = (global as any).schedule || (globalThis as any).schedule;
  if (scheduleFn) scheduleFn(fn);
}

