# 🔧 Guia de Desenvolvimento

> Como contribuir e desenvolver o Danger Bot

---

## 🚀 Setup do Ambiente

### 1. Clonar Repositório

```bash
git clone https://bitbucket.org/diletta/danger-bot.git
cd danger-bot
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Compilar

```bash
npm run build
```

---

## 📝 Conventional Commits

Este projeto usa **Conventional Commits** + **Husky**.

### Tipos Permitidos

- `feat` - Nova funcionalidade
- `fix` - Correção de bug
- `docs` - Documentação
- `refactor` - Refatoração
- `test` - Testes
- `chore` - Outros

### Exemplo

```bash
git commit -m "feat(plugins): adicionar plugin de cobertura"
```

**Ver:** [Guia completo de commits](COMMITS.md)

---

## 🔌 Criar Plugin

### Via CLI

```bash
danger-bot create-plugin
```

### Manual

1. Criar pasta: `src/plugins/flutter/meu-plugin/`
2. Criar `meu-plugin.ts`
3. Criar `index.ts` (barrel)
4. Criar `README.md`
5. Exportar em `src/plugins/flutter/index.ts`

---

## ⚠️ Boas Práticas

### 🚨 EVITE Inline Comments

**Sempre use comentários gerais:**

```typescript
// ✅ CORRETO
sendFail("Erro encontrado");

// ❌ EVITE (cria metadados visíveis no Bitbucket)
sendFail("Erro encontrado", "arquivo.dart", 10);
```

**Por quê?** O Bitbucket adiciona preview com metadados visíveis em inline comments:
```
<!-- 1 failure: Erro... DangerID: ...; File: ...; Line: ...; -->
```

**Documentação completa:** [Guia de Plugins - Boas Práticas](GUIA_PLUGINS.md#️-boas-práticas-e-armadilhas-comuns)

---

## 🧪 Testar

### Localmente

```bash
cd /path/to/projeto-teste
npm link /path/to/danger-bot
npm run danger:local
```

### Em PR Real

```bash
npm run danger:pr https://github.com/user/repo/pull/123
```

---

## 📦 Scripts NPM

```bash
npm run build         # Compilar TypeScript
npm run watch         # Watch mode
npm run lint          # ESLint
npm run lint:fix      # ESLint --fix
npm run format        # Prettier
npm run type-check    # TypeScript check
```

---

## 🎣 Git Hooks

- **pre-commit**: ESLint + Prettier nos arquivos staged
- **commit-msg**: Validação Conventional Commits
- **pre-push**: lint + type-check + build completo

---

## 🏷️ Versioning

```bash
# Criar nova versão
git tag v1.9.0
git push origin v1.9.0
```

---

## 📚 Documentação

Toda documentação em `docs/` deve ser em **PT-BR**.

### Criar Nova Doc

```bash
touch docs/MINHA_DOC.md
```

### Atualizar README

Adicionar link no `README.md` principal.

---

## 💬 Suporte

- 📖 [Arquitetura](ARQUITETURA.md)
- 💬 [Slack - #danger-bot](https://diletta.slack.com/archives/C09CZAH10J3)
- 💬 felipe.duarte@dilettasolutions.com

---
