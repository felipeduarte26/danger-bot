# Arquitetura

Estrutura interna do projeto Danger Bot.

---

## Visao geral

```
danger-bot/
├── src/                    # Codigo fonte TypeScript
│   ├── index.ts            # Entry point - exports principais
│   ├── types.ts            # Interfaces, tipos e funcoes core
│   ├── helpers.ts          # Funcoes auxiliares
│   ├── config.ts           # Loader do danger-bot.yaml (plugins locais + ignore)
│   └── plugins/
│       ├── index.ts        # Barrel file de plataformas
│       └── flutter/        # Plugins Flutter/Dart
│           ├── index.ts    # Barrel file - exporta todos os plugins
│           ├── pr-summary/
│           │   ├── pr-summary.ts
│           │   ├── index.ts
│           │   └── README.md
│           ├── security-checker/
│           └── ...
├── bin/                    # CLI
│   ├── cli.js              # Entry point da CLI (Commander)
│   ├── commands/           # Implementacao dos comandos
│   │   ├── create-plugin.js
│   │   ├── remove-plugin.js
│   │   ├── list-plugins.js
│   │   ├── generate-dangerfile.js
│   │   ├── validate-plugin.js
│   │   ├── init-config.js
│   │   └── info.js
│   ├── templates/          # Templates para geracao de codigo
│   │   ├── plugin-template.js
│   │   ├── dangerfile-template.js
│   │   └── readme-template.js
│   └── utils/              # Utilitarios da CLI
│       ├── fs-helpers.js
│       ├── string-helpers.js
│       └── readline-helper.js
├── scripts/                # Scripts de build e setup
│   ├── patch-danger.cjs    # Patches no Danger JS (postinstall)
│   ├── extract_dart_identifiers.js
│   └── setup_spell_check.sh
├── dist/                   # Build output (commitado)
└── docs/                   # Documentacao
```

---

## Fluxo de execucao

```
1. Usuario cria dangerfile.ts
   └── import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot"

2. CI/CD executa `npx danger ci`
   └── Danger JS carrega dangerfile.ts

3. executeDangerBot(plugins, callbacks?)
   ├── loadConfig() → carrega danger-bot.yaml (se existir)
   ├── setIgnoredFiles(config.ignore_files) → filtra arquivos ignorados
   ├── loadLocalPlugins(config.local_plugins) → carrega plugins locais
   ├── callbacks.onBeforeRun() → false cancela
   ├── runPlugins([...plugins, ...localPlugins])
   │   └── Para cada plugin habilitado:
   │       └── plugin.run()
   │           └── Usa helpers (getDartFiles, sendWarn, etc.)
   ├── callbacks.onSuccess() ou callbacks.onError()
   └── callbacks.onFinally()

4. Danger JS posta comentarios no PR
```

---

## Modulos principais

### src/index.ts

Entry point do pacote. Responsavel por:
- Re-exportar tipos e helpers
- Exportar todos os plugins individuais
- Definir arrays de plugins por categoria (`allFlutterPlugins`, `domainLayerPlugins`, etc.)

### src/types.ts

Define as interfaces core do sistema de plugins:
- `DangerPluginConfig` - configuracao de um plugin (name, description, enabled)
- `DangerPlugin` - interface de um plugin (config + run)
- `DangerBotCallbacks` - callbacks do ciclo de vida
- `DangerBotConfig` - re-export da interface de configuracao YAML
- `createPlugin()` - factory para criar plugins
- `runPlugins()` - executa plugins sequencialmente
- `executeDangerBot()` - funcao principal com config automatico, plugins locais e callbacks

### src/helpers.ts

Funcoes auxiliares organizadas em categorias:
- **Danger Core**: `getDanger()`
- **Mensagens**: `sendMessage`, `sendWarn`, `sendFail`, `sendMarkdown`, `scheduleTask`
- **Filtros de arquivos**: `getAllChangedFiles`, `getDartFiles`, `getFilesMatching`, etc.
- **Clean Architecture**: `getDomainDartFiles`, `getDataDartFiles`, `isInLayer`, etc.
- **Info do PR**: `getPRDescription`, `getPRTitle`, `getLinesChanged`
- **Configuracao**: `setIgnoredFiles`, `getIgnoredFiles` (usados internamente pelo config loader)

> `getAllChangedFiles()` filtra automaticamente os arquivos listados em `ignore_files` do `danger-bot.yaml`.

### src/config.ts

Carrega configuracoes do arquivo `danger-bot.yaml` da raiz do projeto:
- `loadConfig()` - le e parseia o YAML
- `loadLocalPlugins()` - carrega plugins locais via `import()` dinamico
- `DangerBotConfig` - interface da estrutura do YAML
- Validacao automatica de plugins locais (verifica `config.name` e `run()`)

### src/plugins/flutter/

Cada plugin segue a mesma estrutura:

```
plugin-name/
├── plugin-name.ts    # Logica do plugin usando createPlugin()
├── index.ts          # export { default } from "./plugin-name"
└── README.md         # Documentacao especifica
```

---

## Sistema de plugins

### Interface

```typescript
interface DangerPlugin {
  config: DangerPluginConfig;
  run(): Promise<void>;
}

interface DangerPluginConfig {
  name: string;
  description: string;
  enabled: boolean;
}
```

### Factory

```typescript
function createPlugin(config: DangerPluginConfig, runFn: () => Promise<void>): DangerPlugin
```

### Execucao

Os plugins sao executados **sequencialmente** por `runPlugins()`. Se um plugin lanca erro, a execucao para e `onError` e chamado.

Plugins com `config.enabled = false` sao pulados automaticamente.

---

## CLI

A CLI usa [Commander](https://github.com/tj/commander.js) e esta em `bin/cli.js`.

Cada comando e um modulo separado em `bin/commands/`. Os comandos manipulam o filesystem para criar/remover plugins e atualizar barrel files automaticamente.

Templates em `bin/templates/` geram codigo para novos plugins, dangerfiles e READMEs.

O comando `init` (`bin/commands/init-config.js`) gera um `danger-bot.yaml` de exemplo na raiz do projeto do usuario.

---

## Scripts

### patch-danger.cjs

Executado automaticamente no `postinstall`. Modifica o Danger JS para:
- Remover mensagem "All green. Good on 'ya"
- Customizar links e nomes de runtime
- Traduzir mensagens para portugues
- Corrigir inline comments no Bitbucket Cloud

Usa um sistema de versionamento de patches (`.danger-bot-patched`) para evitar reaplicacao.

### extract_dart_identifiers.js

Extrai identificadores (classes, metodos, variaveis) de arquivos Dart e quebra nomes camelCase em palavras individuais para verificacao ortografica com cspell.

### setup_spell_check.sh

Configura o cspell para CI/CD, extraindo palavras customizadas do `.vscode/settings.json` e gerando `cspell.config.json`.

---

## Build

O projeto usa TypeScript com `tsc` e `tsc-alias` para resolver path aliases:

```json
{
  "paths": {
    "@types": ["types"],
    "@plugins/*": ["plugins/*"]
  }
}
```

O `dist/` e commitado no repositorio para permitir instalacao via Git (que nao executa `npm run build`).

---

## Qualidade de codigo

- **ESLint 9** com TypeScript type-checked rules
- **Prettier** para formatacao
- **Husky** com hooks:
  - `pre-commit`: lint-staged (ESLint + Prettier nos arquivos staged)
  - `commit-msg`: commitlint (Conventional Commits)
  - `pre-push`: lint + type-check + build completo
- **Commitlint** com config conventional
