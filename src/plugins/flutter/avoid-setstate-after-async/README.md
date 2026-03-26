# Avoid setState After Async

Em classes `State<>` / `ViewState<>`, detecta `setState(` após um `await` na mesma função assíncrona **sem** uso de `mounted` entre o `await` e o `setState`, risco de `setState() called after dispose()`.

## O que verifica

- Arquivos com `extends State<` ou `extends ViewState<` e `setState`
- Padrão: após `await`, antes do próximo `setState`, deve haver verificação envolvendo `mounted`

## Severidade

- **Tipo:** `warn`

## Exemplo

```dart
// ❌ Errado
await fetchData();
setState(() { _data = result; });

// ✅ Correto
await fetchData();
if (!mounted) return;
setState(() { _data = result; });
```

## Referências

- [State.mounted (Flutter)](https://api.flutter.dev/flutter/widgets/State/mounted.html)
