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

// Apenas plugins de Clean Architecture (10 plugins)
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
const disabled = ["spell-checker", "portuguese-documentation", "comments-checker"];

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
| `prSizeCheckerPlugin` | `pr-size-checker` | Alerta quando o PR tem muitas linhas alteradas |
| `prValidationPlugin` | `pr-validation` | Valida descricao, titulo e formato do PR |
| `changelogCheckerPlugin` | `changelog-checker` | Verifica se CHANGELOG.md foi atualizado |

### Clean Architecture - Domain

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `domainEntitiesPlugin` | `domain-entities` | Valida entities: `final class`, constructor `const`, sufixo `Entity` |
| `domainFailuresPlugin` | `domain-failures` | Valida failures: `sealed class`, pattern matching |
| `domainRepositoriesPlugin` | `domain-repositories` | Valida interfaces: `abstract interface class` |
| `domainUseCasesPlugin` | `domain-usecases` | Valida usecases: interface + implementacao, metodo `call()` |

### Clean Architecture - Data

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `dataDatasourcesPlugin` | `data-datasources` | Valida nomenclatura: sufixo `Datasource`, interface + impl |
| `dataModelsPlugin` | `data-models` | Valida models: `final class`, `fromJson`, `toJson`, `toEntity` |
| `dataRepositoriesPlugin` | `data-repositories` | Valida que implementam interface do Domain |

### Clean Architecture - Presentation

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `presentationViewModelsPlugin` | `presentation-viewmodels` | Valida que ViewModels usem UseCases, nao Repositories |
| `presentationStatesPlugin` | `presentation-states` | Valida States: `sealed class` com subclasses `final` |

### Qualidade de Codigo

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `cleanArchitecturePlugin` | `clean-architecture` | Detecta imports entre camadas (Domain nao pode importar Data, etc.) |
| `fileNamingPlugin` | `file-naming` | Verifica `snake_case` em nomes de arquivos `.dart` |
| `commentsCheckerPlugin` | `comments-checker` | Forca `///` (doc comments) ao inves de `//` |
| `lateFinalCheckerPlugin` | `late-final-checker` | Detecta `late final` e sugere alternativas seguras |
| `barrelFilesEnforcerPlugin` | `barrel-files-enforcer` | Forca barrel files para organizar exports |
| `securityCheckerPlugin` | `security-checker` | Detecta API keys hardcoded, `eval()`, secrets |
| `spellCheckerPlugin` | `spell-checker` | Verifica ortografia em identificadores Dart com cspell |

### Performance e Flutter

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `flutterAnalyzePlugin` | `flutter-analyze` | Executa `flutter analyze` e reporta problemas |
| `flutterPerformancePlugin` | `flutter-performance` | Detecta operacoes custosas dentro de `build()` |
| `flutterWidgetsPlugin` | `flutter-widgets` | Verifica ordem de funcoes em widgets Flutter |
| `mediaqueryModernPlugin` | `mediaquery-modern` | Forca APIs modernas do MediaQuery (Flutter 3.10+) |
| `memoryLeakDetectorPlugin` | `memory-leak-detector` | Detecta Controllers/Timers/Streams sem `dispose()` |

### Documentacao

| Plugin | Nome interno | Descricao |
|--------|-------------|-----------|
| `portugueseDocumentationPlugin` | `portuguese-documentation` | Detecta documentacao em portugues no codigo |

---

## Criando um plugin customizado

### Usando a CLI

```bash
danger-bot create-plugin
```

A CLI pergunta nome e descricao, e gera automaticamente:
- Arquivo do plugin com `createPlugin`
- `index.ts` com export
- `README.md` com documentacao
- Atualiza barrel files e `allFlutterPlugins`

### Manualmente

Crie uma pasta em `src/plugins/flutter/meu-plugin/`:

**`meu-plugin.ts`:**

```typescript
import { createPlugin, getDartFiles, sendWarn, sendMessage } from "@felipeduarte26/danger-bot";

export default createPlugin(
  {
    name: "meu-plugin",
    description: "Descricao do que o plugin faz",
    enabled: true,
  },
  async () => {
    const dartFiles = getDartFiles();

    if (dartFiles.length === 0) {
      return; // nada para verificar
    }

    for (const file of dartFiles) {
      // sua logica aqui
    }

    sendMessage(`Verificados ${dartFiles.length} arquivos`);
  }
);
```

**`index.ts`:**

```typescript
export { default } from "./meu-plugin";
```

Depois, adicione o export em `src/plugins/flutter/index.ts` e no array `allFlutterPlugins` em `src/index.ts`.

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
  sendMessage, sendWarn, sendFail, sendMarkdown, scheduleTask,

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
