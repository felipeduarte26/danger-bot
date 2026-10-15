# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

`@felipeduarte26/danger-bot` é um pacote de plugins para o [Danger JS](https://danger.systems/js/) que faz code review automático de PRs **Flutter/Dart** (Clean Architecture, Clean Code, Effective Dart). Roda no CI com `npx danger ci` a partir do `dangerfile.ts` do projeto consumidor (ex.: esfera-web, no Bitbucket).

- **Idioma:** mensagens dos plugins, READMEs e docs em **pt-BR**; identificadores de código em inglês. Responda ao usuário em pt-BR.
- **Node `>=25.2.1`** (`engines`), Danger `^14.0.7` (peer), TypeScript 5.9, build **CommonJS**.
- Documentação completa em [`docs/`](docs/) — este arquivo resume o que é preciso para trabalhar no código e aponta para lá.

## Comandos

```bash
npm install          # roda o postinstall scripts/patch-danger.cjs (patches no Danger)
npm run build        # tsc + tsc-alias + dist/package.json {"type":"commonjs"}
npm run lint         # eslint . --max-warnings 0 (type-checked)
npm run type-check   # tsc --noEmit
npx prettier --write <arquivos alterados>   # formate só o que você mexeu (ver Armadilhas)

node bin/cli.js dry-run --project <projeto-flutter> --base <branch|sha> [--plugins a,b] [-v] [--all]
```

Não há suíte de testes. Para validar um plugin, use o **dry-run** num projeto real (ex.: uma cópia do esfera-web) ou o **harness** da seção [Testando](#testando-um-plugin). Antes de testar, rode `npm run build`: o CLI e o harness carregam o `dist/`, não o `src/`.

**Git hooks (Husky):**
- `pre-commit`: lint-staged (eslint+prettier nos `.ts`, prettier nos `.js` — inclusive `dist/`)
- `commit-msg`: commitlint
- `pre-push`: lint + type-check + build

**Commits:** [Conventional Commits](https://www.conventionalcommits.org/) (`docs/COMMITS.md`): `type(scope): subject`, subject em minúsculas e sem ponto final, header ≤ 100. Tipos: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. Scope é opcional (sem ele, só um aviso).

## Arquitetura

### Fluxo de uma execução

1. O `dangerfile.ts` do projeto chama `executeDangerBot(allFlutterPlugins, callbacks?)` ([src/types.ts](src/types.ts)).
2. `loadConfig()` lê `danger-bot.yaml`/`.yml` da raiz (cwd) — [src/config.ts](src/config.ts).
3. `ignore_files` (globs `*`, `**`, `?`) é aplicado **mutando** `danger.git.modified_files`/`created_files`: nenhum plugin vê os arquivos ignorados.
4. `local_plugins` são carregados com `importModule()` (`import()` nativo) e entram **antes** do `google-chat-notification`, que é sempre movido para o fim.
5. `runPlugins()` registra os ativos (`setActivePlugins`) e roda **em sequência**. Um plugin que lança erro para a execução e chama `onError`.
6. `flushSummaries()` roda no `finally` (mesmo com erro) e publica os resumos de fail/warn.
7. A Promise da execução é registrada com o `schedule()` do Danger, que espera ela terminar antes de publicar os comentários.

### Mensagens e quando o build falha ([src/helpers.ts](src/helpers.ts))

- `sendFail/sendWarn(msg, file, line)` (com arquivo e linha) **não** chamam `fail()`/`warn()` na hora: publicam um comentário inline via `markdown()` e guardam a ocorrência num resumo indexado pela **primeira linha da mensagem** (o título).
- `flushSummaries()` emite um `fail`/`warn` por título na tabela principal: até 3 ocorrências listam os arquivos, acima disso só a contagem. **É esse `fail` que reprova o build.** Por isso o título deve ser fixo: dados variáveis no título quebram o agrupamento.
- Sem `file`/`line`, `sendFail`/`sendWarn` chamam `fail()`/`warn()` direto.
- Mensagens idênticas (tipo + arquivo + linha + texto) são descartadas no mesmo processo (`isDuplicate`).
- Antes do flush, as ocorrências inline não estão em `results.fails`. Quem precisa do total usa `getPendingSummaryCounts()`.

### Build CommonJS e `import()`

- Com `module: CommonJS` o TypeScript troca `import(x)` por `require(x)`. Pacotes **só-ESM** (`eld`, `dictionary-pt`) e URLs `file://` falham assim. Use `importModule()` de [src/native-import.ts](src/native-import.ts). Pacotes CommonJS (`wordpos`, `compromise`, `nodehun`) usam `require` normal.
- Dentro do pacote os plugins importam de `"@types"` (alias de `src/types.ts`, resolvido pelo `tsc-alias`). Plugins locais do projeto importam de `"@felipeduarte26/danger-bot"`.
- `dist/` é **commitado**: consumidores instalam via git (`#main` ou tag), sem build. Depois de mudar `src/`, rode o build e commite o `dist/`.

### Danger real × dry-run ([bin/commands/dry-run.js](bin/commands/dry-run.js))

O dry-run monta um mock de `global.danger` a partir de `git diff <merge-base>...HEAD`. Diferenças que importam:

| | Danger real (CI) | dry-run |
|---|---|---|
| `change.content` do `structuredDiffForFile` | mantém o prefixo `+`/`-`/espaço | sem prefixo |
| linha de mudança `normal` | `ln2` | `ln` |
| `git.insertions/deletions` | **não existem** — use `await getLineStats()` | existem |
| `github.pr.body` / `bitbucket_cloud.pr.description` | descrição real | vazia (o pr-validation sempre reclama) |
| plugins pulados por padrão | — | flutter-analyze, flutter-test-runner, test-coverage-summary, google-chat-notification, ai-code-review, spell-checker, pr-summary |

Detalhes do filtro `--plugins`:
- Ele usa **substring**: `spell-checker` também roda o `spell-checker-ptbr`.
- Ele desliga a lista de pulados.
- Sem rede, o `identifier-language` trava no Google Translate. Use `--plugins` sem ele, ou pré-carregue um `fetch` que rejeita: `node --import ./nofetch.mjs bin/cli.js dry-run ...`, com `globalThis.fetch = () => Promise.reject(new Error("offline"))`.

### Patches no Danger ([scripts/patch-danger.cjs](scripts/patch-danger.cjs))

O postinstall substitui strings exatas no `node_modules/danger/distribution`:
- tradução pt-BR;
- branding (nome e link) lido do `danger-bot.yaml` em tempo de execução (ver abaixo);
- resumo em 3 cenários: fails → problemas; só warnings → "Aprovado!"; limpo → "Parabéns!";
- comentários inline do Bitbucket Cloud no estilo Danger Ruby (link invisível com dangerID + arquivo/linha);
- remoção do check de `uuid` para não duplicar comentários;
- `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN` passa a usar o template inline do Bitbucket.

Como funciona:
- Cada substituição é `[rótulo, original, novo]` e parte sempre do **original do Danger**, guardado em `<arquivo>.backup` na primeira vez. Reaplicar é seguro, e os textos `original` são os do Danger sem patch.
- **Branding:** os textos novos usam `__dangerBotBranding.name`/`.url`. O script injeta no topo de cada arquivo que os usa uma declaração que chama `getBranding()` do `dist/branding.js` (caminho relativo ao arquivo do Danger), com fallback para o padrão. Por isso mudar o `branding` do YAML vale na próxima execução, sem reinstalar.
- Ele grava `node_modules/danger/.danger-bot-patched` com `PATCH_VERSION` (hoje igual à versão do pacote). **Ao mudar os patches, mude `PATCH_VERSION`**, senão o marker impede a reaplicação.
- Trecho que não casa vira `⚠️ trecho nao encontrado (<rótulo>)` no log e um aviso de patch incompleto no fim. Ao atualizar o Danger, rode o script e corrija os textos `original` que deixaram de casar.
- O GitLab usa o `githubIssueTemplate`; não há patch específico para ele.
- Para conferir uma instalação: `cat node_modules/danger/.danger-bot-patched` e `grep -c "__dangerBotBranding" node_modules/danger/distribution/runner/templates/*.js`.

### Scripts legados

`scripts/extract_dart_identifiers.js` e `scripts/setup_spell_check.sh` são do spell check antigo, que rodava como step separado do CI. Nada os usa: o spell-checker monta a config do cspell sozinho, e o `.js` nem roda (usa `require` num pacote `"type": "module"`). Não os use como base nem os recomende em pipelines. Remover ou manter é decisão do dono, porque vão junto no pacote publicado (`files`).

### CLI ([bin/cli.js](bin/cli.js), alias `db`)

| Comando | Para que serve |
|---|---|
| `dry-run`/`run`, `init`, `gen` | Para o projeto consumidor. `init` gera o `danger-bot.yaml` e `gen` gera o `dangerfile.example.ts` |
| `list`/`ls`, `info`, `create-plugin`/`new`, `remove-plugin`/`rm` | Leem `src/plugins/` do cwd: rode na raiz deste repo |
| `validate <arquivo>` | Valida o arquivo do plugin; funciona em qualquer lugar |

`create-plugin` e `remove-plugin` são interativos (readline): stdin em pipe não funciona, porque o `rl.question` só lê a primeira linha. Para automatizar, use um script que escreve cada resposta quando aparece um prompt terminando em `: `.

## Criando um plugin

Toda mensagem de plugin segue o [padrão obrigatório das mensagens](#padrão-obrigatório-das-mensagens): helpers `sendFormatted*`, código real do erro, a correção, a ação, o objetivo e o link de referência.

**Prefira `node bin/cli.js create-plugin`.** Ele cria a pasta, o `index.ts` e o README, e registra o plugin em `src/index.ts` (falta só colocá-lo num array de categoria). O `remove-plugin` desfaz tudo.

### Estrutura

```
src/plugins/flutter/<nome-kebab>/
├── <nome-kebab>.ts   # export default createPlugin(...)
├── index.ts          # export { default } from "./<nome-kebab>";
└── README.md
```

### Registro (4 lugares — o que a CLI faz)

1. `src/plugins/flutter/index.ts`: `export { default as meuPluginPlugin } from "./meu-plugin";`
2. `src/index.ts`, bloco `export { ... } from "./plugins/flutter";` — sem isso `import { meuPluginPlugin }` vem `undefined`.
3. `src/index.ts`, `allFlutterPlugins`: `require("./plugins/flutter/meu-plugin").default,` **antes** do `google-chat-notification`. Use sempre `require().default` nesse array: variável importada causa `ReferenceError: Cannot access 'flutter_2' before initialization`.
4. `src/index.ts`: o nome no `import { ... } from "./plugins/flutter"` e no array de categoria (`domainLayerPlugins`, `dataLayerPlugins`, `presentationLayerPlugins`, `cleanArchitecturePlugins`, `codeQualityPlugins`, `performancePlugins`, `testPlugins`).

### Template (arquivo inteiro)

A maioria dos plugins lê o arquivo inteiro com `fs.readFileSync`. Toda mensagem segue o [padrão obrigatório](#padrão-obrigatório-das-mensagens): código real do erro, a mesma linha corrigida, ação, objetivo e referência.

```typescript
/**
 * Meu Plugin
 * O que verifica e por quê (1-3 linhas). Exceções que evitam falso positivo.
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

const PATTERN = /padraoProblematico\(/;
const REPLACEMENT = "padraoCorreto(";

export default createPlugin(
  {
    name: "meu-plugin", // kebab-case, igual ao nome da pasta
    description: "O que o plugin faz",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        fs.existsSync(f)
    );

    for (const file of dartFiles) {
      const lines = fs.readFileSync(file, "utf-8").split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (!PATTERN.test(lines[i])) continue;

        const wrong = lines[i].trim(); // código REAL do arquivo
        const fixed = wrong.replace(PATTERN, REPLACEMENT); // a mesma linha, já corrigida

        sendFormattedFail({
          title: "TITULO FIXO EM CAPS", // chave do resumo: sem dados variáveis
          description: "Por que `padraoProblematico()` é um problema (1-2 linhas, **negrito** no essencial).",
          problem: {
            wrong,
            correct: fixed,
            wrongLabel: "Efeito do código atual",
            correctLabel: "O que muda com a correção",
          },
          action: { text: "Substitua por:", code: fixed },
          objective: "Benefício da correção em uma frase.",
          reference: { text: "Nome da doc oficial", url: "https://api.flutter.dev/..." },
          file,
          line: i + 1,
        });
      }
    }
  }
);
```

**Só linhas adicionadas** (o padrão de comments-checker, spell-checker, spell-checker-ptbr e ai-code-review):

```typescript
const diff = await danger.git.structuredDiffForFile(file);
for (const chunk of diff?.chunks ?? []) {
  for (const change of chunk.changes as any[]) {
    if (change.type !== "add") continue;
    const content = String(change.content).replace(/^\+/, ""); // CI mantém o "+"
    const line = change.ln; // linhas "normal" usam ln2 no Danger real
  }
}
```

**Plugin local do projeto** — um arquivo `.ts`/`.js` apontado em `local_plugins`. O mesmo formato, importando do pacote:

```typescript
import { createPlugin, getDartFiles, sendFormattedWarn } from "@felipeduarte26/danger-bot";
export default createPlugin({ name: "regra-local", description: "...", enabled: true }, async () => {
  for (const file of await getDartFiles()) { /* ... */ }
});
```

O Node carrega o `.ts` direto ([type stripping](https://nodejs.org/api/typescript.html)), sem compilar. Ao escrever o plugin:
- só sintaxe apagável: tipos e interfaces; `enum`, `namespace` e parameter properties dão `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`;
- import relativo **com extensão**: `import { x } from "../shared/util.ts"`; sem ela dá `ERR_MODULE_NOT_FOUND`.

As regras de carregamento estão em [Configuração no projeto consumidor](#configuração-no-projeto-consumidor).

### Padrão obrigatório das mensagens

**Todo problema apontado num arquivo/linha usa `sendFormattedFail` (regra) ou `sendFormattedWarn` (heurística).** Nunca use `sendFail`/`sendWarn` com template literal montado à mão. O exemplo de referência é o [mediaquery-modern.ts](src/plugins/flutter/mediaquery-modern/mediaquery-modern.ts) (veja o `sendFormattedFail` do `MediaQuery.of(...).<prop>`):

| Campo | O que colocar | No mediaquery-modern |
|---|---|---|
| `title` | Problema em CAPS, sem emoji e **fixo** (é a chave do resumo) | `"MEDIAQUERY.OF() — USE API MODERNA"` |
| `description` | Por que é problema, citando o trecho detectado | `` `MediaQuery.of(...).${property}` causa rebuilds desnecessários. `` |
| `problem.wrong` | O **código real** do erro (linha ou trecho do arquivo) | `line.trim()` |
| `problem.correct` | O **mesmo código já corrigido** | `line.trim().replace(MQ_OF_RE, alternative)` |
| `wrongLabel` / `correctLabel` | O efeito de cada versão | `"Rebuild quando QUALQUER propriedade muda"` / `` `Rebuild apenas quando ${property} muda` `` |
| `action` | `text`: o que fazer; `code`: a correção pronta para copiar | `` `Substitua por \`${alternative}\`:` `` + a linha corrigida |
| `objective` | O benefício em uma frase | `"Melhor **performance** com rebuilds mais eficientes."` |
| `reference` | Link oficial (dart.dev, docs.flutter.dev, api.flutter.dev, linter rules...) **sempre que existir** | `MediaQuery-class.html` na api.flutter.dev |
| `file` / `line` | Para o comentário inline na linha do problema | `file`, `i + 1` |

Quando não der para mostrar a linha real:
- **Regra estrutural** (nome de arquivo, pasta, classe ou método ausente): use os nomes reais do arquivo (ex.: `wrong: fileName` e ``correct: `${fileName.replace(".dart", "")}_entity.dart` ``) ou um esqueleto com o nome real da classe (`class ${cls.name} { }`). Veja domain-entities e data-datasources.
- **Dado sensível** (security-checker): não repita o segredo no PR; use um exemplo genérico.
- **Sem documentação confiável:** só então omita `reference`.

Os outros helpers ficam para mensagens **sem** linha de código associada:
- `sendFail`/`sendWarn` sem arquivo — resumo de uma linha no formato `**TÍTULO** — detalhe`. Ex.: pr-size-checker, o total do flutter-analyze, flutter-test-runner, changelog-checker.
- `sendMarkdown` — relatórios e tabelas (pr-summary, test-coverage-summary). Também serve para repassar a saída de uma ferramenta externa linha a linha, com o link da regra: é o que o flutter-analyze faz com cada diagnóstico, somando um `sendFail` de resumo.
- `sendMessage` — informação neutra.

`sendFormattedFail`/`sendFormattedWarn` montam este layout:

```
TITULO EM CAPS (sem emoji, sem ##)

Descrição curta.

### ⚠️ Problema Identificado
❌ **Errado** + bloco de código
✅ **Correto** + bloco de código

### 🎯 AÇÃO NECESSÁRIA
texto opcional + bloco de código

### 🚀 Objetivo
frase curta
📖 [link de referência](url)
```

`problem.language`/`action.language` têm padrão `dart`; use `"text"` para árvores de pastas.

**Severidade:** `fail` para regra do padrão do time. `warn` para heurística sujeita a falso positivo (ex.: print-statement-detector, avoid-setstate-after-async). `message`/`sendMarkdown` para informação (resumos, tabelas).

### Convenções dos plugins existentes

- **Exclusões padrão:**
  - `_test.dart`, `.g.dart`, `.freezed.dart` (às vezes também `.mocks.dart`, `/generated/`, `/test/`);
  - barrel files: nome do arquivo igual ao da pasta (`isBarrelFile`) ou `<camada>s.dart`.
- **Camada:** pelo caminho (`/domain/`, `/data/`, `/presentation/`, `/usecases/`, `/entities/`...).
- **Parse de classes linha a linha:** antes de aplicar regex de cabeçalho, chame `normalizePrimaryConstructorHeaders(content)`. Para os campos declarados no cabeçalho, use `primaryConstructorFieldsByLine(content)`/`findPrimaryConstructors(content)` (vêm de `primary-constructors.ts`). Sem isso, código com primary constructor (Dart 3.13) gera falso positivo (`const` lido como nome da classe, campos invisíveis). Quem confere identificadores do arquivo inteiro deve ler o conteúdo **original**.
- **Duplicidade entre plugins:** use `isPluginActive("outro-plugin")` para não repetir checagem (ex.: o changelog-checker não roda quando o pr-validation está ativo).
- **Logs de debug:** use `verboseLog(...)`, que só aparece com `settings.verbose: true` ou `dry-run -v`.
- **README do plugin:**
  - estrutura: título, parágrafo do que faz, `## O que verifica`, `## Severidade` (`- **Tipo:** \`fail\``), `## Exemplo` (❌ Errado / ✅ Correto em dart), `## Referências`;
  - confira se o exemplo "✅ Correto" passa nos **outros** plugins (ex.: `bool refresh` é reprovado pelo boolean-naming-convention).

## Helpers disponíveis

Todos são exportados por `@felipeduarte26/danger-bot` (e por `"@types"` dentro do pacote). Referência completa em [docs/HELPERS.md](docs/HELPERS.md) e [docs/API.md](docs/API.md).

| Helper | O que faz |
|---|---|
| `getDanger()` | Objeto `danger` global (tipado `ExtendedDangerDSLType`) |
| `sendFail` / `sendWarn` / `sendMessage` (`msg, file?, line?`) | Publicam; com arquivo/linha viram inline + resumo |
| `sendFormattedFail` / `sendFormattedWarn` (`FormattedMessageOptions`) | Layout padrão (título, problema, ação, objetivo, referência) |
| `sendMarkdown(msg, file?, line?)` | Markdown livre (tabelas, relatórios) |
| `scheduleTask(fn)` | Agenda tarefa no `schedule()` do Danger |
| `getAllChangedFiles()` | Criados + modificados, respeitando `ignore_files` |
| `getDartFiles()` **async** | `.dart` existentes no disco, **sem** `_test.dart` |
| `getDartFilesInDirectory(dir)` / `getDomainDartFiles()` / `getDataDartFiles()` / `getPresentationDartFiles()` **async** | Subconjuntos do `getDartFiles()` |
| `getFilesMatching(re)` / `getFilesByExtension(ext)` / `hasFilesMatching(re)` | Filtros sobre `getAllChangedFiles()` |
| `getFileContent(file)` / `fileContainsPattern(file, re)` **async** | Conteúdo depois do PR (`diffForFile().after`, senão o disco) |
| `isInLayer(file, "domain" \| "data" \| "presentation")` | `file.includes("/<camada>/")` |
| `getPRTitle()` / `getPRDescription()` | GitHub ou Bitbucket Cloud |
| `getLineStats()` **async** | `{ added, removed }` somando `diffForFile` (funciona no CI). `getLinesChanged()` é obsoleto |
| `isPluginActive(name)` / `setActivePlugins(names)` | Plugins que rodam nesta execução |
| `getPendingSummaryCounts()` | Fails/warns inline ainda não publicados |
| `flushSummaries()` | Publica os resumos (o `executeDangerBot` já chama) |
| `verboseLog(...)` / `isVerbose()` | Log condicional |
| `setIgnoredFiles` / `getIgnoredFiles` / `isFileIgnored` | Regra de `ignore_files` (globs) |
| `createPlugin(config, run)` / `runPlugins(plugins)` / `executeDangerBot(plugins, callbacks?)` | Núcleo |
| `loadConfig()` / `loadLocalPlugins(paths)` | Leitura do `danger-bot.yaml` |
| `normalizePrimaryConstructorHeaders` / `findPrimaryConstructors` / `primaryConstructorFieldsByLine` | Suporte a primary constructors (Dart 3.13+) |
| `importModule(specifier)` (só dentro do pacote, `src/native-import.ts`) | `import()` nativo para pacotes só-ESM |

Callbacks do `executeDangerBot`:
- `onBeforeRun` — retornar `false` cancela;
- `onSuccess`;
- `onError(error)`;
- `onFinally`.

## Plugins existentes (48)

Antes de criar um plugin, veja se a regra já existe. Arrays em [src/index.ts](src/index.ts); descrição de cada um no README da pasta e em [docs/GUIA_PLUGINS.md](docs/GUIA_PLUGINS.md).

- **PR:** pr-summary, pr-size-checker, pr-validation, changelog-checker, merge-conflict-checker
- **Domain:** domain-entities, domain-failures, repositories, domain-usecases (exige o sufixo `UseCase` em PascalCase)
- **Data:** data-datasources, data-models, model-entity-inheritance
- **Presentation:** presentation-viewmodels, presentation-try-catch-checker, presentation-encapsulation
- **Arquitetura/nomes:** clean-architecture, folder-naming-convention, file-naming, class-naming-convention, boolean-naming-convention, barrel-files-enforcer
- **Qualidade Dart:** late-final-checker, memory-leak-detector, comments-checker, build-doc-checker, security-checker, identifier-language, spell-checker, spell-checker-ptbr, avoid-god-class, avoid-setstate-after-async, date-type-checker, print-statement-detector, empty-catch-detector, future-wait-modernizer, positional-bool-params, private-named-params, primary-constructors (só roda com `sdk` mínimo ≥ 3.13 no pubspec), ai-code-review (desabilitado por padrão)
- **Flutter/performance:** flutter-analyze, flutter-performance, flutter-widgets, mediaquery-modern, column-row-spacing
- **Testes:** test-file-checker, flutter-test-runner, test-coverage-summary
- **Notificação:** google-chat-notification (sempre o último)

## Testando um plugin

**No dry-run** (precisa estar numa branch diferente da base):

```bash
npm run build
node bin/cli.js dry-run --project ../esfera-web --base develop --plugins meu-plugin -v
```

**Harness isolado** (mock dos globais do Danger + plugin do `dist/`). Salve num diretório temporário, nunca no repo:

```javascript
// run.cjs — uso: node run.cjs <dist> <plugin> <arquivos.dart...>
const fs = require("fs");
const [dist, plugin, ...files] = process.argv.slice(2);
const out = [];
global.danger = {
  git: {
    modified_files: [], created_files: files, deleted_files: [],
    // simula "arquivo inteiro adicionado", no formato do Danger real (prefixo "+")
    structuredDiffForFile: async (f) => ({ chunks: [{ changes: fs.readFileSync(f, "utf8")
      .split("\n").map((l, i) => ({ type: "add", content: "+" + l, ln: i + 1 })) }] }),
    diffForFile: async (f) => ({ after: fs.readFileSync(f, "utf8") }),
  },
};
for (const k of ["fail", "warn", "message"]) global[k] = (m) => out.push(`${k}: ${m.split("\n")[0]}`);
global.markdown = (m, f, l) => out.push(`inline ${f}:${l}: ${m.split("\n")[0]}`);
require(`${dist}/plugins/flutter/${plugin}`).default.run().then(() => console.log(out));
```

Teste o caso que deve ser reportado **e** o que não deve. Para mudanças em parsers, compare o resultado antigo com o novo no mesmo diff: crie um `git worktree` do HEAD com `node_modules` linkado e rode o dry-run das duas versões num clone do esfera-web.

## Configuração no projeto consumidor

`danger-bot.yaml` na raiz (gerado por `danger-bot init`; detalhes em [docs/CONFIGURACAO.md](docs/CONFIGURACAO.md)):

```yaml
branding:               # nome e link nos comentários e no status (default: Danger Bot + repo do GitHub)
  name: "Minha Empresa"
  url: "https://minhaempresa.com"
local_plugins:          # arquivos .ts/.js ou pastas (exceto index.*)
  - ./danger/plugins/
ignore_files:           # caminho exato ou glob: lib/legacy/**, **/old_page.dart, lib/x/*.dart
  - lib/features/old_module/legacy_page.dart
settings:
  verbose: false
  gemini_api_keys: []   # ai-code-review (ou env GEMINI_API_KEYS / GEMINI_API_KEY)
  google_chat_webhook: "https://chat.googleapis.com/v1/spaces/..."  # ou env GOOGLE_CHAT_WEBHOOK
```

**Leitura do arquivo** ([src/config.ts](src/config.ts)):
- `danger-bot.yaml` ou `.yml` no **cwd** do processo (a raiz do projeto, onde roda o `danger ci` ou o dry-run).
- YAML inválido não quebra a execução: vira `⚠️ Erro ao ler config` no log e a configuração **inteira** é ignorada (sem ignore, sem plugins locais, sem keys).
- `loadConfig()` loga `📄 Danger Bot config carregado` a cada chamada (o executeDangerBot e plugins como ai-code-review e google-chat-notification chamam). `readConfig()` é a versão silenciosa.
- Chave desconhecida é ignorada sem aviso.

**Chaves:**
- **`branding`** — nome e link nos comentários e no status do build ([src/branding.ts](src/branding.ts), lido pelo Danger via patch). Campo inválido cai no padrão. Detalhes em [Patches no Danger](#patches-no-danger-scriptspatch-dangercjs) e em [docs/CONFIGURACAO.md](docs/CONFIGURACAO.md#branding).
- **`local_plugins`** — plugins do próprio projeto, sem publicar no pacote:
  - cada item é um arquivo ou uma pasta, relativo à raiz; pasta carrega só os `.ts`/`.js` do primeiro nível (não é recursiva; `.mjs`/`.cjs` ficam de fora) e pula `index.*`;
  - o módulo precisa exportar um plugin (`config.name` + `run()`) como `export default` ou `module.exports`; `.js` pode ser ESM ou CommonJS;
  - rodam **depois** dos plugins passados ao `executeDangerBot` e **antes** do google-chat-notification, compartilhando o estado do pacote (resumos, dedupe);
  - caminho inexistente vira `⚠️ Plugin local não encontrado`; erro de carregamento (sintaxe não apagável, import relativo sem extensão) vira `❌ Erro ao carregar <arquivo>` e o plugin é **pulado**. Nos dois casos nada aparece na PR: só no log do CI;
  - os arquivos ficam no repositório do projeto. No esfera-web o YAML vem do Bitrise, mas os plugins apontados por ele precisam estar commitados;
  - o import de `@felipeduarte26/danger-bot` é resolvido a partir do arquivo do plugin, então o pacote precisa estar no `node_modules` do projeto. No CI está; no dry-run com a CLI via `npm link` e sem `package.json` no projeto (TESTE_LOCAL, cenário A), o plugin falha com `Cannot find package '@felipeduarte26/danger-bot'`.
- **`ignore_files`** — remove os arquivos de `danger.git.modified_files`/`created_files` antes de qualquer plugin (os `deleted_files` ficam). Caminho exato ou glob relativo à raiz: `*` não cruza `/`, exceto num `/*` final, que pega a pasta inteira com subpastas; `**` cruza pastas; `?` é um caractere.
- **`settings.verbose`** — logs `[verbose]` (o mesmo que o `-v` do dry-run).
- **`settings.gemini_api_keys`** — keys do ai-code-review, somadas às env `GEMINI_API_KEYS`/`GEMINI_API_KEY`.
- **`settings.google_chat_webhook`** — webhook do google-chat-notification (precisa começar com `https://`); alternativa: env `GOOGLE_CHAT_WEBHOOK`.
- **`settings.fail_on_errors`** — existe no tipo `DangerBotConfig`, mas nenhum código o lê.

Keys e webhook são segredos: um `danger-bot.yaml` com eles não deve ir para o git. O esfera-web mantém o arquivo no `.gitignore` e no Generic File Storage do Bitrise.

Para desligar plugins, use o `dangerfile.ts` (não há opção no YAML):

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

const disabled = ["ai-code-review", "flutter-test-runner"];
const plugins = allFlutterPlugins.map((p) => {
  if (disabled.includes(p.config.name)) p.config.enabled = false;
  return p;
});

executeDangerBot(plugins);
```

`cSpell.words` do `.vscode/settings.json` do projeto é lido pelo spell-checker e pelo identifier-language: é ali que entram marcas e termos de domínio (ex.: `enphase`).

## Pipeline (CI)

Exemplos completos por plataforma em [docs/pipelines/](docs/pipelines/README.md): GitHub Actions e GitLab no README, [Bitbucket Pipelines](docs/pipelines/BITBUCKET_PIPELINES.md) em arquivo próprio. Eles seguem as regras abaixo, conferidas no código do Danger 14 e dos plugins. Ao montar ou corrigir uma pipeline, valide cada item.

### Requisitos comuns

- **Node ≥ 25.2.1** (`engines`).
- **`package.json` do consumidor** (projeto Flutter costuma não ter; crie na raiz):

  ```json
  {
    "private": true,
    "devDependencies": {
      "danger": "^14.0.7",
      "@felipeduarte26/danger-bot": "git+https://github.com/felipeduarte26/danger-bot.git#main",
      "typescript": "^5.9.3"
    }
  }
  ```

  - `danger` fora da faixa do `peerDependencies` faz o `npm install` falhar com `ERESOLVE`. **Ao mudar o peer do Danger ou o `engines` deste pacote, atualize as pipelines dos consumidores:** elas fixam essas versões e não acompanham o `#main`.
  - O Danger não traz transpilador (`typescript` e Babel são só `devDependencies` dele). Sem `typescript` no projeto, o `dangerfile.ts` é executado sem transpilar e quebra no `import`.
  - Sem `package-lock.json` commitado, use `npm install`; o `npm ci` exige o lock.
  - `--ignore-scripts` pula os patches do postinstall. Para reaplicar: `rm -f node_modules/danger/.danger-bot-patched && npm rebuild @felipeduarte26/danger-bot`.
- **Imagem com Node 25 e Flutter.** Sem imagem pronta, parta da do Flutter (`ghcr.io/cirruslabs/flutter:<versão>`) e instale o Node com nvm no mesmo script. Sem Flutter no PATH, desligue esses plugins no `dangerfile.ts`, senão:
  - o flutter-analyze publica **"✅ Nenhum problema encontrado"** sem ter analisado nada;
  - o flutter-test-runner fica em silêncio;
  - o test-coverage-summary diz "indisponível".
- **Código gerado:** se o projeto não versiona `*.g.dart`/`*.freezed.dart` (o esfera-web não versiona), rode `flutter pub get` e `dart run build_runner build --delete-conflicting-outputs` antes do Danger. Sem isso os testes não compilam e o flutter-test-runner reprova a PR.
- **Histórico completo do git:** o merge-conflict-checker faz `git fetch origin` e `git merge-tree` contra `origin/<destino>`.
- **Rede de saída:**
  - identifier-language → Google Translate;
  - ai-code-review → Gemini;
  - google-chat-notification → webhook;
  - merge-conflict-checker → `git fetch origin`.
- **Secrets opcionais:** `GEMINI_API_KEYS`/`GEMINI_API_KEY` e `GOOGLE_CHAT_WEBHOOK` (ou no `danger-bot.yaml`).
- **Detecção da plataforma:** o Danger escolhe pelas variáveis presentes, nesta ordem: Bitbucket Server → Bitbucket Cloud → GitLab → GitHub. Uma variável de outra plataforma no ambiente desvia a execução.

### GitHub Actions

- **Disparo:** `on: pull_request`. O `branches:` desse evento filtra a branch de **destino**.
- **Token:** `GITHUB_TOKEN` automático, com `permissions: contents: read`, `pull-requests: write` e `statuses: write`. Os comentários saem como `github-actions[bot]`; para outro usuário, use um PAT em `DANGER_GITHUB_API_TOKEN`.
- **Checkout:** `fetch-depth: 0` e `ref: ${{ github.event.pull_request.head.sha }}`. O padrão do `pull_request` é o merge commit, e os plugins leem do disco o conteúdo dos arquivos.
- **PR de fork:** o `GITHUB_TOKEN` é só leitura e o Danger não comenta. `pull_request_target` resolve, mas roda código da PR com acesso aos secrets: só em repositório interno.
- **merge-conflict-checker:** com conflito o GitHub não dispara o `pull_request`, então ele não roda nesse caso.

### GitLab CI

- **Disparo:** `rules: - if: $CI_PIPELINE_SOURCE == "merge_request_event"`. Para filtrar o destino, some `&& $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "develop"`. O Danger só reconhece o MR com `CI_MERGE_REQUEST_IID`, que existe apenas em pipelines de merge request.
- **Token:** `DANGER_GITLAB_API_TOKEN` (project ou personal access token, escopo `api`). O `CI_JOB_TOKEN` não comenta.
  - Marque a variável como **Masked**, não como **Protected**: variável protegida não chega a MR de branch não protegida.
- **Self-hosted:** o host vem de `CI_API_V4_URL`, automático no runner, ou de `DANGER_GITLAB_HOST`.
- **Histórico:** `GIT_DEPTH: 0` (o padrão do runner é raso).
- **Limitação atual do pacote:** `getPRTitle()`, `getPRDescription()` e o pr-validation só leem GitHub e Bitbucket Cloud.
  - No GitLab a descrição chega vazia e o pr-validation reprova todo MR com "DESCRIÇÃO DO PR MUITO CURTA".
  - O google-chat-notification sai sem link e com o título genérico.
  - Desligue o pr-validation no GitLab até o suporte ser adicionado (`danger.gitlab.mr.title`, `.description` e `.web_url`).

### Bitbucket Pipelines (Bitbucket Cloud)

- **Disparo:** `pipelines: pull-requests:`. A chave filtra a branch de **origem**, não o destino. Para rodar só em PR para `develop`, saia do script quando `$BITBUCKET_PR_DESTINATION_BRANCH` for outro.
- **Token:** `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN`, um **repository access token** (Repository settings → Access tokens; escopos Pull requests Read/Write e Repositories Read). Não é App password: App password vai no par `DANGER_BITBUCKETCLOUD_USERNAME`/`PASSWORD`.
- **`DANGER_BITBUCKETCLOUD_UUID` é obrigatório com access token.** Sem ele o Danger consulta `/2.0/user`, que o access token não acessa, e falha. Basta um UUID entre chaves (ex.: o do workspace): os comentários antigos são achados pelo dangerID (`--id`), não pelo UUID.
- **Precedência de credenciais:** OAuth (`DANGER_BITBUCKETCLOUD_OAUTH_KEY`/`SECRET`) → usuário (`DANGER_BITBUCKETCLOUD_USERNAME`/`PASSWORD`) → access token. Com `USERNAME` no ambiente, o token é ignorado.
- **Histórico:** `clone: depth: full`.
- **Variáveis:** as de repositório marcadas como Secured chegam nos pipelines de PR do próprio repositório, não nos de fork.

## Armadilhas conhecidas

- **`dist/` misto:** o commitado tem arquivos formatados pelo Prettier (via lint-staged) e outros crus do `tsc`. Depois do `npm run build`, formate o dist e restaure com `git checkout` cada arquivo cujo conteúdo formatado não mudou. Sem isso, uns 47 `index.js` intocados aparecem no diff.
- **Prettier em lote:** `npx prettier --write "src/**/*.ts"` reformata arquivos que você não mexeu (alguns `index.ts`), e o `README.md` não está prettier-limpo. Formate só os arquivos alterados.
- **eld e Hunspell desligados de propósito:**
  - eld no identifier-language e Hunspell (`HUNSPELL_ENABLED = false`) no spell-checker-ptbr;
  - medido no esfera-web, ligá-los levava de 181 para 2.022 e de 5 para 78 falhas, quase todas falsos positivos;
  - religar exige recalibrar as heurísticas, não só mudar a flag;
  - no spell-checker, o eld só rotula uma palavra como "não está em inglês" quando detecta pt/es.
- **cspell:**
  - spell-checker e identifier-language chamam `./node_modules/.bin/cspell`, relativo ao **cwd** do projeto: sem `node_modules` lá (ex.: dry-run num projeto Flutter sem `package.json`), o passo não roda;
  - o `--root <tmpdir>` é obrigatório: o cspell 10 ignora arquivos fora da raiz.
- **Danger runtime:**
  - `executeDangerBot` precisa continuar registrado no `schedule()` e com `flushSummaries()` no `finally`;
  - o `google-chat-notification` lê `global.results` mais `getPendingSummaryCounts()`.
- **`getDartFiles()` é assíncrona e exclui testes:** use `getFilesMatching(/_test\.dart$/)` para pegar testes.
- **Mudança no `domain-usecases`:** ele passou a analisar os `*_usecase.dart` (antes um filtro excluía todos) e reprova `Usecase` como casing errado. PRs que tocam usecases antigos com `Usecase` falham.
- **Antes de mexer em heurísticas**, valide contra código real do time (esfera-web) num clone/cópia em diretório temporário. Nunca altere o repositório do projeto original.

## Referências

- Danger JS: [docs](https://danger.systems/js/) · [getting started](https://danger.systems/js/guides/getting_started.html) · [Bitbucket Cloud](https://danger.systems/js/usage/bitbucket_cloud.html) · [repo](https://github.com/danger/danger-js)
- Dart:
  - [Effective Dart](https://dart.dev/effective-dart): [style](https://dart.dev/effective-dart/style), [design](https://dart.dev/effective-dart/design), [documentation](https://dart.dev/effective-dart/documentation), [usage](https://dart.dev/effective-dart/usage)
  - análise: [linter rules](https://dart.dev/tools/linter-rules) · [diagnostics](https://dart.dev/tools/diagnostics)
  - linguagem: [primary constructors](https://dart.dev/language/primary-constructors) · [class modifiers](https://dart.dev/language/class-modifiers) · [records](https://dart.dev/language/records) · [private named parameters](https://dart.dev/to/private-named-parameters)
- Flutter: [performance best practices](https://docs.flutter.dev/perf/best-practices) · [testing](https://docs.flutter.dev/testing) · [API](https://api.flutter.dev/)
- Arquitetura: [The Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) · [SRP](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html)
- Ferramentas: [cspell](https://cspell.org/) · [eld](https://github.com/nitotm/efficient-language-detector-js) · [Node.js TypeScript (type stripping)](https://nodejs.org/api/typescript.html) · [Conventional Commits](https://www.conventionalcommits.org/)
- Integrações: [Google Chat webhooks](https://developers.google.com/chat/how-tos/webhooks) · [Gemini API](https://ai.google.dev/) · [Google AI Studio (keys)](https://aistudio.google.com/apikey)
- Docs do projeto: [GUIA_PLUGINS](docs/GUIA_PLUGINS.md) · [HELPERS](docs/HELPERS.md) · [API](docs/API.md) · [ARQUITETURA](docs/ARQUITETURA.md) · [CONFIGURACAO](docs/CONFIGURACAO.md) · [TESTE_LOCAL](docs/TESTE_LOCAL.md) · [CLI](docs/CLI.md) · [COMMITS](docs/COMMITS.md)
