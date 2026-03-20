# Bitbucket Pipelines

Guia de configuracao do Danger Bot no Bitbucket Pipelines.

---

## Pre-requisitos

- Repositorio no Bitbucket Cloud
- Pipelines habilitado no repositorio
- App password com permissoes de PR

---

## Configuracao

### 1. Criar App Password

1. Bitbucket → **Personal Settings** → **App passwords**
2. **Create app password**
3. Permissoes necessarias:
   - Repositories: **Read**, **Write**
   - Pull requests: **Read**, **Write**
4. Copie o token gerado

### 2. Configurar variavel de ambiente

No repositorio, va em **Repository Settings → Repository variables**:

```
Nome: DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN
Valor: <seu-app-password>
Secured: Sim
```

### 3. Configurar package.json

Se o projeto nao tem `package.json`:

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

### 4. Criar dangerfile.ts

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins);
```

### 5. Configurar bitbucket-pipelines.yml

```yaml
image: node:22

pipelines:
  pull-requests:
    '**':
      - step:
          name: Danger Bot
          caches:
            - node
          script:
            - npm ci
            - npx danger ci
```

---

## Configuracao completa

### Com projeto Flutter

```yaml
image: ghcr.io/cirruslabs/flutter:latest

definitions:
  caches:
    node-cache: node_modules

pipelines:
  pull-requests:
    '**':
      - step:
          name: Danger Bot
          image: node:22
          caches:
            - node-cache
          script:
            - npm ci
            - npx danger ci

      - step:
          name: Flutter Tests
          script:
            - flutter pub get
            - flutter analyze
            - flutter test
```

### Com steps paralelos

```yaml
pipelines:
  pull-requests:
    '**':
      - parallel:
          - step:
              name: Danger Bot
              image: node:22
              caches:
                - node
              script:
                - npm ci
                - npx danger ci

          - step:
              name: Flutter Analyze
              script:
                - flutter pub get
                - flutter analyze
```

---

## Troubleshooting

### Erro: Token nao funciona

1. Verifique se a variavel esta como **Secured**
2. Verifique o nome exato: `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN`
3. Verifique se o App Password tem permissoes de PR (Read + Write)
4. Teste o token localmente:

```bash
export DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN=<token>
npx danger ci
```

### Erro: "Cannot find module"

```bash
# Verifique se npm ci esta antes de danger ci
npm ci
npx danger ci
```

### Erro: Pipelines nao executa em PRs

Verifique se o trigger esta correto:

```yaml
pipelines:
  pull-requests:    # <-- deve ser pull-requests, nao branches
    '**':
      - step: ...
```

### Build lento

1. Use cache de `node`:

```yaml
caches:
  - node
```

2. Use `npm ci` ao inves de `npm install`
3. Use imagem `node:22` especifica (nao `latest`)

---

## Variaveis automaticas

O Bitbucket Pipelines fornece:

| Variavel | Descricao |
|----------|-----------|
| `BITBUCKET_PR_ID` | ID do Pull Request |
| `BITBUCKET_BRANCH` | Branch atual |
| `BITBUCKET_REPO_SLUG` | Nome do repositorio |
| `BITBUCKET_WORKSPACE` | Workspace do Bitbucket |
| `BITBUCKET_COMMIT` | Hash do commit |

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
    const pr = d.bitbucket_cloud?.pr;
    if (pr) {
      sendMessage(
        `**Danger Bot**\n\n` +
        `**PR**: ${pr.title}\n` +
        `**Autor**: ${pr.author?.display_name}\n` +
        `**Destino**: ${pr.destination?.branch?.name}`
      );
    }
    return true;
  },
  onSuccess: () => sendMessage("Analise concluida!"),
});
```
