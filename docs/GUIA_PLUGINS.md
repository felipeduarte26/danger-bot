# Guia de Plugins

Como usar, configurar e criar plugins no Danger Bot.

---

## Usando plugins

### Todos os plugins

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins);
```

### Por categoria

```typescript
import {
  domainLayerPlugins,
  dataLayerPlugins,
  presentationLayerPlugins,
  cleanArchitecturePlugins,
  codeQualityPlugins,
  performancePlugins,
  testPlugins,
  executeDangerBot,
} from "@felipeduarte26/danger-bot";

// Apenas plugins de Clean Architecture
executeDangerBot(cleanArchitecturePlugins);

// Combinar categorias
executeDangerBot([...codeQualityPlugins, ...performancePlugins]);
```

### Plugins individuais

```typescript
import {
  prValidationPlugin,
  securityCheckerPlugin,
  flutterAnalyzePlugin,
  executeDangerBot,
} from "@felipeduarte26/danger-bot";

executeDangerBot([prValidationPlugin, securityCheckerPlugin, flutterAnalyzePlugin]);
```

---

## Configurando plugins

### Desabilitar um plugin

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

const plugins = allFlutterPlugins.map(p => {
  if (p.config.name === "spell-checker") {
    p.config.enabled = false;
  }
  return p;
});

executeDangerBot(plugins);
```

### Desabilitar varios plugins

```typescript
const disabled = ["spell-checker", "comments-checker"];

const plugins = allFlutterPlugins.map(p => {
  if (disabled.includes(p.config.name)) {
    p.config.enabled = false;
  }
  return p;
});

executeDangerBot(plugins);
```

---

## Lista completa de plugins

### Pull Request

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `prSummaryPlugin` | `pr-summary` | Gera sumario automatico com estatisticas do PR |
| `prSizeCheckerPlugin` | `pr-size-checker` | Verifica tamanho do PR por arquivos .dart |
| `prValidationPlugin` | `pr-validation` | Valida descricao, changelog e aspectos gerais do PR |
| `changelogCheckerPlugin` | `changelog-checker` | Avisa quando o PR muda codigo sem atualizar o CHANGELOG; nao roda se o `pr-validation` estiver ativo (ele ja reprova pelo mesmo motivo) |
| `mergeConflictCheckerPlugin` | `merge-conflict-checker` | Detecta conflitos de merge com o branch de destino |

### Clean Architecture - Domain

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `domainEntitiesPlugin` | `domain-entities` | Valida Domain Entities |
| `domainFailuresPlugin` | `domain-failures` | Valida Domain Failures |
| `repositoriesPlugin` | `repositories` | Valida Repositories (Domain interface + Data implementacao) |
| `domainUseCasesPlugin` | `domain-usecases` | Valida Domain Use Cases |

### Clean Architecture - Data

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `dataDatasourcesPlugin` | `data-datasources` | Valida Data Sources |
| `dataModelsPlugin` | `data-models` | Valida Data Models |
| `modelEntityInheritancePlugin` | `model-entity-inheritance` | Model com os mesmos campos da Entity deve fazer `extends` dela; aponta `toEntity()` redundante |

### Clean Architecture - Presentation

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `presentationViewModelsPlugin` | `presentation-viewmodels` | Valida que ViewModels dependam apenas de UseCases |
| `presentationTryCatchCheckerPlugin` | `presentation-try-catch-checker` | Detecta uso de try-catch na camada Presentation |
| `presentationEncapsulationPlugin` | `presentation-encapsulation` | Membros publicos em classes `State` da presentation que deveriam ser privados |

### Qualidade de Codigo

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `cleanArchitecturePlugin` | `clean-architecture` | Detecta violacoes entre camadas (imports indevidos) |
| `fileNamingPlugin` | `file-naming` | Verifica nomenclatura de arquivos Dart (snake_case) |
| `folderNamingConventionPlugin` | `folder-naming-convention` | Pastas da Clean Architecture no plural (`usecases/`, `entities/`, `models/`...) |
| `commentsCheckerPlugin` | `comments-checker` | Verifica uso correto de comentarios |
| `buildDocCheckerPlugin` | `build-doc-checker` | Detecta `///` desnecessarios dentro do metodo `build` |
| `lateFinalCheckerPlugin` | `late-final-checker` | Detecta late final desnecessario com valor atribuido |
| `barrelFilesEnforcerPlugin` | `barrel-files-enforcer` | Sugere barrel files quando multiplos imports vem da mesma pasta |
| `securityCheckerPlugin` | `security-checker` | Detecta problemas de seguranca (keys, secrets, arquivos sensiveis) |
| `spellCheckerPlugin` | `spell-checker` | Verifica ortografia em identificadores Dart |
| `spellCheckerPtbrPlugin` | `spell-checker-ptbr` | Verifica ortografia e acentuacao em strings PT-BR (linhas adicionadas) |
| `identifierLanguagePlugin` | `identifier-language` | Detecta identificadores e comentarios que nao estao em ingles |
| `classNamingConventionPlugin` | `class-naming-convention` | Verifica se nomes de classes usam substantivos (Clean Code) |
| `booleanNamingConventionPlugin` | `boolean-naming-convention` | Booleans com frase nao imperativa (`is`, `has`, `can`, `should`...) — Effective Dart |
| `positionalBoolParamsPlugin` | `positional-bool-params` | Parametros `bool` posicionais devem ser named — Effective Dart |
| `privateNamedParamsPlugin` | `private-named-params` | Sugere `this._campo` no construtor em vez de initializer list (Dart 3.12+) |
| `avoidGodClassPlugin` | `avoid-god-class` | Detecta classes muito grandes (SRP — responsabilidade unica) |
| `avoidSetstateAfterAsyncPlugin` | `avoid-setstate-after-async` | Detecta setState apos await sem verificar mounted |
| `dateTypeCheckerPlugin` | `date-type-checker` | Detecta campos de data declarados como String ao inves de DateTime |
| `printStatementDetectorPlugin` | `print-statement-detector` | Detecta `print()` e `debugPrint()` em codigo de producao |
| `emptyCatchDetectorPlugin` | `empty-catch-detector` | Detecta blocos `catch` vazios sem tratamento |
| `futureWaitModernizerPlugin` | `future-wait-modernizer` | Detecta `Future.wait([...])` com lista literal e sugere a tupla com `.wait` do Dart 3 (type-safe, sem cast por indice) |
| `aiCodeReviewPlugin` | `ai-code-review` | Code review com IA (Gemini) — Clean Code, SOLID, seguranca e bugs (mensagens como aviso) |
| `primaryConstructorsPlugin` | `primary-constructors` | Obriga o uso de primary constructors em classes e enums (Dart 3.13+); so roda com `sdk` minimo >= 3.13 |

### Performance e Flutter

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `flutterAnalyzePlugin` | `flutter-analyze` | Executa flutter analyze e reporta problemas |
| `flutterPerformancePlugin` | `flutter-performance` | Detecta operacoes custosas no build() |
| `columnRowSpacingPlugin` | `column-row-spacing` | Sugere propriedade `spacing` (Flutter 3.27+) em Column/Row em vez de SizedBox intercalados |
| `flutterWidgetsPlugin` | `flutter-widgets` | Verifica ordem dos metodos em widgets Flutter |
| `mediaqueryModernPlugin` | `mediaquery-modern` | Sugere APIs modernas do MediaQuery (Flutter 3.10+) |
| `memoryLeakDetectorPlugin` | `memory-leak-detector` | Detecta possiveis memory leaks em States |
| `googleChatNotificationPlugin` | `google-chat-notification` | Envia notificacao ao Google Chat (webhook, Cards V2) ao final do code review — deve rodar por ultimo |

### Testes

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `testFileCheckerPlugin` | `test-file-checker` | Verifica se arquivos da PR possuem testes correspondentes (`lib/x.dart` → `test/x_test.dart`, tambem em monorepo e por nome em qualquer pasta de `test/`) |
| `flutterTestRunnerPlugin` | `flutter-test-runner` | Executa os testes da PR e mostra o resultado; teste quebrando **falha o build** |
| `testCoverageSummaryPlugin` | `test-coverage-summary` | Mostra cobertura de testes no summary da PR (le `coverage/lcov.info` ou gera com `flutter test --coverage`) e o checklist de plataformas |

---

## Padrao de mensagens dos plugins

Todos os plugins devem seguir o mesmo formato de mensagem ao usar `sendFail` ou `sendWarn`. O padrao garante consistencia visual nos comentarios do PR.

### Estrutura obrigatoria

```
TITULO EM CAPS (sem emoji)

Descricao curta do problema detectado.

### Problema Identificado

Bloco de codigo mostrando o trecho problematico.

### 🎯 ACAO NECESSARIA

Exemplo com ❌ (errado) e ✅ (correto).

### 🚀 Objetivo

Frase curta explicando o beneficio da correcao.

📖 [Link de referencia](url)
```

### Exemplo real (barrel-files-enforcer)

```typescript
sendFail(
  `BARREL FILE RECOMENDADO

**3 imports** da mesma pasta \`models/\` poderiam usar um barrel file.

### Problema Identificado

\`\`\`dart
// ❌ Atual — 3 imports separados
import 'package:app/features/user/domain/entities/user_entity.dart';
import 'package:app/features/user/domain/entities/address_entity.dart';
import 'package:app/features/user/domain/entities/role_entity.dart';

// ✅ Com barrel file — 1 import
import 'package:app/features/user/domain/entities/entities.dart';
\`\`\`

### 🎯 ACAO NECESSARIA

Crie \`entities.dart\` na pasta \`entities/\`:

\`\`\`dart
export 'user_entity.dart';
export 'address_entity.dart';
export 'role_entity.dart';
\`\`\`

### 🚀 Objetivo

Simplificar **imports** e melhorar **organizacao**.

📖 [Guia sobre Barrel Files](https://medium.com/@ugamakelechi501/barrel-files-in-dart-and-flutter)`,
  file,
  line
);
```

### Regras do padrao

| Elemento | Regra |
|----------|-------|
| Titulo | CAPS, sem emoji, sem `##` |
| Descricao | 1-2 linhas, pode usar **negrito** |
| Problema Identificado | Bloco de codigo com o trecho real |
| Acao Necessaria | Exemplo ❌/✅ com codigo |
| Objetivo | Frase curta (1 linha) |
| Link | Emoji 📖 + link markdown |

### Forma simplificada — sendFormattedFail / sendFormattedWarn

Para evitar montar o template literal manualmente, use `sendFormattedFail` ou `sendFormattedWarn`. A funcao monta o layout padrao automaticamente:

```typescript
sendFormattedFail({
  title: "BARREL FILE RECOMENDADO",
  description: "**3 imports** da mesma pasta `models/` poderiam usar um barrel file.",
  problem: {
    wrong: "import '...user_entity.dart';\nimport '...address_entity.dart';\nimport '...role_entity.dart';",
    correct: "import '...entities.dart';",
    wrongLabel: "Atual — 3 imports separados",
    correctLabel: "Com barrel file — 1 import",
  },
  action: {
    text: "Crie `entities.dart` na pasta `entities/`:",
    code: "export 'user_entity.dart';\nexport 'address_entity.dart';\nexport 'role_entity.dart';",
  },
  objective: "Simplificar **imports** e melhorar **organização**.",
  reference: {
    text: "Guia sobre Barrel Files",
    url: "https://medium.com/@ugamakelechi501/barrel-files-in-dart-and-flutter",
  },
  file: "lib/main.dart",
  line: 5,
});
```

**Parametros de `FormattedMessageOptions`:**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `title` | `string` | Sim | Titulo em CAPS |
| `description` | `string` | Sim | Descricao curta do problema |
| `problem.wrong` | `string` | Sim | Codigo errado (exibido com ❌) |
| `problem.correct` | `string` | Sim | Codigo correto (exibido com ✅) |
| `problem.wrongLabel` | `string` | Nao | Label do errado (default: `"Errado"`) |
| `problem.correctLabel` | `string` | Nao | Label do correto (default: `"Correto"`) |
| `problem.language` | `string` | Nao | Linguagem do bloco (default: `dart`) |
| `action.code` | `string` | Sim | Codigo da correcao |
| `action.text` | `string` | Nao | Texto antes do bloco de codigo |
| `action.language` | `string` | Nao | Linguagem do bloco (default: `dart`) |
| `objective` | `string` | Sim | Frase curta sobre o beneficio |
| `reference.text` | `string` | Nao | Texto do link |
| `reference.url` | `string` | Nao | URL do link |
| `file` | `string` | Nao | Arquivo para comentario inline |
| `line` | `number` | Nao | Linha para comentario inline |

> `sendFormattedWarn` funciona da mesma forma, mas envia como aviso (nao falha o build).

---

## Plugins Locais do Projeto

Alem dos plugins do pacote, voce pode criar plugins **locais** no seu projeto, sem precisar fazer push no repositorio do Danger Bot.

### Configuracao

1. Gere o arquivo de configuracao:

```bash
danger-bot init
```

2. Edite o `danger-bot.yaml`:

```yaml
local_plugins:
  - ./danger/plugins/meu-plugin.ts
  - ./danger/plugins/

ignore_files:
  - lib/features/old_module/legacy_page.dart
```

3. O `executeDangerBot` carrega tudo automaticamente:

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins);
```

> Documentacao completa: [Configuracao](CONFIGURACAO.md)

---

## Criando um plugin customizado

> **Passo a passo, receitas ("preciso de... → use") e exemplos completos:** [CRIANDO_PLUGINS.md](CRIANDO_PLUGINS.md).

Todo plugin Flutter lê o código pelo **modelo Dart** ([MODELO_DART.md](MODELO_DART.md)): `DartFile.changed()` entrega os arquivos `.dart` do PR já analisados, e o plugin trabalha com propriedades — `file.classes`, `cls.fields`, `cls.methods`, `method.body.calls`, `file.imports`, `file.comments`, `file.strings`... Não use regex nem contagem de chaves para achar classes, campos, métodos, chamadas, comentários ou strings: o modelo já trata comentários, strings, genéricos aninhados, quebras de linha e primary constructors (Dart 3.13).

### Usando a CLI (recomendado) — para plugins do pacote

```bash
danger-bot create-plugin
```

A CLI pergunta nome, descricao e o **tipo de regra** (Call, Class/structure, Text added in the PR, Path/file), e gera automaticamente:
- Arquivo do plugin com `createPlugin` no template do tipo escolhido, já lendo o código pelo modelo Dart (`file.calls()`, `file.classes` + `Presence`, `readWithDiff` + `file.strings` ou `file.path`), com a mensagem de exemplo no [padrao de mensagens](#padrao-de-mensagens-dos-plugins) — veja a [tabela dos tipos](CLI.md#danger-bot-create-plugin)
- `index.ts` com export
- `README.md` na estrutura padrao (`O que verifica`, `Severidade`, `Exemplo`, `Referencias`)
- Atualiza o barrel da plataforma (`src/plugins/flutter/index.ts`)
- Em `src/index.ts`: adiciona o **export por nome** (bloco `export { ... } from "./plugins/flutter"`), o `import` usado pelos arrays de categoria e o `require().default` no `allFlutterPlugins` — **antes** do `google-chat-notification`, que precisa continuar sendo o ultimo
- Nao duplica nada se rodar de novo e avisa (`[WARN]`) se algum bloco nao for encontrado

O unico passo manual e colocar o plugin num array de categoria (`codeQualityPlugins`, `performancePlugins`...), se fizer sentido — a CLI lembra disso no final.

> **Sempre use a CLI para criar plugins do pacote.** Ela garante o padrao correto automaticamente.

### Plugin local do projeto

Crie um arquivo `.ts` no seu projeto (ex: `danger/plugins/meu-plugin.ts`) e aponte no `danger-bot.yaml`. O plugin deve seguir o padrao `createPlugin`. Veja [Configuracao](CONFIGURACAO.md) para exemplos completos.

### Manualmente (para plugins do pacote)

> **Atenção:** Prefira sempre a CLI. Se criar manualmente, siga rigorosamente o padrao abaixo.

Crie uma pasta em `src/plugins/flutter/meu-plugin/`:

**`meu-plugin.ts`:**

```typescript
/**
 * Meu Plugin
 * O que verifica e por quê. Exceções que evitam falso positivo.
 */
import { DartFile, DartLayerFolder, createPlugin, sendFormattedFail } from "@types";

export default createPlugin(
  {
    name: "meu-plugin",
    description: "Descricao do que o plugin faz",
    enabled: true,
  },
  async () => {
    // .dart criados/modificados no PR, sem testes e sem arquivos gerados
    for (const file of DartFile.changed()) {
      if (!file.path.inFolder(DartLayerFolder.Entities)) continue;

      for (const cls of file.classes) {
        for (const field of cls.fields) {
          if (field.isFinal) continue; // sua regra aqui, sobre as propriedades do modelo

          sendFormattedFail({
            title: "TITULO DO PROBLEMA",
            description: `O campo \`${field.name}\` de \`${cls.name}\` deveria ser final.`,
            problem: {
              wrong: field.lineText, // codigo REAL do arquivo
              correct: `final ${field.compact}`, // o mesmo codigo, corrigido
            },
            action: { code: `final ${field.compact}` },
            objective: "Frase curta sobre o beneficio.",
            reference: { text: "Referencia", url: "https://link.com" },
            file: file.path.path,
            line: field.nameLine,
          });
        }
      }
    }
  }
);
```

**`index.ts`:**

```typescript
export { default } from "./meu-plugin";
```

**Registrar o plugin (4 passos — e o que a CLI faz automaticamente):**

1. Adicione o export em `src/plugins/flutter/index.ts`:

```typescript
export { default as meuPluginPlugin } from "./meu-plugin";
```

2. Adicione o nome no bloco `export { ... } from "./plugins/flutter";` do topo de `src/index.ts` — sem isso `import { meuPluginPlugin } from "@felipeduarte26/danger-bot"` vem `undefined`:

```typescript
export {
  // ... plugins existentes ...
  meuPluginPlugin,
} from "./plugins/flutter";
```

3. Adicione no `allFlutterPlugins` em `src/index.ts` usando **`require().default`**, **antes** do `google-chat-notification` (ele precisa ser sempre o ultimo):

```typescript
export const allFlutterPlugins = [
  // ... plugins existentes ...
  require("./plugins/flutter/meu-plugin").default,  // ✅ Correto
  // google-chat-notification deve ser sempre o último plugin
  require("./plugins/flutter/google-chat-notification").default,
];
```

4. Adicione no import e no array de categoria correspondente em `src/index.ts`:

```typescript
import {
  // ... imports existentes ...
  meuPluginPlugin,
} from "./plugins/flutter";

export const codeQualityPlugins = [
  // ... plugins existentes ...
  meuPluginPlugin,
];
```

> **IMPORTANTE — Padrao do `allFlutterPlugins`**
>
> O array `allFlutterPlugins` **deve** usar `require("./plugins/flutter/nome").default` para cada plugin.
> **Nunca** use variaveis importadas diretamente neste array (ex: `meuPluginPlugin`).
>
> Isso evita erro de referencia circular no JavaScript compilado:
> `ReferenceError: Cannot access 'flutter_2' before initialization`
>
> Os arrays de categoria (`codeQualityPlugins`, `performancePlugins`, etc.) podem usar
> variaveis importadas normalmente, pois sao declarados apos o `import`.

### Validar o plugin

```bash
danger-bot validate src/plugins/flutter/meu-plugin/meu-plugin.ts
```

O validador verifica:
- Import do `createPlugin`
- Export default
- Campos `name` e `description`
- Campo `enabled`
- Funcao async
- Documentacao JSDoc

---

## Helpers disponiveis para plugins

Todos os helpers podem ser importados de `@felipeduarte26/danger-bot` (ou de `"@types"` dentro do pacote):

```typescript
import {
  // Modelo Dart: leitura do código (ver MODELO_DART.md)
  DartFile, DartPath, DartPackage, DartText,
  DartLayer, DartLayerFolder, DartMemberKind, Presence, Nullability, // ...e os demais enums

  // Danger core
  getDanger,

  // Mensagens
  sendMessage, sendWarn, sendFail, sendFormattedFail, sendFormattedWarn, sendMarkdown, scheduleTask,

  // Arquivos (para .dart, prefira DartFile.changed() e file.path)
  getAllChangedFiles, getFilesMatching, getFilesByExtension, hasFilesMatching,
  getFileContent, fileContainsPattern,

  // Legado (compatibilidade com plugins locais antigos): use DartFile/DartPath
  getDartFiles, getDartFilesInDirectory, getDomainDartFiles, getDataDartFiles,
  getPresentationDartFiles, isInLayer,

  // PR info
  getPRDescription, getPRTitle, getLineStats,

  // Plugins ativos na execucao (evitar checagens duplicadas entre plugins)
  isPluginActive,

  // Legado: primary constructors em texto (o modelo já resolve: cls.fields, cls.header)
  normalizePrimaryConstructorHeaders, findPrimaryConstructors, primaryConstructorFieldsByLine,
} from "@felipeduarte26/danger-bot";
```

### Linhas alteradas no PR

`danger.git.insertions` / `danger.git.deletions` **nao existem no Danger real** (so no mock do `dry-run`) — no CI eles vem `undefined`. Use o helper assincrono, que soma o `diffForFile` de cada arquivo (o mesmo calculo do `danger.git.linesOfCode()`) e funciona em GitHub, GitLab e Bitbucket:

```typescript
const { added, removed } = await getLineStats();
```

`getLinesChanged()` (sincrono) continua exportado por compatibilidade, mas esta **obsoleto**: fora do dry-run so tem o total do GitHub.

### Evitar checagens duplicadas

`isPluginActive("nome-do-plugin")` diz se outro plugin vai rodar nesta execucao (o `runPlugins`/`executeDangerBot` e o `dry-run` registram os plugins habilitados). Exemplo: o `changelog-checker` nao avisa quando o `pr-validation` esta ativo, porque ele ja reprova o PR pelo mesmo motivo.

### Classes com primary constructor (Dart 3.13+)

O modelo Dart já trata primary constructors: os parâmetros `final`/`var` do cabeçalho aparecem em `cls.fields` (com `origin === DartFieldOrigin.PrimaryConstructor`), `cls.primaryConstructor` é o construtor do cabeçalho e `cls.header` é o cabeçalho clássico equivalente (`final class Foo extends Base {`). Os helpers de texto `normalizePrimaryConstructorHeaders`, `findPrimaryConstructors` e `primaryConstructorFieldsByLine` continuam exportados só para plugins locais antigos.

> Referencia completa: [Helpers](HELPERS.md) | [API](API.md)
