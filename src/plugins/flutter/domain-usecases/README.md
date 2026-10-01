# Domain Usecases

Valida arquivos em `/usecases/` (ou `/usecase/`), exceto barrels (`usecases.dart`, `usecase.dart`): um use case por arquivo com **interface** `I…UseCase` e **implementação** `…UseCase` usando **`implements`**, não `extends`.

## O que verifica

- Nome `*_usecase.dart`
- `abstract interface class` com prefixo **I** e sufixo **UseCase** — em PascalCase: `Usecase` é reprovado com "SUFIXO DO USECASE COM CASING INCORRETO"
- Implementação `final class …UseCase implements I…UseCase`
- Proíbe múltiplas interfaces no mesmo arquivo e `extends I…` na implementação
- Interface com **um único método**, chamado `call` (callable class), com no máximo **3 parâmetros** (acima disso, use uma classe de parâmetros)
- Documentação `///` repetida no `@override` da implementação quando a interface já documenta o método

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
class GetUserUsecase extends IGetUserUsecase { }

// ✅ Correto
abstract interface class IGetUserUseCase {
  Future<UserEntity> call(String id);
}

final class GetUserUseCase implements IGetUserUseCase {
  @override
  Future<UserEntity> call(String id) async { /* ... */ }
}
```

## Referências

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Effective Dart: Style — UpperCamelCase](https://dart.dev/effective-dart/style#do-name-types-using-uppercamelcase)
