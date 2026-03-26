# File Naming

Valida **apenas arquivos Dart novos** em `lib/`: o nome do arquivo deve estar em **snake_case** (`^[a-z0-9_]+\.dart$`).

## O que verifica

- `git.created_files` sob `lib/` com extensão `.dart`
- Caracteres proibidos: maiúsculas, hífen, espaços, etc.

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado — nome do arquivo: UserProfile.dart

// ✅ Correto — user_profile.dart
class UserProfile extends StatelessWidget { /* ... */ }
```

## Referências

- [Effective Dart — Style](https://dart.dev/guides/language/effective-dart/style)
