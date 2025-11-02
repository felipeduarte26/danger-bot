# 📝 Guia de Commits - Conventional Commits

> Padrão de mensagens de commit para o Danger Bot

---

## 🎯 Por que Conventional Commits?

O Danger Bot usa [Conventional Commits](https://www.conventionalcommits.org/) para:

- ✅ Histórico de commits legível e estruturado
- ✅ Geração automática de changelogs
- ✅ Versionamento semântico automático
- ✅ Facilitar code review
- ✅ Entender o impacto de cada mudança

---

## 📋 Formato Padrão

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Componentes:

| Componente | Obrigatório | Descrição                                    |
| ---------- | ----------- | -------------------------------------------- |
| `type`     | ✅ Sim      | Tipo da mudança (feat, fix, docs, etc)       |
| `scope`    | ❌ Não      | Contexto da mudança (cli, plugin, docs, etc) |
| `subject`  | ✅ Sim      | Descrição curta em lowercase                 |
| `body`     | ❌ Não      | Descrição detalhada                          |
| `footer`   | ❌ Não      | Breaking changes, issues, etc                |

---

## 🏷️ Types (Tipos)

### Tipos Principais

| Type       | Quando Usar                         | Exemplo                                                     |
| ---------- | ----------------------------------- | ----------------------------------------------------------- |
| `feat`     | Nova funcionalidade                 | `feat(cli): adicionar comando remove-plugin`                |
| `fix`      | Correção de bug                     | `fix(plugin): corrigir spell checker em palavras compostas` |
| `docs`     | Documentação                        | `docs(readme): atualizar guia de instalação`                |
| `refactor` | Refatoração sem mudar comportamento | `refactor(helpers): simplificar getDanger`                  |
| `perf`     | Melhoria de performance             | `perf(analyze): otimizar processamento de arquivos`         |
| `test`     | Adicionar/corrigir testes           | `test(plugin): adicionar testes do pr-size-checker`         |
| `build`    | Sistema de build/dependências       | `build(deps): atualizar danger para v13.0.1`                |
| `ci`       | CI/CD                               | `ci(bitrise): adicionar step de lint`                       |
| `chore`    | Outras mudanças (configs, scripts)  | `chore(husky): configurar pre-commit hook`                  |
| `style`    | Formatação (sem mudança de código)  | `style: formatar com prettier`                              |
| `revert`   | Reverter commit anterior            | `revert: reverter "feat: add new feature"`                  |

---

## 🎯 Scopes (Contextos)

Scopes comuns no Danger Bot:

### CLI

- `cli` - CLI principal
- `commands` - Comandos específicos
- `templates` - Templates de código

### Plugins

- `plugin` - Plugins em geral
- `flutter` - Plugins Flutter
- `nodejs` - Plugins Node.js
- `pr-size` - Plugin específico
- `spell-checker` - Plugin específico

### Código

- `helpers` - Helper functions
- `types` - TypeScript types
- `config` - Configurações

### Documentação

- `docs` - Documentação geral
- `readme` - README.md
- `api` - Documentação da API
- `guides` - Guias

### Infraestrutura

- `ci` - CI/CD
- `deps` - Dependências
- `build` - Build system

---

## ✍️ Exemplos Práticos

### 1. Nova Feature

```bash
git commit -m "feat(cli): adicionar comando remove-plugin

- Remove pasta do plugin
- Remove exports dos barrel files
- Remove do allFlutterPlugins
- Confirmação de segurança
- Prompts interativos"
```

### 2. Correção de Bug

```bash
git commit -m "fix(plugin): corrigir detecção de arquivos gerados

Estava incluindo arquivos .g.dart na análise, agora filtra corretamente."
```

### 3. Documentação

```bash
git commit -m "docs(cli): adicionar documentação do remove-plugin

- Processo interativo
- Exemplo de saída
- O que é removido automaticamente
- Quando usar"
```

### 4. Refatoração

```bash
git commit -m "refactor(cli): modularizar cli.js em commands separados

- Cria pasta bin/commands/
- Separa cada comando em arquivo próprio
- Melhora manutenibilidade
- Reduz cli.js de 673 para 63 linhas"
```

### 5. Breaking Change

```bash
git commit -m "feat(api): remover função deprecated runPlugins

BREAKING CHANGE: runPlugins() foi removida. Use executeDangerBot() em vez disso.

Antes:
  await runPlugins(plugins);

Depois:
  executeDangerBot(plugins);"
```

### 6. Múltiplos Scopes

```bash
git commit -m "chore(deps): atualizar dependências

- typescript: 5.8.0 → 5.9.3
- danger: 12.0.0 → 13.0.0
- commander: 13.0.0 → 14.0.2"
```

---

## 🚫 O que NÃO fazer

### ❌ Exemplos Ruins

```bash
# Type em uppercase
git commit -m "FEAT: add new feature"

# Subject em uppercase
git commit -m "feat: Add new feature"

# Sem type
git commit -m "add new feature"

# Ponto final no subject
git commit -m "feat: add new feature."

# Subject muito genérico
git commit -m "feat: update"

# Mixing conventions
git commit -m "Add new feature and fix bug"
```

### ✅ Como Corrigir

```bash
# ✅ Correto
git commit -m "feat: add new feature"

# ✅ Correto
git commit -m "feat(cli): add remove-plugin command"

# ✅ Correto (sem ponto final)
git commit -m "feat: add automatic plugin registration"

# ✅ Correto (específico)
git commit -m "feat(cli): add remove-plugin with confirmation"

# ✅ Correto (separar em commits)
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug in validator"
```

---

## 🔧 Commitlint - Validação Automática

O Danger Bot usa `commitlint` para validar mensagens automaticamente.

### Configuração

O projeto já está configurado com:

```javascript
// commitlint.config.js
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],
    "scope-case": [2, "always", "lower-case"],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 100],
  },
};
```

### Hooks

O commitlint é executado automaticamente pelo Husky:

```bash
# .husky/commit-msg
npx commitlint --edit "$1"
```

### Exemplos de Erros

```bash
$ git commit -m "Add feature"
⧗   input: Add feature
✖   type may not be empty [type-empty]
✖   found 1 problems, 0 warnings

$ git commit -m "FEAT: new feature"
⧗   input: FEAT: new feature
✖   type must be lower-case [type-case]
✖   found 1 problems, 0 warnings

$ git commit -m "feat: New Feature."
⧗   input: feat: New Feature.
✖   subject must not end with full stop [subject-full-stop]
✖   found 1 problems, 0 warnings
```

---

## 🔄 Workflow de Commit

### 1. Fazer Mudanças

```bash
# Modificar arquivos
vim src/plugins/flutter/my-plugin/my-plugin.ts
```

### 2. Adicionar ao Stage

```bash
git add src/plugins/flutter/my-plugin/
```

### 3. Commit (Automático)

```bash
git commit -m "feat(plugin): add my custom plugin"

# Husky executa automaticamente:
# → pre-commit: lint-staged (formata código)
# → commit-msg: commitlint (valida mensagem)
```

### 4. Push (Automático)

```bash
git push origin main

# Husky executa automaticamente:
# → pre-push: lint + type-check + build
```

---

## 📚 Boas Práticas

### ✅ DO (Faça)

- ✅ Use imperative mood: "add" não "added" ou "adds"
- ✅ Seja específico no subject
- ✅ Use lowercase no subject
- ✅ Limite subject a 72 caracteres
- ✅ Use body para explicar o "porquê"
- ✅ Separe mudanças não relacionadas em commits separados
- ✅ Use scope quando fizer sentido

### ❌ DON'T (Não faça)

- ❌ Não use uppercase no type ou subject
- ❌ Não termine subject com ponto
- ❌ Não faça commits genéricos ("update", "fix")
- ❌ Não misture diferentes types em um commit
- ❌ Não commite código não formatado (lint-staged cuida disso)

---

## 🎓 Referências

### Documentação Oficial

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Commitlint](https://commitlint.js.org/)
- [Semantic Versioning](https://semver.org/)

### Guias Adicionais

- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
- [How to Write a Git Commit Message](https://chris.beams.io/posts/git-commit/)

---

## 💡 Dicas Rápidas

### TL;DR

```bash
# ✅ Correto
git commit -m "feat(cli): add remove-plugin command"
git commit -m "fix(plugin): resolve spell checker bug"
git commit -m "docs: update readme with new examples"

# ❌ Errado
git commit -m "Add feature"
git commit -m "FEAT: new feature"
git commit -m "feat: New Feature."
```

### Atalhos

```bash
# Commitar tudo
git add -A && git commit -m "feat: add new feature"

# Amend (corrigir último commit)
git commit --amend -m "feat: add new feature (fixed typo)"

# Ver commits com formato
git log --oneline --graph --decorate
```

---

## 🐛 Troubleshooting

### Commit rejeitado pelo commitlint

```bash
# Erro
✖   type may not be empty [type-empty]

# Solução
git commit -m "feat: add new feature"  # Adicionar type
```

### Commit rejeitado pelo lint

```bash
# Erro
❌ ESLint failed! Fix errors before pushing.

# Solução
npm run lint:fix  # Corrigir automaticamente
git add .
git commit -m "style: fix linting errors"
```

### Commit rejeitado pelo type-check

```bash
# Erro
❌ TypeScript type check failed!

# Solução
npm run type-check  # Ver erros
# Corrigir erros de tipo
git add .
git commit -m "fix: resolve type errors"
```

---

## 🎯 Comandos Úteis

```bash
# Ver últimos commits
git log --oneline -10

# Ver commits por autor
git log --author="Felipe" --oneline

# Ver commits por type
git log --grep="^feat" --oneline

# Ver commits de um arquivo
git log --oneline -- src/plugins/flutter/spell-checker/spell-checker.ts

# Ver estatísticas
git shortlog -sn --no-merges
```

---

<div align="center">

**📝 Commits consistentes = Histórico limpo = Projeto profissional**

---

</div>
