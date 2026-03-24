# API Reference

Referencia completa da API publica do Danger Bot.

---

## Exports Principais

```typescript
// Funcao principal
export { executeDangerBot } from "@felipeduarte26/danger-bot";

// Helpers de mensagem
export { getDanger, sendMessage, sendWarn, sendFail, sendFormattedFail, sendFormattedWarn, sendMarkdown, scheduleTask };
export type { FormattedMessageOptions };

// Helpers de arquivos
export {
  getAllChangedFiles,
  getDartFiles,
  getDartFilesInDirectory,
  getFilesMatching,
  getFilesByExtension,
  hasFilesMatching,
  getFileContent,
  fileContainsPattern,
};

// Helpers de Clean Architecture
export { getDomainDartFiles, getDataDartFiles, getPresentationDartFiles, isInLayer };

// Helpers de PR
export { getPRDescription, getPRTitle, getLinesChanged };

// Tipos
export { DangerPlugin, DangerPluginConfig, DangerBotCallbacks, DangerBotConfig };

// Factory
export { createPlugin, runPlugins };

// Configuracao (danger-bot.yaml)
export { loadConfig, loadLocalPlugins, setIgnoredFiles, getIgnoredFiles };

// Plugins individuais
export { allFlutterPlugins, prSummaryPlugin, prSizeCheckerPlugin /* ... */ };

// Plugins por categoria
export {
  domainLayerPlugins,
  dataLayerPlugins,
  presentationLayerPlugins,
  cleanArchitecturePlugins,
  codeQualityPlugins,
  performancePlugins,
};
```

---

## executeDangerBot

Funcao principal que executa uma lista de plugins com callbacks opcionais.

Carrega automaticamente o `danger-bot.yaml` da raiz do projeto (se existir) para:
- Aplicar `ignore_files` no filtro de arquivos
- Carregar e executar `local_plugins` apos os plugins passados por parametro

```typescript
function executeDangerBot(plugins: DangerPlugin[], callbacks?: DangerBotCallbacks): void
```

**Parametros:**

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| `plugins` | `DangerPlugin[]` | Sim | Array de plugins para executar |
| `callbacks` | `DangerBotCallbacks` | Nao | Callbacks do ciclo de vida |

**Exemplo:**

```typescript
import { allFlutterPlugins, executeDangerBot, sendMessage } from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins, {
  onBeforeRun: () => {
    sendMessage("Iniciando analise...");
    return true;
  },
  onSuccess: () => sendMessage("Concluido!"),
  onError: (error) => console.error(error),
  onFinally: () => sendMessage("Finalizado."),
});
```

---

## DangerBotCallbacks

Todos os callbacks sao opcionais.

```typescript
interface DangerBotCallbacks {
  onBeforeRun?: () => boolean | Promise<boolean>;
  onSuccess?: () => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  onFinally?: () => void | Promise<void>;
}
```

| Callback | Quando executa | Retorno |
|----------|----------------|---------|
| `onBeforeRun` | Antes de executar plugins | `false` cancela a execucao |
| `onSuccess` | Apos todos os plugins finalizarem com sucesso | - |
| `onError` | Quando algum plugin lanca erro | - |
| `onFinally` | Sempre no final (sucesso ou erro) | - |

---

## Helpers de Mensagem

### getDanger()

Retorna o objeto `danger` injetado globalmente pelo Danger JS. Tipado com `ExtendedDangerDSLType` que inclui `insertions` e `deletions`.

```typescript
const d = getDanger();
const pr = d.github?.pr || d.bitbucket_cloud?.pr || d.gitlab?.mr;
const files = d.git.modified_files;
const insertions = d.git.insertions; // tipado!
```

### sendMessage(msg, file?, line?)

Envia mensagem informativa no PR. Nao afeta o status do build.

```typescript
sendMessage("Tudo certo!");
sendMessage("Boa pratica aqui!", "lib/user.dart", 42);
```

### sendWarn(msg, file?, line?)

Envia aviso no PR. Nao falha o build.

```typescript
sendWarn("PR muito grande: 500 linhas");
sendWarn("Considere usar const", "lib/config.dart", 15);
```

### sendFail(msg, file?, line?)

Envia erro no PR. **Falha o build.**

```typescript
sendFail("Testes falhando");
sendFail("API key hardcoded!", "lib/config.dart", 8);
```

### sendFormattedFail(opts) / sendFormattedWarn(opts)

Enviam mensagens formatadas no padrao Danger Bot. Montam automaticamente o layout com titulo, problema, acao e objetivo, sem precisar escrever template literals verbosos.

```typescript
function sendFormattedFail(opts: FormattedMessageOptions): void
function sendFormattedWarn(opts: FormattedMessageOptions): void
```

```typescript
sendFormattedFail({
  title: "TRY-CATCH NA PRESENTATION",
  description: "Detectado `try-catch` na camada Presentation.",
  problem: {
    wrong: "try { await usecase.execute(); } catch (e) { }",
    correct: "final result = await usecase.execute();\nresult.fold(...);",
  },
  action: { code: "result.fold(\n  (failure) => showError(failure),\n  (success) => updateState(success),\n);" },
  objective: "Tratar erros via Either/Result no UseCase.",
  reference: { text: "Clean Architecture", url: "https://..." },
  file: "lib/page.dart",
  line: 42,
});
```

> Referencia completa dos campos: [Guia de Plugins](GUIA_PLUGINS.md#forma-simplificada--sendformattedfail--sendformattedwarn)

### sendMarkdown(msg, file?, line?)

Envia conteudo markdown formatado no PR.

```typescript
sendMarkdown(`
## Analise de Codigo

| Metrica | Valor |
|---------|-------|
| Arquivos | 15 |
| Linhas | +250 / -100 |
`);
```

### scheduleTask(fn)

Agenda uma tarefa assincrona para execucao pelo Danger.

```typescript
scheduleTask(async () => {
  const output = execSync("flutter analyze").toString();
  if (output.includes("error")) {
    sendFail("Flutter analyze encontrou erros");
  }
});
```

---

## Helpers de Arquivos

### getAllChangedFiles()

Retorna todos os arquivos modificados e criados no PR (exclui deletados).

```typescript
const files = getAllChangedFiles();
```

### getDartFiles()

Retorna apenas arquivos `.dart` modificados ou criados.

```typescript
const dartFiles = getDartFiles();
const codeFiles = dartFiles.filter(f => !f.includes("_test.dart"));
const testFiles = dartFiles.filter(f => f.includes("_test.dart"));
```

### getDartFilesInDirectory(directory)

Retorna arquivos `.dart` de um diretorio especifico.

```typescript
const authFiles = getDartFilesInDirectory("/core/auth/");
```

### getFilesMatching(pattern)

Retorna arquivos que correspondem a um padrao RegExp.

```typescript
const configFiles = getFilesMatching(/\.(yaml|json)$/);
const testFiles = getFilesMatching(/_test\.dart$/);
```

### getFilesByExtension(extension)

Retorna arquivos com extensao especifica.

```typescript
const yamlFiles = getFilesByExtension(".yaml");
```

### hasFilesMatching(pattern)

Verifica se algum arquivo corresponde ao padrao.

```typescript
if (hasFilesMatching(/pubspec\.yaml$/)) {
  sendMessage("pubspec.yaml foi modificado");
}
```

### getFileContent(file)

Le o conteudo de um arquivo do diff do git.

```typescript
const content = await getFileContent("lib/main.dart");
```

### fileContainsPattern(file, pattern)

Verifica se o conteudo de um arquivo corresponde a um padrao.

```typescript
const hasEval = await fileContainsPattern("lib/utils.dart", /eval\(/);
```

---

## Helpers de Clean Architecture

### getDomainDartFiles()

Atalho para `getDartFilesInDirectory("/domain/")`.

### getDataDartFiles()

Atalho para `getDartFilesInDirectory("/data/")`.

### getPresentationDartFiles()

Atalho para `getDartFilesInDirectory("/presentation/")`.

### isInLayer(file, layer)

Verifica se um arquivo pertence a uma camada especifica.

```typescript
if (isInLayer(file, "domain") && file.includes("viewmodel")) {
  sendFail("ViewModel encontrado na camada Domain!");
}
```

---

## Helpers de PR

### getPRDescription()

Retorna a descricao do PR (funciona com GitHub, Bitbucket e GitLab).

### getPRTitle()

Retorna o titulo do PR.

### getLinesChanged()

Retorna o total de linhas alteradas (insertions + deletions).

```typescript
const lines = getLinesChanged();
if (lines > 500) {
  sendWarn(`PR muito grande: ${lines} linhas`);
}
```

---

## Tipos

### DangerPluginConfig

```typescript
interface DangerPluginConfig {
  name: string;
  description: string;
  enabled: boolean;
}
```

### DangerPlugin

```typescript
interface DangerPlugin {
  config: DangerPluginConfig;
  run(): Promise<void>;
}
```

---

## createPlugin

Factory para criar plugins customizados.

```typescript
import { createPlugin, getDartFiles, sendWarn } from "@felipeduarte26/danger-bot";

export default createPlugin(
  {
    name: "meu-plugin",
    description: "Descricao do plugin",
    enabled: true,
  },
  async () => {
    const files = getDartFiles();
    if (files.length > 20) {
      sendWarn("Muitos arquivos Dart modificados!");
    }
  }
);
```

---

## Arrays de Plugins

| Export | Plugins incluidos | Quantidade |
|--------|-------------------|------------|
| `allFlutterPlugins` | Todos os plugins do pacote | — |
| `domainLayerPlugins` | entities, failures, repositories, usecases | 4 |
| `dataLayerPlugins` | datasources, models | 2 |
| `presentationLayerPlugins` | viewmodels, try-catch-checker | 2 |
| `cleanArchitecturePlugins` | domain + data + presentation + clean-architecture | 9 |
| `codeQualityPlugins` | late-final, memory-leak, comments, security, barrel, identifier-language, class-naming-convention | 7 |
| `performancePlugins` | flutter-performance, mediaquery-modern | 2 |

---

## Configuracao (danger-bot.yaml)

### DangerBotConfig

Interface da configuracao carregada do `danger-bot.yaml`.

```typescript
interface DangerBotConfig {
  local_plugins?: string[];
  ignore_files?: string[];
  settings?: {
    fail_on_errors?: boolean;
    verbose?: boolean;
  };
}
```

### loadConfig()

Carrega o `danger-bot.yaml` (ou `.yml`) da raiz do projeto. Retorna `{}` se o arquivo nao existir.

```typescript
function loadConfig(): DangerBotConfig
```

### loadLocalPlugins(pluginPaths)

Carrega plugins locais a partir de caminhos (arquivos ou diretorios). Valida se cada modulo exporta um `DangerPlugin` valido.

```typescript
async function loadLocalPlugins(pluginPaths: string[]): Promise<DangerPlugin[]>
```

### setIgnoredFiles(files)

Define os arquivos ignorados por todos os plugins. Chamado internamente pelo `executeDangerBot`.

```typescript
function setIgnoredFiles(files: string[]): void
```

### getIgnoredFiles()

Retorna o `Set` de arquivos atualmente ignorados.

```typescript
function getIgnoredFiles(): Set<string>
```

> Documentacao completa: [Configuracao](CONFIGURACAO.md)
