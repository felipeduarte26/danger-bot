# Bitbucket Pipelines

Guia de configuracao do Danger Bot no Bitbucket Pipelines (Bitbucket Cloud).

---

## Pre-requisitos

- Repositorio no Bitbucket Cloud
- Pipelines habilitado no repositorio
- Repository access token com permissao de PR

---

## Configuracao

### 1. Criar o repository access token

1. Repositorio → **Repository settings** → **Access tokens**
2. **Create Repository Access Token**
3. Permissoes necessarias:
   - Repositories: **Read**
   - Pull requests: **Read**, **Write**
4. Copie o token gerado

> O access token nao e um App password. App password e usado no par `DANGER_BITBUCKETCLOUD_USERNAME`/`DANGER_BITBUCKETCLOUD_PASSWORD`, que tem prioridade sobre o token (veja [Troubleshooting](#troubleshooting)).

### 2. Configurar variaveis de ambiente

No repositorio, va em **Repository settings → Repository variables**:

```text
Nome: DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN
Valor: <access-token>
Secured: Sim

Nome: DANGER_BITBUCKETCLOUD_UUID
Valor: {uuid-do-workspace}
```

O `DANGER_BITBUCKETCLOUD_UUID` e **obrigatorio** com access token. Sem ele o Danger consulta `/2.0/user` para descobrir o proprio usuario, o access token nao tem acesso a esse endpoint e a execucao falha. Basta um UUID entre chaves (o do workspace serve): o Danger acha os proprios comentarios pelo `--id`, nao pelo UUID.

Variaveis opcionais: `GEMINI_API_KEYS` (ai-code-review) e `GOOGLE_CHAT_WEBHOOK` (google-chat-notification).

### 3. Configurar package.json

Se o projeto nao tem `package.json`, crie na raiz:

```json
{
  "name": "meu-projeto-danger",
  "private": true,
  "scripts": {
    "danger:ci": "danger ci"
  },
  "devDependencies": {
    "danger": "^14.0.7",
    "@felipeduarte26/danger-bot": "git+https://github.com/felipeduarte26/danger-bot.git#main",
    "typescript": "^5.9.3"
  }
}
```

O `typescript` e obrigatorio: o Danger nao transpila o `dangerfile.ts` sozinho.

### 4. Criar dangerfile.ts

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins);
```

### 5. Configurar bitbucket-pipelines.yml

A imagem precisa ter Node 25 e Flutter. O exemplo parte da imagem do Flutter e instala o Node com nvm:

```yaml
image: ghcr.io/cirruslabs/flutter:3.47.7

pipelines:
  pull-requests:
    '**':
      - step:
          name: Danger Bot
          clone:
            depth: full # merge-conflict-checker precisa do historico
          script:
            # A chave de pull-requests filtra a ORIGEM; o destino e filtrado aqui
            - if [ "$BITBUCKET_PR_DESTINATION_BRANCH" != "develop" ]; then echo "PR nao aponta para develop"; exit 0; fi
            - curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
            - export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm install 25
            - flutter pub get
            # Apenas se o projeto nao versiona os arquivos gerados
            - dart run build_runner build --delete-conflicting-outputs
            - npm install
            - npx danger ci --id "Danger Bot" --removePreviousComments
```

---

## Configuracao com steps paralelos

```yaml
image: ghcr.io/cirruslabs/flutter:3.47.7

pipelines:
  pull-requests:
    '**':
      - parallel:
          - step:
              name: Danger Bot
              clone:
                depth: full
              script:
                - curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
                - export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm install 25
                - flutter pub get
                - npm install
                - npx danger ci

          - step:
              name: Flutter Tests
              script:
                - flutter pub get
                - flutter analyze
                - flutter test
```

---

## Troubleshooting

### Erro: "(Have you allowed permission 'account' for this credential?)"

Falta o `DANGER_BITBUCKETCLOUD_UUID`. Sem ele o Danger chama `/2.0/user`, que o access token nao acessa. Defina a variavel com um UUID entre chaves.

### Erro: "DANGER_BITBUCKETCLOUD_UUID must be wraped with brackets"

O valor precisa das chaves: `{3babe94d-...}`, nao `3babe94d-...`.

### Erro: o token e ignorado

O Danger escolhe a credencial nesta ordem: OAuth (`DANGER_BITBUCKETCLOUD_OAUTH_KEY`/`SECRET`) → usuario (`DANGER_BITBUCKETCLOUD_USERNAME`/`PASSWORD`) → access token. Se houver `DANGER_BITBUCKETCLOUD_USERNAME` no ambiente, remova-o ou faca `unset` antes do `npx danger ci`.

### Erro: Token nao funciona

1. Verifique se a variavel esta como **Secured**
2. Verifique o nome exato: `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN`
3. Verifique se o token tem Pull requests **Read + Write** e nao expirou
4. Teste o token localmente:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer <token>" \
  https://api.bitbucket.org/2.0/repositories/<workspace>/<repo>/pullrequests/<id>
```

### Erro: ERESOLVE no npm install

O `danger` do `package.json` esta fora da faixa exigida pelo Danger Bot. Use `"danger": "^14.0.7"`.

### Erro: "Cannot use import statement outside a module"

Falta o `typescript` no `package.json`.

### Erro: Pipelines nao executa em PRs

Verifique se o trigger esta correto:

```yaml
pipelines:
  pull-requests:    # <-- deve ser pull-requests, nao branches
    '**':
      - step: ...
```

O Danger so reconhece o PR quando existe `BITBUCKET_PR_ID`, que so aparece em pipelines de `pull-requests`. PRs vindos de fork nao recebem as variaveis Secured.

### Build lento

1. Use cache de `node`:

```yaml
caches:
  - node
```

2. Com `package-lock.json` commitado, use `npm ci` ao inves de `npm install`
3. Use uma versao fixa da imagem (nao `latest`)

---

## Variaveis automaticas

O Bitbucket Pipelines fornece:

| Variavel | Descricao |
|----------|-----------|
| `BITBUCKET_PR_ID` | ID do Pull Request |
| `BITBUCKET_PR_DESTINATION_BRANCH` | Branch de destino do Pull Request |
| `BITBUCKET_BRANCH` | Branch de origem |
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
