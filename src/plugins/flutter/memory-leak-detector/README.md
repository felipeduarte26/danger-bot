# Memory Leak Detector

Em `State<>` / `ViewState<>`, encontra **campos** típicos que precisam de `dispose()` ou `cancel()` e verifica se o corpo de `dispose()` contém a chamada correspondente.

## O que verifica

- Tipos com dispose: `TextEditingController`, `AnimationController`, `FocusNode`, `ChangeNotifier`, etc.
- Tipos com cancel: `Timer`, `StreamSubscription`, `StreamController`

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
class _PageState extends State<Page> {
  final _controller = TextEditingController();

  @override
  Widget build(BuildContext context) => const SizedBox();
}

// ✅ Correto
@override
void dispose() {
  _controller.dispose();
  super.dispose();
}
```

## Referências

- [State.dispose](https://api.flutter.dev/flutter/widgets/State/dispose.html)
