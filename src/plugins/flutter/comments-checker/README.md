# Comments Checker

Analisa **apenas linhas adicionadas** no diff. Comentários de linha `//` que não sejam casos permitidos geram falha: o projeto prefere `///` para documentação pública (DartDoc).

## O que verifica

- Linhas novas que começam com `//` (não `///`)
- Prefixos permitidos sem falhar: `TODO:`, `FIXME:`, `ignore:`, `coverage:ignore`, `danger:ignore` (na mesma linha ou linha anterior)

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado (linha adicionada no diff)
// calcula o total

// ✅ Correto
/// Calculates the total for the cart.
```

## Referências

- [Effective Dart — Documentation](https://dart.dev/effective-dart/documentation)
