# CI/CD

Guias de configuracao do Danger Bot em diferentes plataformas de CI/CD.

---

## Plataformas

| Plataforma | Guia | Dificuldade | Tempo |
|------------|------|-------------|-------|
| **GitHub Actions** | Abaixo | Facil | ~10 min |
| **Bitbucket Pipelines** | [BITBUCKET_PIPELINES.md](./BITBUCKET_PIPELINES.md) | Facil | ~10 min |
| **Bitrise** | [BITRISE.md](./BITRISE.md) | Media | ~15 min |
| **GitLab CI** | Abaixo | Facil | ~10 min |
| **CircleCI** | Abaixo | Media | ~15 min |

---

## Requisitos gerais

1. **Node.js 22+** instalado no CI
2. **Access Token** do git provider (para comentar em PRs)
3. **dangerfile.ts** commitado no repositorio
4. **Variavel de ambiente** com o token configurada

---

## Tokens

### GitHub

Variavel: `GITHUB_TOKEN` ou `DANGER_GITHUB_API_TOKEN`

Permissoes: `repo` (Full control)

O `GITHUB_TOKEN` e fornecido automaticamente pelo GitHub Actions.

### Bitbucket Cloud

Variavel: `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN`

Como criar:
1. Bitbucket → Personal Settings → App passwords
2. Create app password
3. Permissoes: Repositories (Read, Write) + Pull requests (Read, Write)

### GitLab

Variavel: `DANGER_GITLAB_API_TOKEN`

Como criar:
1. GitLab → User Settings → Access Tokens
2. Scopes: `api`, `write_repository`

---

## GitHub Actions

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

### Com cache

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
          cache: "npm"
      - run: npm ci
      - run: npx danger ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## GitLab CI

Adicione ao `.gitlab-ci.yml`:

```yaml
danger:
  image: node:22
  stage: test
  only:
    - merge_requests
  script:
    - npm ci
    - npx danger ci
  variables:
    DANGER_GITLAB_API_TOKEN: $DANGER_GITLAB_API_TOKEN
  cache:
    paths:
      - node_modules/
```

---

## CircleCI

Adicione ao `.circleci/config.yml`:

```yaml
version: 2.1

jobs:
  danger:
    docker:
      - image: cimg/node:22.0
    steps:
      - checkout
      - restore_cache:
          keys:
            - npm-deps-{{ checksum "package-lock.json" }}
      - run: npm ci
      - save_cache:
          paths:
            - node_modules
          key: npm-deps-{{ checksum "package-lock.json" }}
      - run: npx danger ci

workflows:
  pr-check:
    jobs:
      - danger:
          filters:
            branches:
              ignore: main
```

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

### Cache de node_modules

```yaml
# GitHub Actions
- uses: actions/setup-node@v4
  with:
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
# GitHub Actions
on: [pull_request]

# Bitbucket Pipelines
pipelines:
  pull-requests:
    '**':
      - step: ...

# GitLab CI
only:
  - merge_requests
```

---

## Troubleshooting

### Token nao funciona

1. Verifique se o token tem permissoes de escrita em PRs
2. Verifique se a variavel esta configurada no CI
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

### Build lento

1. Habilite cache de `node_modules`
2. Use versao especifica do danger-bot (tag)
3. Use `npm ci` ao inves de `npm install`

---

## Comparacao

| Recurso | GitHub Actions | Bitbucket Pipelines | GitLab CI | Bitrise |
|---------|---------------|-------------------|-----------|---------|
| Setup | Facil | Facil | Facil | Media |
| Cache | Sim | Sim | Sim | Sim |
| Gratuito | Ilimitado (publico) | 50 min/mes | 400 min/mes | Limitado |
| Mobile | Bom | OK | Bom | Excelente |
