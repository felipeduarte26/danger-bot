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
 * 
 * @param msg - Mensagem a ser enviada
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
export function sendMessage(msg: string, file?: string, line?: number): void {
  const messageFn = (global as any).message || (globalThis as any).message;
  if (messageFn) {
    if (file && line !== undefined) {
      messageFn(msg, file, line);
    } else {
      messageFn(msg);
    }
  }
}

/**
 * Send a warning to the PR
 * Envia um warning no PR
 * 
 * @param msg - Mensagem de warning
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
export function sendWarn(msg: string, file?: string, line?: number): void {
  const warnFn = (global as any).warn || (globalThis as any).warn;
  if (warnFn) {
    if (file && line !== undefined) {
      warnFn(msg, file, line);
    } else {
      warnFn(msg);
    }
  }
}

/**
 * Send a fail message to the PR (fails the build)
 * Envia um fail no PR (falha o build)
 * 
 * @param msg - Mensagem de erro
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
export function sendFail(msg: string, file?: string, line?: number): void {
  const failFn = (global as any).fail || (globalThis as any).fail;
  if (failFn) {
    if (file && line !== undefined) {
      failFn(msg, file, line);
    } else {
      failFn(msg);
    }
  }
}

/**
 * Send markdown to the PR
 * Envia markdown no PR
 * 
 * @param msg - Conteúdo markdown
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
export function sendMarkdown(msg: string, file?: string, line?: number): void {
  const markdownFn = (global as any).markdown || (globalThis as any).markdown;
  if (markdownFn) {
    if (file && line !== undefined) {
      markdownFn(msg, file, line);
    } else {
      markdownFn(msg);
    }
  }
}

/**
 * Schedule an async task
 * Agenda uma tarefa assíncrona
 */
export function scheduleTask(fn: () => Promise<void>): void {
  const scheduleFn = (global as any).schedule || (globalThis as any).schedule;
  if (scheduleFn) scheduleFn(fn);
}

