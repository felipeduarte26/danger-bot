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
    const dartFiles = getDartFiles().filter((f) => fs.existsSync(f));

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
            i + 1,
          );
        }
      }
    }
  },
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

Os plugins locais sao executados **depois** dos plugins passados para `executeDangerBot`.

---

## ignore_files

Array de caminhos de arquivos que devem ser ignorados por **todos** os plugins. Os caminhos sao relativos a raiz do repositorio.

```yaml
ignore_files:
  - lib/features/old_budget/new_budget_one_controller.dart
  - lib/features/products/stringbox/view/stringbox_page.dart
  - lib/features/products/inverters/view/page_inverters.dart
```

Quando um arquivo esta na lista de `ignore_files`, ele nao aparece nos resultados de:

- `getAllChangedFiles()`
- `getDartFiles()`
- `getDartFilesInDirectory()`
- `getDomainDartFiles()`, `getDataDartFiles()`, `getPresentationDartFiles()`
- `getFilesMatching()`, `getFilesByExtension()`
- `hasFilesMatching()`

### Migrando do ignore_danger_files.json

Se seu projeto usa o antigo `ignore_danger_files.json`:

```json
{
  "files": [
    "lib/features/old_module/legacy_page.dart",
    "lib/core/deprecated_helper.dart"
  ]
}
```

Migre para o `danger-bot.yaml`:

```yaml
ignore_files:
  - lib/features/old_module/legacy_page.dart
  - lib/core/deprecated_helper.dart
```

Depois, remova o `ignore_danger_files.json`.

---

## settings

Configuracoes gerais do Danger Bot.

| Opcao | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `verbose` | `boolean` | `false` | Exibe logs detalhados durante a execucao |

```yaml
settings:
  verbose: true
```

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
  sendMessage, sendWarn, sendFail, sendMarkdown,

  // Arquivos (ja respeita ignore_files automaticamente)
  getAllChangedFiles, getDartFiles, getDartFilesInDirectory,
  getFilesMatching, getFilesByExtension, hasFilesMatching,
  getFileContent, fileContainsPattern,

  // Clean Architecture
  getDomainDartFiles, getDataDartFiles, getPresentationDartFiles, isInLayer,

  // PR info
  getPRDescription, getPRTitle, getLinesChanged,

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

Nao. Use caminhos exatos relativos a raiz do repositorio.
