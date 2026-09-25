# Helpers Reference

Referencia completa de todas as funcoes auxiliares do Danger Bot.

Todos os helpers sao importados de `@felipeduarte26/danger-bot`:

```typescript
import { getDanger, sendMessage, getDartFiles /* ... */ } from "@felipeduarte26/danger-bot";
```

---

## Danger Core

### getDanger()

Retorna o objeto `danger` injetado globalmente pelo Danger JS em runtime.

O retorno e tipado com `ExtendedDangerDSLType`, que estende `DangerDSLType` do Danger JS adicionando `insertions` e `deletions` ao `git`. **Atencao:** esses dois campos so existem no mock do `dry-run`; no Danger real (CI) vem `undefined`. Para linhas do PR use [`getLineStats()`](#getlinestats).

```typescript
function getDanger(): ExtendedDangerDSLType
```

**Exemplo:**

```typescript
const d = getDanger();

// GitHub
const pr = d.github?.pr;
console.log(`PR #${pr?.number}: ${pr?.title}`);

// Bitbucket Cloud
const bbPR = d.bitbucket_cloud?.pr;

// GitLab
const mr = d.gitlab?.mr;

// Arquivos modificados
const modified = d.git.modified_files;
const created = d.git.created_files;
const deleted = d.git.deleted_files;

// Linhas do PR: use getLineStats() (git.insertions/deletions só existem no dry-run)
const { added, removed } = await getLineStats();

// Commits
const commits = d.git.commits;
```

**Interfaces estendidas:**

```typescript
interface ExtendedGitDSL extends GitDSL {
  insertions?: number; // só no mock do dry-run
  deletions?: number; // só no mock do dry-run
}

interface ExtendedDangerDSLType extends DangerDSLType {
  git: ExtendedGitDSL;
}
```

---

## Mensagens no PR

Todas as funcoes de mensagem aceitam parametros opcionais `file` e `line` para comentarios inline.

### sendMessage(msg, file?, line?)

Envia mensagem informativa. Nao afeta o build.

```typescript
function sendMessage(msg: string, file?: string, line?: number): void
```

```typescript
sendMessage("Tudo certo!");
sendMessage("Boa pratica aqui!", "lib/user.dart", 42);
sendMessage("**Total**: 5 arquivos\n- 3 Dart\n- 2 YAML");
```

### sendWarn(msg, file?, line?)

Envia aviso. Nao falha o build.

```typescript
function sendWarn(msg: string, file?: string, line?: number): void
```

```typescript
sendWarn("PR muito grande: 500 linhas");
sendWarn("Considere usar const", "lib/config.dart", 15);
```

### sendFail(msg, file?, line?)

Envia erro. **Falha o build.**

```typescript
function sendFail(msg: string, file?: string, line?: number): void
```

```typescript
sendFail("Testes falhando");
sendFail("API key hardcoded!", "lib/config.dart", 8);
```

### sendFormattedFail(opts)

Envia um erro formatado no padrao Danger Bot. Monta automaticamente o layout com titulo, problema, acao e objetivo.

```typescript
function sendFormattedFail(opts: FormattedMessageOptions): void
```

```typescript
sendFormattedFail({
  title: "TRY-CATCH NA PRESENTATION",
  description: "Detectado `try-catch` na camada Presentation.",
  problem: {
    wrong: "try {\n  await usecase.execute();\n} catch (e) {\n  // ...\n}",
    correct: "final result = await usecase.execute();\nresult.fold((failure) => ..., (success) => ...);",
  },
  action: {
    code: "final result = await usecase.execute();\nresult.fold(\n  (failure) => showError(failure),\n  (success) => updateState(success),\n);",
  },
  objective: "Tratar erros via **Either/Result** no UseCase.",
  reference: {
    text: "Clean Architecture",
    url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
  },
  file: "lib/presentation/page.dart",
  line: 42,
});
```

### sendFormattedWarn(opts)

Mesmo que `sendFormattedFail`, mas envia como aviso (nao falha o build).

```typescript
function sendFormattedWarn(opts: FormattedMessageOptions): void
```

> Detalhes dos campos: [Guia de Plugins](GUIA_PLUGINS.md#forma-simplificada--sendformattedfail--sendformattedwarn)

### sendMarkdown(msg, file?, line?)

Envia conteudo markdown formatado.

```typescript
function sendMarkdown(msg: string, file?: string, line?: number): void
```

```typescript
sendMarkdown(`
## Relatorio

| Metrica | Valor |
|---------|-------|
| Arquivos | 15 |
| Linhas | +250 / -100 |
`);
```

### scheduleTask(fn)

Agenda tarefa assincrona para execucao pelo Danger.

```typescript
function scheduleTask(fn: () => Promise<void>): void
```

```typescript
scheduleTask(async () => {
  const { execSync } = require("child_process");
  const output = execSync("flutter analyze").toString();
  if (output.includes("error")) {
    sendFail("Flutter analyze encontrou erros");
  }
});
```

---

## Filtros de Arquivos

> **Nota:** Todos os helpers de filtro de arquivos respeitam automaticamente a lista de `ignore_files` configurada no `danger-bot.yaml`. Arquivos ignorados nao aparecem nos resultados. Veja [Configuracao](CONFIGURACAO.md).

### getAllChangedFiles()

Retorna todos os arquivos modificados e criados no PR. Combina `modified_files` e `created_files`, excluindo deletados e arquivos listados em `ignore_files`.

```typescript
function getAllChangedFiles(): string[]
```

```typescript
const files = getAllChangedFiles();
const yamlFiles = files.filter(f => f.endsWith(".yaml"));
const testFiles = files.filter(f => f.includes("_test."));
```

### getDartFiles()

Retorna apenas arquivos `.dart` modificados ou criados.

```typescript
function getDartFiles(): string[]
```

```typescript
const dartFiles = getDartFiles();
const codeFiles = dartFiles.filter(f => !f.includes("_test.dart"));
const testFiles = dartFiles.filter(f => f.includes("_test.dart"));
```

### getDartFilesInDirectory(directory)

Retorna arquivos `.dart` de um diretorio especifico.

```typescript
function getDartFilesInDirectory(directory: string): string[]
```

```typescript
const domainFiles = getDartFilesInDirectory("/domain/");
const userFiles = getDartFilesInDirectory("/features/user/");
const authFiles = getDartFilesInDirectory("/core/auth/");
```

### getFilesMatching(pattern)

Retorna arquivos que correspondem a um padrao RegExp.

```typescript
function getFilesMatching(pattern: RegExp): string[]
```

```typescript
const configFiles = getFilesMatching(/\.(yaml|json|env)$/);
const testFiles = getFilesMatching(/_test\.dart$/);
const modelFiles = getFilesMatching(/\/models\/.*\.dart$/);
```

### getFilesByExtension(extension)

Retorna arquivos com extensao especifica.

```typescript
function getFilesByExtension(extension: string): string[]
```

```typescript
const dartFiles = getFilesByExtension(".dart");
const yamlFiles = getFilesByExtension(".yaml");
```

### hasFilesMatching(pattern)

Verifica se pelo menos um arquivo corresponde ao padrao.

```typescript
function hasFilesMatching(pattern: RegExp): boolean
```

```typescript
if (hasFilesMatching(/pubspec\.yaml$/)) {
  sendMessage("pubspec.yaml foi modificado");
}
```

### getFileContent(file)

Le o conteudo de um arquivo a partir do diff do git.

```typescript
async function getFileContent(file: string): Promise<string | null>
```

```typescript
const content = await getFileContent("lib/main.dart");
if (content?.includes("print(")) {
  sendWarn("Encontrado print() no codigo");
}
```

### fileContainsPattern(file, pattern)

Verifica se o conteudo de um arquivo corresponde a um padrao.

```typescript
async function fileContainsPattern(file: string, pattern: RegExp): Promise<boolean>
```

```typescript
const hasEval = await fileContainsPattern("lib/utils.dart", /eval\(/);
if (hasEval) {
  sendFail("Uso de eval() detectado!");
}
```

---

## Clean Architecture

### getDomainDartFiles()

Atalho para `getDartFilesInDirectory("/domain/")`.

```typescript
function getDomainDartFiles(): string[]
```

```typescript
const domainFiles = getDomainDartFiles();
const entities = domainFiles.filter(f => f.includes("/entities/"));
const usecases = domainFiles.filter(f => f.includes("/usecases/"));
```

### getDataDartFiles()

Atalho para `getDartFilesInDirectory("/data/")`.

```typescript
function getDataDartFiles(): string[]
```

```typescript
const dataFiles = getDataDartFiles();
const datasources = dataFiles.filter(f => f.includes("/datasources/"));
```

### getPresentationDartFiles()

Atalho para `getDartFilesInDirectory("/presentation/")`.

```typescript
function getPresentationDartFiles(): string[]
```

### isInLayer(file, layer)

Verifica se um arquivo pertence a uma camada especifica.

```typescript
function isInLayer(file: string, layer: "domain" | "data" | "presentation"): boolean
```

```typescript
const files = getDartFiles();
for (const file of files) {
  if (isInLayer(file, "domain") && file.includes("viewmodel")) {
    sendFail(`ViewModel na camada Domain: ${file}`);
  }
}
```

---

## Informacoes do PR

### getPRDescription()

Retorna a descricao do PR. Funciona com GitHub, Bitbucket Cloud e GitLab.

```typescript
function getPRDescription(): string
```

### getPRTitle()

Retorna o titulo do PR.

```typescript
function getPRTitle(): string
```

### getLineStats()

Retorna as linhas adicionadas e removidas no PR. No Danger real soma o `danger.git.diffForFile` de cada arquivo criado, modificado ou removido — o mesmo calculo do `danger.git.linesOfCode()` —, entao funciona em GitHub, GitLab e Bitbucket. No `dry-run` usa os totais do `git diff --stat`. O resultado fica em cache durante a execucao (varios plugins podem chamar).

```typescript
function getLineStats(): Promise<{ added: number; removed: number }>
```

```typescript
const { added, removed } = await getLineStats();
if (added + removed > 500) {
  sendWarn(`PR com ${added + removed} linhas alteradas (+${added} / -${removed})`);
}
```

### getLinesChanged() — obsoleto

Versao sincrona mantida por compatibilidade. No Danger real `git.insertions`/`git.deletions` nao existem: fora do `dry-run` so retorna o total do GitHub (`pr.additions + pr.deletions`) e **0 nas outras plataformas**. Use `await getLineStats()`.

```typescript
function getLinesChanged(): number
```

---

## Configuracao de Ignore

### setIgnoredFiles(files)

Define os arquivos que devem ser ignorados por todos os plugins. Chamado internamente pelo `executeDangerBot` ao carregar o `danger-bot.yaml`.

```typescript
function setIgnoredFiles(files: string[]): void
```

```typescript
setIgnoredFiles([
  "lib/features/old_module/legacy_page.dart",
  "lib/core/deprecated_helper.dart",
]);
```

### getIgnoredFiles()

Retorna o `Set` de arquivos atualmente ignorados.

```typescript
function getIgnoredFiles(): Set<string>
```

```typescript
const ignored = getIgnoredFiles();
console.log(`${ignored.size} arquivo(s) ignorado(s)`);
```

> Na pratica, nao e necessario chamar essas funcoes manualmente. O `executeDangerBot` carrega o `danger-bot.yaml` e aplica automaticamente. Veja [Configuracao](CONFIGURACAO.md).

---

## Plugins ativos na execucao

### isPluginActive()

Diz se um plugin vai rodar nesta execucao. O `runPlugins` (usado pelo `executeDangerBot`) e o `dry-run` registram os plugins habilitados antes de executar — util para um plugin nao repetir o que outro ja verifica. Em execucao manual (sem registro) retorna `false`.

```typescript
function isPluginActive(name: string): boolean
function setActivePlugins(names: string[]): void // chamado pelo runPlugins/dry-run
```

```typescript
// changelog-checker: o pr-validation já reprova o PR pelo mesmo motivo
if (isPluginActive("pr-validation")) return;
```

---

## Primary constructors (Dart 3.13+)

Para plugins que analisam a estrutura das classes (nome, `extends`/`implements`, campos). Com primary constructor o cabecalho tem `const` e a lista de parametros entre o nome e as clausulas, e os campos viram parametros declarantes. Detalhes e exemplo no [Guia de Plugins](GUIA_PLUGINS.md#classes-com-primary-constructor-dart-313).

| Helper | Retorno |
| ------ | ------- |
| `normalizePrimaryConstructorHeaders(content)` | Texto com cada cabecalho reescrito na forma classica (mesma numeracao de linhas); identidade em codigo classico |
| `findPrimaryConstructors(content)` | `PrimaryConstructorDecl[]`: `name`, `kind`, `lineIndex` e `fields` (`name`, `type`, `isFinal`, `lineIndex`, `text`, `docLines`) |
| `primaryConstructorFieldsByLine(content)` | `Map<linha do cabecalho, PrimaryConstructorField[]>` |

---

## Usando helpers em plugins customizados

Exemplo completo de um plugin que usa varios helpers:

```typescript
import {
  createPlugin,
  getDartFiles,
  getFileContent,
  sendMessage,
  sendWarn,
  sendFail,
  getLineStats,
  isInLayer,
} from "@felipeduarte26/danger-bot";

export default createPlugin(
  {
    name: "meu-plugin-customizado",
    description: "Exemplo de plugin usando helpers",
    enabled: true,
  },
  async () => {
    const dartFiles = getDartFiles();
    if (dartFiles.length === 0) return;

    // Verificar tamanho do PR
    const { added, removed } = await getLineStats();
    const lines = added + removed;
    if (lines > 1000) {
      sendWarn(`PR muito grande: ${lines} linhas. Considere dividir.`);
    }

    // Verificar cada arquivo
    for (const file of dartFiles) {
      const content = await getFileContent(file);
      if (!content) continue;

      // Verificar print() em codigo de producao
      if (!file.includes("_test.dart") && content.includes("print(")) {
        sendWarn(`print() encontrado em ${file}. Use um logger.`);
      }

      // Verificar violacao de arquitetura
      if (isInLayer(file, "domain") && content.includes("/data/")) {
        sendFail(`Domain importando Data em ${file}`);
      }
    }

    sendMessage(`Analisados ${dartFiles.length} arquivos Dart`);
  }
);
```
