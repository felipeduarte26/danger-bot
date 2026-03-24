# Inicio Rapido

Comece a usar o Danger Bot em menos de 5 minutos.

---

## TL;DR

```bash
npm install --save-dev danger @felipeduarte26/danger-bot
```

```typescript
// dangerfile.ts
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins);
```

```bash
npx danger ci
```

---

## Passo a Passo

### 1. Instalar dependencias

```bash
npm install --save-dev danger @felipeduarte26/danger-bot
```

Se seu projeto Flutter nao tem `package.json`, crie um primeiro:

```bash
npm init -y
npm install --save-dev danger @felipeduarte26/danger-bot
```

> Para instalacao via Git (sem npm registry), veja [Instalacao](INSTALACAO.md).

### 2. Criar o dangerfile

Crie `dangerfile.ts` na raiz do projeto:

**Opcao A - Todos os plugins:**

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins);
```

**Opcao B - Plugins selecionados:**

```typescript
import {
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  securityCheckerPlugin,
  cleanArchitecturePlugin,
  executeDangerBot,
} from "@felipeduarte26/danger-bot";

executeDangerBot([
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  securityCheckerPlugin,
  cleanArchitecturePlugin,
]);
```

**Opcao C - Por categoria:**

```typescript
import {
  cleanArchitecturePlugins,
  codeQualityPlugins,
  executeDangerBot,
} from "@felipeduarte26/danger-bot";

executeDangerBot([...cleanArchitecturePlugins, ...codeQualityPlugins]);
```

### 3. Configurar scripts no package.json

```json
{
  "scripts": {
    "danger:ci": "danger ci",
    "danger:local": "danger local"
  }
}
```

### 4. Testar localmente

```bash
npx danger local
```

### 5. Configurar no CI/CD

#### GitHub Actions

Crie `.github/workflows/danger.yml`:

```yaml
name: Danger
on: [pull_request]

jobs:
  danger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm ci
      - run: npx danger ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Bitbucket Pipelines

Adicione ao `bitbucket-pipelines.yml`:

```yaml
pipelines:
  pull-requests:
    '**':
      - step:
          name: Danger Bot
          image: node:22
          script:
            - npm ci
            - npx danger ci
```

> Guias completos: [CI/CD](pipelines/README.md) | [Bitrise](pipelines/BITRISE.md) | [Bitbucket](pipelines/BITBUCKET_PIPELINES.md)

---

## Configuracao do projeto (opcional)

Gere um arquivo `danger-bot.yaml` para configurar plugins locais e arquivos ignorados:

```bash
npx danger-bot init
```

Edite o arquivo para adicionar configuracoes:

```yaml
# Plugins locais do seu projeto
local_plugins:
  - ./danger/plugins/

# Arquivos ignorados por todos os plugins
ignore_files:
  - lib/features/old_module/legacy_page.dart
```

O `executeDangerBot` carrega o YAML automaticamente. Nenhuma mudanca no `dangerfile.ts` e necessaria.

> Documentacao completa: [Configuracao](CONFIGURACAO.md)

---

## Personalizacao

### Desabilitar um plugin

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

// Desabilitar o spell-checker
const plugins = allFlutterPlugins.map(p => {
  if (p.config.name === "spell-checker") {
    p.config.enabled = false;
  }
  return p;
});

executeDangerBot(plugins);
```

### Usar callbacks

```typescript
import { allFlutterPlugins, executeDangerBot, sendMessage } from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins, {
  onBeforeRun: () => {
    sendMessage("Iniciando analise...");
    return true;
  },
  onSuccess: () => sendMessage("Analise concluida!"),
  onError: (error) => console.error("Erro:", error.message),
});
```

---

## Problemas comuns

**"Module not found"** - Reinstale as dependencias:

```bash
rm -rf node_modules package-lock.json
npm install
```

**"danger is not defined"** - Instale o Danger como peer dependency:

```bash
npm install --save-dev danger
```

> Mais solucoes: [FAQ](FAQ.md)

---

## Proximos passos

- [Configuracao](CONFIGURACAO.md) - Plugins locais e arquivos ignorados
- [Guia de Plugins](GUIA_PLUGINS.md) - Entenda cada plugin e como configurar
- [API Reference](API.md) - Funcoes e tipos disponiveis
- [Exemplos](EXEMPLOS.md) - Casos de uso praticos
- [CI/CD](pipelines/README.md) - Configure sua pipeline
