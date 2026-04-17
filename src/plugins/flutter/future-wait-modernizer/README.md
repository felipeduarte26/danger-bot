# Future Wait Modernizer

Detecta uso de `Future.wait([...])` com lista literal e sugere a sintaxe moderna de tupla com `.wait` introduzida no Dart 3. A sintaxe de tupla é type-safe, elimina casts manuais por índice e é mais legível com destructuring.

## O que verifica

- `Future.wait([...])` com lista literal de futures
- Somente quando o resultado é atribuído a uma variável (`final`, `var`, `const` ou `=`)
- Não flageia `Future.wait` com variáveis ou expressões dinâmicas (ex: `Future.wait(listaDeFutures)`, `Future.wait(items.map(...))`)
- Gera sugestão de correção com nomes de variáveis inferidos automaticamente
- Exclui arquivos de teste e gerados

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
final results = await Future.wait([
  fetchUsers(),
  fetchOrders(),
]);
final users = results[0] as List<User>;
final orders = results[1] as List<Order>;

// ✅ Correto (Dart 3+)
final (
  users,
  orders,
) = await (
  fetchUsers(),
  fetchOrders(),
).wait;
```

## Referências

- [Dart Records — Multiple Returns](https://dart.dev/language/records#multiple-returns)
- [FutureRecord.wait](https://api.dart.dev/stable/dart-async/FutureRecord2/wait.html)
