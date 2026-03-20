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

O retorno e tipado com `ExtendedDangerDSLType`, que estende `DangerDSLType` do Danger JS adicionando `insertions` e `deletions` ao `git`.

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

// Linhas (tipado via ExtendedGitDSL)
const insertions = d.git.insertions;
const deletions = d.git.deletions;

// Commits
const commits = d.git.commits;
```

**Interfaces estendidas:**

```typescript
interface ExtendedGitDSL extends GitDSL {
  insertions?: number;
  deletions?: number;
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

### getAllChangedFiles()

Retorna todos os arquivos modificados e criados no PR. Combina `modified_files` e `created_files`, excluindo deletados.

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

### getLinesChanged()

Retorna o total de linhas alteradas (insertions + deletions).

```typescript
function getLinesChanged(): number
```

```typescript
const lines = getLinesChanged();
if (lines > 500) {
  sendWarn(`PR com ${lines} linhas alteradas`);
}
```

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
  getLinesChanged,
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
    const lines = getLinesChanged();
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
