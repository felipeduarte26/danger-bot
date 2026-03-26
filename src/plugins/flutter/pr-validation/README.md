# PR Validation

Valida metadados do PR e consistência básica do Flutter: tamanho da descrição, changelog na raiz, `pubspec.lock` sem `pubspec.yaml`, e mensagens sobre tamanho da PR (arquivos `.dart` e linhas alteradas).

## O que verifica

- Descrição do PR com menos de **15** caracteres → `fail`
- `changelog.md` / `CHANGELOG.md` ausente ou não modificado (se `requireChangelog`) → `fail`
- `pubspec.lock` alterado sem `pubspec.yaml` → `fail`
- Muitos arquivos `.dart` ou muitas linhas → `warn` / `message` conforme limiares no código

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
