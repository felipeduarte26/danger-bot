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

A forma mais rapida e usar o **dry-run** do Danger Bot CLI:

```bash
npx danger-bot dry-run --base develop
```

Isso simula a execucao completa dos plugins usando o git diff local, sem precisar de tokens, CI ou PR aberto. Voce vera exatamente quais erros e avisos seriam reportados.

Opcoes uteis:

```bash
# Apontar para outro projeto
npx danger-bot dry-run --project /caminho/do/projeto --base main

# Rodar apenas plugins especificos
npx danger-bot dry-run --plugins "model-entity,domain-entities,print-statement"

# Ver detalhes completos
npx danger-bot dry-run --base develop -v

# Incluir plugins que precisam de API/CLI externa
npx danger-bot dry-run --base develop --all
```

Alternativa (requer `danger` instalado e dangerfile configurado):

```bash
npx danger local
```

> Guias de CI/CD: [Pipelines](pipelines/README.md)

---

## Configuracao (danger-bot.yaml)

### O que e o danger-bot.yaml?

Um arquivo opcional de configuracao na raiz do seu projeto. Permite definir plugins locais e arquivos ignorados sem alterar o `dangerfile.ts`.

```bash
npx danger-bot init
```

> Documentacao completa: [Configuracao](CONFIGURACAO.md)

### Como ignorar arquivos especificos?

Adicione ao `danger-bot.yaml`:

```yaml
ignore_files:
  - lib/features/old_module/legacy_page.dart
  - lib/core/deprecated_helper.dart
```

### Posso criar plugins locais no meu projeto?

Sim. Crie plugins `.ts` ou `.js` seguindo o padrao `createPlugin` e aponte no `danger-bot.yaml`:

```yaml
local_plugins:
  - ./danger/plugins/meu-plugin.ts
  - ./danger/plugins/
```

O `executeDangerBot` carrega automaticamente. Veja [Configuracao](CONFIGURACAO.md).

### Meu projeto usa ignore_danger_files.json, como migrar?

Migre os caminhos para o `danger-bot.yaml` em `ignore_files` e remova o `ignore_danger_files.json`. Veja [Migracao](CONFIGURACAO.md#migrando-do-ignore_danger_filesjson).

---

## Plugins

### Quantos plugins existem?

Os plugins do pacote estao organizados em categorias:
- Pull Request (pr-summary, pr-size-checker, pr-validation, changelog-checker, merge-conflict-checker)
- Domain — Clean Architecture (entities, failures, repositories, usecases)
- Data — Clean Architecture (datasources, models)
- Presentation — Clean Architecture (viewmodels, try-catch-checker)
- Qualidade de Codigo (clean-architecture, file-naming, comments, late-final, barrel-files, security, spell-checker, identifier-language, class-naming, avoid-god-class, avoid-setstate-after-async, date-type-checker, print-statement-detector, empty-catch-detector, future-wait-modernizer, ai-code-review)
- Performance e Flutter (flutter-analyze, flutter-performance, flutter-widgets, mediaquery-modern, memory-leak-detector, column-row-spacing)
- Testes (test-file-checker, flutter-test-runner, test-coverage-summary)
- Notificacoes (google-chat-notification)

Use `danger-bot list` para ver a lista atualizada.

### Como criar meu proprio plugin?

**Para o pacote (contribuir):**

```bash
npx danger-bot create-plugin
```

**Para seu projeto (plugin local):**

Crie um arquivo `.ts` seguindo o padrao `createPlugin` e aponte no `danger-bot.yaml`. Veja [Plugins Locais](GUIA_PLUGINS.md#plugins-locais-do-projeto).

Ou crie manualmente. Veja: [Guia de Plugins](GUIA_PLUGINS.md#criando-um-plugin-customizado)

### Os plugins funcionam com projetos nao-Flutter?

Os plugins atuais sao focados em Flutter/Dart. Porem, os helpers de PR (`prSizeCheckerPlugin`, `prValidationPlugin`, `changelogCheckerPlugin`) funcionam com qualquer projeto.

Voce pode criar plugins customizados para qualquer linguagem usando `createPlugin()`.

---

## Suporte

- [Documentacao](.)
- [GitHub Issues](https://github.com/felipeduarte26/danger-bot/issues)
