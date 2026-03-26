# Presentation Viewmodels

Para arquivos `*_viewmodel.dart` / `*_view_model.dart` cuja classe estende **`ViewModelBase`**, garante que não haja dependência direta da camada **Data** (imports ou campos).

## O que verifica

- Imports de `data/repositories`, `data/datasources`, `data/models`, barrel `data/data.dart`
- Campos `late final` / `final` cujo tipo sugere `Repository`, `Datasource` ou `Model` (heurística)

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
import 'package:app/data/models/user_model.dart';

// ✅ Correto
import 'package:app/domain/usecases/get_user_usecase.dart';
```

## Referências

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
