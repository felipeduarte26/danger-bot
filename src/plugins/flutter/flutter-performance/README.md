# Flutter Performance

Procura **operações custosas antes do `return`** dentro de `Widget build(BuildContext context) { ... }` (não analisa `build` em forma de expressão `=>`).

## O que verifica

- Loops (`for`/`while`), ordenação, criação de controllers (`TextEditingController`, `AnimationController`, …), HTTP/JSON, `DateTime.now()`, etc., na região entre `{` do build e o primeiro `return`

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
Widget build(BuildContext context) {
  final sorted = [...items]..sort();
  return ListView(children: sorted.map(...).toList());
}

// ✅ Correto
late final List<Item> _sorted;

@override
void initState() {
  super.initState();
  _sorted = [...items]..sort();
}

Widget build(BuildContext context) {
  return ListView(children: _sorted.map(...).toList());
}
```

## Referências

- [Flutter performance best practices](https://docs.flutter.dev/perf/best-practices)
