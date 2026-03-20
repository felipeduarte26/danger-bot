# Conventional Commits

Padrao de mensagens de commit usado no Danger Bot.

---

## Formato

```
<type>(<scope>): <subject>

<body>

<footer>
```

| Componente | Obrigatorio | Descricao |
|------------|-------------|-----------|
| `type` | Sim | Tipo da mudanca |
| `scope` | Nao | Contexto (cli, plugin, docs, etc.) |
| `subject` | Sim | Descricao curta em lowercase, sem ponto final |
| `body` | Nao | Descricao detalhada |
| `footer` | Nao | Breaking changes, issues relacionadas |

---

## Tipos

| Type | Quando usar | Exemplo |
|------|-------------|---------|
| `feat` | Nova funcionalidade | `feat(cli): adicionar comando remove-plugin` |
| `fix` | Correcao de bug | `fix(plugin): corrigir spell checker em palavras compostas` |
| `docs` | Documentacao | `docs(readme): atualizar guia de instalacao` |
| `refactor` | Refatoracao sem mudar comportamento | `refactor(helpers): simplificar getDanger` |
| `perf` | Melhoria de performance | `perf(analyze): otimizar processamento de arquivos` |
| `test` | Testes | `test(plugin): adicionar testes do pr-size-checker` |
| `build` | Build ou dependencias | `build(deps): atualizar danger para v13.0.1` |
| `ci` | CI/CD | `ci(bitrise): adicionar step de lint` |
| `chore` | Outras mudancas | `chore(husky): configurar pre-commit hook` |
| `style` | Formatacao | `style: formatar com prettier` |
| `revert` | Reverter commit | `revert: reverter "feat: add new feature"` |

---

## Scopes comuns

| Area | Scopes |
|------|--------|
| CLI | `cli`, `commands`, `templates` |
| Plugins | `plugin`, `flutter`, `pr-size`, `spell-checker` |
| Codigo | `helpers`, `types`, `config` |
| Docs | `docs`, `readme`, `api` |
| Infra | `ci`, `deps`, `build` |

---

## Exemplos

### Nova feature

```bash
git commit -m "feat(cli): adicionar comando remove-plugin

- Remove pasta do plugin
- Remove exports dos barrel files
- Confirmacao de seguranca"
```

### Correcao de bug

```bash
git commit -m "fix(plugin): corrigir deteccao de arquivos gerados

Estava incluindo arquivos .g.dart na analise."
```

### Breaking change

```bash
git commit -m "feat(api): remover funcao deprecated runPlugins

BREAKING CHANGE: runPlugins() foi removida. Use executeDangerBot()."
```

### Documentacao

```bash
git commit -m "docs(cli): adicionar documentacao do remove-plugin"
```

### Dependencias

```bash
git commit -m "build(deps): atualizar dependencias

- typescript: 5.8.0 → 5.9.3
- danger: 12.0.0 → 13.0.0"
```

---

## Regras

### Correto

```bash
git commit -m "feat: add new feature"
git commit -m "feat(cli): add remove-plugin command"
git commit -m "fix: resolve validation bug"
```

### Incorreto

```bash
git commit -m "Add feature"           # sem type
git commit -m "FEAT: new feature"     # type em uppercase
git commit -m "feat: Add Feature."    # subject em uppercase + ponto
git commit -m "feat: update"          # muito generico
```

---

## Validacao automatica

O projeto usa `commitlint` com Husky. Mensagens fora do padrao sao rejeitadas automaticamente:

```bash
$ git commit -m "Add feature"
⧗   input: Add feature
✖   type may not be empty [type-empty]
```

### Configuracao

```javascript
// commitlint.config.js
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"]],
    "subject-empty": [2, "never"],
    "subject-case": [2, "always", "lower-case"],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 100],
  },
};
```

---

## Boas praticas

- Use modo imperativo: "add" nao "added" ou "adds"
- Seja especifico no subject
- Use lowercase no subject
- Limite o header a 100 caracteres
- Use body para explicar o "porque"
- Separe mudancas nao relacionadas em commits separados
- Use scope quando fizer sentido

---

## Referencias

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Commitlint](https://commitlint.js.org/)
- [Semantic Versioning](https://semver.org/)
