# Domain Usecases

Valida arquivos em `/usecases/` (exceto `usecases.dart`): um use case por arquivo com **interface** `I…Usecase` e **implementação** `…Usecase` usando **`implements`**, não `extends`.

## O que verifica

- Nome `*_usecase.dart`
- `abstract interface class` com prefixo **I** e sufixo **Usecase**
- `final class …Usecase implements I…Usecase`
- Proíbe múltiplas interfaces no mesmo arquivo
- Proíbe `extends I…` na implementação

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
class GetUserUsecase extends IGetUserUsecase { }

// ✅ Correto
abstract interface class IGetUserUsecase {
  Future<UserEntity> call(String id);
}

final class GetUserUsecase implements IGetUserUsecase {
  @override
  Future<UserEntity> call(String id) async { /* ... */ }
}
```

## Referências

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
