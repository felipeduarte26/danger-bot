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
# Nome e link do bot nos comentarios do PR
branding:
  name: "Minha Empresa"
  url: "https://minhaempresa.com"

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

## branding

Nome e link que identificam o bot. Sem a secao (ou com um campo invalido), vale o padrao: **Danger Bot** e `https://github.com/felipeduarte26/danger-bot`.

```yaml
branding:
  name: "Minha Empresa"            # texto nao vazio
  url: "https://minhaempresa.com"  # precisa comecar com http:// ou https://
```

Onde aparece:

| Local | Exemplo com o branding acima |
| ----- | ---------------------------- |
| Rodape do comentario principal | `Gerado por 🚀 Minha Empresa no commit <commit>`, com o nome linkando para a `url` |
| Link invisivel no fim de cada comentario (principal e inline) | Nao aparece na tela; o Danger o usa para achar os proprios comentarios. Aponta para a `url` |
| Status do build | Link do status quando o CI nao informa a URL do build; chave do status no Bitbucket quando o Danger roda sem `--id` |
| Card do Google Chat (`google-chat-notification`) | Titulo `Minha Empresa — Code Review` |
| Rodape da revisao por IA (`ai-code-review`) | `Analise gerada por Minha Empresa AI` |

Os comentarios inline continuam sem rodape visivel: o nome aparece so no comentario principal.

A frase de abertura quando ha erros nao usa o branding: e sempre `⚠️ Danger Bot encontrou alguns problemas. Nao se preocupe, tudo pode ser corrigido.`

O nome e o link sao lidos a cada execucao do Danger: mudar o `danger-bot.yaml` vale no proximo build, sem reinstalar. O `--id` passado ao `danger ci` e outra coisa: ele identifica os comentarios do bot (para atualiza-los ou remove-los) e da nome ao status do build quando informado. Trocar o `--id` faz o bot deixar de reconhecer os comentarios antigos.

---

## local_plugins

Array de caminhos para plugins customizados do projeto. Aceita:

- **Arquivo**: caminho direto para um arquivo `.ts` ou `.js`
- **Diretorio**: os arquivos `.ts`/`.js` do primeiro nivel do diretorio (exceto `index.*`) serao carregados como plugins. Subpastas nao sao lidas

Os caminhos sao relativos a raiz do projeto, e os arquivos precisam estar no repositorio (commitados).

### Criando um plugin local

O plugin local deve seguir o mesmo padrao dos plugins do Danger Bot:

```typescript
import {
  createPlugin,
  sendFormattedFail,
  DartFile,
  DartCommentDirective,
} from "@felipeduarte26/danger-bot";

export default createPlugin(
  {
    name: "meu-plugin-local",
    description: "Regra customizada do meu projeto",
    enabled: true,
  },
  async () => {
    // .dart do PR (sem testes e sem gerados), já analisados pelo modelo Dart
    for (const file of DartFile.changed()) {
      for (const comment of file.comments) {
        if (comment.directive !== DartCommentDirective.Todo) continue; // só comentário de verdade

        sendFormattedFail({
          title: "TODO ENCONTRADO",
          description: "Comentário TODO detectado no código.",
          problem: { wrong: comment.lineText, correct: "// (TODO resolvido e removido)" },
          action: {
            text: "Resolva o TODO antes de mergear a PR e remova o comentário.",
            code: "// (TODO resolvido e removido)",
          },
          objective: "Manter o código limpo e sem pendências.",
          file: file.path.path,
          line: comment.line,
        });
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

Arquivos `.ts` sao carregados direto pelo Node (type stripping, Node >= 22.18), sem compilar. Por isso:

- use apenas sintaxe TypeScript "apagavel": tipos e interfaces; `enum`, `namespace` e parameter properties (`constructor(private x)`) nao carregam;
- imports relativos precisam da extensao: `import { x } from "../shared/util.ts"`, nao `"../shared/util"`.

Arquivos `.js` podem ser ESM (`export default`) ou CommonJS (`module.exports`).

Plugin que nao carrega e pulado e os demais continuam. O motivo aparece **so no log do CI**, nao no PR:

| Log | Causa |
| --- | ----- |
| `⚠️ Plugin local não encontrado: <caminho>` | Caminho errado no `danger-bot.yaml` |
| `❌ Erro ao carregar <arquivo>` + `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` | `enum`, `namespace` ou outra sintaxe nao apagavel |
| `❌ Erro ao carregar <arquivo>` + `ERR_MODULE_NOT_FOUND` | Import relativo sem extensao |
| `❌ Erro ao carregar <arquivo>` + `Cannot find package '@felipeduarte26/danger-bot'` | O pacote nao esta no `node_modules` do projeto (ex.: dry-run com a CLI via `npm link`, sem `package.json`) |
| `⚠️ <arquivo>: não é um plugin válido` | O arquivo nao exporta um plugin (falta `config.name` ou `run()`) |

Para conferir antes do PR, rode `npx danger-bot dry-run --base develop`: ele carrega os plugins locais do mesmo jeito.

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

O `executeDangerBot` (e o `dry-run`, com a mesma regra) remove esses arquivos de `danger.git.modified_files` e `danger.git.created_files` antes de rodar os plugins, entao eles nao aparecem para nenhum plugin nem nos helpers (`DartFile.changed()`, `getAllChangedFiles()`, `getFilesMatching()`...).

---

## settings

Configuracoes gerais do Danger Bot.

| Opcao                 | Tipo       | Default | Descricao |
| --------------------- | ---------- | ------- | --------- |
| `verbose`             | `boolean`  | `false` | Exibe logs detalhados durante a execucao |
| `blame`               | `boolean`  | `true`  | Apenas no Bitbucket: adiciona aos comentarios inline quem alterou a linha por ultimo (`git blame`). `false` desliga |
| `gemini_api_keys`     | `string[]` | `[]`    | API keys do Google Gemini para o plugin **ai-code-review** (rotacao automatica) |
| `google_chat_webhook` | `string`   | —       | URL do webhook do Google Chat para o plugin **google-chat-notification** (opcional) |

```yaml
settings:
  verbose: true
  gemini_api_keys:
    - "AIzaSy..."
    - "AIzaSy..."
```

### `blame` (autoria nos comentarios inline)

Quando o Danger roda num PR do Bitbucket, cada comentario inline termina com quem alterou a linha por ultimo:

```text
👤 Última alteração: **Fulano de Tal** · 17/10/2026 · `abc1234`
```

- O nome e o `user.name` do commit no git, nao a conta do Bitbucket.
- A data e absoluta (no fuso do autor) para o corpo do comentario nao mudar entre execucoes: o Danger so edita um comentario inline quando o texto muda.
- Precisa do historico completo (`clone: depth: full`). Num clone raso, linhas mais antigas que o limite ficam sem autoria.
- Linha nao commitada ou erro do git (ex.: `detected dubious ownership`): o comentario sai sem a linha de autoria.
- GitHub, GitLab e `dry-run` nao mostram a autoria.

```yaml
settings:
  blame: false # desliga
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

  // Modelo Dart: leitura do código (ver MODELO_DART.md)
  DartFile,
  DartPath,

  // Arquivos (ja respeita ignore_files automaticamente)
  getAllChangedFiles,
  getFilesMatching,
  getFilesByExtension,
  hasFilesMatching,
  getFileContent,
  fileContainsPattern,

  // Legado (plugins antigos): use DartFile.changed() e DartPath
  getDartFiles,
  getDartFilesInDirectory,
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
