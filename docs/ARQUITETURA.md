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
│   ├── branding.ts         # Nome e link do bot (branding do danger-bot.yaml)
│   ├── native-import.ts    # import() nativo (pacotes so-ESM e plugins locais no build CommonJS)
│   ├── dart/               # Modelo Dart: leitura do codigo pelos plugins (DartFile, DartClass...)
│   │   ├── internal/       # lexer, parser de declaracoes, nivel superior, pubspec
│   │   ├── enums.ts, path.ts, type.ts, nodes.ts, declarations.ts, file.ts, text.ts
│   │   └── index.ts        # exportacoes publicas (re-exportadas por types.ts)
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
│   │   ├── dry-run.js
│   │   ├── inspect.js
│   │   ├── create-plugin.js
│   │   ├── remove-plugin.js
│   │   ├── list-plugins.js
│   │   ├── generate-dangerfile.js
│   │   ├── validate-plugin.js
│   │   ├── init-config.js
│   │   └── info.js
│   ├── templates/          # Templates para geracao de codigo
│   │   ├── plugin-template.js
│   │   ├── plugins/        # Um template por tipo de regra (call, class, diff, path)
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
├── tests/                  # Testes do modelo Dart (node:test, sobre o dist/)
├── tools/parity/           # Paridade antes × depois dos plugins sobre o esfera (fora do pacote)
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

3. executeDangerBot(plugins, callbacks?) — registra a execucao com schedule()
   ├── loadConfig() → carrega danger-bot.yaml (se existir)
   ├── setIgnoredFiles(config.ignore_files) → tira os ignorados (globs) de danger.git
   ├── loadLocalPlugins(config.local_plugins) → carrega plugins locais (import() nativo)
   ├── google-chat-notification vai para o fim da lista
   ├── callbacks.onBeforeRun() → false cancela
   ├── runPlugins([...plugins, ...localPlugins])
   │   └── Para cada plugin habilitado:
   │       └── plugin.run()
   │           └── Le o codigo pelo modelo Dart (DartFile.changed(), file.classes...)
   │               e publica com sendFormattedFail/sendWarn
   ├── callbacks.onSuccess() ou callbacks.onError()
   ├── flushSummaries() → fails/warns agrupados (sempre, mesmo se um plugin falhar)
   └── callbacks.onFinally()

4. Danger JS espera as tarefas do schedule() e posta os comentarios no PR
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
- **Filtros de arquivos**: `getAllChangedFiles`, `getFilesMatching`, etc. (para `.dart`, os plugins usam `DartFile.changed()`)
- **Legado**: `getDartFiles`, `getDomainDartFiles`, `getDataDartFiles`, `isInLayer` (mantidos para plugins locais antigos)
- **Info do PR**: `getPRDescription`, `getPRTitle`, `getLineStats` (`getLinesChanged` obsoleto)
- **Execucao**: `isPluginActive` / `setActivePlugins` (plugins habilitados na execucao)
- **Primary constructors (legado)**: `normalizePrimaryConstructorHeaders`, `findPrimaryConstructors`, `primaryConstructorFieldsByLine`
- **Configuracao**: `setIgnoredFiles`, `getIgnoredFiles` (usados internamente pelo config loader)

> `getAllChangedFiles()` filtra automaticamente os arquivos listados em `ignore_files` do `danger-bot.yaml`.

### src/dart/ (modelo Dart)

Le e analisa cada arquivo `.dart` uma vez por execucao (cache limpo no `runPlugins`) e entrega o codigo como objetos: `DartFile` (classes, funcoes, diretivas, comentarios, strings, chamadas), `DartPath` (camada, pasta, teste, gerado), `DartClass`, `DartField`, `DartMethod`, `DartConstructor`, `DartType`, `DartBody` (statements, chamadas, closures, try/catch)... Trabalha sobre tokens, nao sobre linhas: comentarios e strings nunca viram codigo, e quebras de linha nao mudam o resultado. Nunca lanca excecao; o que nao reconhece vira `DartUnknownMember`/`parseErrors`. Guia completo em [MODELO_DART.md](MODELO_DART.md).

- `internal/lexer.ts`: tokens, strings com interpolacao, comentarios aninhados, CRLF/BOM.
- `internal/syntax.ts`: classes/enums, membros, parametros, construtores (tambem usado pelo primary-constructors).
- `internal/toplevel.ts`: diretivas, mixin, extension, extension type, typedef, funcoes e variaveis de nivel superior.
- `path.ts`, `type.ts`, `nodes.ts`, `declarations.ts`, `file.ts`: as classes publicas; `enums.ts`: os enums.

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

Os plugins sao executados **sequencialmente** por `runPlugins()`. Se um plugin lanca erro, a execucao para e `onError` e chamado; os fails/warns que ja tinham sido emitidos continuam sendo publicados (o `flushSummaries()` roda no `finally`).

### Mensagens e falha do build

`sendFail`/`sendWarn` com `file` e `line` publicam um comentario inline via `markdown()` e guardam a ocorrencia num resumo. O `flushSummaries()`, no fim da execucao, emite na tabela principal um `fail`/`warn` por titulo (ate 3 ocorrencias com o arquivo; acima disso, a contagem) — e esse `fail` que reprova o build. Antes do flush essas ocorrencias nao estao em `results.fails`; quem precisa do total (ex.: `google-chat-notification`) usa `getPendingSummaryCounts()`.

### Build em CommonJS e import()

O build e CommonJS (`module: CommonJS`), e o TypeScript troca `import()` por `require()`. Para pacotes so-ESM (`eld`, `dictionary-pt`) e para os plugins locais (carregados por URL `file://`), use `importModule()` de `src/native-import.ts`, que mantem o `import()` nativo do Node.

Plugins com `config.enabled = false` sao pulados automaticamente.

---

## CLI

A CLI usa [Commander](https://github.com/tj/commander.js) e esta em `bin/cli.js`.

Cada comando e um modulo separado em `bin/commands/`. Os comandos manipulam o filesystem para criar/remover plugins e atualizar barrel files automaticamente.

Templates em `bin/templates/` geram codigo para novos plugins, dangerfiles e READMEs. O `create-plugin` pergunta o tipo de regra e usa o template de `bin/templates/plugins/<tipo>.ts.tpl` (`call`, `class`, `diff`, `path`), todos sobre o modelo Dart.

O comando `inspect` (`bin/commands/inspect.js`) carrega o `dist/dart` e mostra o modelo de um arquivo `.dart`, com o nome de cada propriedade, para quem escreve plugins.

O comando `init` (`bin/commands/init-config.js`) gera um `danger-bot.yaml` de exemplo na raiz do projeto do usuario.

---

## Scripts

### patch-danger.cjs

Executado automaticamente no `postinstall`. Modifica o Danger JS para:
- Remover mensagem "All green. Good on 'ya"
- Exibir o nome e o link do `branding` do `danger-bot.yaml`
- Traduzir mensagens para portugues
- Corrigir inline comments no Bitbucket Cloud

O nome e o link nao ficam gravados no Danger: os arquivos alterados chamam `getBranding()` (`src/branding.ts`) ao serem carregados, entao mudar o YAML vale na proxima execucao. Cada arquivo e patcheado a partir do original do Danger (`<arquivo>.backup`), e um marcador versionado (`.danger-bot-patched`) evita reaplicar sem necessidade.

### extract_dart_identifiers.js e setup_spell_check.sh (legado)

Scripts da versao antiga do spell check, quando o cspell rodava como step separado do CI. Nada no pacote os usa hoje: o plugin `spell-checker` monta a configuracao do cspell sozinho. O `extract_dart_identifiers.js` usa `require` e nao roda como `.js` neste pacote (`"type": "module"`).

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
