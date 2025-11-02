# 🔧 API Reference

> Referência completa da API do Danger Bot

---

## 📦 Exports Principais

```typescript
// Helpers
export { getDanger, sendMessage, sendWarn, sendFail, sendMarkdown, scheduleTask };

// Types
export { DangerPlugin, DangerPluginConfig, DangerBotCallbacks };

// Functions
export { createPlugin, runPlugins, executeDangerBot };

// Plugins (Flutter)
export {
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  flutterArchitecturePlugin,
  spellCheckerPlugin,
  portugueseDocumentationPlugin,
  allFlutterPlugins
};
```

---

## 🎯 Helpers

### getDanger()

Retorna o objeto `danger` com acesso a dados do PR/MR.

```typescript
import { getDanger } from "@diletta/danger-bot";

const d = getDanger();
const pr = d.github?.pr || d.bitbucket_cloud?.pr || d.gitlab?.mr;
const modifiedFiles = d.git.modified_files;
```

### sendMessage(message, file?, line?)

Envia mensagem informativa no PR.

```typescript
import { sendMessage } from "@diletta/danger-bot";

sendMessage("✅ Tudo certo!");
sendMessage("Arquivo modificado", "lib/main.dart", 42);
```

### sendWarn(warning, file?, line?)

Envia aviso (não falha o build).

```typescript
import { sendWarn } from "@diletta/danger-bot";

sendWarn("⚠️ PR muito grande");
sendWarn("Refatore esta função", "lib/utils.dart", 100);
```

### sendFail(error, file?, line?)

Envia erro (falha o build).

```typescript
import { sendFail } from "@diletta/danger-bot";

sendFail("❌ Testes falhando");
sendFail("Código não compila", "lib/broken.dart", 50);
```

---

## 🔌 Plugin API

### createPlugin(config, runFn)

Cria um novo plugin.

```typescript
import { createPlugin, getDanger, sendMessage } from "@types";

export default createPlugin(
  {
    name: "meu-plugin",
    description: "Descrição",
    enabled: true,
  },
  async () => {
    // Lógica do plugin
  }
);
```

### executeDangerBot(plugins, callbacks?)

Executa plugins com callbacks opcionais.

```typescript
import { executeDangerBot, allFlutterPlugins } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins, {
  onBeforeRun: () => true,
  onSuccess: () => console.log("✅"),
  onError: (error) => console.error(error),
  onFinally: () => console.log("Done")
});
```

---

## 📚 Types

### DangerPluginConfig

```typescript
interface DangerPluginConfig {
  name: string;
  description: string;
  enabled: boolean;
}
```

### DangerPlugin

```typescript
interface DangerPlugin {
  config: DangerPluginConfig;
  run(): Promise<void>;
}
```

---

<div align="center">

[📚 Docs](.) • [🔌 Plugins](GUIA_PLUGINS.md) • [💡 Exemplos](EXEMPLOS.md)

</div>

