# Instalacao

Guia completo de instalacao do Danger Bot.

---

## Via npm (recomendado)

```bash
npm install --save-dev danger @felipeduarte26/danger-bot
```

## Via Git (direto do repositorio)

Util quando o pacote nao esta publicado no npm registry:

```bash
npm install --save-dev danger @felipeduarte26/danger-bot@git+https://github.com/felipeduarte26/danger-bot.git#main
```

No `package.json`, ficara assim:

```json
{
  "devDependencies": {
    "danger": "^13.0.7",
    "@felipeduarte26/danger-bot": "git+https://github.com/felipeduarte26/danger-bot.git#main"
  }
}
```

### Versao especifica via tag

```json
{
  "devDependencies": {
    "@felipeduarte26/danger-bot": "git+https://github.com/felipeduarte26/danger-bot.git#v1.8.0"
  }
}
```

### Via SSH

```json
{
  "devDependencies": {
    "@felipeduarte26/danger-bot": "git+ssh://git@github.com/felipeduarte26/danger-bot.git#v1.8.0"
  }
}
```

---

## Projetos Flutter sem package.json

Projetos Flutter normalmente nao tem `package.json`. Crie um na raiz:

```bash
npm init -y
npm install --save-dev danger @felipeduarte26/danger-bot
```

Adicione ao `.gitignore`:

```
node_modules/
package-lock.json
```

## Configuracao do dangerfile

Apos instalar, crie `dangerfile.ts` na raiz do projeto:

### Uso basico

```typescript
import { allFlutterPlugins, executeDangerBot } from "@felipeduarte26/danger-bot";

executeDangerBot(allFlutterPlugins);
```

### Plugins selecionados

```typescript
import {
  prValidationPlugin,
  cleanArchitecturePlugin,
  securityCheckerPlugin,
  executeDangerBot,
} from "@felipeduarte26/danger-bot";

executeDangerBot([prValidationPlugin, cleanArchitecturePlugin, securityCheckerPlugin]);
```

### Com callbacks

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
    if (pr) {
      sendMessage(`Analisando PR: ${pr.title}`);
    }
    return true;
  },
  onSuccess: () => sendMessage("Analise concluida!"),
});
```

---

## Verificar instalacao

```bash
# Verificar se esta instalado
npm list danger @felipeduarte26/danger-bot

# Saida esperada
# ├── danger@13.x.x
# └── @felipeduarte26/danger-bot@1.8.0

# Testar localmente
npx danger local
```

---

## Atualizacao

### Via npm

```bash
npm update @felipeduarte26/danger-bot
```

### Via Git

```bash
npm install @felipeduarte26/danger-bot@git+https://github.com/felipeduarte26/danger-bot.git#main
```

---

## Desinstalacao

```bash
npm uninstall @felipeduarte26/danger-bot
```

---

## Troubleshooting

### Erro: "Cannot find module '@felipeduarte26/danger-bot'"

```bash
rm -rf node_modules package-lock.json
npm install
```

### Erro: "danger is not defined"

O Danger JS precisa estar instalado como peer dependency:

```bash
npm install --save-dev danger
```

### Patches nao foram aplicados

Force a reaplicacao:

```bash
rm -f node_modules/danger/.danger-bot-patched
npm rebuild @felipeduarte26/danger-bot
```

### Erro de permissao no postinstall

```bash
npm install --ignore-scripts
node node_modules/@felipeduarte26/danger-bot/scripts/patch-danger.cjs
```

> Mais solucoes: [FAQ](FAQ.md)
