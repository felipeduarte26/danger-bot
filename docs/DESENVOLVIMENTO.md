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
| `build` | `tsc && tsc-alias` | Compila TypeScript para `dist/` |
| `watch` | `tsc --watch` | Compila em modo watch |
| `lint` | `eslint . --max-warnings 0` | Verifica erros de lint |
| `lint:fix` | `eslint . --fix` | Corrige erros automaticamente |
| `format` | `prettier --write "src/**/*.ts" "bin/**/*.js"` | Formata codigo |
| `format:check` | `prettier --check "src/**/*.ts" "bin/**/*.js"` | Verifica formatacao |
| `type-check` | `tsc --noEmit` | Verifica tipos sem gerar arquivos |
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
npm run lint
npm run type-check
npm run build
```

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

## Criando um plugin

### Via CLI (recomendado)

```bash
npx danger-bot create-plugin
```

### Manualmente

1. Crie a pasta `src/plugins/flutter/meu-plugin/`
2. Crie `meu-plugin.ts` com `createPlugin()`
3. Crie `index.ts` com `export { default } from "./meu-plugin"`
4. Adicione export em `src/plugins/flutter/index.ts`
5. Adicione no array `allFlutterPlugins` em `src/index.ts`
6. Build: `npm run build`
7. Valide: `npx danger-bot validate src/plugins/flutter/meu-plugin/meu-plugin.ts`

---

## Estrutura de um plugin

```typescript
import { createPlugin, getDartFiles, sendWarn } from "@felipeduarte26/danger-bot";

export default createPlugin(
  {
    name: "meu-plugin",
    description: "O que o plugin faz",
    enabled: true,
  },
  async () => {
    const files = getDartFiles();
    // logica do plugin
  }
);
```

---

## Build e dist

O `dist/` e commitado no repositorio para permitir instalacao via Git. Apos alteracoes em `src/`, sempre execute:

```bash
npm run build
```

E inclua as mudancas do `dist/` no commit.

---

## Versionamento

```bash
# Atualizar versao no package.json
npm version patch  # 1.8.0 → 1.8.1
npm version minor  # 1.8.0 → 1.9.0
npm version major  # 1.8.0 → 2.0.0

# Criar tag
git tag v1.9.0
git push origin v1.9.0
```

---

## Documentacao

Toda documentacao fica em `docs/` e deve ser mantida atualizada.

Ao criar um novo plugin, inclua um `README.md` na pasta do plugin.

Ao adicionar funcionalidades, atualize os docs relevantes (API, Helpers, etc.).

---

## Suporte

- [Arquitetura](ARQUITETURA.md)
- [GitHub Issues](https://github.com/felipeduarte26/danger-bot/issues)
