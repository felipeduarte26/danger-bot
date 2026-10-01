# Build Doc Checker

Detecta comentários de documentação `///` **dentro** do corpo de métodos `Widget build(...)`. DartDoc não documenta nada ali: os widgets já se explicam pelo nome e pelos parâmetros, e o `///` só polui o código.

## O que verifica

- Métodos `@override Widget build(...)`, com corpo `{ ... }` ou `=> ...;`
- Cada linha `///` entre a abertura e o fim do corpo gera uma falha, com o trecho real e a versão sem o comentário
- Ignora `///` dentro de strings multi-linha, testes e arquivos gerados (`.g.dart`, `.freezed.dart`)

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
@override
Widget build(BuildContext context) {
  return Column(
    /// Lista de itens do pedido
    children: _items,
  );
}

// ✅ Correto — use // se precisar de um comentário inline
@override
Widget build(BuildContext context) {
  return Column(
    children: _items,
  );
}
```

## Referências

- [Effective Dart — Documentation](https://dart.dev/effective-dart/documentation)
