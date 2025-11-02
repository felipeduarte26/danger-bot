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
 */
function sendMessage(msg) {
    const messageFn = global.message || globalThis.message;
    if (messageFn)
        messageFn(msg);
}
/**
 * Send a warning to the PR
 * Envia um warning no PR
 */
function sendWarn(msg) {
    const warnFn = global.warn || globalThis.warn;
    if (warnFn)
        warnFn(msg);
}
/**
 * Send a fail message to the PR (fails the build)
 * Envia um fail no PR (falha o build)
 */
function sendFail(msg) {
    const failFn = global.fail || globalThis.fail;
    if (failFn)
        failFn(msg);
}
/**
 * Send markdown to the PR
 * Envia markdown no PR
 */
function sendMarkdown(msg) {
    const markdownFn = global.markdown || globalThis.markdown;
    if (markdownFn)
        markdownFn(msg);
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
