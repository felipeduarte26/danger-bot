/**
 * COMMAND: init-config
 * ====================
 * Gera um arquivo danger-bot.yaml de exemplo na raiz do projeto
 */
import * as fs from "fs";
import * as path from "path";
import { createInterface } from "readline";

const CONFIG_TEMPLATE = `# ============================================
# DANGER BOT - Configuração do Projeto
# ============================================
# Documentação: https://github.com/felipeduarte26/danger-bot
#
# Este arquivo configura o comportamento do Danger Bot
# para o seu projeto. Coloque-o na raiz do repositório.

# ─────────────────────────────────────────────
# Plugins Locais
# ─────────────────────────────────────────────
# Caminhos para plugins customizados do projeto.
# Pode ser um arquivo .ts/.js ou um diretório contendo plugins.
#
# Os plugins locais devem seguir o padrão DangerPlugin:
#   export default createPlugin(
#     { name: "meu-plugin", description: "...", enabled: true },
#     async () => { /* lógica */ }
#   );
#
# Exemplo:
#   local_plugins:
#     - ./danger/plugins/meu-plugin.ts
#     - ./danger/plugins/
local_plugins: []

# ─────────────────────────────────────────────
# Arquivos Ignorados
# ─────────────────────────────────────────────
# Arquivos que devem ser ignorados por TODOS os plugins.
# Use o caminho relativo à raiz do repositório.
# Útil para arquivos legados ou que não seguem as regras.
#
# Exemplo:
#   ignore_files:
#     - lib/features/old_module/legacy_page.dart
#     - lib/core/deprecated_helper.dart
ignore_files: []

# ─────────────────────────────────────────────
# Configurações Gerais
# ─────────────────────────────────────────────
settings:
  # Se true, exibe logs detalhados durante a execução
  verbose: false

  # ─────────────────────────────────────────────
  # AI Code Review (Google Gemini)
  # ─────────────────────────────────────────────
  # API keys do Google Gemini para o plugin ai-code-review.
  # Gere keys gratuitas em: https://aistudio.google.com/apikey
  # Múltiplas keys permitem rotation automática (rate limit).
  #
  # Alternativa: use a env var GEMINI_API_KEYS (separadas por vírgula)
  # ou GEMINI_API_KEY (uma única key).
  #
  # Exemplo:
  #   gemini_api_keys:
  #     - "AIzaSy..."
  #     - "AIzaSy..."
  gemini_api_keys: []
`;

export async function initConfig() {
  const configPath = path.resolve(process.cwd(), "danger-bot.yaml");

  if (fs.existsSync(configPath)) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    const answer = await new Promise((resolve) => {
      rl.question("⚠️  danger-bot.yaml já existe. Deseja sobrescrever? (s/N): ", resolve);
    });
    rl.close();

    if (String(answer).toLowerCase() !== "s") {
      console.log("❌ Operação cancelada.");
      return;
    }
  }

  fs.writeFileSync(configPath, CONFIG_TEMPLATE, "utf-8");

  console.log("");
  console.log("✅ danger-bot.yaml criado com sucesso!");
  console.log("");
  console.log("📄 Arquivo: " + configPath);
  console.log("");
  console.log("📝 Próximos passos:");
  console.log("   1. Edite o danger-bot.yaml com suas configurações");
  console.log("   2. Adicione plugins locais em local_plugins");
  console.log("   3. Liste arquivos para ignorar em ignore_files");
  console.log("");
  console.log("📖 Docs: https://github.com/felipeduarte26/danger-bot");
  console.log("");
}
