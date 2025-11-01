# 🤖 Danger Bot CLI - Guia Completo

## 📋 Visão Geral

A CLI do Danger Bot é uma ferramenta de linha de comando poderosa para **criar, gerenciar e validar plugins** de forma automatizada e padronizada.

---

## 🚀 Instalação

### Opção 1: Uso Direto (Recomendado para desenvolvimento)

```bash
cd /path/to/danger-bot
npm link
```

Agora você pode usar `danger-bot` em qualquer lugar:

```bash
danger-bot --help
danger-bot create-plugin
danger-bot list
```

### Opção 2: Uso com npx (Sem instalação global)

```bash
cd /path/to/danger-bot
npx danger-bot --help
```

### Opção 3: Uso Direto com Node

```bash
cd /path/to/danger-bot
node bin/cli.js --help
```

---

## 📚 Comandos Disponíveis

### `danger-bot --version` ou `-V`

Exibe a versão atual do Danger Bot.

```bash
$ danger-bot --version
1.0.0
```

---

### `danger-bot --help` ou `-h`

Mostra a ajuda geral com lista de todos os comandos.

```bash
$ danger-bot --help

Usage: danger-bot [options] [command]

CLI para Danger Bot - Facilita criação e gerenciamento de plugins

Options:
  -V, --version            output the version number
  -h, --help               display help for command

Commands:
  create-plugin|new        Criar um novo plugin interativamente
  list|ls                  Listar todos os plugins disponíveis
  generate-dangerfile|gen  Gerar dangerfile de exemplo
  validate <plugin-file>   Validar plugin
  info                     Mostrar informações do projeto
  help [command]           display help for command
```

---

## 🎨 Comando: `create-plugin` (ou `new`)

**Descrição:** Cria um novo plugin de forma interativa com estrutura completa.

### Uso

```bash
danger-bot create-plugin
# ou
danger-bot new
```

### Fluxo Interativo

#### 1. Seleção de Plataforma

```
============================================================
CREATE NEW DANGER BOT PLUGIN
============================================================

Select platform/language:
  1. Flutter/Dart
  2. Node.js

Platform (1-4) [1]:
```

**Opções:**

- `1` - Flutter/Dart (padrão)
- `2` - Node.js
- `3` - React
- `4` - Outra (customizada)

#### 2. Informações do Plugin

```
Selected platform: Flutter/Dart

Plugin name (e.g., "My Custom Plugin"): Test Coverage
Description: Verifica cobertura de testes mínima
Enable by default? (y/n) [y]: y
```

#### 3. Criação Automática

```
------------------------------------------------------------
CREATING PLUGIN...
------------------------------------------------------------

[OK] Created plugin folder: flutter/test-coverage/
[OK] Created plugin file: flutter/test-coverage/test-coverage.ts
[OK] Created barrel file: flutter/test-coverage/index.ts
[OK] Created documentation: flutter/test-coverage/README.md
[OK] Export added to flutter/index.ts

============================================================
PLUGIN CREATED SUCCESSFULLY!
============================================================

Plugin structure:
  src/plugins/flutter/test-coverage/
  ├── test-coverage.ts      # Plugin implementation
  ├── index.ts              # Barrel file
  └── README.md             # Documentation

Next steps:
  1. Edit: src/plugins/flutter/test-coverage/test-coverage.ts
  2. Update documentation: src/plugins/flutter/test-coverage/README.md
  3. Implement the plugin logic
  4. Run: npm run build
  5. Use: import { testCoveragePlugin } from "@diletta/danger-bot"
```

### O que é Criado Automaticamente

#### 1. Estrutura de Pastas

```
src/plugins/{platform}/{plugin-name}/
├── {plugin-name}.ts    # Implementação do plugin
├── index.ts            # Barrel file para exports
└── README.md           # Documentação completa
```

#### 2. Arquivo do Plugin

```typescript
/**
 * TEST COVERAGE PLUGIN
 * ====================
 * Verifica cobertura de testes mínima
 */

import { danger, message, warn, fail } from "danger";
import { createPlugin } from "@types";

export default createPlugin(
  {
    name: "test-coverage",
    description: "Verifica cobertura de testes mínima",
    enabled: true,
  },
  async () => {
    // TODO: Implement plugin logic

    // Example: Access Danger data
    const modifiedFiles = danger.git.modified_files;
    const createdFiles = danger.git.created_files;
    const allFiles = [...modifiedFiles, ...createdFiles];

    // Example: Send messages
    message(`✅ Plugin test-coverage executed successfully!`);

    // Other options:
    // warn("⚠️ Warning message");
    // fail("❌ Critical error - this will fail the PR");
    // message("📝 Informational message");
  }
);
```

#### 3. Barrel File

```typescript
export { default } from "./test-coverage";
```

#### 4. README.md

Template completo com seções padrão:

- Overview
- Purpose
- How It Works
- Configuration
- Example Output
- Best Practices
- Customization
- Platforms Supported
- Dependencies
- Related Plugins

#### 5. Export Automático

Adiciona automaticamente no `src/plugins/{platform}/index.ts`:

```typescript
export { default as testCoveragePlugin } from "./test-coverage";
```

### Convenções de Nomenclatura

| Input                 | Output                         |
| --------------------- | ------------------------------ |
| Nome: "Test Coverage" | Arquivo: `test-coverage.ts`    |
|                       | Pasta: `test-coverage/`        |
|                       | Export: `testCoveragePlugin`   |
|                       | Config name: `"test-coverage"` |

---

## 📋 Comando: `list` (ou `ls`)

**Descrição:** Lista todos os plugins disponíveis organizados por plataforma.

### Uso

```bash
danger-bot list
# ou
danger-bot ls
```

### Exemplo de Saída

```
============================================================
DANGER BOT PLUGINS
============================================================

--- FLUTTER ---

[1] CHANGELOG-CHECKER
    Platform: flutter
    Folder: changelog-checker/
    File: changelog-checker.ts
    Description: Verifica se o CHANGELOG.md foi atualizado
    Status: ENABLED
    Documentation: README.md

[2] FLUTTER-ANALYZE
    Platform: flutter
    Folder: flutter-analyze/
    File: flutter-analyze.ts
    Description: Executa flutter analyze e reporta problemas
    Status: ENABLED
    Documentation: README.md

[3] PR-SIZE-CHECKER
    Platform: flutter
    Folder: pr-size-checker/
    File: pr-size-checker.ts
    Description: Verifica se o PR não está muito grande
    Status: ENABLED
    Documentation: README.md

--- NODEJS ---

[7] API-VALIDATOR
    Platform: nodejs
    Folder: api-validator/
    File: api-validator.ts
    Description: Valida contratos de API
    Status: ENABLED
    Documentation: README.md

============================================================
Total: 7 plugin(s) across 2 platform(s)
```

### Informações Exibidas

Para cada plugin:

- **Número** - Índice sequencial
- **Nome** - Nome do plugin em maiúsculas
- **Platform** - Plataforma (flutter, nodejs, react, etc)
- **Folder** - Nome da pasta
- **File** - Nome do arquivo principal
- **Description** - Descrição extraída do código
- **Status** - ENABLED ou DISABLED
- **Documentation** - Se possui README.md

---

## ℹ️ Comando: `info`

**Descrição:** Mostra informações gerais do projeto e estatísticas dos plugins.

### Uso

```bash
danger-bot info
```

### Exemplo de Saída

```
============================================================
DANGER BOT - PROJECT INFO
============================================================

Name:        @diletta/danger-bot
Version:     1.0.0
Description: Conjunto modular de plugins Danger JS

Platforms:

  flutter/ (6 plugins)
    - changelog-checker/
    - flutter-analyze/
    - flutter-architecture/
    - portuguese-documentation/
    - pr-size-checker/
    - spell-checker/

  nodejs/ (2 plugins)
    - api-validator/
    - env-checker/

Total: 8 plugin(s) across 2 platform(s)

============================================================
```

---

## 📝 Comando: `generate-dangerfile` (ou `gen`)

**Descrição:** Gera um arquivo `dangerfile.example.ts` com todos os plugins disponíveis.

### Uso

```bash
danger-bot generate-dangerfile
# ou
danger-bot gen
```

### Exemplo de Saída

```
Generating dangerfile.example.ts...

✅ dangerfile.example.ts created successfully!

This file includes:
- All 8 available plugins
- Proper imports
- Plugin execution setup
- Error handling

Next steps:
1. Review: dangerfile.example.ts
2. Customize: Enable/disable plugins as needed
3. Rename: mv dangerfile.example.ts dangerfile.ts
4. Use: npm run danger:ci
```

### Arquivo Gerado

```typescript
/**
 * DANGER BOT - DANGERFILE
 * ========================
 * Auto-generated dangerfile with all available plugins
 */

// Import Danger types and functions
import { danger, message, warn, fail } from "danger";

// Import Danger Bot plugins
import {
  // Flutter plugins
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  flutterArchitecturePlugin,
  portugueseDocumentationPlugin,
  prSizeCheckerPlugin,
  spellCheckerPlugin,

  // Helpers
  runPlugins,
} from "@diletta/danger-bot";

// Configure which plugins to use
const plugins = [
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  flutterArchitecturePlugin,
  spellCheckerPlugin,
  portugueseDocumentationPlugin,
];

// Execute plugins
(async () => {
  try {
    const pr =
      danger.github?.pr || danger.bitbucket_cloud?.pr || danger.gitlab?.mr;

    if (pr) {
      message(
        `🔍 Danger CI - Análise automática\n\n` +
          `**Título**: ${pr.title}\n` +
          `📦 Plugins ativos: ${
            plugins.filter((p) => p.config.enabled).length
          }/${plugins.length}`
      );
    }

    await runPlugins(plugins);
    message("✅ Danger CI - Análise concluída!");
  } catch (error) {
    message("⚠️ Erro no Danger CI");
    throw error;
  }
})();
```

---

## ✅ Comando: `validate`

**Descrição:** Valida se um plugin segue o padrão correto do Danger Bot.

### Uso

```bash
danger-bot validate <caminho-do-plugin>
```

### Exemplo

```bash
$ danger-bot validate src/plugins/flutter/test-coverage/test-coverage.ts

Validating plugin: src/plugins/flutter/test-coverage/test-coverage.ts

✅ Plugin is valid!

Checks:
- ✅ Has createPlugin import
- ✅ Has default export
- ✅ Has 'name' field
- ✅ Has 'description' field
- ⚠️  Consider adding 'enabled' field

Plugin details:
- Name: test-coverage
- Description: Verifica cobertura de testes
- Enabled: true (default)
```

### Validações Realizadas

#### Obrigatórias ✅

1. **Import do createPlugin**

   ```typescript
   import { createPlugin } from "@types";
   ```

2. **Export default**

   ```typescript
   export default createPlugin(...)
   ```

3. **Campo 'name'**

   ```typescript
   {
     name: "plugin-name",
     // ...
   }
   ```

4. **Campo 'description'**
   ```typescript
   {
     description: "Plugin description",
     // ...
   }
   ```

#### Recomendadas ⚠️

5. **Campo 'enabled'**

   ```typescript
   {
     enabled: true,
     // ...
   }
   ```

6. **Documentação (README.md)**

---

## 🎯 Casos de Uso

### 1. Criar Plugin Flutter

```bash
$ danger-bot create-plugin

Platform (1-4) [1]: 1
Plugin name: Screenshot Validator
Description: Valida se screenshots foram atualizados
Enable by default? (y/n) [y]: y

# Resultado:
# src/plugins/flutter/screenshot-validator/
```

### 2. Criar Plugin Node.js

```bash
$ danger-bot create-plugin

Platform (1-4) [1]: 2
Plugin name: Package Audit
Description: Executa npm audit e reporta vulnerabilidades
Enable by default? (y/n) [y]: y

# Resultado:
# src/plugins/nodejs/package-audit/
```

### 3. Criar Plugin Customizado

```bash
$ danger-bot create-plugin

Platform (1-4) [1]: 4
Platform name: Python
Plugin name: Pytest Coverage
Description: Verifica cobertura pytest
Enable by default? (y/n) [y]: y

# Resultado:
# src/plugins/python/pytest-coverage/
```

### 4. Listar Todos os Plugins

```bash
$ danger-bot list

# Mostra todos os plugins organizados por plataforma
```

### 5. Verificar Informações do Projeto

```bash
$ danger-bot info

# Exibe estatísticas e plugins disponíveis
```

### 6. Gerar Dangerfile Completo

```bash
$ danger-bot generate-dangerfile

# Cria dangerfile.example.ts com todos os plugins
```

### 7. Validar Plugin Criado

```bash
$ danger-bot validate src/plugins/flutter/meu-plugin/meu-plugin.ts

# Verifica se o plugin está correto
```

---

## 🔧 Troubleshooting

### Comando não encontrado

```bash
$ danger-bot: command not found
```

**Solução:**

```bash
cd /path/to/danger-bot
npm link
```

### Erro ao criar plugin

```bash
Error: Plugin already exists
```

**Solução:**

- Escolha outro nome
- Ou delete a pasta existente antes de criar

### Plugin não aparece no list

**Verificar:**

1. Plugin está na pasta correta (`src/plugins/{platform}/{plugin}/`)
2. Arquivo tem extensão `.ts`
3. Não é `index.ts`

### Erro de importação

```bash
Cannot find module '@types'
```

**Solução:**

```bash
npm run build  # Recompila o projeto
```

---

## 💡 Dicas e Boas Práticas

### 1. Nomenclatura

✅ **Use kebab-case:**

```
test-coverage
api-validator
screenshot-checker
```

❌ **Evite:**

```
TestCoverage
test_coverage
testCoverage
```

### 2. Descrições

✅ **Seja claro e objetivo:**

```
"Verifica cobertura mínima de testes"
"Valida contratos de API REST"
```

❌ **Evite descrições vagas:**

```
"Plugin de teste"
"Faz validação"
```

### 3. Organização

✅ **Agrupe por plataforma:**

```
src/plugins/
├── flutter/       # Plugins Dart/Flutter
├── nodejs/        # Plugins Node.js
└── react/         # Plugins React
```

### 4. Desenvolvimento

```bash
# 1. Criar plugin
danger-bot create-plugin

# 2. Implementar lógica
vim src/plugins/{platform}/{plugin}/{plugin}.ts

# 3. Atualizar documentação
vim src/plugins/{platform}/{plugin}/README.md

# 4. Validar
danger-bot validate src/plugins/{platform}/{plugin}/{plugin}.ts

# 5. Build
npm run build

# 6. Testar localmente
npm run danger:local
```

---

## 📚 Recursos Adicionais

### Documentação Relacionada

- [Guia de Instalação](INSTALLATION.md) - Como instalar o Danger Bot
- [Arquitetura de Plugins](PLATFORM_ARCHITECTURE.md) - Estrutura por plataforma
- [Guia de Pipelines](PIPELINE_GUIDE.md) - Configuração CI/CD
- [README Principal](../README.md) - Visão geral do projeto

### Links Úteis

- [Danger JS Docs](https://danger.systems/js/) - Documentação oficial do Danger
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Referência TypeScript
- [Commander.js](https://github.com/tj/commander.js) - Biblioteca usada na CLI

---

## 🤝 Contribuindo

Encontrou um bug ou tem uma sugestão para a CLI?

1. Abra uma issue no repositório
2. Descreva o problema/sugestão
3. Se possível, sugira uma solução

---

<div align="center">

**CLI do Danger Bot - Desenvolvendo plugins nunca foi tão fácil! 🚀**

[Voltar ao Índice](DOCS_INDEX.md) • [Instalação](INSTALLATION.md) • [Arquitetura](PLATFORM_ARCHITECTURE.md)

</div>
