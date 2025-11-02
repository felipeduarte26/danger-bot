/**
 * DANGER BOT CONFIGURATION
 * ========================
 * Configurações globais do Danger Bot
 */
/**
 * Customiza as mensagens padrão do Danger JS
 * Deve ser chamado no início do dangerfile
 *
 * @param successMessage Mensagem customizada de sucesso (padrão: "✅ Tudo certo! Nenhum problema encontrado.")
 */
export declare function customizeDangerMessages(successMessage?: string): void;
/**
 * Configuração customizada para o footer do Danger
 * Aplica todas as customizações de mensagens
 *
 * @param successMessage Mensagem customizada de sucesso (opcional)
 * @example
 * // Usar mensagem padrão em português
 * setupDangerConfig();
 *
 * // Ou customizar a mensagem
 * setupDangerConfig("🎉 Análise concluída sem problemas!");
 */
export declare function setupDangerConfig(successMessage?: string): void;
