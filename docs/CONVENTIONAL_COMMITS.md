# 📝 Conventional Commits

Este projeto usa [Conventional Commits](https://www.conventionalcommits.org/) para padronizar mensagens de commit.

## 📋 Formato

```
<tipo>[escopo opcional]: <descrição>

[corpo opcional]

[rodapé(s) opcional(is)]
```

## 🏷️ Tipos Permitidos

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `feat` | Nova funcionalidade | `feat(plugins): adicionar plugin de cobertura de código` |
| `fix` | Correção de bug | `fix(spell-checker): corrigir detecção de palavras compostas` |
| `docs` | Apenas documentação | `docs(readme): atualizar guia de instalação` |
| `style` | Formatação, ponto e vírgula, etc | `style: formatar código com prettier` |
| `refactor` | Refatoração de código | `refactor(helpers): simplificar função getDanger` |
| `perf` | Melhoria de performance | `perf(analyzer): otimizar regex de detecção` |
| `test` | Adicionar/corrigir testes | `test(plugins): adicionar testes unitários` |
| `build` | Mudanças no build ou deps | `build: atualizar dependências` |
| `ci` | Mudanças em CI/CD | `ci: adicionar workflow de release` |
| `chore` | Outras mudanças | `chore: atualizar .gitignore` |
| `revert` | Reverter commit anterior | `revert: reverter commit abc123` |

## 📝 Exemplos

### ✅ Commits Válidos

```bash
# Feature simples
git commit -m "feat: adicionar suporte a TypeScript 5.0"

# Feature com escopo
git commit -m "feat(cli): adicionar comando para listar plugins"

# Fix com corpo
git commit -m "fix(husky): corrigir permissões dos hooks

O hook pre-push estava sem permissão de execução
causando falha no CI"

# Breaking change
git commit -m "feat(api)!: remover suporte a Node.js 18

BREAKING CHANGE: Node.js 18 não é mais suportado.
Migre para Node.js 22 ou superior."
```

### ❌ Commits Inválidos

```bash
# Sem tipo
git commit -m "adicionar nova feature"

# Tipo inválido
git commit -m "add: nova feature"

# Subject em maiúscula
git commit -m "feat: Adicionar Nova Feature"

# Subject terminando com ponto
git commit -m "feat: adicionar nova feature."

# Header muito longo (>100 caracteres)
git commit -m "feat: adicionar uma funcionalidade extremamente complexa que faz muitas coisas diferentes ao mesmo tempo"
```

## 🎯 Escopos Recomendados

Para este projeto, use escopos que identifiquem a área afetada:

- `plugins` - Mudanças nos plugins
- `cli` - Mudanças na CLI
- `core` - Mudanças no core do danger-bot
- `helpers` - Mudanças nos helpers
- `docs` - Documentação
- `ci` - CI/CD
- `husky` - Git hooks
- `eslint` - ESLint config
- `types` - TypeScript types

## 🚫 Validação Automática

O projeto usa **commitlint** para validar mensagens de commit automaticamente:

- ✅ Commits válidos são aceitos
- ❌ Commits inválidos são rejeitados antes do commit

### Exemplo de Erro

```bash
$ git commit -m "adicionar nova feature"

📝 Validating commit message...
⧗   input: adicionar nova feature
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]

✖   found 2 problems, 0 warnings
```

## 💡 Dicas

1. **Mantenha o subject curto e descritivo** (máximo 100 caracteres no header total)
2. **Use imperativos**: "adicionar" não "adicionado" ou "adicionando"
3. **Inicie com minúscula**: "adicionar feature" não "Adicionar feature"
4. **Não termine com ponto**: "adicionar feature" não "adicionar feature."
5. **Use corpo para explicações**: Se precisa de mais de uma linha, use o corpo
6. **Breaking changes**: Use `!` ou `BREAKING CHANGE:` no footer

## 🔗 Referências

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Commitlint](https://commitlint.js.org/)
- [Semantic Versioning](https://semver.org/)

## 📦 Integração com Versionamento

Conventional Commits permite gerar automaticamente:
- 📋 CHANGELOGs
- 🏷️ Versões semânticas (semantic versioning)
- 🚀 Releases automáticas

Tipos mapeiam para versões:
- `fix` → PATCH (1.0.1)
- `feat` → MINOR (1.1.0)
- `BREAKING CHANGE` → MAJOR (2.0.0)

