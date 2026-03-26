# Repositories

Valida **contratos** em `domain/.../repositories/` e **implementações** em `data/.../repositories/` (exceto `repositories.dart`).

## O que verifica

**Domain:** arquivo `*_repository_interface.dart`, uma `abstract interface class I…Repository` por arquivo, prefixo **I** e sufixo **Repository**.

**Data:** arquivo `*_repository.dart`, uma classe por arquivo, sufixo **Repository**, `implements` da interface, `extends BaseRepository<…>`.

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// Domain — user_repository_interface.dart
abstract interface class IUserRepository {
  Future<UserEntity> getUser(String id);
}

// Data — user_repository.dart
final class UserRepository extends BaseRepository<AuthFailure>
    implements IUserRepository {
  @override
  Future<UserEntity> getUser(String id) async { /* ... */ }
}
```

## Referências

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
