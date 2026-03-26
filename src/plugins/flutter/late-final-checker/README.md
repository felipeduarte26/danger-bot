# Late Final Checker

Detecta `late final` com **atribuição na mesma linha** da declaração. Nesse caso, `late` é desnecessário — prefira `final` (ou `const` quando aplicável).

## O que verifica

- Regex em linhas de arquivos Dart alterados: `late final … nome = …;`

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
late final String title = 'Home';

// ✅ Correto
final String title = 'Home';
```

## Referências

- [Effective Dart — Usage](https://dart.dev/effective-dart/usage#dont-use-late-when-a-constructor-initializer-will-do)
