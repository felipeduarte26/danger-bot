# Desenvolvimento

Como configurar o ambiente e contribuir com o Danger Bot.

---

## Pre-requisitos

- Node.js >= 25.2.1
- npm
- Git

---

## Setup

```bash
# Clonar o repositorio
git clone https://github.com/felipeduarte26/danger-bot.git
cd danger-bot

# Instalar dependencias
npm install

# Verificar se tudo funciona
npm run build
npm run lint
npm run type-check
```

---

## Scripts disponiveis

| Script | Comando | Descricao |
|--------|---------|-----------|
| `build` | `tsc && tsc-alias && prettier` | Compila TypeScript para `dist/`, já formatado (igual ao que o lint-staged commita) |
| `watch` | `tsc --watch` | Compila em modo watch |
| `lint` | `eslint . --max-warnings 0` | Verifica erros de lint |
| `lint:fix` | `eslint . --fix` | Corrige erros automaticamente |
| `format` | `prettier --write` em `src/`, `bin/`, `tests/` e `.github/` | Formata codigo |
| `format:check` | `prettier --check` nos mesmos arquivos | Verifica formatacao (roda no CI) |
| `type-check` | `tsc --noEmit` | Verifica tipos sem gerar arquivos |
| `test` | `node --test tests/*.test.cjs` | Testes do modelo Dart (sobre o `dist/`: rode o build antes) |
| `prepare` | `husky` | Configura git hooks |

---

## Workflow de desenvolvimento

### 1. Criar branch

```bash
git checkout -b feat/minha-feature
```

### 2. Fazer alteracoes

Edite os arquivos em `src/`. Para criar um novo plugin, use a CLI:

```bash
npx danger-bot create-plugin
```

### 3. Verificar

```bash
npm run lint        # inclui as regras que barram regex e parser próprio nos plugins
npm run type-check
npm run build
npm test            # testes do modelo Dart
```

Mudou o modelo Dart (`src/dart/`) ou um plugin existente? Rode também a paridade ([tools/parity/](../tools/parity/README.md)).

### 4. Commit

Use [Conventional Commits](COMMITS.md):

```bash
git add .
git commit -m "feat(plugin): adicionar meu-plugin"
```

Os git hooks executam automaticamente:
- **pre-commit**: lint-staged (ESLint + Prettier nos arquivos staged)
- **commit-msg**: commitlint (valida formato da mensagem)

### 5. Push

```bash
git push origin feat/minha-feature
```

O hook **pre-push** executa automaticamente:
- ESLint
- Type check
- Build completo

### 6. Pull Request

Abra um PR no GitHub.

---

## Modulos principais

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/index.ts` | Entry point, exports principais, arrays de plugins |
| `src/types.ts` | Interfaces (`DangerPlugin`, `DangerBotCallbacks`), `executeDangerBot`, `createPlugin` |
| `src/helpers.ts` | Funcoes auxiliares (mensagens, filtros de arquivos, PR info) |
| `src/config.ts` | Loader do `danger-bot.yaml` (plugins locais, ignore_files) |

> Detalhes: [Arquitetura](ARQUITETURA.md)

---

## Criando um plugin

> Guia completo: [CRIANDO_PLUGINS.md](CRIANDO_PLUGINS.md) (passo a passo, cookbook, exemplos e checklist de revisão).

### Via CLI (recomendado)

```bash
npx danger-bot create-plugin
```

### Manualmente

1. Crie a pasta `src/plugins/flutter/meu-plugin/`
2. Crie `meu-plugin.ts` com `createPlugin()`
3. Crie `index.ts` com `export { default } from "./meu-plugin"`
4. Adicione export em `src/plugins/flutter/index.ts`
5. Em `src/index.ts`: adicione o nome no bloco `export { ... } from "./plugins/flutter"` (export por nome) e no `import` das categorias
6. Adicione no array `allFlutterPlugins` em `src/index.ts`, **antes** do `google-chat-notification` (ele precisa ser o ultimo)
7. Build: `npm run build`
8. Valide: `npx danger-bot validate src/plugins/flutter/meu-plugin/meu-plugin.ts`

> A CLI (`create-plugin`) faz os passos 1 a 6 automaticamente.

---

## Estrutura de um plugin

O plugin lê o código pelo [modelo Dart](MODELO_DART.md): nada de `fs`, `split("\n")` ou regex para achar
classes, campos, chamadas, strings ou comentários.

```typescript
import { DartFile, createPlugin, sendFormattedFail } from "@types";

export default createPlugin(
  {
    name: "meu-plugin",
    description: "O que o plugin faz",
    enabled: true,
  },
  async () => {
    // .dart criados/modificados no PR, já analisados (sem testes e sem gerados)
    for (const file of DartFile.changed()) {
      for (const call of file.calls()) {
        // a regra, sobre as propriedades do modelo; a mensagem com sendFormattedFail
      }
    }
  }
);
```

### Padrao de mensagens

Ao reportar problemas, siga este formato:

```
TITULO EM CAPS (sem emoji)
Descricao curta do problema
### Problema Identificado (com bloco de codigo)
### 🎯 ACAO NECESSARIA (exemplo ❌/✅)
### 🚀 Objetivo (frase curta)
📖 [Link](url) de referencia
```

> Detalhes completos: [Guia de Plugins](GUIA_PLUGINS.md#padrao-de-mensagens-dos-plugins)

---

## Build e dist

O `dist/` e commitado no repositorio para permitir instalacao via Git. Apos alteracoes em `src/`, sempre execute:

```bash
npm run build
```

E inclua as mudancas do `dist/` no mesmo commit do `src/`. O build ja formata o `dist/` com o Prettier, entao um build sem mudanca no `src/` nao deixa diff.

O `pre-push` roda lint, type-check e build. Se o `src/` esta sem alteracoes locais e o build muda o `dist/`, o push para: o `dist/` commitado esta desatualizado. Commite o `dist/` e faca o push de novo.

---

## Versionamento

O historico fica no [CHANGELOG](../CHANGELOG.md) (Keep a Changelog + SemVer). Para fechar uma versao:

1. No `CHANGELOG.md`, troque `## [Nao publicado]` por `## [X.Y.Z] - AAAA-MM-DD`, abra um `## [Nao publicado]` vazio acima e atualize os links do fim.
2. Mesmo numero no `package.json`, no badge do `README.md`, na saida do `info` em `docs/CLI.md` e na do `npm list` em `docs/INSTALACAO.md`.
3. Commit `chore(release): vX.Y.Z` e `git push origin main`.

A tag `vX.Y.Z` e criada pelo CI (veja abaixo). Nao use `npm version`: ele cria commit e tag com outro formato.

---

## CI

O workflow [.github/workflows/ci.yml](../.github/workflows/ci.yml) roda em todo PR, em todo push na `main` e manualmente (`workflow_dispatch`). Os jobs de verificacao rodam em paralelo, cada um com o proprio status no PR:

| Job | O que verifica |
| --- | --- |
| `lint` | ESLint (inclusive as regras que barram regex e parser proprio nos plugins) e Prettier (`npm run format:check`) |
| `types` | `npm run type-check` |
| `build` | `npm run build` e se o `dist/` commitado e o build do `src/` (sem diff depois do build) |
| `test` | `npm test` sobre o `dist/` commitado (o que o consumidor instala) |
| `cli` | Smoke test da CLI: `--version`, `list`, `inspect` de um arquivo Dart e `validate` de um plugin |
| `conventions` | Mensagens de commit (commitlint), aviso de CHANGELOG no PR que muda `src/`, `bin/` ou `scripts/`, e versao igual no `package.json`, no badge do README, no `CLI.md`, no `INSTALACAO.md` e no CHANGELOG |
| `tag` | So em push na `main`, depois de todos: cria a tag anotada `vX.Y.Z` da versao do `package.json` |

Todos os jobs usam a preparacao comum de [.github/actions/setup](../.github/actions/setup/action.yml): Node 25, cache do npm (pelo `package.json`, ja que nao ha lock commitado) e `npm install`.

O job `tag` le a versao do `package.json` e cria a tag no commit **se ela ainda nao existir** no remoto. Se a versao nao mudou, nao faz nada. Versao fora do formato `X.Y.Z` reprova o job; sem a secao `## [X.Y.Z]` no CHANGELOG, a tag e criada com um aviso.

---

## Documentacao

Toda documentacao fica em `docs/` e deve ser mantida atualizada.

Ao criar um novo plugin, inclua um `README.md` na pasta do plugin.

Ao adicionar funcionalidades, atualize os docs relevantes (API, Helpers, etc.).

---

## Suporte

- [Arquitetura](ARQUITETURA.md)
- [GitHub Issues](https://github.com/felipeduarte26/danger-bot/issues)
