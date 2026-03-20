# Exemplos

Casos de uso praticos do Danger Bot.

---

## Basico - Todos os plugins

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins);
```

---

## Plugins selecionados

```typescript
import {
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  securityCheckerPlugin,
  executeDangerBot,
} from "@felipeduarte26/danger-bot";

executeDangerBot([
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  securityCheckerPlugin,
]);
```

---

## Por categoria

```typescript
import {
  cleanArchitecturePlugins,
  codeQualityPlugins,
  performancePlugins,
  executeDangerBot,
} from "@felipeduarte26/danger-bot";

executeDangerBot([
  ...cleanArchitecturePlugins,
  ...codeQualityPlugins,
  ...performancePlugins,
]);
```

---

## Com callbacks completos

```typescript
import {
  allFlutterPlugins,
  executeDangerBot,
  sendMessage,
  getDanger,
} from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins, {
  onBeforeRun: () => {
    const d = getDanger();
    const pr = d.github?.pr || d.bitbucket_cloud?.pr || d.gitlab?.mr;
    const platform = d.github ? "GitHub" :
                     d.bitbucket_cloud ? "Bitbucket" :
                     d.gitlab ? "GitLab" : "Desconhecido";

    if (pr) {
      sendMessage(
        `**Analise Automatica**\n\n` +
        `**Plataforma**: ${platform}\n` +
        `**Titulo**: ${pr.title}\n` +
        `**Plugins**: ${allFlutterPlugins.filter(p => p.config.enabled).length}`
      );
    }

    return true;
  },

  onSuccess: () => {
    sendMessage("Analise concluida com sucesso!");
  },

  onError: (error) => {
    console.error("Erro durante analise:", error.message);
  },

  onFinally: () => {
    sendMessage("Pipeline finalizado.");
  },
});
```

---

## Desabilitando plugins especificos

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

const disabled = ["spell-checker", "portuguese-documentation"];

const plugins = allFlutterPlugins.map(p => {
  if (disabled.includes(p.config.name)) {
    p.config.enabled = false;
  }
  return p;
});

executeDangerBot(plugins);
```

---

## Apenas Clean Architecture

```typescript
import {
  cleanArchitecturePlugins,
  prValidationPlugin,
  executeDangerBot,
  sendMessage,
} from "@felipeduarte26/danger-bot";

executeDangerBot([prValidationPlugin, ...cleanArchitecturePlugins], {
  onSuccess: () => sendMessage("Arquitetura validada!"),
});
```

---

## Usando helpers diretamente

```typescript
import {
  allFlutterPlugins,
  executeDangerBot,
  getDanger,
  getDartFiles,
  getLinesChanged,
  sendMessage,
  sendWarn,
  sendMarkdown,
} from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins, {
  onBeforeRun: () => {
    const dartFiles = getDartFiles();
    const lines = getLinesChanged();

    sendMarkdown(`
## Resumo do PR

| Metrica | Valor |
|---------|-------|
| Arquivos Dart | ${dartFiles.length} |
| Linhas alteradas | ${lines} |
    `);

    if (lines > 1000) {
      sendWarn("PR muito grande. Considere dividir em PRs menores.");
    }

    return true;
  },
});
```

---

## Plugin customizado inline

Voce pode criar plugins diretamente no dangerfile sem precisar de arquivos separados:

```typescript
import {
  allFlutterPlugins,
  executeDangerBot,
  createPlugin,
  getDartFiles,
  getFileContent,
  sendWarn,
} from "@felipeduarte26/danger-bot";

const noTodoPlugin = createPlugin(
  {
    name: "no-todo-comments",
    description: "Detecta comentarios TODO no codigo",
    enabled: true,
  },
  async () => {
    const files = getDartFiles();
    for (const file of files) {
      const content = await getFileContent(file);
      if (content?.includes("// TODO")) {
        sendWarn(`TODO encontrado em ${file}. Crie uma issue.`);
      }
    }
  }
);

executeDangerBot([...allFlutterPlugins, noTodoPlugin]);
```

---

## Condicional por branch

```typescript
import {
  allFlutterPlugins,
  codeQualityPlugins,
  executeDangerBot,
  getDanger,
} from "@felipeduarte26/danger-bot";

const d = getDanger();
const targetBranch = d.github?.pr?.base?.ref || d.bitbucket_cloud?.pr?.destination?.branch?.name;

if (targetBranch === "main" || targetBranch === "master") {
  // Analise completa para PRs para main
  executeDangerBot(allFlutterPlugins);
} else {
  // Analise leve para branches de desenvolvimento
  executeDangerBot(codeQualityPlugins);
}
```
