# PR Validation

Valida metadados do PR e consistência básica do Flutter: tamanho da descrição, changelog na raiz, `pubspec.lock` sem `pubspec.yaml`, e mensagens sobre tamanho da PR (arquivos `.dart` e linhas alteradas).

## O que verifica

- Descrição do PR com menos de **15** caracteres → `fail`
- `changelog.md` / `CHANGELOG.md` ausente ou não modificado (se `requireChangelog`) → `fail`
- `pubspec.lock` alterado sem `pubspec.yaml` → `fail`
- Muitos arquivos `.dart` ou muitas linhas → `warn` / `message` conforme limiares no código. As linhas vêm de `getLineStats()` (soma do `diffForFile` de cada arquivo), então funcionam no CI em GitHub, GitLab e Bitbucket — `git.insertions`/`git.deletions` só existem no dry-run

O aviso do `changelog-checker` fica desligado enquanto este plugin estiver ativo: todo PR que ele avisaria, este já reprova.

## Severidade

- **Tipo:** `fail`, `warn` e `message` (conforme a verificação)

## Exemplo

```markdown
## ❌ Descrição curta demais
x

## ✅ Descrição mínima aceitável
## Contexto
Corrige fluxo de login.

## Testes
Testado no emulador Android.
```

## Referências

— (fluxo de PR / changelog do time)
