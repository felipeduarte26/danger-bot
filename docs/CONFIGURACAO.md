# Configuracao

O Danger Bot pode ser configurado através de um arquivo `danger-bot.yaml` (ou `.yml`) na raiz do projeto.

---

## Gerando o arquivo

```bash
danger-bot init
```

Isso cria um `danger-bot.yaml` com todas as opcoes documentadas e exemplos.

---

## Estrutura do arquivo

```yaml
# Plugins locais do projeto
local_plugins:
  - ./danger/plugins/meu-plugin.ts
  - ./danger/plugins/

# Arquivos ignorados por todos os plugins
ignore_files:
  - lib/features/old_module/legacy_page.dart
  - lib/core/deprecated_helper.dart

# Configuracoes gerais
settings:
  verbose: false
```

---

## local_plugins

Array de caminhos para plugins customizados do projeto. Aceita:

- **Arquivo**: caminho direto para um arquivo `.ts` ou `.js`
- **Diretorio**: todos os arquivos `.ts`/`.js` do diretorio (exceto `index.*`) serao carregados como plugins

Os caminhos sao relativos a raiz do projeto.

### Criando um plugin local

O plugin local deve seguir o mesmo padrao dos plugins do Danger Bot:

```typescript
import { createPlugin, sendFail, getDartFiles } from "@felipeduarte26/danger-bot";
import * as fs from "fs";

export default createPlugin(
  {
    name: "meu-plugin-local",
    description: "Regra customizada do meu projeto",
    enabled: true,
  },
  async () => {
    const dartFiles = await getDartFiles(); // ja vem sem testes e so com arquivos existentes

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("TODO")) {
          sendFail(
            `TODO ENCONTRADO

Comentario TODO detectado no codigo.

### Problema Identificado

\`\`\`dart
${lines[i].trim()}
\`\`\`

### 🎯 ACAO NECESSARIA

Resolva o TODO antes de mergear a PR.

### 🚀 Objetivo

Manter o codigo limpo e sem pendencias.`,
            file,
            i + 1
          );
        }
      }
    }
  }
);
```

### Exemplo de estrutura de projeto

```
meu-projeto/
├── danger-bot.yaml         # Configuracao
├── dangerfile.ts           # Entry point
├── danger/
│   └── plugins/
│       ├── todo-checker.ts        # Plugin local
│       └── custom-rule.ts         # Outro plugin local
├── lib/
│   └── ...
└── package.json
```

### danger-bot.yaml

```yaml
local_plugins:
  - ./danger/plugins/
```

### dangerfile.ts

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

// Os plugins locais sao carregados automaticamente do danger-bot.yaml
executeDangerBot(allFlutterPlugins);
```

Os plugins locais sao executados **depois** dos plugins passados para `executeDangerBot` e **antes** do `google-chat-notification`, que sempre roda por ultimo para resumir o resultado final.

Arquivos `.ts` sao carregados direto pelo Node (type stripping, Node >= 22.18), entao use apenas sintaxe TypeScript "apagavel" (tipos e interfaces; sem `enum` e sem `namespace`). Arquivos `.js` podem ser ESM (`export default`) ou CommonJS (`module.exports`).

---

## ignore_files

Array de caminhos de arquivos que devem ser ignorados por **todos** os plugins. Os caminhos sao relativos a raiz do repositorio e aceitam globs:

| Padrao | Ignora |
| ------ | ------ |
| `lib/core/legacy_helper.dart` | O arquivo exato |
| `lib/legacy/*.dart` | Arquivos `.dart` direto em `lib/legacy/` (`*` nao cruza `/`) |
| `lib/legacy/*` | Tudo dentro de `lib/legacy/`, inclusive subpastas |
| `lib/legacy/**` | Tudo dentro de `lib/legacy/`, inclusive subpastas |
| `**/old_page.dart` | `old_page.dart` em qualquer pasta |
| `lib/page?.dart` | `?` vale por um caractere (`page1.dart`, `pageA.dart`) |

```yaml
ignore_files:
  - lib/features/old_budget/new_budget_one_controller.dart
  - lib/features/products/stringbox/view/stringbox_page.dart
  - lib/features/products/inverters/view/*
```

O `executeDangerBot` (e o `dry-run`, com a mesma regra) remove esses arquivos de `danger.git.modified_files` e `danger.git.created_files` antes de rodar os plugins, entao eles nao aparecem para nenhum plugin nem nos helpers (`getAllChangedFiles()`, `getDartFiles()`, `getFilesMatching()`...).

---

## settings

Configuracoes gerais do Danger Bot.

| Opcao                 | Tipo       | Default | Descricao |
| --------------------- | ---------- | ------- | --------- |
| `verbose`             | `boolean`  | `false` | Exibe logs detalhados durante a execucao |
| `gemini_api_keys`     | `string[]` | `[]`    | API keys do Google Gemini para o plugin **ai-code-review** (rotacao automatica) |
| `google_chat_webhook` | `string`   | —       | URL do webhook do Google Chat para o plugin **google-chat-notification** (opcional) |

```yaml
settings:
  verbose: true
  gemini_api_keys:
    - "AIzaSy..."
    - "AIzaSy..."
```

### `gemini_api_keys` (plugin ai-code-review)

O plugin **ai-code-review** usa a API do **Google Gemini** (modelo `gemini-2.5-flash-lite`, tier gratuito).

Voce pode informar keys de **tres** formas; o plugin **reune todas as fontes** e remove duplicatas:

1. **`danger-bot.yaml`** — `settings.gemini_api_keys` como lista de strings:

   ```yaml
   settings:
     gemini_api_keys:
       - "AIzaSy..."
       - "AIzaSy..."
   ```

2. **`GEMINI_API_KEYS`** (env var) — varias keys separadas por virgula.

3. **`GEMINI_API_KEY`** (env var) — uma unica key.

Ordem: primeiro YAML, depois `GEMINI_API_KEYS`, depois `GEMINI_API_KEY`. Duplicatas sao removidas.

Gere keys gratuitas em: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

**Rotacao:** com varias keys distintas, o plugin tenta outra key em caso de rate limit (HTTP 429) e distribui uso entre elas. Limites tipicos do **free tier** (por key): **15 requisicoes/minuto** e **1.000 requisicoes/dia** — confirme limites atuais na documentacao do Google.

> Sem nenhuma key configurada, o plugin exibe um aviso no log e nao chama a API.

Mais detalhes: [README do plugin](../src/plugins/flutter/ai-code-review/README.md).

### `google_chat_webhook` (plugin google-chat-notification)

O plugin **google-chat-notification** envia uma notificacao ao **Google Chat** quando o Danger Bot termina o code review da PR. O card (formato **Cards V2**) inclui o status (vermelho com falhas, amarelo so com avisos, verde sem nada — contando tambem os comentarios inline), o titulo do PR e um botao com o link para o PR (GitHub ou Bitbucket Cloud).

**Configuracao:**

1. **`danger-bot.yaml`** — `settings.google_chat_webhook` com a URL completa do webhook:

   ```yaml
   settings:
     google_chat_webhook: "https://chat.googleapis.com/v1/spaces/.../messages?key=..."
   ```

2. **`GOOGLE_CHAT_WEBHOOK`** (env var) — mesma URL; usada se preferir nao commitar o webhook no repositorio (recomendado em CI com secrets).

Se nenhuma das duas estiver definida, o plugin registra um aviso no log e nao envia mensagem.

**Ordem de execucao:** o plugin precisa rodar por ultimo para refletir o resultado final. O `executeDangerBot` garante isso: move o `google-chat-notification` para o fim da lista, depois dos plugins locais.

**Webhook no Google Chat:** Espaco > **Apps e integracoes** > **Webhooks** > **Adicionar webhook**. Copie a URL gerada para o YAML ou para a env var.

O recurso usa **incoming webhooks** do Google Workspace; nao ha cobranca separada pelo Danger Bot para essa integracao.

Mais detalhes: [README do plugin](../src/plugins/flutter/google-chat-notification/README.md).

---

## Exemplo completo

```yaml
# ============================================
# DANGER BOT - Configuracao do Projeto
# ============================================

local_plugins:
  - ./danger/plugins/todo-checker.ts
  - ./danger/plugins/custom-imports.ts

ignore_files:
  - lib/features/old_budget/new_budget_one_controller.dart
  - lib/features/products/stringbox/view/stringbox_page.dart
  - lib/features/products/stringbox/view/stringbox_list_page.dart
  - lib/features/products/stringbox/view/new_stringbox_page.dart
  - lib/features/products/inverters/view/table_list_inversor.dart
  - lib/features/products/inverters/view/page_inverters.dart
  - lib/features/products/inverters/view/new_inversor.dart
  - lib/features/products/inverters/view/listagem_inversor.dart
  - lib/features/old_budget/budget_list/views/budget_list_page.dart

settings:
  verbose: false
```

---

## Helpers disponiveis para plugins locais

Plugins locais podem importar todos os helpers do pacote:

```typescript
import {
  // Danger core
  getDanger,

  // Mensagens
  sendMessage,
  sendWarn,
  sendFail,
  sendMarkdown,

  // Arquivos (ja respeita ignore_files automaticamente)
  getAllChangedFiles,
  getDartFiles,
  getDartFilesInDirectory,
  getFilesMatching,
  getFilesByExtension,
  hasFilesMatching,
  getFileContent,
  fileContainsPattern,

  // Clean Architecture
  getDomainDartFiles,
  getDataDartFiles,
  getPresentationDartFiles,
  isInLayer,

  // PR info
  getPRDescription,
  getPRTitle,
  getLineStats, // linhas do PR (async); getLinesChanged está obsoleto

  // Plugins ativos na execução
  isPluginActive,

  // Plugin factory
  createPlugin,
} from "@felipeduarte26/danger-bot";
```

---

## FAQ

### Os plugins locais sao executados antes ou depois?

Depois. A ordem de execucao e:

1. Plugins passados no `executeDangerBot(plugins)`
2. Plugins locais do `danger-bot.yaml`

### Posso desabilitar plugins do pacote via YAML?

Nao diretamente no YAML. Use o codigo do `dangerfile.ts`:

```typescript
const plugins = allFlutterPlugins.map((p) => {
  if (p.config.name === "spell-checker") {
    p.config.enabled = false;
  }
  return p;
});

executeDangerBot(plugins);
```

### O ignore_files aceita glob patterns?

Sim: `*`, `**` e `?`, alem de caminhos exatos relativos a raiz do repositorio. Veja a tabela em [ignore_files](#ignore_files). O `dry-run` usa a mesma regra do CI.

### Migrando do ignore_danger_files.json

Copie os caminhos do `ignore_danger_files.json` para a lista `ignore_files` do `danger-bot.yaml` (mesmo formato: caminhos relativos a raiz) e apague o arquivo antigo — ele nao e mais lido.
