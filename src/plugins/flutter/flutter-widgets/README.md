# Flutter Widgets

Em classes que estendem `StatelessWidget` ou `State<…>`, verifica a **ordem dos métodos** no corpo da classe: `@override` (ciclo de vida) → métodos públicos → métodos privados (`_`).

## O que verifica

- Cada classe `… extends StatelessWidget` / `State<…>` separadamente
- Sequência de métodos detectados na profundidade de chaves 1 do corpo da classe

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
class _MyState extends State<MyWidget> {
  void _helper() {}
  @override
  Widget build(BuildContext context) => const SizedBox();
}

// ✅ Correto
class _MyState extends State<MyWidget> {
  @override
  Widget build(BuildContext context) => const SizedBox();

  void _helper() {}
}
```

## Referências

- [Effective Dart — Style](https://dart.dev/effective-dart/style)
