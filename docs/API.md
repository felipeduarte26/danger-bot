# API Reference

Referencia completa da API publica do Danger Bot.

---

## Exports Principais

```typescript
// Funcao principal
export { executeDangerBot } from "@felipeduarte26/danger-bot";

// Helpers de mensagem
export { getDanger, sendMessage, sendWarn, sendFail, sendMarkdown, scheduleTask };

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
export { DangerPlugin, DangerPluginConfig, DangerBotCallbacks };

// Factory
export { createPlugin, runPlugins };

// Plugins individuais (27)
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
| `allFlutterPlugins` | Todos os 27 plugins | 27 |
| `domainLayerPlugins` | entities, failures, repositories, usecases | 4 |
| `dataLayerPlugins` | datasources, models | 2 |
| `presentationLayerPlugins` | viewmodels, try-catch-checker | 2 |
| `cleanArchitecturePlugins` | domain + data + presentation + clean-architecture | 9 |
| `codeQualityPlugins` | late-final, memory-leak, comments, security, barrel, identifier-language, class-naming-convention | 7 |
| `performancePlugins` | flutter-performance, mediaquery-modern | 2 |
