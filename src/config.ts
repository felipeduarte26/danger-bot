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
export function customizeDangerMessages(
  successMessage: string = "✅ Tudo certo! Nenhum problema encontrado."
): void {
  const d = (global as any).danger || (globalThis as any).danger;
  const results = (global as any).results || (globalThis as any).results;
  
  if (d && d.utils) {
    // Customizar mensagens do Danger
    const originalHref = d.utils.href;
    d.utils.href = (text: string, url: string) => {
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
  
  // Substituir mensagem "All green. Well done." por mensagem em português
  if (results) {
    const originalMarkdown = results.markdowns || [];
    Object.defineProperty(results, 'markdowns', {
      get() {
        // Substituir mensagens de sucesso em inglês por português
        return originalMarkdown.map((m: any) => {
          const text = m.message || '';
          if (text.includes('All green') || 
              text.includes('Well done') ||
              text.includes(':tada:')) {
            return {
              ...m,
              message: successMessage
            };
          }
          return m;
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
export function setupDangerConfig(
  successMessage?: string
): void {
  const schedule = (global as any).schedule || (globalThis as any).schedule;
  
  if (schedule) {
    schedule(async () => {
      customizeDangerMessages(successMessage);
    });
  } else {
    // Se schedule não estiver disponível, executa imediatamente
    customizeDangerMessages(successMessage);
  }
}

