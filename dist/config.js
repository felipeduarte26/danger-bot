"use strict";
/**
 * DANGER BOT CONFIGURATION
 * ========================
 * Configurações globais do Danger Bot
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.customizeDangerMessages = customizeDangerMessages;
exports.setupDangerConfig = setupDangerConfig;
/**
 * Customiza as mensagens padrão do Danger JS
 * Deve ser chamado no início do dangerfile
 */
function customizeDangerMessages() {
    const d = global.danger || globalThis.danger;
    const results = global.results || globalThis.results;
    if (d && d.utils) {
        // Customizar mensagens do Danger
        // Remover a mensagem "All green. Well done." quando não há problemas
        const originalHref = d.utils.href;
        d.utils.href = (text, url) => {
            // Substituir "dangerJS" por "Danger Bot" no link
            if (text.toLowerCase().includes('danger')) {
                text = text.replace(/dangerJS/gi, 'Danger Bot');
                text = text.replace(/danger/gi, 'Danger Bot');
            }
            // Customizar o link para apontar para nosso repositório
            if (url.includes('danger.systems') || url.includes('github.com/danger')) {
                url = 'https://bitbucket.org/diletta/danger-bot';
            }
            return originalHref(text, url);
        };
    }
    // Suprimir mensagem "All green. Well done."
    if (results) {
        const originalMarkdown = results.markdowns || [];
        Object.defineProperty(results, 'markdowns', {
            get() {
                return originalMarkdown.filter((m) => {
                    const text = m.message || '';
                    return !text.includes('All green') &&
                        !text.includes('Well done') &&
                        !text.includes(':tada:');
                });
            },
            set(value) {
                originalMarkdown.length = 0;
                originalMarkdown.push(...value);
            }
        });
    }
}
/**
 * Configuração customizada para o footer do Danger
 * Remove mensagens padrão e adiciona customizações
 */
function setupDangerConfig() {
    const schedule = global.schedule || globalThis.schedule;
    if (schedule) {
        schedule(async () => {
            customizeDangerMessages();
        });
    }
    else {
        // Se schedule não estiver disponível, executa imediatamente
        customizeDangerMessages();
    }
}
