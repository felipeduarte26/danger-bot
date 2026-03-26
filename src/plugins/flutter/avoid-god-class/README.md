# Avoid God Class

Analisa classes em arquivos Dart alterados e sinaliza “god classes”: muitas linhas ou muitos métodos públicos, indicando violação do princípio de responsabilidade única. Ignora `.g.dart`, `.freezed.dart` e `*_test.dart`.

## O que verifica

- Classe com mais de **300 linhas** (do `{` inicial ao `}` de fechamento)
- Classe com mais de **15 métodos públicos** (heurística por assinatura na profundidade de chaves 1)
- Exclui enum, mixin e extension do parsing de “classe”

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
class UserPanel {
  void save() {}
  void load() {}
  void validate() {}
  // ... 12+ métodos públicos sem @override
}

// ✅ Correto
class UserPanel {
  // responsabilidade focada; extrair validators, formatters, etc.
}
```

## Referências

- [Single Responsibility Principle (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html)
