# 💡 Exemplos Práticos

> Casos de uso reais do Danger Bot

---

## 🎯 Exemplo 1: Setup Básico

```typescript
import { allFlutterPlugins, executeDangerBot } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins);
```

---

## 🎨 Exemplo 2: Com Callbacks

```typescript
import { allFlutterPlugins, executeDangerBot, sendMessage, getDanger } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins, {
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
    
    return true;
  },
  
  onSuccess: () => {
    sendMessage("✅ Análise concluída com sucesso!");
  }
});
```

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

