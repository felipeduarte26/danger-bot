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
| `changelogCheckerPlugin` | `changelog-checker` | Verifica se o CHANGELOG.md foi atualizado |
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

### Clean Architecture - Presentation

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `presentationViewModelsPlugin` | `presentation-viewmodels` | Valida que ViewModels dependam apenas de UseCases |
| `presentationTryCatchCheckerPlugin` | `presentation-try-catch-checker` | Detecta uso de try-catch na camada Presentation |

### Qualidade de Codigo

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `cleanArchitecturePlugin` | `clean-architecture` | Detecta violacoes entre camadas (imports indevidos) |
| `fileNamingPlugin` | `file-naming` | Verifica nomenclatura de arquivos Dart (snake_case) |
| `commentsCheckerPlugin` | `comments-checker` | Verifica uso correto de comentarios |
| `lateFinalCheckerPlugin` | `late-final-checker` | Detecta late final desnecessario com valor atribuido |
| `barrelFilesEnforcerPlugin` | `barrel-files-enforcer` | Sugere barrel files quando multiplos imports vem da mesma pasta |
| `securityCheckerPlugin` | `security-checker` | Detecta problemas de seguranca (keys, secrets, arquivos sensiveis) |
| `spellCheckerPlugin` | `spell-checker` | Verifica ortografia em identificadores Dart |
| `identifierLanguagePlugin` | `identifier-language` | Detecta identificadores e comentarios que nao estao em ingles |
| `classNamingConventionPlugin` | `class-naming-convention` | Verifica se nomes de classes usam substantivos (Clean Code) |
| `avoidGodClassPlugin` | `avoid-god-class` | Detecta classes muito grandes (SRP — responsabilidade unica) |
| `avoidSetstateAfterAsyncPlugin` | `avoid-setstate-after-async` | Detecta setState apos await sem verificar mounted |
| `dateTypeCheckerPlugin` | `date-type-checker` | Detecta campos de data declarados como String ao inves de DateTime |

### Performance e Flutter

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `flutterAnalyzePlugin` | `flutter-analyze` | Executa flutter analyze e reporta problemas |
| `flutterPerformancePlugin` | `flutter-performance` | Detecta operacoes custosas no build() |
| `columnRowSpacingPlugin` | `column-row-spacing` | Sugere propriedade `spacing` (Flutter 3.27+) em Column/Row em vez de SizedBox intercalados |
| `flutterWidgetsPlugin` | `flutter-widgets` | Verifica ordem dos metodos em widgets Flutter |
| `mediaqueryModernPlugin` | `mediaquery-modern` | Sugere APIs modernas do MediaQuery (Flutter 3.10+) |
| `memoryLeakDetectorPlugin` | `memory-leak-detector` | Detecta possiveis memory leaks em States |

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

### Usando a CLI (recomendado) — para plugins do pacote

```bash
danger-bot create-plugin
```

A CLI pergunta nome e descricao, e gera automaticamente:
- Arquivo do plugin com `createPlugin`
- `index.ts` com export
- `README.md` com documentacao
- Atualiza barrel files (`src/plugins/flutter/index.ts`)
- Adiciona no `allFlutterPlugins` em `src/index.ts` usando `require().default`

> **Sempre use a CLI para criar plugins do pacote.** Ela garante o padrao correto automaticamente.

### Plugin local do projeto

Crie um arquivo `.ts` no seu projeto (ex: `danger/plugins/meu-plugin.ts`) e aponte no `danger-bot.yaml`. O plugin deve seguir o padrao `createPlugin`. Veja [Configuracao](CONFIGURACAO.md) para exemplos completos.

### Manualmente (para plugins do pacote)

> **Atenção:** Prefira sempre a CLI. Se criar manualmente, siga rigorosamente o padrao abaixo.

Crie uma pasta em `src/plugins/flutter/meu-plugin/`:

**`meu-plugin.ts`:**

```typescript
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

export default createPlugin(
  {
    name: "meu-plugin",
    description: "Descricao do que o plugin faz",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        fs.existsSync(f)
    );

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        // sua logica de deteccao aqui

        sendFormattedFail({
          title: "TITULO DO PROBLEMA",
          description: "Descricao curta do que foi detectado.",
          problem: {
            wrong: "codigo_errado();",
            correct: "codigo_correto();",
          },
          action: {
            code: "codigo_correto();",
          },
          objective: "Frase curta sobre o beneficio.",
          reference: {
            text: "Referencia",
            url: "https://link.com",
          },
          file,
          line: i + 1,
        });
      }
    }
  }
);
```

**`index.ts`:**

```typescript
export { default } from "./meu-plugin";
```

**Registrar o plugin (3 passos):**

1. Adicione o export em `src/plugins/flutter/index.ts`:

```typescript
export { default as meuPluginPlugin } from "./meu-plugin";
```

2. Adicione no `allFlutterPlugins` em `src/index.ts` usando **`require().default`**:

```typescript
export const allFlutterPlugins = [
  // ... plugins existentes ...
  require("./plugins/flutter/meu-plugin").default,  // ✅ Correto
];
```

3. Adicione no import e no array de categoria correspondente em `src/index.ts`:

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

Todos os helpers podem ser importados de `@felipeduarte26/danger-bot`:

```typescript
import {
  // Danger core
  getDanger,

  // Mensagens
  sendMessage, sendWarn, sendFail, sendFormattedFail, sendFormattedWarn, sendMarkdown, scheduleTask,

  // Arquivos
  getAllChangedFiles, getDartFiles, getDartFilesInDirectory,
  getFilesMatching, getFilesByExtension, hasFilesMatching,
  getFileContent, fileContainsPattern,

  // Clean Architecture
  getDomainDartFiles, getDataDartFiles, getPresentationDartFiles, isInLayer,

  // PR info
  getPRDescription, getPRTitle, getLinesChanged,
} from "@felipeduarte26/danger-bot";
```

> Referencia completa: [Helpers](HELPERS.md) | [API](API.md)
