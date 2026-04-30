# Presentation Viewmodels

Para arquivos `*_viewmodel.dart` / `*_view_model.dart` cuja classe estende **`ViewModelBase`**, garante que não haja dependência direta da camada **Data** e que métodos públicos trabalhem com **state** (retornando `void` ou `Future<void>`).

## O que verifica

1. **Imports proibidos** — `data/repositories`, `data/datasources`, `data/models`, barrel `data/data.dart`
2. **Campos proibidos** — `late final` / `final` cujo tipo sugere `Repository`, `Datasource` ou `Model`
3. **Retorno de métodos públicos** — métodos públicos devem retornar `void` ou `Future<void>` (forçar trabalhar com state)

## Severidade

- **Tipo:** `fail`

## Exemplos

```dart
// ❌ Errado — import da Data Layer
import 'package:app/data/models/user_model.dart';

// ✅ Correto
import 'package:app/domain/usecases/get_user_usecase.dart';
```

```dart
// ❌ Errado — método público retorna valor
Future<UserEntity?> fetchUser(String id) async {
  final result = await _getUserUseCase(id);
  return result.fold((f) => null, (user) => user);
}

// ✅ Correto — método público atualiza state
Future<void> fetchUser(String id) async {
  final result = await _getUserUseCase(id);
  result.fold(
    (f) => state = state.copyWith(error: f),
    (user) => state = state.copyWith(user: user),
  );
}
```

## Referências

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Bloc: prefer_void_public_cubit_methods](https://bloclibrary.dev/lint-rules/prefer_void_public_cubit_methods/)
