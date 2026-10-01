# Presentation Encapsulation

Em arquivos sob `/presentation/`, detecta membros **públicos** em classes `State` (`extends State<...>`, `ConsumerState<...>` e variantes) que deveriam ser privados (`_`). O `State` é detalhe de implementação do widget: sua API não deve vazar. A classe `StatefulWidget` não é verificada — os campos dela são a API pública do widget.

## O que verifica

- Variáveis, métodos, getters e setters públicos declarados no corpo da classe `State`
- **Não** reporta: membros com `@override`, `@protected`, `@visibleForTesting`, `@visibleForOverriding` ou `@mustCallSuper`; membros `static`; construtores; membros já privados
- Pula a classe inteira quando o `State` é exposto por builder pattern (`widget.builder(this)`, `widget.builder(context, this)`)
- Para ignorar de propósito, coloque `// ignore: presentation-encapsulation` acima da classe ou do membro
- Ignora testes, gerados (`.g.dart`, `.freezed.dart`, `.gr.dart`...) e pastas como `/generated/`, `/build/`, `/test/`

## Severidade

- **Tipo:** `fail` por membro, mais uma `message` com o total

## Exemplo

```dart
// ❌ Errado
class _OrderPageState extends State<OrderPage> {
  bool loading = false;
  void reload() { /* ... */ }
}

// ✅ Correto
class _OrderPageState extends State<OrderPage> {
  bool _loading = false;
  void _reload() { /* ... */ }
}
```

## Referências

- [Effective Dart — Design: libraries and privacy](https://dart.dev/effective-dart/design#libraries)
