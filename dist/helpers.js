"use strict";
/**
 * DANGER HELPERS
 * ==============
 * Funções helper que encapsulam as chamadas ao Danger JS
 * Isso evita conflitos com o sistema de remoção de imports do Danger
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDanger = getDanger;
exports.sendMessage = sendMessage;
exports.sendWarn = sendWarn;
exports.sendFail = sendFail;
exports.sendMarkdown = sendMarkdown;
exports.scheduleTask = scheduleTask;
/**
 * Get the danger object
 * Acessa o objeto danger que o Danger JS injeta globalmente
 */
function getDanger() {
    return global.danger || globalThis.danger;
}
/**
 * Send a message to the PR
 * Envia uma mensagem no PR
 *
 * @param msg - Mensagem a ser enviada
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
function sendMessage(msg, file, line) {
    const messageFn = global.message || globalThis.message;
    if (messageFn) {
        if (file && line !== undefined) {
            messageFn(msg, file, line);
        }
        else {
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
function sendWarn(msg, file, line) {
    const warnFn = global.warn || globalThis.warn;
    if (warnFn) {
        if (file && line !== undefined) {
            warnFn(msg, file, line);
        }
        else {
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
function sendFail(msg, file, line) {
    const failFn = global.fail || globalThis.fail;
    if (failFn) {
        if (file && line !== undefined) {
            failFn(msg, file, line);
        }
        else {
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
function sendMarkdown(msg, file, line) {
    const markdownFn = global.markdown || globalThis.markdown;
    if (markdownFn) {
        if (file && line !== undefined) {
            markdownFn(msg, file, line);
        }
        else {
            markdownFn(msg);
        }
    }
}
/**
 * Schedule an async task
 * Agenda uma tarefa assíncrona
 */
function scheduleTask(fn) {
    const scheduleFn = global.schedule || globalThis.schedule;
    if (scheduleFn)
        scheduleFn(fn);
}
