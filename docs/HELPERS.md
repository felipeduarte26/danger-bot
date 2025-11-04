# 🛠️ Helpers Reference

> Guia completo de todas as funções auxiliares do Danger Bot

---

## 📋 Índice

- [Introdução](#-introdução)
- [Danger Core](#-danger-core)
- [Mensagens no PR](#-mensagens-no-pr)
- [Filtros de Arquivos](#-filtros-de-arquivos)
- [Clean Architecture](#-clean-architecture)
- [Leitura de Conteúdo](#-leitura-de-conteúdo)
- [Informações do PR](#-informações-do-pr)
- [Exemplos Práticos](#-exemplos-práticos)

---

## 🎯 Introdução

Os **helpers** do Danger Bot são funções auxiliares que facilitam a criação de plugins customizados. Todas as funções encapsulam chamadas ao Danger JS, evitando conflitos com o sistema de remoção automática de imports.

### Por que usar helpers?

- ✅ **Simplicidade** - API mais amigável que o Danger JS direto
- ✅ **Type-safe** - Totalmente tipado com TypeScript
- ✅ **Testado** - Funções estáveis e confiáveis
- ✅ **Documentado** - Exemplos práticos para cada função

### Como importar

```typescript
import {
  getDanger,
  sendMessage,
  sendWarn,
  sendFail,
  getDartFiles,
  getFileContent,
  // ... outras funções
} from "@diletta/danger-bot";
```

---

## 🎯 Danger Core

### `getDanger()`

Acessa o objeto danger que o Danger JS injeta globalmente.

**Retorna:** `any` - Objeto danger com todas as informações do contexto

**Quando usar:** 
- Acessar informações do PR/MR
- Obter dados de commits
- Verificar arquivos modificados
- Acessar metadados específicos da plataforma (GitHub, Bitbucket, GitLab)

**Exemplo:**

```typescript
const danger = getDanger();

// GitHub
const pr = danger.github?.pr;
console.log(`PR #${pr?.number}: ${pr?.title}`);
console.log(`Autor: ${pr?.user?.login}`);

// Bitbucket Cloud
const bbPR = danger.bitbucket_cloud?.pr;
console.log(`PR: ${bbPR?.title}`);
console.log(`Autor: ${bbPR?.author?.display_name}`);

// GitLab
const mr = danger.gitlab?.mr;
console.log(`MR: ${mr?.title}`);

// Informações Git
console.log(`Commits: ${danger.git.commits.length}`);
console.log(`Arquivos modificados: ${danger.git.modified_files.length}`);
console.log(`Arquivos criados: ${danger.git.created_files.length}`);
console.log(`Arquivos deletados: ${danger.git.deleted_files.length}`);
console.log(`Linhas adicionadas: ${danger.git.insertions}`);
console.log(`Linhas removidas: ${danger.git.deletions}`);
```

---

## 💬 Mensagens no PR

### `sendMessage(msg, file?, line?)`

Envia uma mensagem informativa no Pull Request.

**Parâmetros:**
- `msg: string` - Mensagem a ser enviada (suporta markdown)
- `file?: string` - Caminho do arquivo para comentário inline (opcional)
- `line?: number` - Número da linha para comentário inline (opcional)

**Comportamento:** Não afeta o status do build

**Quando usar:**
- ✅ Feedback positivo
- ✅ Informações gerais
- ✅ Estatísticas do PR
- ✅ Sugestões não-críticas

**Exemplos:**

```typescript
// Mensagem simples
sendMessage("✅ Código está bem formatado!");

// Mensagem com markdown
sendMessage(`
**📊 Análise do PR**

- Arquivos modificados: 15
- Linhas adicionadas: 250
- Linhas removidas: 100
- Cobertura de testes: 85%
`);

// Comentário inline em arquivo específico
sendMessage("💡 Boa prática implementada aqui!", "lib/user.dart", 42);

// Mensagem condicional
const dartFiles = getDartFiles();
if (dartFiles.length > 0) {
  sendMessage(`✅ ${dartFiles.length} arquivos Dart revisados`);
}
```

---

### `sendWarn(msg, file?, line?)`

Envia um aviso (warning) no Pull Request.

**Parâmetros:**
- `msg: string` - Mensagem de aviso (suporta markdown)
- `file?: string` - Caminho do arquivo para comentário inline (opcional)
- `line?: number` - Número da linha para comentário inline (opcional)

**Comportamento:** Não faz o build falhar, mas indica problemas que devem ser revisados

**Quando usar:**
- ⚠️ Problemas não-críticos
- ⚠️ Code smells
- ⚠️ Possíveis bugs
- ⚠️ Questões de performance
- ⚠️ PRs muito grandes

**Exemplos:**

```typescript
// Aviso geral
sendWarn("⚠️ PR muito grande: 500 linhas alteradas");

// Aviso inline
sendWarn("⚠️ Considere usar const aqui", "lib/config.dart", 15);

// Aviso com sugestão detalhada
sendWarn(`
⚠️ **Performance**: Operação custosa detectada no build()

**Problema:** \`DateTime.now()\` no build method
**Impacto:** Widget reconstrói com valor diferente a cada frame
**Solução:** Mova para \`initState()\` ou use \`ValueNotifier\`
`);

// Aviso condicional
const linesChanged = getLinesChanged();
if (linesChanged > 500) {
  sendWarn(`⚠️ PR muito grande: ${linesChanged} linhas\n\nConsidere dividir em PRs menores`);
}
```

---

### `sendFail(msg, file?, line?)`

Envia uma mensagem de erro no Pull Request.

**Parâmetros:**
- `msg: string` - Mensagem de erro (suporta markdown)
- `file?: string` - Caminho do arquivo para comentário inline (opcional)
- `line?: number` - Número da linha para comentário inline (opcional)

**Comportamento:** ⚠️ **FAZ O BUILD FALHAR!**

**Quando usar:**
- ❌ Problemas críticos
- ❌ Violações de segurança
- ❌ Testes falhando
- ❌ Violações de arquitetura obrigatórias
- ❌ API keys hardcoded

**Exemplos:**

```typescript
// Erro crítico
sendFail("❌ Testes falhando: 3 de 10 testes falharam");

// Erro de segurança
sendFail("❌ API key hardcoded detectada!", "lib/config.dart", 8);

// Erro com contexto detalhado
sendFail(`
❌ **Segurança Crítica**: Dados sensíveis sem criptografia

**Arquivo:** \`lib/storage/user_prefs.dart\`
**Problema:** Senha armazenada em SharedPreferences
**Risco:** Dados acessíveis em dispositivos com root

**Solução Obrigatória:**
\`\`\`dart
// ❌ NÃO FAÇA
SharedPreferences.setString('password', userPassword);

// ✅ FAÇA
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
await secureStorage.write(key: 'password', value: userPassword);
\`\`\`
`);

// Erro condicional
const dartFiles = getDartFiles();
const hasTests = dartFiles.some(f => f.includes('_test.dart'));
const hasCode = dartFiles.some(f => !f.includes('_test.dart'));

if (hasCode && !hasTests) {
  sendFail("❌ Código sem testes adicionados\n\nPor favor, adicione testes para o código novo");
}
```

---

### `sendMarkdown(msg, file?, line?)`

Envia conteúdo markdown formatado no Pull Request.

**Parâmetros:**
- `msg: string` - Conteúdo em markdown
- `file?: string` - Caminho do arquivo para comentário inline (opcional)
- `line?: number` - Número da linha para comentário inline (opcional)

**Quando usar:**
- 📊 Relatórios detalhados
- 📈 Tabelas com métricas
- 📋 Listas complexas
- 📝 Documentação inline

**Exemplos:**

```typescript
// Tabela com estatísticas
sendMarkdown(`
## 📊 Análise de Código

| Métrica | Valor | Status |
|---------|-------|--------|
| Arquivos Dart | 15 | ✅ |
| Linhas adicionadas | +250 | ✅ |
| Linhas removidas | -100 | ✅ |
| Cobertura | 85% | ✅ |
| Complexidade | Baixa | ✅ |

**Conclusão:** Todas as métricas dentro dos padrões!
`);

// Lista de arquivos por camada
const domainFiles = getDomainDartFiles();
const dataFiles = getDataDartFiles();
const presentationFiles = getPresentationDartFiles();

sendMarkdown(`
## 🏗️ Clean Architecture - Arquivos Modificados

### Domain Layer (${domainFiles.length} arquivos)
${domainFiles.map(f => `- \`${f}\``).join('\n')}

### Data Layer (${dataFiles.length} arquivos)
${dataFiles.map(f => `- \`${f}\``).join('\n')}

### Presentation Layer (${presentationFiles.length} arquivos)
${presentationFiles.map(f => `- \`${f}\``).join('\n')}
`);
```

---

### `scheduleTask(fn)`

Agenda uma tarefa assíncrona para ser executada pelo Danger.

**Parâmetros:**
- `fn: () => Promise<void>` - Função assíncrona a ser executada

**Quando usar:**
- 🔄 Chamadas de API externas
- 📁 Leitura de arquivos grandes
- 🔨 Execução de comandos shell
- ⏳ Operações que levam tempo

**Exemplos:**

```typescript
// Executar flutter analyze
scheduleTask(async () => {
  const { execSync } = require('child_process');
  try {
    const output = execSync('flutter analyze', { encoding: 'utf-8' });
    if (output.includes('error')) {
      sendFail('❌ Flutter analyze encontrou erros');
    } else {
      sendMessage('✅ Flutter analyze passou sem erros');
    }
  } catch (error) {
    sendFail('❌ Erro ao executar flutter analyze');
  }
});

// Verificar cobertura de testes
scheduleTask(async () => {
  const coverage = await fetchCodeCoverage();
  if (coverage < 80) {
    sendWarn(`⚠️ Cobertura de testes baixa: ${coverage}%`);
  } else {
    sendMessage(`✅ Cobertura de testes: ${coverage}%`);
  }
});

// Validar dependências
scheduleTask(async () => {
  const pubspec = await getFileContent('pubspec.yaml');
  if (pubspec?.includes('any')) {
    sendWarn('⚠️ Dependências sem versão específica no pubspec.yaml');
  }
});
```

---

## 📁 Filtros de Arquivos

### `getAllChangedFiles()`

Retorna todos os arquivos modificados e criados no PR.

**Retorna:** `string[]` - Array com caminhos dos arquivos

**Nota:** Exclui arquivos deletados

**Exemplos:**

```typescript
const files = getAllChangedFiles();
console.log(`${files.length} arquivos foram modificados ou criados`);

// Filtrar por extensão manualmente
const yamlFiles = files.filter(f => f.endsWith('.yaml'));
const testFiles = files.filter(f => f.includes('_test.'));

// Verificar se existe arquivo específico
if (files.includes('pubspec.yaml')) {
  sendMessage('📦 Dependências foram atualizadas');
}

// Listar todos os arquivos
sendMarkdown(`
## 📁 Arquivos Modificados

${files.map(f => `- \`${f}\``).join('\n')}
`);
```

---

### `getDartFiles()`

Retorna todos os arquivos `.dart` modificados ou criados.

**Retorna:** `string[]` - Array com caminhos dos arquivos .dart

**Nota:** Inclui arquivos de teste (`*_test.dart`)

**Exemplos:**

```typescript
const dartFiles = getDartFiles();

if (dartFiles.length === 0) {
  sendMessage("ℹ️ Nenhum arquivo Dart modificado");
  return;
}

// Separar código de testes
const codeFiles = dartFiles.filter(f => !f.includes('_test.dart'));
const testFiles = dartFiles.filter(f => f.includes('_test.dart'));

sendMessage(`📝 ${codeFiles.length} arquivos de código, ${testFiles.length} testes`);

// Verificar se tem testes para código novo
if (codeFiles.length > 0 && testFiles.length === 0) {
  sendWarn('⚠️ Código novo sem testes');
}

// Analisar cada arquivo
for (const file of dartFiles) {
  const content = await getFileContent(file);
  if (content?.includes('TODO')) {
    sendWarn(`⚠️ TODO encontrado em ${file}`);
  }
}
```

---

### `getDartFilesInDirectory(directory)`

Retorna arquivos `.dart` de um diretório específico.

**Parâmetros:**
- `directory: string` - Caminho do diretório (ex: '/domain/', '/features/auth/')

**Retorna:** `string[]` - Array com caminhos dos arquivos .dart no diretório

**Exemplos:**

```typescript
// Arquivos de uma feature específica
const authFiles = getDartFilesInDirectory('/features/auth/');
const userFiles = getDartFilesInDirectory('/features/user/');

// Arquivos de módulo core
const coreFiles = getDartFilesInDirectory('/core/');

// Verificar mudanças em área crítica
const authFiles = getDartFilesInDirectory('/core/auth/');
if (authFiles.length > 0) {
  sendWarn(`⚠️ Mudanças em autenticação detectadas
  
Arquivos modificados:
${authFiles.map(f => `- ${f}`).join('\n')}

**Atenção:** Esta é uma área crítica. Revisar cuidadosamente.`);
}

// Validar estrutura de feature
const featureFiles = getDartFilesInDirectory('/features/payment/');
const hasData = featureFiles.some(f => f.includes('/data/'));
const hasDomain = featureFiles.some(f => f.includes('/domain/'));
const hasPresentation = featureFiles.some(f => f.includes('/presentation/'));

if (!hasData || !hasDomain || !hasPresentation) {
  sendWarn('⚠️ Feature incompleta: falta alguma camada da Clean Architecture');
}
```

---

### `getFilesMatching(pattern)`

Retorna arquivos que correspondem a um padrão RegExp.

**Parâmetros:**
- `pattern: RegExp` - Padrão RegExp para buscar

**Retorna:** `string[]` - Array com caminhos dos arquivos correspondentes

**Exemplos:**

```typescript
// Arquivos de configuração
const configFiles = getFilesMatching(/\.(yaml|json|env)$/);
if (configFiles.length > 0) {
  sendMessage(`⚙️ ${configFiles.length} arquivos de configuração modificados`);
}

// Arquivos de teste
const testFiles = getFilesMatching(/_test\.dart$/);

// Arquivos de modelos
const modelFiles = getFilesMatching(/\/models\/.*\.dart$/);

// Assets (imagens, ícones)
const assetFiles = getFilesMatching(/\.(png|jpg|svg|webp)$/);
if (assetFiles.length > 0) {
  sendMessage(`🖼️ ${assetFiles.length} assets adicionados/modificados`);
}

// Arquivos críticos
const criticalFiles = getFilesMatching(/\/(main|app|config)\.dart$/);
if (criticalFiles.length > 0) {
  sendWarn(`⚠️ Arquivos críticos modificados:
  
${criticalFiles.map(f => `- ${f}`).join('\n')}

Requer revisão cuidadosa!`);
}

// Validar nomenclatura
const invalidFiles = getFilesMatching(/[A-Z]/); // Detecta CamelCase em paths
if (invalidFiles.length > 0) {
  sendFail(`❌ Arquivos com nomenclatura incorreta (use snake_case):
  
${invalidFiles.map(f => `- ${f}`).join('\n')}`);
}
```

---

### `getFilesByExtension(extension)`

Retorna arquivos com extensão específica.

**Parâmetros:**
- `extension: string` - Extensão do arquivo (ex: '.dart', '.yaml', '.md')

**Retorna:** `string[]` - Array com caminhos dos arquivos

**Exemplos:**

```typescript
// Arquivos Dart
const dartFiles = getFilesByExtension('.dart');

// Arquivos YAML
const yamlFiles = getFilesByExtension('.yaml');
if (yamlFiles.includes('pubspec.yaml')) {
  sendMessage('📦 pubspec.yaml foi modificado - verificar dependências');
}

// Arquivos de documentação
const mdFiles = getFilesByExtension('.md');
if (mdFiles.length > 0) {
  sendMessage(`📚 ${mdFiles.length} arquivos de documentação atualizados`);
}

// Arquivos JSON
const jsonFiles = getFilesByExtension('.json');

// Validar que certos arquivos não foram modificados
const lockFiles = getFilesByExtension('.lock');
if (lockFiles.length > 0) {
  sendWarn('⚠️ Arquivos .lock modificados - executar flutter pub get');
}
```

---

### `hasFilesMatching(pattern)`

Verifica se algum arquivo corresponde a um padrão RegExp.

**Parâmetros:**
- `pattern: RegExp` - Padrão RegExp para buscar

**Retorna:** `boolean` - `true` se pelo menos um arquivo corresponde

**Quando usar:** Verificações condicionais rápidas sem precisar do array de arquivos

**Exemplos:**

```typescript
// Verificar se tem mudanças em testes
if (hasFilesMatching(/_test\.dart$/)) {
  sendMessage('✅ Testes foram incluídos neste PR');
}

// Verificar se tem mudanças em configs
if (hasFilesMatching(/\.(yaml|json)$/)) {
  sendWarn('⚠️ Arquivos de configuração modificados');
}

// Verificar se main.dart foi modificado
if (hasFilesMatching(/\/main\.dart$/)) {
  sendWarn('⚠️ main.dart foi modificado - revisar ponto de entrada');
}

// Executar plugin apenas se houver arquivos relevantes
if (hasFilesMatching(/\/domain\/.*\.dart$/)) {
  // Executar validações de domain layer
  validateDomainLayer();
}

// Validar que nenhum arquivo proibido foi adicionado
if (hasFilesMatching(/\.(log|tmp|cache)$/)) {
  sendFail('❌ Arquivos temporários detectados no commit');
}
```

---

## 🏗️ Clean Architecture

### `getDomainDartFiles()`

Retorna arquivos `.dart` da camada Domain.

**Retorna:** `string[]` - Array com caminhos dos arquivos da camada Domain

**Conteúdo típico:** entities, failures, repositories (interfaces), use cases

**Exemplos:**

```typescript
const domainFiles = getDomainDartFiles();

if (domainFiles.length > 0) {
  sendMessage(`🏗️ ${domainFiles.length} arquivos da camada Domain modificados`);

  // Verificar subpastas
  const entities = domainFiles.filter(f => f.includes('/entities/'));
  const failures = domainFiles.filter(f => f.includes('/failures/'));
  const repositories = domainFiles.filter(f => f.includes('/repositories/'));
  const usecases = domainFiles.filter(f => f.includes('/usecases/'));

  sendMarkdown(`
## 🏗️ Domain Layer

- **Entities:** ${entities.length}
- **Failures:** ${failures.length}
- **Repositories:** ${repositories.length}
- **UseCases:** ${usecases.length}
  `);

  // Validar que Domain não importa outras camadas
  for (const file of domainFiles) {
    const content = await getFileContent(file);
    if (content?.includes('/data/') || content?.includes('/presentation/')) {
      sendFail(`❌ Domain importando outras camadas: ${file}`);
    }
  }
}
```

---

### `getDataDartFiles()`

Retorna arquivos `.dart` da camada Data.

**Retorna:** `string[]` - Array com caminhos dos arquivos da camada Data

**Conteúdo típico:** datasources, models, repositories (implementações)

**Exemplos:**

```typescript
const dataFiles = getDataDartFiles();

if (dataFiles.length > 0) {
  // Verificar se mudanças incluem datasources
  const datasources = dataFiles.filter(f => f.includes('/datasources/'));
  const models = dataFiles.filter(f => f.includes('/models/'));
  const repos = dataFiles.filter(f => f.includes('/repositories/'));

  if (datasources.length > 0) {
    sendWarn(`⚠️ ${datasources.length} Datasources modificados
    
**Atenção:** Verifique:
- Endpoints de API corretos
- Tratamento de erros
- Timeout configurado
- Retry policy
    `);
  }

  // Validar que models têm fromJson/toJson
  for (const modelFile of models) {
    const content = await getFileContent(modelFile);
    if (content && modelFile.includes('_model.dart')) {
      const hasFromJson = content.includes('fromJson');
      const hasToJson = content.includes('toJson');
      
      if (!hasFromJson || !hasToJson) {
        sendWarn(`⚠️ Model sem serialização completa: ${modelFile}`);
      }
    }
  }
}
```

---

### `getPresentationDartFiles()`

Retorna arquivos `.dart` da camada Presentation.

**Retorna:** `string[]` - Array com caminhos dos arquivos da camada Presentation

**Conteúdo típico:** pages, widgets, viewmodels, states, controllers

**Exemplos:**

```typescript
const presentationFiles = getPresentationDartFiles();

if (presentationFiles.length > 0) {
  // Verificar se tem testes de UI
  const hasTests = getAllChangedFiles().some(f =>
    f.includes('presentation') && f.includes('_test.dart')
  );

  if (!hasTests && presentationFiles.length > 5) {
    sendWarn('⚠️ Muitas mudanças na UI sem testes correspondentes');
  }

  // Verificar componentes
  const pages = presentationFiles.filter(f => f.includes('/pages/'));
  const widgets = presentationFiles.filter(f => f.includes('/widgets/'));
  const viewmodels = presentationFiles.filter(f => f.includes('/viewmodels/'));

  sendMarkdown(`
## 🎨 Presentation Layer

- **Pages:** ${pages.length}
- **Widgets:** ${widgets.length}
- **ViewModels:** ${viewmodels.length}
  `);

  // Validar que ViewModels não acessam Repositories diretamente
  for (const vm of viewmodels) {
    const content = await getFileContent(vm);
    if (content?.includes('Repository') && !content.includes('UseCase')) {
      sendFail(`❌ ViewModel acessando Repository diretamente: ${vm}
      
Use UseCases ao invés de Repositories!`);
    }
  }
}
```

---

### `isInLayer(file, layer)`

Verifica se um arquivo pertence a uma camada específica.

**Parâmetros:**
- `file: string` - Caminho do arquivo
- `layer: 'domain' | 'data' | 'presentation'` - Nome da camada

**Retorna:** `boolean` - `true` se o arquivo está na camada

**Exemplos:**

```typescript
const files = getDartFiles();

files.forEach(file => {
  if (isInLayer(file, 'domain')) {
    console.log(`${file} está na camada Domain`);
  }
});

// Validar que tipos não estão em camadas erradas
for (const file of files) {
  // ViewModel só pode estar em Presentation
  if (file.includes('viewmodel') && !isInLayer(file, 'presentation')) {
    sendFail(`❌ ViewModel fora da camada Presentation: ${file}`);
  }

  // Entity só pode estar em Domain
  if (file.includes('entity') && !isInLayer(file, 'domain')) {
    sendFail(`❌ Entity fora da camada Domain: ${file}`);
  }

  // Model só pode estar em Data
  if (file.includes('_model.dart') && !isInLayer(file, 'data')) {
    sendFail(`❌ Model fora da camada Data: ${file}`);
  }
}

// Verificar imports incorretos entre camadas
const domainFiles = files.filter(f => isInLayer(f, 'domain'));
for (const file of domainFiles) {
  const content = await getFileContent(file);
  
  // Domain não pode importar Data ou Presentation
  if (content?.includes("import 'package:")) {
    if (content.includes('/data/')) {
      sendFail(`❌ Domain importando Data: ${file}`);
    }
    if (content.includes('/presentation/')) {
      sendFail(`❌ Domain importando Presentation: ${file}`);
    }
  }
}
```

---

## 📖 Leitura de Conteúdo

### `getFileContent(file)`

Lê o conteúdo de um arquivo do git diff.

**Parâmetros:**
- `file: string` - Caminho do arquivo

**Retorna:** `Promise<string | null>` - Conteúdo do arquivo ou `null` se não disponível

**Nota:** Retorna apenas o conteúdo das mudanças (diff), não o arquivo completo

**Exemplos:**

```typescript
// Ler conteúdo de um arquivo
const content = await getFileContent('lib/main.dart');

if (content) {
  // Verificar se contém código problemático
  if (content.includes('print(')) {
    sendWarn('⚠️ print() detectado - remover antes de produção');
  }

  // Verificar imports
  if (content.includes("import 'dart:mirrors'")) {
    sendFail('❌ dart:mirrors não é suportado no Flutter');
  }

  // Contar linhas
  const lines = content.split('\n').length;
  console.log(`Arquivo tem ${lines} linhas`);
}

// Analisar múltiplos arquivos
const dartFiles = getDartFiles();
for (const file of dartFiles) {
  const content = await getFileContent(file);
  
  if (content) {
    // Detectar TODOs
    if (content.includes('TODO')) {
      sendWarn(`⚠️ TODO encontrado em ${file}`);
    }

    // Detectar hardcoded strings
    const hasHardcodedStrings = /['"][\w\s]{20,}['"]/.test(content);
    if (hasHardcodedStrings) {
      sendWarn(`⚠️ Possíveis strings hardcoded em ${file} - considere i18n`);
    }

    // Detectar console.log ou print
    if (content.match(/\b(print|console\.log)\(/)) {
      sendWarn(`⚠️ Debug code detectado em ${file}`);
    }
  }
}

// Validar estrutura de classes
const entityFiles = getDartFilesInDirectory('/domain/entities/');
for (const file of entityFiles) {
  const content = await getFileContent(file);
  
  if (content && !content.includes('final class')) {
    sendWarn(`⚠️ Entity sem 'final class': ${file}`);
  }
}
```

---

### `fileContainsPattern(file, pattern)`

Verifica se o conteúdo de um arquivo corresponde a um padrão RegExp.

**Parâmetros:**
- `file: string` - Caminho do arquivo
- `pattern: RegExp` - Padrão RegExp para buscar

**Retorna:** `Promise<boolean>` - `true` se o padrão for encontrado

**Exemplos:**

```typescript
// Verificar se arquivo usa API específica
const usesHttp = await fileContainsPattern('lib/api.dart', /\bhttp\./);
const usesDio = await fileContainsPattern('lib/api.dart', /\bDio\(/);

// Verificar se tem imports proibidos
const hasBloc = await fileContainsPattern(file, /import.*flutter_bloc/);

// Detectar código problemático
const hasPrint = await fileContainsPattern(file, /\bprint\(/);
const hasConsoleLog = await fileContainsPattern(file, /console\.log/);

if (hasPrint || hasConsoleLog) {
  sendWarn(`⚠️ Debug code detectado em ${file}`);
}

// Validar padrões arquiteturais
const domainFiles = getDomainDartFiles();
for (const file of domainFiles) {
  // Domain não pode usar Flutter
  const usesFlutter = await fileContainsPattern(file, /import.*flutter/);
  if (usesFlutter) {
    sendFail(`❌ Domain importando Flutter: ${file}`);
  }
}

// Verificar segurança
const configFiles = getFilesMatching(/config/);
for (const file of configFiles) {
  // Detectar possíveis API keys hardcoded
  const hasApiKey = await fileContainsPattern(file, /['"][\w-]{32,}['"]/);
  if (hasApiKey) {
    sendFail(`❌ Possível API key hardcoded em ${file}`);
  }
}

// Validar uso de async/await
const hasAsyncWithoutAwait = await fileContainsPattern(
  file,
  /async\s*{[^}]*}(?!.*await)/
);
if (hasAsyncWithoutAwait) {
  sendWarn(`⚠️ Função async sem await em ${file}`);
}
```

---

## 📋 Informações do PR

### `getPRDescription()`

Retorna a descrição da Pull Request.

**Retorna:** `string` - Descrição do PR ou string vazia

**Suporte:** GitHub, Bitbucket Cloud, GitLab

**Exemplos:**

```typescript
const description = getPRDescription();

// Verificar se tem descrição
if (!description || description.trim().length === 0) {
  sendFail('❌ PR sem descrição - adicione contexto sobre as mudanças');
}

// Verificar se descrição é muito curta
if (description.length < 50) {
  sendWarn('⚠️ Descrição muito curta - adicione mais detalhes');
}

// Verificar checklist
const hasChecklist = description.includes('- [');
if (!hasChecklist) {
  sendWarn('⚠️ PR sem checklist - considere adicionar');
}

// Verificar se menciona issue/ticket
const hasIssueReference = /\b(fixes|closes|resolves)\s+#\d+/i.test(description);
if (!hasIssueReference) {
  sendWarn('⚠️ PR não referencia nenhuma issue/ticket');
}

// Verificar palavras-chave obrigatórias
const keywords = ['motivo', 'mudanças', 'testes'];
const missingKeywords = keywords.filter(k => !description.toLowerCase().includes(k));
if (missingKeywords.length > 0) {
  sendWarn(`⚠️ Descrição incompleta. Faltam: ${missingKeywords.join(', ')}`);
}

// Extrair informações
if (description.includes('BREAKING CHANGE')) {
  sendWarn('⚠️ **BREAKING CHANGE** detectado - revisar cuidadosamente!');
}
```

---

### `getPRTitle()`

Retorna o título da Pull Request.

**Retorna:** `string` - Título do PR ou string vazia

**Suporte:** GitHub, Bitbucket Cloud, GitLab

**Exemplos:**

```typescript
const title = getPRTitle();

// Verificar formato Conventional Commits
const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?:.+/;
if (!conventionalPattern.test(title)) {
  sendWarn(`⚠️ Título não segue Conventional Commits
  
**Formato esperado:** \`type(scope): description\`
**Exemplos:**
- \`feat(auth): add login with biometrics\`
- \`fix(payment): resolve crash on checkout\`
- \`docs: update installation guide\`
  `);
}

// Verificar se título é muito curto
if (title.length < 10) {
  sendWarn('⚠️ Título muito curto - seja mais descritivo');
}

// Verificar se título é muito longo
if (title.length > 72) {
  sendWarn('⚠️ Título muito longo - mantenha abaixo de 72 caracteres');
}

// Detectar WIP
if (title.toLowerCase().includes('wip')) {
  sendMessage('ℹ️ PR marcado como Work in Progress');
}

// Validar capitalização
if (!/^[A-Z]/.test(title.split(':')[1]?.trim() || '')) {
  sendWarn('⚠️ Descrição deve iniciar com letra maiúscula');
}

// Detectar PR draft
const isDraft = title.toLowerCase().includes('draft');
if (isDraft) {
  sendMessage('📝 Este é um PR draft - não merge ainda');
}
```

---

### `getLinesChanged()`

Retorna o total de linhas alteradas (inserções + deleções).

**Retorna:** `number` - Número de linhas alteradas

**Exemplos:**

```typescript
const linesChanged = getLinesChanged();

// Alertar sobre PR grande
if (linesChanged > 500) {
  sendWarn(`⚠️ PR muito grande: ${linesChanged} linhas alteradas

**Recomendação:** Divida em PRs menores para facilitar revisão

**Estatísticas:**
- 0-200 linhas: Ideal ✅
- 201-500 linhas: Aceitável ⚠️
- 500+ linhas: Muito grande ❌
  `);
} else if (linesChanged > 200) {
  sendMessage(`ℹ️ PR médio: ${linesChanged} linhas alteradas`);
} else {
  sendMessage(`✅ PR pequeno: ${linesChanged} linhas alteradas - fácil de revisar!`);
}

// Obter detalhes
const danger = getDanger();
const insertions = danger.git.insertions;
const deletions = danger.git.deletions;

sendMarkdown(`
## 📊 Estatísticas do PR

| Métrica | Valor |
|---------|-------|
| Linhas adicionadas | +${insertions} |
| Linhas removidas | -${deletions} |
| **Total alterado** | **${linesChanged}** |
| Arquivos modificados | ${getAllChangedFiles().length} |
`);

// Calcular "impacto" do PR
const impact = insertions > deletions ? 'Expansão' : 'Refatoração';
sendMessage(`📈 Tipo de mudança: **${impact}**`);
```

---

## 💡 Exemplos Práticos

### Plugin Simples: Verificar Tamanho do PR

```typescript
import { createPlugin, getLinesChanged, sendWarn, sendMessage } from "@diletta/danger-bot";

export default createPlugin(
  {
    name: "pr-size-checker",
    description: "Verifica se o PR não está muito grande",
    enabled: true,
  },
  async () => {
    const linesChanged = getLinesChanged();

    if (linesChanged > 500) {
      sendWarn(`⚠️ PR muito grande: ${linesChanged} linhas

Considere dividir em PRs menores para facilitar a revisão.`);
    } else {
      sendMessage(`✅ Tamanho do PR: ${linesChanged} linhas`);
    }
  }
);
```

---

### Plugin Intermediário: Validar Clean Architecture

```typescript
import {
  createPlugin,
  getDomainDartFiles,
  getDataDartFiles,
  getPresentationDartFiles,
  getFileContent,
  sendFail,
  sendMessage,
} from "@diletta/danger-bot";

export default createPlugin(
  {
    name: "clean-architecture",
    description: "Valida regras da Clean Architecture",
    enabled: true,
  },
  async () => {
    const domainFiles = getDomainDartFiles();
    const dataFiles = getDataDartFiles();
    const presentationFiles = getPresentationDartFiles();

    let violations = 0;

    // Validar Domain Layer
    for (const file of domainFiles) {
      const content = await getFileContent(file);

      if (!content) continue;

      // Domain não pode importar Flutter
      if (content.includes("import 'package:flutter")) {
        sendFail(`❌ Domain importando Flutter: ${file}`);
        violations++;
      }

      // Domain não pode importar outras camadas
      if (content.includes('/data/') || content.includes('/presentation/')) {
        sendFail(`❌ Domain importando outras camadas: ${file}`);
        violations++;
      }
    }

    // Validar Data Layer
    for (const file of dataFiles) {
      const content = await getFileContent(file);

      if (!content) continue;

      // Data não pode importar Presentation
      if (content.includes('/presentation/')) {
        sendFail(`❌ Data importando Presentation: ${file}`);
        violations++;
      }
    }

    // Validar Presentation Layer
    for (const file of presentationFiles) {
      const content = await getFileContent(file);

      if (!content) continue;

      // ViewModel não pode acessar Repository diretamente
      if (file.includes('viewmodel') && content.includes('Repository') && !content.includes('UseCase')) {
        sendFail(`❌ ViewModel acessando Repository: ${file}

Use UseCases ao invés de Repositories!`);
        violations++;
      }
    }

    if (violations === 0) {
      sendMessage('✅ Nenhuma violação de Clean Architecture detectada');
    }
  }
);
```

---

### Plugin Avançado: Análise de Segurança

```typescript
import {
  createPlugin,
  getDartFiles,
  getFileContent,
  sendFail,
  sendWarn,
  sendMessage,
} from "@diletta/danger-bot";

export default createPlugin(
  {
    name: "security-checker",
    description: "Verifica problemas de segurança no código",
    enabled: true,
  },
  async () => {
    const dartFiles = getDartFiles();
    let securityIssues = 0;

    for (const file of dartFiles) {
      const content = await getFileContent(file);

      if (!content) continue;

      // API Keys hardcoded
      if (/['"][\w-]{32,}['"]/.test(content) && file.includes('config')) {
        sendFail(`❌ Possível API key hardcoded: ${file}`);
        securityIssues++;
      }

      // SharedPreferences com dados sensíveis
      if (content.includes('SharedPreferences') && 
          (content.includes('password') || content.includes('token'))) {
        sendFail(`❌ Dados sensíveis em SharedPreferences: ${file}

Use flutter_secure_storage ao invés de SharedPreferences!`);
        securityIssues++;
      }

      // Desabilitação de SSL/TLS
      if (content.includes('badCertificateCallback') && content.includes('true')) {
        sendFail(`❌ Validação SSL desabilitada: ${file}

NUNCA desabilite validação de certificados!`);
        securityIssues++;
      }

      // HTTP ao invés de HTTPS
      if (/http:\/\/(?!localhost)/.test(content)) {
        sendWarn(`⚠️ URL HTTP detectada: ${file}

Use HTTPS para comunicação segura.`);
        securityIssues++;
      }

      // eval() ou similar
      if (content.includes('eval(')) {
        sendFail(`❌ Uso de eval() detectado: ${file}

eval() é perigoso e deve ser evitado!`);
        securityIssues++;
      }
    }

    if (securityIssues === 0) {
      sendMessage('🔒 Nenhum problema de segurança detectado');
    } else {
      sendMessage(`⚠️ Total: ${securityIssues} problemas de segurança encontrados`);
    }
  }
);
```

---

## 📚 Recursos Adicionais

- **[API Reference](API.md)** - Referência completa da API
- **[Guia de Plugins](GUIA_PLUGINS.md)** - Como criar plugins customizados
- **[Exemplos](EXEMPLOS.md)** - Mais exemplos práticos
- **[FAQ](FAQ.md)** - Perguntas frequentes

---

<div align="center">

**💡 Dica:** Use os helpers para criar plugins mais simples e manuteníveis!

[📚 Voltar para Documentação](./) • [🔌 Criar Plugin](GUIA_PLUGINS.md) • [⚙️ API Reference](API.md)

</div>

