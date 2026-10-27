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
  testPlugins,
  executeDangerBot,
} from "@felipeduarte26/danger-bot";

executeDangerBot([
  ...cleanArchitecturePlugins,
  ...codeQualityPlugins,
  ...performancePlugins,
  ...testPlugins,
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

const disabled = ["spell-checker", "comments-checker"];

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
  DartFile,
  getLineStats,
  sendWarn,
  sendMarkdown,
} from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins, {
  onBeforeRun: async () => {
    const dartFiles = DartFile.changed(); // .dart do PR, sem testes e sem gerados
    // git.insertions/deletions só existem no dry-run: no CI as linhas vêm do diff
    const { added, removed } = await getLineStats();
    const lines = added + removed;

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
  DartFile,
  DartCommentDirective,
  sendFormattedWarn,
} from "@felipeduarte26/danger-bot";

const noTodoPlugin = createPlugin(
  {
    name: "no-todo-comments",
    description: "Detecta comentarios TODO no codigo",
    enabled: true,
  },
  async () => {
    for (const file of DartFile.changed()) {
      // comentarios de verdade: um "// TODO" dentro de uma string nao conta
      for (const comment of file.comments) {
        if (comment.directive !== DartCommentDirective.Todo) continue;

        sendFormattedWarn({
          title: "TODO NO CODIGO",
          description: "Pendencia deixada no codigo: registre numa issue para nao se perder.",
          problem: {
            wrong: comment.lineText,
            correct: "// (pendencia registrada na issue e comentario removido)",
          },
          action: {
            text: "Crie uma issue com a pendencia e remova o comentario.",
            code: "// (comentario removido)",
          },
          objective: "Pendencias rastreadas no backlog, nao escondidas no codigo.",
          file: file.path.path,
          line: comment.line,
        });
      }
    }
  }
);

executeDangerBot([...allFlutterPlugins, noTodoPlugin]);
```

---

## Com plugins locais (danger-bot.yaml)

Crie plugins locais no seu projeto sem alterar o pacote:

**danger-bot.yaml:**

```yaml
local_plugins:
  - ./danger/plugins/

ignore_files:
  - lib/features/old_module/legacy_page.dart
```

**danger/plugins/todo-checker.ts:**

```typescript
import { createPlugin, DartFile, DartCommentDirective, sendWarn } from "@felipeduarte26/danger-bot";

export default createPlugin(
  {
    name: "todo-checker",
    description: "Detecta comentarios TODO no codigo",
    enabled: true,
  },
  async () => {
    // .dart do PR (sem testes e sem gerados), ja analisados pelo modelo Dart
    for (const file of DartFile.changed()) {
      for (const comment of file.comments) {
        if (comment.directive !== DartCommentDirective.Todo) continue;
        sendWarn(`TODO encontrado: ${comment.lineText}`, file.path.path, comment.line);
      }
    }
  },
);
```

**dangerfile.ts:**

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

// Plugins locais sao carregados automaticamente do danger-bot.yaml
executeDangerBot(allFlutterPlugins);
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
