# Date Type Checker

Em entities/models (pastas ou sufixos `_entity.dart` / `_model.dart`), detecta campos **`String`** cujo nome ou documentação `///` sugere data/hora — recomenda **`DateTime`**.

## O que verifica

- Sufixos tipo `At`, `Date`, `Timestamp`, `Time`, `Dt`; prefixos `date`, `timestamp`, `dt`; nomes exatos (`deadline`, `birthday`, …)
- Documentação acima do campo com palavras-chave de data/hora
- Exclusões por nome (ex.: `datepicker`, `dateformat`, …)

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
final String createdAt;

// ✅ Correto
final DateTime createdAt;
```

## Referências

- [DateTime (Dart)](https://api.dart.dev/stable/dart-core/DateTime-class.html)
