# 🤖 CLI do Danger Bot

> Interface de linha de comando para gerenciar plugins e facilitar o desenvolvimento

---

## 📋 Visão Geral

O Danger Bot inclui uma CLI poderosa que facilita:

- ✅ Criar novos plugins seguindo o padrão
- ✅ Remover plugins existentes automaticamente
- ✅ Listar todos os plugins disponíveis
- ✅ Validar plugins existentes
- ✅ Gerar dangerfiles de exemplo
- ✅ Ver informações do projeto

---

## 🚀 Instalação

A CLI vem automaticamente quando você instala o Danger Bot:

```bash
npm install --save-dev @diletta/danger-bot@git+https://bitbucket.org/diletta/danger-bot.git
```

Verifique a instalação:

```bash
danger-bot --version
# Output: 1.8.0
```

---

## 📚 Comandos Disponíveis

### 📖 Help - Ajuda

```bash
danger-bot --help
danger-bot -h
```

**Output:**

```
Usage: danger-bot [options] [command]

CLI para Danger Bot - Facilita criação e gerenciamento de plugins

Options:
  -V, --version            output the version number
  -h, --help               display help for command

Commands:
  create-plugin|new        Criar um novo plugin interativamente
  remove-plugin|rm         Remover um plugin existente
  list|ls                  Listar todos os plugins disponíveis
  generate-dangerfile|gen  Gerar dangerfile de exemplo com todos os plugins
  validate <plugin-file>   Validar se um plugin segue o padrão correto
  info                     Mostrar informações do projeto
  help [command]           display help for command
```

---

## 🔌 create-plugin (new)

Cria um novo plugin interativamente com todos os arquivos necessários.

### Uso

```bash
danger-bot create-plugin
# ou
danger-bot new
```

### Processo Interativo

1. **Selecionar Plataforma**

   ```
   Select platform/language:
     1. Flutter/Dart
     2. Node.js
   Platform (1-2) [1]:
   ```

2. **Nome do Plugin**

   ```
   Plugin name (e.g., "My Custom Plugin"): Code Coverage Checker
   ```

3. **Descrição**

   ```
   Description: Verifica cobertura de testes do projeto
   ```

4. **Habilitar por Padrão**
   ```
   Enable by default? (y/n) [y]: y
   ```

### Estrutura Criada

```
src/plugins/flutter/code-coverage-checker/
├── code-coverage-checker.ts    # Implementação do plugin
├── index.ts                     # Barrel file
└── README.md                    # Documentação completa
```

### Exemplo de Saída

```
============================================================
CREATE NEW DANGER BOT PLUGIN
============================================================

Selected platform: Flutter/Dart

------------------------------------------------------------
CREATING PLUGIN...
------------------------------------------------------------

[OK] Created plugin folder: flutter/code-coverage-checker/
[OK] Created plugin file: flutter/code-coverage-checker/code-coverage-checker.ts
[OK] Created barrel file: flutter/code-coverage-checker/index.ts
[OK] Created documentation: flutter/code-coverage-checker/README.md
[OK] Export added to flutter/index.ts

============================================================
PLUGIN CREATED SUCCESSFULLY!
============================================================

Plugin structure:
  src/plugins/flutter/code-coverage-checker/
  ├── code-coverage-checker.ts      # Plugin implementation
  ├── index.ts                       # Barrel file
  └── README.md                      # Documentation

Next steps:
  1. Edit: src/plugins/flutter/code-coverage-checker/code-coverage-checker.ts
  2. Update documentation: src/plugins/flutter/code-coverage-checker/README.md
  3. Implement the plugin logic
  4. Run: npm run build
  5. Use: import { codeCoverageCheckerPlugin } from "@diletta/danger-bot"
```

### Template Gerado

O plugin criado já vem com:

- ✅ Estrutura básica completa
- ✅ Imports corretos (`createPlugin`, `getDanger`, helpers)
- ✅ Configuração (name, description, enabled)
- ✅ Função run async
- ✅ Exemplos de uso dos helpers
- ✅ Documentação completa
- ✅ Export automático no barrel file da plataforma
- ✅ **Adicionado automaticamente no `allFlutterPlugins`**
- ✅ **Import adicionado automaticamente no `src/index.ts`**

---

## 🗑️ remove-plugin (rm)

Remove um plugin existente de forma segura e automática, limpando todas as referências.

### Uso

```bash
danger-bot remove-plugin
# ou
danger-bot rm
```

### Processo Interativo

1. **Selecionar Plataforma**

   ```
   Available platforms:
     1. flutter
   
   Select platform (1-1): 1
   ```

2. **Selecionar Plugin**

   ```
   Available plugins in flutter:
     1. pr-size-checker
     2. changelog-checker
     3. flutter-analyze
     4. flutter-architecture
     5. spell-checker
     6. portuguese-documentation
     7. plugin-test
   
   Select plugin to remove (1-7): 7
   ```

3. **Confirmar Remoção**

   ```
   ⚠️  WARNING: This will permanently delete the plugin "plugin-test"!
   Are you sure? (yes/no): yes
   ```

### Exemplo de Saída

```
============================================================
REMOVE DANGER BOT PLUGIN
============================================================

Available platforms:
  1. flutter

Select platform (1-1): 1

Available plugins in flutter:
  1. pr-size-checker
  2. changelog-checker
  3. plugin-test

Select plugin to remove (1-3): 3

⚠️  WARNING: This will permanently delete the plugin "plugin-test"!
Are you sure? (yes/no): yes

------------------------------------------------------------
REMOVING PLUGIN...
------------------------------------------------------------

[OK] Removed plugin folder: flutter/plugin-test/
[OK] Removed export from flutter/index.ts
[OK] Removed from imports in src/index.ts
[OK] Removed from allFlutterPlugins in src/index.ts

============================================================
PLUGIN REMOVED SUCCESSFULLY!
============================================================

Removed:
  ❌ flutter/plugin-test/ - Plugin folder deleted
  ❌ flutter/index.ts - Export removed
  ❌ src/index.ts - Import removed
  ❌ src/index.ts - Removed from allFlutterPlugins

Next steps:
  1. Run: npm run build
  2. Commit the changes
```

### O que é removido automaticamente

- ✅ **Pasta do plugin** - Deleta `src/plugins/<platform>/<plugin-name>/`
- ✅ **Export do barrel** - Remove linha do `<platform>/index.ts`
- ✅ **Import principal** - Remove do import em `src/index.ts`
- ✅ **Array de plugins** - Remove do `allFlutterPlugins` em `src/index.ts`

### Segurança

- ⚠️ Requer confirmação explícita digitando "yes"
- ⚠️ Operação irreversível (sem undo)
- ⚠️ Faz backup automático? Não - use Git para reverter se necessário
- ✅ Lista todas as mudanças que serão feitas
- ✅ Não remove se o plugin não existir

### Quando Usar

- ❌ Plugin obsoleto ou não utilizado
- ❌ Plugin duplicado
- ❌ Plugin de teste que não é mais necessário
- ❌ Refatoração da estrutura de plugins

---

## 📋 list (ls)

Lista todos os plugins disponíveis organizados por plataforma.

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

[4] SPELL-CHECKER
    Platform: flutter
    Folder: spell-checker/
    File: spell-checker.ts
    Description: Verifica ortografia em identificadores Dart
    Status: ENABLED
    Documentation: README.md

============================================================
Total: 7 plugin(s) across 1 platform(s)
```

### Informações Exibidas

- **Nome**: Nome do plugin em uppercase
- **Platform**: Plataforma (flutter, nodejs, etc)
- **Folder**: Nome da pasta
- **File**: Arquivo principal
- **Description**: Descrição do que o plugin faz
- **Status**: ENABLED ou DISABLED
- **Documentation**: Se tem README.md

---

## 📄 generate-dangerfile (gen)

Gera um `dangerfile.example.ts` com todos os plugins disponíveis.

### Uso

```bash
danger-bot generate-dangerfile
# ou
danger-bot gen
```

### Exemplo de Saída

```
✅ Dangerfile de exemplo criado: dangerfile.example.ts

📝 Para usar:
   1. Renomeie para dangerfile.ts
   2. Customize conforme necessário
```

### Dangerfile Gerado

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
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  flutterArchitecturePlugin,
  spellCheckerPlugin,
  portugueseDocumentationPlugin,
  runPlugins,
} from "@diletta/danger-bot";

// Configurar plugins ativos
const plugins = [
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  flutterArchitecturePlugin,
  spellCheckerPlugin,
  portugueseDocumentationPlugin,
];

// Executar análise
(async () => {
  try {
    const pr = danger.github?.pr || danger.bitbucket_cloud?.pr || danger.gitlab?.mr;

    if (pr) {
      message(
        `🔍 **Danger CI** executando análise automática\n\n` +
          `**Título**: ${pr.title}\n` +
          `📦 Plugins ativos: ${plugins.filter((p) => p.config.enabled).length}/${plugins.length}`
      );
    }

    await runPlugins(plugins);
    message("✅ **Danger CI** - Análise concluída com sucesso!");
  } catch (error) {
    message("⚠️ **Erro no Danger CI**: Verifique os logs do CI.");
    throw error;
  }
})();
```

---

## ✅ validate

Valida se um plugin segue o padrão correto do Danger Bot.

### Uso

```bash
danger-bot validate <caminho-do-arquivo>
```

### Exemplo

```bash
danger-bot validate src/plugins/flutter/spell-checker/spell-checker.ts
```

### Validações Realizadas

#### ❌ Erros (Obrigatórios)

- Import de `createPlugin` presente
- Export default com `createPlugin`
- Campo `name` definido
- Campo `description` definido

#### ⚠️ Avisos (Recomendados)

- Campo `enabled` definido
- Função run é `async`
- Documentação JSDoc no topo

### Exemplo de Saída - Plugin Válido

```
🔍 Validando plugin...

✅ Plugin válido! Nenhum problema encontrado.
```

### Exemplo de Saída - Com Erros

```
🔍 Validando plugin...

❌ Erros encontrados:
   ❌ Falta import do createPlugin
   ❌ Falta export default createPlugin
   ❌ Falta campo "name"

⚠️ Avisos:
   ⚠️ Falta campo "enabled" (será true por padrão)
   ⚠️ Falta documentação JSDoc no topo do arquivo
```

---

## ℹ️ info

Mostra informações gerais do projeto Danger Bot.

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
Version:     1.8.0
Description: Conjunto modular de plugins Danger JS

Platforms:

  flutter/ (7 plugins)
    - changelog-checker/
    - flutter-analyze/
    - flutter-architecture/
    - plugin-test/
    - portuguese-documentation/
    - pr-size-checker/
    - spell-checker/

Total: 7 plugin(s) across 1 platform(s)

============================================================
```

---

## 🎯 Casos de Uso

### Criar Plugin Customizado

```bash
# 1. Criar plugin
danger-bot create-plugin

# 2. Implementar lógica
vim src/plugins/flutter/meu-plugin/meu-plugin.ts

# 3. Compilar
npm run build

# 4. Testar
npm run danger:local
```

### Verificar Todos os Plugins

```bash
# Listar plugins
danger-bot list

# Ver info geral
danger-bot info
```

### Validar Before Commit

```bash
# Validar plugin modificado
danger-bot validate src/plugins/flutter/spell-checker/spell-checker.ts

# Se válido, fazer commit
git add .
git commit -m "feat(plugin): melhorar spell-checker"
```

### Gerar Dangerfile Base

```bash
# Gerar exemplo
danger-bot gen

# Personalizar
cp dangerfile.example.ts dangerfile.ts
vim dangerfile.ts
```

---

## 🔧 Configuração

### Alias no Shell

Adicione ao seu `.bashrc` ou `.zshrc`:

```bash
alias db='danger-bot'
alias db-new='danger-bot create-plugin'
alias db-ls='danger-bot list'
alias db-info='danger-bot info'
```

Uso:

```bash
db ls
db-new
db-info
```

### NPM Scripts

Adicione ao `package.json`:

```json
{
  "scripts": {
    "plugin:new": "danger-bot create-plugin",
    "plugin:list": "danger-bot list",
    "plugin:validate": "danger-bot validate",
    "plugin:info": "danger-bot info"
  }
}
```

Uso:

```bash
npm run plugin:new
npm run plugin:list
```

---

## 🏗️ Arquitetura da CLI

A CLI é modular e bem organizada:

```
bin/
├── cli.js                    # Entry point (63 linhas)
├── commands/                 # Comandos individuais
│   ├── create-plugin.js
│   ├── list-plugins.js
│   ├── generate-dangerfile.js
│   ├── validate-plugin.js
│   └── info.js
├── templates/                # Templates de código
│   ├── plugin-template.js
│   ├── readme-template.js
│   └── dangerfile-template.js
└── utils/                    # Utilitários
    ├── string-helpers.js     # kebab-case, camelCase, etc
    ├── readline-helper.js    # Interação com usuário
    └── fs-helpers.js         # Operações de arquivo
```

---

## 📚 Recursos Adicionais

- **[Guia de Plugins](GUIA_PLUGINS.md)** - Como criar plugins manualmente
- **[API Reference](API.md)** - Funções disponíveis para plugins
- **[Desenvolvimento](DESENVOLVIMENTO.md)** - Contribuir para o projeto
- **[Exemplos](EXEMPLOS.md)** - Casos de uso reais

---

## 🐛 Troubleshooting

### CLI não encontrada

```bash
# Reinstalar globalmente
npm uninstall -g @diletta/danger-bot
npm install -g @diletta/danger-bot@git+https://bitbucket.org/diletta/danger-bot.git

# Ou usar via npx
npx danger-bot list
```

### Permissão negada

```bash
# Dar permissão de execução
chmod +x ./node_modules/.bin/danger-bot
```

### Erro ao criar plugin

```bash
# Verificar se está no diretório correto
pwd
# Deve estar na raiz do projeto danger-bot

# Verificar se a pasta src/plugins existe
ls -la src/plugins
```

---

<div align="center">

**🎉 Agora você domina a CLI do Danger Bot!**

[📚 Voltar para Documentação](.) • [🔌 Criar Primeiro Plugin](GUIA_PLUGINS.md) • [⚙️ API Reference](API.md)

---

</div>
