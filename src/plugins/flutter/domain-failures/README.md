# Domain Failures

Valida arquivos em `/failures/` (exceto `failures.dart`): padrão com **sealed class** base e subclasses **final** para erros tipados.

## O que verifica

- Nome `*_failure.dart`
- Presença de `sealed class …Failure`
- Pelo menos uma `final class … extends …Failure`
- Nomes da sealed e das subclasses terminando em **Failure**

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
class AuthFailure { }

// ✅ Correto
sealed class AuthFailure {
  AuthFailure([this.message = '']);
  final String message;
}

final class AuthUnexpectedFailure extends AuthFailure {
  AuthUnexpectedFailure([super.message]);
}
```

## Referências

- [Pattern matching / sealed classes (Dart 3)](https://dart.dev/language/patterns)
