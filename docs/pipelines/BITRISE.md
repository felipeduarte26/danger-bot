# Bitrise

Guia de configuracao do Danger Bot no Bitrise.

---

## Pre-requisitos

- Projeto configurado no Bitrise
- Node.js disponivel (via step ou imagem)
- Token do git provider configurado

---

## Configuracao

### 1. Configurar variaveis de ambiente

No Bitrise, va em **Workflow Editor → Secrets**:

**Para Bitbucket Cloud:**

```
DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN = <seu-token>
```

**Para GitHub:**

```
DANGER_GITHUB_API_TOKEN = <seu-token>
```

### 2. Configurar package.json

Se o projeto nao tem `package.json`, crie na raiz:

```json
{
  "name": "meu-projeto-danger",
  "private": true,
  "scripts": {
    "danger:ci": "danger ci"
  },
  "devDependencies": {
    "danger": "^13.0.7",
    "@felipeduarte26/danger-bot": "git+https://github.com/felipeduarte26/danger-bot.git#main"
  }
}
```

### 3. Criar dangerfile.ts

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins);
```

### 4. Adicionar steps no workflow

Adicione ao `bitrise.yml` (apos o step de checkout):

```yaml
- script@1:
    title: Install Node.js dependencies
    inputs:
      - content: |
          npm ci

- script@1:
    title: Run Danger Bot
    inputs:
      - content: |
          npx danger ci
```

---

## Workflow completo

```yaml
format_version: "13"
default_step_lib_source: https://github.com/bitrise-io/bitrise-steplib.git

workflows:
  primary:
    steps:
      - activate-ssh-key@4: {}
      - git-clone@8: {}

      - nvm@1:
          inputs:
            - node_version: "22"

      - script@1:
          title: Install dependencies
          inputs:
            - content: npm ci

      - script@1:
          title: Run Danger Bot
          inputs:
            - content: npx danger ci

      # ... outros steps do seu workflow (flutter build, tests, etc.)
```

---

## Com cache

```yaml
- cache-pull@2: {}

- nvm@1:
    inputs:
      - node_version: "22"

- script@1:
    title: Install dependencies
    inputs:
      - content: npm ci

- script@1:
    title: Run Danger Bot
    inputs:
      - content: npx danger ci

- cache-push@2:
    inputs:
      - cache_paths: node_modules
```

---

## Executar apenas em PRs

No Bitrise, configure o trigger:

```yaml
trigger_map:
  - pull_request_source_branch: "*"
    workflow: primary
```

Ou verifique no script:

```yaml
- script@1:
    title: Run Danger Bot
    inputs:
      - content: |
          if [ -n "$BITRISE_PULL_REQUEST" ]; then
            npx danger ci
          else
            echo "Nao e um PR, pulando Danger Bot"
          fi
```

---

## Troubleshooting

### Erro: "Module '@felipeduarte26/danger-bot' not found"

Verifique se o `npm ci` esta sendo executado antes do `npx danger ci`.

Se estiver instalando via Git, verifique se o Bitrise tem acesso ao repositorio:

```bash
# Testar acesso
git ls-remote https://github.com/felipeduarte26/danger-bot.git
```

### Erro: Token nao funciona

1. Verifique se a variavel esta em **Secrets** (nao em Env Vars)
2. Verifique o nome exato: `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN`
3. Verifique as permissoes do token

### Node.js nao encontrado

Adicione o step `nvm` antes do `npm ci`:

```yaml
- nvm@1:
    inputs:
      - node_version: "22"
```

### Build muito lento

1. Use `cache-pull` e `cache-push` para `node_modules`
2. Use `npm ci` ao inves de `npm install`
3. Use versao fixa do danger-bot (tag ao inves de `#main`)

---

## Variaveis de ambiente disponiveis

O Bitrise fornece automaticamente:

| Variavel | Descricao |
|----------|-----------|
| `BITRISE_PULL_REQUEST` | Numero do PR (vazio se nao for PR) |
| `BITRISE_GIT_BRANCH` | Branch atual |
| `BITRISE_GIT_TAG` | Tag (se houver) |
| `BITRISE_SOURCE_DIR` | Diretorio do projeto |

---

## Exemplo com dangerfile completo

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
    const pr = d.bitbucket_cloud?.pr || d.github?.pr;
    if (pr) {
      sendMessage(`Analisando: ${pr.title}`);
    }
    return true;
  },
  onSuccess: () => sendMessage("Analise concluida!"),
});
```
