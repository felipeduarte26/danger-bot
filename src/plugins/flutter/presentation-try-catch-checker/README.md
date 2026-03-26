# Presentation Try Catch Checker

Em arquivos sob `/presentation/`, detecta blocos **`try` com `catch` ou `finally`**. A convenção do plugin é tratar falhas em **Repository/UseCase** (ex.: `Either`/Result), não na presentation.

## O que verifica

- Linha `try {` fora de comentários; classifica `try-catch`, `try-finally` ou `try-catch-finally`
- Ignora `*_test.dart`, `.g.dart`, `.freezed.dart`

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado (ViewModel na presentation)
Future<void> load() async {
  try {
    await _repo.get();
  } catch (e) { /* ... */ }
}

// ✅ Correto
final result = await _getDataUsecase();
result.fold((f) => /* estado de erro */, (d) => /* sucesso */);
```

## Referências

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
