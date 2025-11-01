# 🤖 CLI do Danger Bot

## 🎯 Visão Geral

O Danger Bot inclui uma CLI poderosa para facilitar o desenvolvimento e gerenciamento de plugins!

## 📦 Instalação da CLI

```bash
# Após instalar o danger-bot, a CLI já está disponível
npm install danger-bot@git+https://github.com/diletta/danger-bot.git#v1.0.0

# Usar comandos
npx danger-bot <comando>

# Ou instalar globalmente
npm install -g danger-bot@git+https://felipeDuarteBarbosa@bitbucket.org/diletta/danger-bot.git#v1.0.0
danger-bot <comando>
```

## 🚀 Comandos Disponíveis

### 1. 🎨 `create-plugin` (alias: `new`)

Cria um novo plugin interativamente seguindo o padrão do Danger Bot.

```bash
danger-bot create-plugin
# ou
danger-bot new
```

**Funcionalidades:**

- ✅ Pergunta nome, descrição e se está habilitado
- ✅ Permite escolher emoji para o plugin
- ✅ Cria arquivo com padrão: `nome-do-plugin-plugin.ts`
- ✅ Adiciona automaticamente o export no `index.ts`
- ✅ Gera código base com `createPlugin` e imports corretos
- ✅ Converte nome para kebab-case no arquivo e camelCase no export

**Exemplo:**

```
$ danger-bot create-plugin

🎨 Criar Novo Plugin do Danger Bot

Nome do plugin: Test Coverage
Descrição do plugin: Verifica se testes cobrem arquivos modificados

📋 Escolha um emoji:
1. 🔍  2. 📄  3. 🏗️  4. 🔤  5. 🌐
6. ⚡  7. 🎨  8. 🔧  9. 📊  10. 🚀

Número do emoji (1-20) [1]: 9
Plugin habilitado por padrão? (s/n) [s]: s

✅ Plugin criado: src/plugins/test-coverage-plugin.ts
✅ Export adicionado ao index.ts

🎉 Plugin criado com sucesso!

📝 Próximos passos:
   1. Edite: src/plugins/test-coverage-plugin.ts
   2. Implemente a lógica
   3. Execute: npm run build
   4. Use: import { testCoveragePlugin } from "danger-bot"
```

### 2. 📋 `list` (alias: `ls`)

Lista todos os plugins disponíveis com suas informações.

```bash
danger-bot list
# ou
danger-bot ls
```

**Saída:**

```
📦 Plugins Disponíveis:

1. 🔍 pr-size-checker
   📄 Arquivo: pr-size-checker.ts
   📝 Verifica se o PR não está muito grande
   ✅ Habilitado

2. 📄 changelog-checker
   📄 Arquivo: changelog-checker.ts
   📝 Verifica se o CHANGELOG.md foi atualizado
   ✅ Habilitado
```

### 3. 📝 `generate-dangerfile` (alias: `gen`)

Gera um `dangerfile.example.ts` com todos os plugins.

```bash
danger-bot generate-dangerfile
# ou
danger-bot gen
```

**Arquivo gerado:**

```typescript
import {
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  runPlugins,
} from "danger-bot";

const plugins = [
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
];

(async () => {
  await runPlugins(plugins);
  message("✅ Análise concluída!");
})();
```

### 4. 🔍 `validate <arquivo>`

Valida se um plugin segue o padrão correto.

```bash
danger-bot validate src/plugins/meu-plugin.ts
```

**Verificações:**

- ✅ Import do `createPlugin`
- ✅ Export default presente
- ✅ Campos: `name`, `description`, `enabled`
- ⚠️ Função async, documentação JSDoc

### 5. ℹ️ `info`

Mostra informações do projeto.

```bash
danger-bot info
```

## 🎨 Padrão de Plugins

### Estrutura do Arquivo

**Nome:** `<nome-kebab-case>-plugin.ts`

```typescript
/**
 * 📊 TEST COVERAGE PLUGIN
 * ======================
 * Verifica se testes cobrem arquivos modificados
 */

import { createPlugin } from "../types";

export default createPlugin(
  {
    name: "test-coverage",
    description: "Verifica se testes cobrem arquivos modificados",
    enabled: true,
  },
  async () => {
    // Sua lógica aqui
    const modifiedFiles = danger.git.modified_files;

    message("✅ Plugin executado!");
  }
);
```

### Export Automático

No `src/index.ts`:

```typescript
export { default as testCoveragePlugin } from "./plugins/test-coverage-plugin";
```

**Conversão de nomes:**
| Input | Arquivo | Export |
|-------|---------|--------|
| "Test Coverage" | `test-coverage-plugin.ts` | `testCoveragePlugin` |
| "Security Check" | `security-check-plugin.ts` | `securityCheckPlugin` |

## 💡 Exemplos de Uso

### Criar Plugin Personalizado

```bash
danger-bot new
# Responda às perguntas interativas
```

### Validar Todos os Plugins

```bash
# Linux/macOS
for file in src/plugins/*.ts; do
  danger-bot validate "$file"
done
```

### Workflow Completo

```bash
# 1. Criar plugin
danger-bot create-plugin

# 2. Implementar lógica (editar arquivo)

# 3. Validar
danger-bot validate src/plugins/meu-plugin-plugin.ts

# 4. Build
npm run build

# 5. Gerar dangerfile de exemplo
danger-bot gen
```

## 🔧 Desenvolvimento

### Testar Localmente

```bash
# No danger-bot
cd danger-bot
npm link

# Agora pode usar globalmente
danger-bot --help
```

### Comandos Rápidos

```bash
danger-bot --help      # Ajuda
danger-bot --version   # Versão
danger-bot new         # Novo plugin
danger-bot ls          # Listar plugins
danger-bot gen         # Gerar dangerfile
danger-bot info        # Informações
```

## 🎁 Benefícios

✅ **Padronização** - Todos os plugins seguem o mesmo padrão  
✅ **Produtividade** - Criação rápida de plugins  
✅ **Validação** - Garante qualidade do código  
✅ **Automação** - Exports automáticos  
✅ **Interatividade** - Interface amigável

---
