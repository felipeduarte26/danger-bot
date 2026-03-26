# Changelog Checker

Se o PR altera arquivos de código “relevantes” (`.dart`, `.ts`, `.js`, etc.) e **nenhum** arquivo com “changelog” no caminho foi modificado, emite aviso pedindo atualização do changelog.

## O que verifica

- Lista de criados/modificados: presença de mudança em arquivo cujo caminho contém `changelog` (case insensitive)
- “Mudanças significativas”: exclui testes, pastas `docs`/`test`, e arquivos só `.md`/`.json`/`.yaml`/etc.

## Severidade

- **Tipo:** `warn`

## Exemplo

```dart
// Cenário: você alterou lib/foo.dart mas não CHANGELOG.md
// → aviso pedindo entrada no CHANGELOG

// ✅ Correto
// Incluir CHANGELOG.md (ou changelog.md) na mesma PR com a alteração documentada
```

## Referências

- [Keep a Changelog](https://keepachangelog.com/) (convenção comum)
