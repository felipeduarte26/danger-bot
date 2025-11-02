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
  allFlutterPlugins,
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

**Parâmetros:**

| Parâmetro   | Tipo                 | Obrigatório | Descrição                           |
| ----------- | -------------------- | ----------- | ----------------------------------- |
| `plugins`   | `DangerPlugin[]`     | ✅ Sim      | Array de plugins a serem executados |
| `callbacks` | `DangerBotCallbacks` | ❌ Não      | Objeto com callbacks opcionais      |

**Callbacks Disponíveis (todos opcionais!):**

| Callback      | Parâmetros     | Retorno   | Quando Executa                                            |
| ------------- | -------------- | --------- | --------------------------------------------------------- |
| `onBeforeRun` | -              | `boolean` | Antes de executar plugins. Retorne `false` para cancelar. |
| `onSuccess`   | -              | `void`    | Após todos os plugins finalizarem com sucesso.            |
| `onError`     | `error: Error` | `void`    | Quando algum plugin lança erro.                           |
| `onFinally`   | -              | `void`    | Sempre no final (sucesso ou erro).                        |

**Exemplo Completo:**

```typescript
import { executeDangerBot, allFlutterPlugins, sendMessage, sendWarn } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins, {
  // ❌ Opcional: Executado ANTES
  onBeforeRun: () => {
    sendMessage("🚀 Iniciando análise...");
    return true; // `false` cancela execução
  },

  // ❌ Opcional: Executado em SUCESSO
  onSuccess: () => {
    sendMessage("✅ Análise concluída!");
  },

  // ❌ Opcional: Executado em ERRO
  onError: (error) => {
    sendWarn(`⚠️ Erro: ${error.message}`);
  },

  // ❌ Opcional: SEMPRE executado no final
  onFinally: () => {
    sendMessage("📊 Relatório gerado");
  },
});

// ✅ Uso mínimo (sem callbacks):
executeDangerBot(allFlutterPlugins);
```

**Retorno:** `Promise<void>`

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

### DangerBotCallbacks

```typescript
interface DangerBotCallbacks {
  // ❌ Opcional: Executado ANTES de rodar plugins
  onBeforeRun?: () => boolean;

  // ❌ Opcional: Executado após SUCESSO de todos os plugins
  onSuccess?: () => void;

  // ❌ Opcional: Executado quando ocorre ERRO
  onError?: (error: Error) => void;

  // ❌ Opcional: SEMPRE executado no final (sucesso ou erro)
  onFinally?: () => void;
}
```

**Nota:** Todos os callbacks são **opcionais**. Use apenas os que precisar!

---
