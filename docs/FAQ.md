# FAQ

Perguntas frequentes sobre o Danger Bot.

---

## Instalacao

### Como instalar?

```bash
npm install --save-dev danger @felipeduarte26/danger-bot
```

> Guia completo: [Instalacao](INSTALACAO.md)

### Meu projeto Flutter nao tem package.json

Crie um na raiz do projeto:

```bash
npm init -y
npm install --save-dev danger @felipeduarte26/danger-bot
```

### Posso instalar via Git?

Sim:

```bash
npm install --save-dev danger @felipeduarte26/danger-bot@git+https://github.com/felipeduarte26/danger-bot.git#main
```

---

## Uso

### Como usar apenas alguns plugins?

Importe os plugins que deseja:

```typescript
import {
  prSizeCheckerPlugin,
  securityCheckerPlugin,
  executeDangerBot,
} from "@felipeduarte26/danger-bot";

executeDangerBot([prSizeCheckerPlugin, securityCheckerPlugin]);
```

### Como desabilitar um plugin?

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

const plugins = allFlutterPlugins.map(p => {
  if (p.config.name === "spell-checker") {
    p.config.enabled = false;
  }
  return p;
});

executeDangerBot(plugins);
```

### Como usar helpers no meu dangerfile?

```typescript
import { getDanger, sendMessage, getDartFiles } from "@felipeduarte26/danger-bot";

const d = getDanger();
const files = getDartFiles();
sendMessage(`${files.length} arquivos Dart modificados`);
```

### Funciona com GitHub, Bitbucket e GitLab?

Sim. O Danger Bot funciona com todas as plataformas suportadas pelo Danger JS:
- GitHub
- Bitbucket Cloud
- Bitbucket Server
- GitLab

Os helpers como `getDanger()`, `getPRTitle()` e `getPRDescription()` detectam a plataforma automaticamente.

---

## Erros comuns

### "Cannot find module '@felipeduarte26/danger-bot'"

```bash
rm -rf node_modules package-lock.json
npm install
```

### "danger is not defined"

O Danger JS precisa estar instalado:

```bash
npm install --save-dev danger
```

### "Module '@felipeduarte26/danger-bot' not found" no CI

Verifique se o `npm install` esta sendo executado antes do `npx danger ci` na pipeline.

### Patches nao foram aplicados

```bash
rm -f node_modules/danger/.danger-bot-patched
npm rebuild @felipeduarte26/danger-bot
```

### Plugin nao esta executando

Verifique se o plugin esta habilitado:

```typescript
console.log(meuPlugin.config.enabled); // deve ser true
```

### Erro de tipo no TypeScript

O Danger Bot requer TypeScript 5.9+. Verifique sua versao:

```bash
npx tsc --version
```

---

## CI/CD

### Qual token preciso configurar?

| Plataforma | Variavel de ambiente |
|------------|---------------------|
| GitHub | `GITHUB_TOKEN` ou `DANGER_GITHUB_API_TOKEN` |
| Bitbucket Cloud | `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN` |
| GitLab | `DANGER_GITLAB_API_TOKEN` |

### O Danger nao consegue postar comentarios

Verifique:
1. O token tem permissoes de escrita em PRs
2. A variavel de ambiente esta configurada no CI
3. O token nao expirou

### Como testar localmente?

```bash
npx danger local
```

> Guias de CI/CD: [Pipelines](pipelines/README.md)

---

## Plugins

### Quantos plugins existem?

28 plugins organizados em categorias:
- 4 de Pull Request
- 4 de Domain (Clean Architecture)
- 3 de Data (Clean Architecture)
- 2 de Presentation (Clean Architecture)
- 9 de Qualidade de Codigo
- 5 de Performance e Flutter
- 1 de Documentacao

### Como criar meu proprio plugin?

Use a CLI:

```bash
npx danger-bot create-plugin
```

Ou crie manualmente. Veja: [Guia de Plugins](GUIA_PLUGINS.md#criando-um-plugin-customizado)

### Os plugins funcionam com projetos nao-Flutter?

Os plugins atuais sao focados em Flutter/Dart. Porem, os helpers de PR (`prSizeCheckerPlugin`, `prValidationPlugin`, `changelogCheckerPlugin`) funcionam com qualquer projeto.

Voce pode criar plugins customizados para qualquer linguagem usando `createPlugin()`.

---

## Suporte

- [Documentacao](.)
- [GitHub Issues](https://github.com/felipeduarte26/danger-bot/issues)
