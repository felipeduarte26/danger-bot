# 🔌 Guia de Plugins

> Como usar, configurar e criar plugins personalizados

---

## 📋 Plugins Disponíveis

### 📦 Plugins Flutter/Dart

| Plugin | Descrição | Padrão |
|--------|-----------|--------|
| **pr-size-checker** | Verifica tamanho do PR | ✅ Habilitado |
| **changelog-checker** | Valida CHANGELOG.md | ✅ Habilitado |
| **flutter-analyze** | Executa `flutter analyze` | ✅ Habilitado |
| **flutter-architecture** | Valida arquitetura Clean | ✅ Habilitado |
| **spell-checker** | Verifica ortografia | ✅ Habilitado |
| **portuguese-documentation** | Detecta docs em PT | ✅ Habilitado |

---

## 🚀 Uso Básico

### Importar Todos os Plugins

```typescript
import { allFlutterPlugins, executeDangerBot } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins);
```

### Importar Plugins Específicos

```typescript
import {
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  executeDangerBot
} from "@diletta/danger-bot";

executeDangerBot([
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
]);
```

---

## ⚙️ Configuração

### Desabilitar Plugin

```typescript
import { flutterAnalyzePlugin } from "@diletta/danger-bot";

// Desabilitar temporariamente
flutterAnalyzePlugin.config.enabled = false;
```

### Habilitar Condicionalmente

```typescript
import { getDanger, spellCheckerPlugin } from "@diletta/danger-bot";

const d = getDanger();
const isMainBranch = d.github?.pr?.base?.ref === "main";

// Spell checker apenas em PRs para main
spellCheckerPlugin.config.enabled = isMainBranch;
```

---

## 🎨 Criar Plugin Personalizado

### Método 1: Via CLI (Recomendado)

```bash
danger-bot create-plugin
```

Siga o wizard interativo!

### Método 2: Manual

```typescript
// src/plugins/flutter/meu-plugin/meu-plugin.ts
import { createPlugin, getDanger, sendMessage, sendWarn } from "@types";

export default createPlugin(
  {
    name: "meu-plugin",
    description: "Minha validação customizada",
    enabled: true,
  },
  async () => {
    const d = getDanger();
    const modifiedFiles = d.git.modified_files;
    
    // Sua lógica aqui
    const hasTests = modifiedFiles.some(f => f.includes("_test.dart"));
    
    if (!hasTests) {
      sendWarn("⚠️ PR sem testes!");
    } else {
      sendMessage("✅ Testes incluídos!");
    }
  }
);
```

---

## ⚠️ Boas Práticas e Armadilhas Comuns

### 🚨 IMPORTANTE: Evite Inline Comments no Bitbucket

**❌ PROBLEMA:** Usar `file` e `line` cria inline comments que geram metadados visíveis no Bitbucket:

```typescript
// ❌ EVITE ISSO:
sendFail("Erro no arquivo", "lib/main.dart", 10);
//                           ^^^^^^^^^^^^^^  ^^
//                           Cria inline comment
```

**Resultado no Bitbucket:**
```
<!-- 1 failure: Erro no arquivo...
DangerID: danger-id-...; File: lib/main.dart; Line: 10; -->
❌ Erro no arquivo
```

O Bitbucket adiciona esse preview automaticamente e **não pode ser desabilitado**.

**✅ SOLUÇÃO: Use Comentários Gerais**

```typescript
// ✅ RECOMENDADO:
sendFail("Erro no arquivo `lib/main.dart` linha 10");
// Ou
sendFail(`## ❌ Erro Encontrado

Problema no arquivo \`lib/main.dart\` (linha 10):
- Descrição do erro
- Como corrigir`);
```

**Resultado no Bitbucket:**
```
1 Warnings
warning - ❌ Erro Encontrado
Problema no arquivo `lib/main.dart` (linha 10)...
```

### 📋 Quando Usar Inline vs Comentário Geral?

| Situação | Usar |
|----------|------|
| **Arquivo não existe** (ex: changelog ausente) | ✅ Comentário geral |
| **Validação de padrão** (ex: naming conventions) | ✅ Comentário geral |
| **PR size, count de arquivos** | ✅ Comentário geral |
| **Erros de lint/analyze** | ⚠️ Comentário geral (evitar metadados) |
| **Qualquer mensagem importante** | ✅ Comentário geral |

**Regra geral:** Sempre prefira comentários gerais. Inline comments devem ser raros ou evitados.

### 💡 Exemplos Práticos

**✅ Arquivo Ausente (Changelog):**
```typescript
if (!hasChangelog) {
  sendFail(`## 📋 Changelog não encontrado
  
Este projeto não possui \`changelog.md\` na raiz.

### Como resolver:
1. Crie o arquivo...`);
  // SEM file/line = comentário geral limpo
}
```

**✅ Validação de Padrão:**
```typescript
if (wrongNaming) {
  sendFail(`## 📁 Naming Convention Incorreto

Arquivo \`${file}\` não segue o padrão snake_case.

**Encontrado:** \`MyFile.dart\`  
**Esperado:** \`my_file.dart\``);
  // Menciona o arquivo na mensagem, mas não cria inline
}
```

**✅ PR Size:**
```typescript
if (tooLarge) {
  sendWarn(`## 🚨 PR Muito Grande

Esta PR altera **${count} arquivos**.  
Recomendação: quebrar em PRs menores.`);
}
```

### 🎯 Checklist de Plugin

- [ ] Usa `sendFail(message)` sem file/line
- [ ] Mensagens são claras e acionáveis
- [ ] Inclui exemplos de como corrigir
- [ ] Menciona arquivos na mensagem (não inline)
- [ ] Testado no Bitbucket/GitHub

---

## 📚 Documentação Completa

Cada plugin tem documentação detalhada:

- [pr-size-checker](../src/plugins/flutter/pr-size-checker/README.md)
- [changelog-checker](../src/plugins/flutter/changelog-checker/README.md)
- [flutter-analyze](../src/plugins/flutter/flutter-analyze/README.md)
- [flutter-architecture](../src/plugins/flutter/flutter-architecture/README.md)
- [spell-checker](../src/plugins/flutter/spell-checker/README.md)
- [portuguese-documentation](../src/plugins/flutter/portuguese-documentation/README.md)

---

## 💡 Exemplos Avançados

Ver: [EXEMPLOS.md](EXEMPLOS.md)

---

<div align="center">

[📚 Docs](.) • [🤖 CLI](CLI.md) • [💡 Exemplos](EXEMPLOS.md)

</div>

