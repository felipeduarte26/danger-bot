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
export declare function getDanger(): any;
/**
 * Send a message to the PR
 * Envia uma mensagem no PR
 */
export declare function sendMessage(msg: string): void;
/**
 * Send a warning to the PR
 * Envia um warning no PR
 */
export declare function sendWarn(msg: string): void;
/**
 * Send a fail message to the PR (fails the build)
 * Envia um fail no PR (falha o build)
 */
export declare function sendFail(msg: string): void;
/**
 * Send markdown to the PR
 * Envia markdown no PR
 */
export declare function sendMarkdown(msg: string): void;
/**
 * Schedule an async task
 * Agenda uma tarefa assíncrona
 */
export declare function scheduleTask(fn: () => Promise<void>): void;
