# CI/CD

Guias de configuracao do Danger Bot em diferentes plataformas de CI/CD.

---

## Plataformas

| Plataforma | Guia | Dificuldade | Tempo |
|------------|------|-------------|-------|
| **GitHub Actions** | Abaixo | Facil | ~10 min |
| **GitLab CI** | Abaixo | Facil | ~10 min |
| **Bitbucket Pipelines** | [BITBUCKET_PIPELINES.md](./BITBUCKET_PIPELINES.md) | Facil | ~10 min |
| **Bitrise** | [BITRISE.md](./BITRISE.md) | Media | ~15 min |
| **CircleCI** | Abaixo | Media | ~15 min |

---

## Requisitos gerais

1. **Node.js 25.2.1+** (o `engines` do pacote).
2. **Flutter** na mesma maquina, para `flutter-analyze`, `flutter-test-runner` e `test-coverage-summary`. Sem Flutter, desligue esses plugins no `dangerfile.ts`: o `flutter-analyze` publicaria "Nenhum problema encontrado" sem analisar nada.
3. **Codigo gerado:** se o projeto nao versiona `*.g.dart`/`*.freezed.dart`, rode `flutter pub get` e `dart run build_runner build --delete-conflicting-outputs` antes do Danger. Sem isso os testes nao compilam e o `flutter-test-runner` reprova o PR.
4. **Historico completo do git** (clone sem `depth`): o `merge-conflict-checker` compara com `origin/<destino>`.
5. **Access token** do git provider, com permissao de comentar em PRs.
6. **`dangerfile.ts`** na raiz e um **`package.json`** com:

```json
{
  "private": true,
  "devDependencies": {
    "danger": "^14.0.7",
    "@felipeduarte26/danger-bot": "git+https://github.com/felipeduarte26/danger-bot.git#main",
    "typescript": "^5.9.3"
  }
}
```

- O `danger` precisa estar na faixa do `peerDependencies` do Danger Bot; fora dela o `npm install` falha com `ERESOLVE`.
- O `typescript` e obrigatorio: o Danger nao traz transpilador e, sem ele, o `dangerfile.ts` quebra no `import`.
- Sem `package-lock.json` commitado, use `npm install` (o `npm ci` exige o lock).

---

## Tokens

### GitHub

Variavel: `GITHUB_TOKEN` (automatico no GitHub Actions) ou `DANGER_GITHUB_API_TOKEN` (PAT, para comentar como outro usuario).

No GitHub Actions, de ao job as permissoes `pull-requests: write` e `statuses: write`.

### GitLab

Variavel: `DANGER_GITLAB_API_TOKEN` (project ou personal access token).

1. Projeto → Settings → Access Tokens (ou User Settings → Access Tokens)
2. Scope: `api`
3. Em Settings → CI/CD → Variables, marque **Masked** e **nao** marque **Protected**: variavel protegida nao chega a merge request de branch nao protegida.

O `CI_JOB_TOKEN` nao tem permissao para comentar.

### Bitbucket Cloud

Variaveis: `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN` **e** `DANGER_BITBUCKETCLOUD_UUID`. Detalhes em [BITBUCKET_PIPELINES.md](./BITBUCKET_PIPELINES.md).

---

## GitHub Actions

Crie `.github/workflows/danger.yml`:

```yaml
name: Danger Bot

on:
  pull_request:
    branches: [develop] # branch de destino

permissions:
  contents: read
  pull-requests: write
  statuses: write

jobs:
  danger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: ${{ github.event.pull_request.head.sha }}

      - uses: subosito/flutter-action@v2
        with:
          flutter-version: 3.47.7

      - run: flutter pub get

      # Apenas se o projeto nao versiona os arquivos gerados
      - run: dart run build_runner build --delete-conflicting-outputs

      - uses: actions/setup-node@v4
        with:
          node-version: "25"

      - run: npm install

      - run: npx danger ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GEMINI_API_KEYS: ${{ secrets.GEMINI_API_KEYS }}
          GOOGLE_CHAT_WEBHOOK: ${{ secrets.GOOGLE_CHAT_WEBHOOK }}
```

Observacoes:

- O `ref` faz o checkout do codigo da PR; o padrao do `pull_request` e o merge commit, e os plugins leem do disco o conteudo dos arquivos.
- Os comentarios saem como `github-actions[bot]`.
- **PR de fork:** o `GITHUB_TOKEN` e somente leitura e o Danger nao consegue comentar. O `pull_request_target` resolve, mas executa codigo da PR com acesso aos secrets: use so em repositorio interno.
- **merge-conflict-checker:** com conflito o GitHub nao dispara o evento `pull_request`, entao o plugin nao roda nesse caso.

---

## GitLab CI

Adicione ao `.gitlab-ci.yml`:

```yaml
danger:
  image: ghcr.io/cirruslabs/flutter:3.47.7
  stage: test
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event" && $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "develop"
  variables:
    GIT_DEPTH: 0
  script:
    - curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    - export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm install 25
    - flutter pub get
    # Apenas se o projeto nao versiona os arquivos gerados
    - dart run build_runner build --delete-conflicting-outputs
    - npm install
    - npx danger ci
```

Observacoes:

- O Danger so reconhece o merge request em **pipelines de merge request** (`CI_MERGE_REQUEST_IID`); pipelines de branch nao funcionam.
- `GIT_DEPTH: 0` desliga o clone raso padrao do runner.
- GitLab self-hosted funciona sem configuracao extra: o host vem de `CI_API_V4_URL`. Para forcar outro, use `DANGER_GITLAB_HOST`.
- `DANGER_GITLAB_USE_THREADS=true` publica os comentarios como threads.
- **Limitacao atual:** o titulo e a descricao do merge request ainda nao sao lidos no GitLab. O `pr-validation` reprova todo MR com "DESCRICAO DO PR MUITO CURTA" e o `google-chat-notification` sai sem link. Desligue o `pr-validation` no `dangerfile.ts` enquanto isso:

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

const plugins = allFlutterPlugins.map((p) => {
  if (p.config.name === "pr-validation") p.config.enabled = false;
  return p;
});

executeDangerBot(plugins);
```

---

## CircleCI

Adicione ao `.circleci/config.yml`. A imagem precisa ter Node 25 e Flutter; o exemplo parte da imagem do Flutter e instala o Node com nvm:

```yaml
version: 2.1

jobs:
  danger:
    docker:
      - image: ghcr.io/cirruslabs/flutter:3.47.7
    steps:
      - checkout
      - run:
          name: Danger Bot
          command: |
            curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
            export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm install 25
            flutter pub get
            npm install
            npx danger ci

workflows:
  pr-check:
    jobs:
      - danger:
          filters:
            branches:
              ignore: main
```

Configure o token da plataforma (`DANGER_GITHUB_API_TOKEN`, por exemplo) nas variaveis de ambiente do projeto.

---

## dangerfile.ts universal

Este exemplo funciona em todas as plataformas:

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
        `**Danger Bot**\n\n` +
        `**Plataforma**: ${platform}\n` +
        `**Plugins**: ${allFlutterPlugins.filter(p => p.config.enabled).length}`
      );
    }
    return true;
  },
  onSuccess: () => sendMessage("Analise concluida!"),
});
```

---

## Otimizacoes

### Cache

```yaml
# GitHub Actions (setup-node so faz cache com package-lock.json commitado)
- uses: actions/setup-node@v4
  with:
    node-version: "25"
    cache: "npm"

# Bitbucket Pipelines
caches:
  - node

# GitLab CI
cache:
  paths:
    - node_modules/
```

### Executar apenas em PRs

```yaml
# GitHub Actions (branches = destino)
on:
  pull_request:
    branches: [develop]

# Bitbucket Pipelines (a chave e a ORIGEM; filtre o destino no script)
pipelines:
  pull-requests:
    '**':
      - step: ...

# GitLab CI
rules:
  - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

---

## Troubleshooting

### ERESOLVE no npm install

O `danger` do `package.json` esta fora da faixa exigida pelo Danger Bot. Use `"danger": "^14.0.7"`.

### "Cannot use import statement outside a module"

Falta o `typescript` no `package.json`: o Danger nao transpila o `dangerfile.ts` sozinho.

### Token nao funciona

1. Verifique se o token tem permissao de escrita em PRs
2. Verifique se a variavel chega ao job (GitLab: nao marque como Protected; GitHub: permissoes do job)
3. Verifique se o token nao expirou
4. Verifique o nome exato da variavel

### dangerfile.ts not found

```bash
ls -la dangerfile.ts
```

Verifique se o arquivo esta commitado e nao esta no `.gitignore`.

### "Unable to post comment"

Causas comuns:
- Token sem permissoes de write
- Token expirado
- Repositorio incorreto na configuracao

### flutter-analyze diz "Nenhum problema" sem analisar

O Flutter nao esta no PATH do job. Use uma imagem com Flutter ou desligue o plugin.

### Build lento

1. Habilite cache de `node_modules`
2. Use versao especifica do danger-bot (tag)
3. Com `package-lock.json` commitado, use `npm ci`

---

## Comparacao

| Recurso | GitHub Actions | Bitbucket Pipelines | GitLab CI | Bitrise |
|---------|---------------|-------------------|-----------|---------|
| Setup | Facil | Facil | Facil | Media |
| Cache | Sim | Sim | Sim | Sim |
| Gratuito | Ilimitado (publico) | 50 min/mes | 400 min/mes | Limitado |
| Mobile | Bom | OK | Bom | Excelente |
