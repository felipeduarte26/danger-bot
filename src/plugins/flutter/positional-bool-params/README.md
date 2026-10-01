# Positional Bool Params

Detecta parâmetros `bool` **posicionais** em funções, métodos e construtores. No call site, `Task(true)` ou `load(false)` não dizem o que o valor significa; com named parameter fica `Task(repeating: true)`.

## O que verifica

- Assinaturas (inclusive multi-linha) com `bool`/`bool?` posicional, obrigatório ou opcional (`[bool x]`), incluindo `this.x`/`super.x` tipados e parâmetros de primary constructor (`class const A(final bool enabled)`)
- Não reporta parâmetros já nomeados (`{bool x}`), setters, operadores e membros com `@override` (a assinatura vem da classe pai)
- Ignora comentários, strings, testes e gerados (`.g.dart`, `.freezed.dart`, `/generated/`)
- Sugere `{required bool isX}` quando o nome começa com `is`, senão `{bool x = false}`

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
void loadOrders(String branchId, bool forceRefresh) { /* ... */ }
loadOrders(id, true); // true o quê?

// ✅ Correto
void loadOrders(String branchId, {bool forceRefresh = false}) { /* ... */ }
loadOrders(id, forceRefresh: true);
```

## Referências

- [Effective Dart: AVOID positional boolean parameters](https://dart.dev/effective-dart/design#avoid-positional-boolean-parameters)
