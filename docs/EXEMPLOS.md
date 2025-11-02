# 💡 Exemplos Práticos

> Casos de uso reais do Danger Bot

---

## 🎯 Exemplo 1: Setup Básico

```typescript
import { allFlutterPlugins, executeDangerBot } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins);
```

---

## 🎨 Exemplo 2: Com Callbacks (Todos Opcionais!)

> ⚠️ **Importante**: Todos os callbacks são **opcionais**. Use apenas os que precisar!

```typescript
import { 
  allFlutterPlugins, 
  executeDangerBot, 
  sendMessage, 
  sendWarn,
  getDanger 
} from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins, {
  // 1️⃣ Executado ANTES de rodar os plugins
  // Retorne `false` para cancelar a execução
  onBeforeRun: () => {
    const d = getDanger();
    const pr = d.github?.pr || d.bitbucket_cloud?.pr || d.gitlab?.mr;
    
    if (pr) {
      sendMessage(
        `**🤖 Análise Automática**\n\n` +
        `**Título**: ${pr.title}\n` +
        `**Autor**: ${pr.user?.login || pr.author?.display_name}\n` +
        `**Plugins**: ${allFlutterPlugins.length} ativos`
      );
    }
    
    return true; // `true` = continua / `false` = cancela
  },
  
  // 2️⃣ Executado quando TODOS os plugins finalizam COM SUCESSO
  onSuccess: () => {
    sendMessage("✅ Análise concluída com sucesso!");
  },
  
  // 3️⃣ Executado quando algum plugin FALHA ou lança ERRO
  onError: (error) => {
    sendWarn(
      `⚠️ **Erro na análise**\n\n` +
      `${error.message}\n\n` +
      `Por favor, verifique os logs.`
    );
  },
  
  // 4️⃣ Executado SEMPRE no final (sucesso ou erro)
  // Similar ao `finally` do try-catch
  onFinally: () => {
    const d = getDanger();
    const pr = d.github?.pr || d.bitbucket_cloud?.pr || d.gitlab?.mr;
    
    if (pr) {
      sendMessage(
        `📊 **Estatísticas**\n\n` +
        `Plugins executados: ${allFlutterPlugins.length}\n` +
        `Arquivos modificados: ${d.git.modified_files.length}`
      );
    }
  }
});
```

### 📋 Resumo dos Callbacks:

| Callback | Quando executa | Parâmetros | Retorno | Obrigatório |
|----------|----------------|------------|---------|-------------|
| `onBeforeRun` | Antes de rodar plugins | - | `boolean` (continuar?) | ❌ Opcional |
| `onSuccess` | Após sucesso de todos | - | - | ❌ Opcional |
| `onError` | Quando ocorre erro | `error: Error` | - | ❌ Opcional |
| `onFinally` | Sempre no final | - | - | ❌ Opcional |

---

## 🔧 Exemplo 3: Plugins Seletivos

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

## 🎯 Exemplo 4: Desabilitar Plugin

```typescript
import { allFlutterPlugins, spellCheckerPlugin, executeDangerBot } from "@diletta/danger-bot";

// Desabilitar spell checker
spellCheckerPlugin.config.enabled = false;

executeDangerBot(allFlutterPlugins);
```

---

## 🌍 Exemplo 5: Multi-Plataforma

```typescript
import { allFlutterPlugins, executeDangerBot, sendMessage, getDanger } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins, {
  onBeforeRun: () => {
    const d = getDanger();
    const platform = d.github ? 'GitHub' : 
                    d.bitbucket_cloud ? 'Bitbucket' : 
                    d.gitlab ? 'GitLab' : 'Unknown';
    
    sendMessage(`🌍 Plataforma: **${platform}**`);
    return true;
  }
});
```

---

## 🔌 Exemplo 6: Plugin Customizado

```typescript
import { createPlugin, getDanger, sendWarn, sendMessage } from "@types";

export default createPlugin(
  {
    name: "test-coverage",
    description: "Verifica cobertura de testes",
    enabled: true,
  },
  async () => {
    const d = getDanger();
    const modifiedFiles = d.git.modified_files;
    
    const hasCode = modifiedFiles.some(f => 
      f.endsWith(".dart") && !f.includes("_test.dart")
    );
    
    const hasTests = modifiedFiles.some(f => 
      f.includes("_test.dart")
    );
    
    if (hasCode && !hasTests) {
      sendWarn("⚠️ **Código sem testes**\n\nConsidere adicionar testes!");
    } else if (hasTests) {
      sendMessage("✅ Testes incluídos no PR");
    }
  }
);
```

---

<div align="center">

[📚 Docs](.) • [🔌 Plugins](GUIA_PLUGINS.md) • [🤖 CLI](CLI.md)

</div>

