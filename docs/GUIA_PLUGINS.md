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

