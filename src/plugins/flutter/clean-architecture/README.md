# Clean Architecture Plugin

Plugin que detecta violações entre as camadas da Clean Architecture, garantindo separação de responsabilidades.

## 📋 Descrição

A Clean Architecture separa o código em 3 camadas independentes:
- **Domain**: Regras de negócio puras (entities, usecases, interfaces)
- **Data**: Implementação de dados (repositories, datasources, models)
- **Presentation**: UI e apresentação (pages, widgets, viewmodels)

Este plugin detecta quando uma camada importa código de outra camada de forma indevida.

## ✨ Funcionalidades

- ✅ **Detecção de Imports Inválidos**: Domain não pode importar Data ou Presentation
- ✅ **Validação de Dependências**: Data não pode importar Presentation
- ✅ **ViewModels**: ViewModels devem usar UseCases, não Repositories
- ✅ **Mensagens Educativas**: Explica a violação e como corrigir

## 📦 Instalação

```typescript
import { cleanArchitecture } from '@danger-bot/flutter';

export default async () => {
  await cleanArchitecture()();
};
```

## 🏛️ Regras da Clean Architecture

### Fluxo de Dependências

```
┌─────────────────┐
│  PRESENTATION   │  (UI, Widgets, ViewModels, States)
└────────┬────────┘
         │ ✓ Pode depender
         ↓
┌─────────────────┐
│     DOMAIN      │  (Entities, UseCases, Repository Interfaces)
└────────┬────────┘
         │ ✓ Pode depender
         ↓
┌─────────────────┐
│      DATA       │  (Repository Impl, DataSources, Models)
└─────────────────┘
```

**Regra de Ouro**: Dependências sempre apontam **para dentro** (para Domain).

## ❌ Violações Detectadas

### 1. Domain → Data (PROIBIDO)

```dart
// ❌ VIOLAÇÃO - Domain importando Data
// domain/usecases/get_user_usecase.dart
import '../../../data/models/user_model.dart'; // ❌ ERRO!

final class GetUserUseCase {
  Future<UserModel> call() { } // ❌ Usando Model do Data
}

// ✅ CORRETO - Domain usa apenas Domain
// domain/usecases/get_user_usecase.dart
import '../entities/user_entity.dart'; // ✅ OK

final class GetUserUseCase {
  Future<UserEntity> call() { } // ✅ Usando Entity do Domain
}
```

**Por quê?** Domain deve ser independente de implementação. Models são detalhes de implementação.

### 2. Domain → Presentation (PROIBIDO)

```dart
// ❌ VIOLAÇÃO - Domain importando Presentation
// domain/usecases/show_alert_usecase.dart
import '../../../presentation/widgets/alert_dialog.dart'; // ❌ ERRO!

final class ShowAlertUseCase {
  void call() {
    showDialog(AlertDialog()); // ❌ UI no Domain!
  }
}

// ✅ CORRETO - Domain retorna dados, UI decide como mostrar
// domain/usecases/validate_form_usecase.dart
import '../failures/validation_failure.dart';

final class ValidateFormUseCase {
  Result<ValidationFailure, bool> call(String input) {
    if (input.isEmpty) {
      return Left(ValidationFailure('Input vazio')); // ✅ Só dados
    }
    return Right(true);
  }
}

// presentation/pages/form_page.dart
class FormPage extends StatelessWidget {
  void _validate() {
    final result = validateUseCase(input);
    result.fold(
      (failure) => showDialog(...), // ✅ UI decide como mostrar
      (success) => navigate(),
    );
  }
}
```

**Por quê?** Domain não deve saber sobre UI. Apenas retorna dados.

### 3. Data → Presentation (PROIBIDO)

```dart
// ❌ VIOLAÇÃO - Data importando Presentation
// data/repositories/user_repository.dart
import '../../presentation/viewmodels/user_viewmodel.dart'; // ❌ ERRO!

final class UserRepository {
  Future<void> updateUser(UserViewModel vm) { } // ❌ ViewModel no Data!
}

// ✅ CORRETO - Data usa Domain
// data/repositories/user_repository.dart
import '../../domain/entities/user_entity.dart'; // ✅ OK

final class UserRepository implements IUserRepository {
  @override
  Future<Result<Failure, UserEntity>> updateUser(UserEntity entity) {
    final model = UserModel.fromEntity(entity); // Data → Model
    await api.update(model);
    return Right(entity);
  }
}
```

**Por quê?** Data não deve saber sobre UI. Usa entities para comunicação.

### 4. ViewModel → Repository (PROIBIDO)

```dart
// ❌ VIOLAÇÃO - ViewModel usando Repository diretamente
// presentation/viewmodels/user_viewmodel.dart
import '../../domain/repositories/user_repository_interface.dart'; // ❌ ERRO!

final class UserViewModel {
  final IUserRepository repository; // ❌ Pula UseCase!
  
  Future<void> loadUser() {
    final result = await repository.getUser(id); // ❌ Direto no repo
  }
}

// ✅ CORRETO - ViewModel usa UseCase
// presentation/viewmodels/user_viewmodel.dart
import '../../domain/usecases/get_user_usecase.dart'; // ✅ OK

final class UserViewModel {
  final IGetUserUseCase getUserUseCase; // ✅ Usa UseCase
  
  Future<void> loadUser() {
    final result = await getUserUseCase(id); // ✅ Através do UseCase
  }
}
```

**Por quê?** ViewModels devem depender de UseCases, não Repositories. UseCases encapsulam lógica de negócio.

## 📐 Estrutura Correta

### Projeto Completo

```
lib/
├── core/
│   ├── errors/
│   │   ├── failures.dart          # Base Failure
│   │   └── exceptions.dart        # Base Exception
│   └── utils/
│       └── result.dart            # Either/Result type
│
├── features/
│   └── user/
│       ├── domain/
│       │   ├── entities/
│       │   │   └── user_entity.dart       # ✅ Final class, const
│       │   ├── failures/
│       │   │   └── user_failure.dart      # ✅ Sealed class
│       │   ├── repositories/
│       │   │   └── user_repository_interface.dart # ✅ Abstract interface
│       │   └── usecases/
│       │       ├── get_user_usecase.dart  # ✅ Interface + Impl
│       │       └── usecases.dart          # ✅ Barrel file
│       │
│       ├── data/
│       │   ├── models/
│       │   │   └── user_model.dart        # ✅ fromJson/toJson/toEntity
│       │   ├── datasources/
│       │   │   └── user_datasource.dart   # ✅ API calls
│       │   └── repositories/
│       │       └── user_repository.dart   # ✅ Implements interface
│       │
│       └── presentation/
│           ├── pages/
│           │   └── user_page.dart         # ✅ UI
│           ├── widgets/
│           │   └── user_card.dart         # ✅ UI components
│           ├── viewmodels/
│           │   └── user_viewmodel.dart    # ✅ Usa UseCases
│           └── states/
│               └── user_state.dart        # ✅ Sealed class
```

### Fluxo de Dados Correto

```dart
// 1️⃣ PRESENTATION (User toca botão)
class UserPage extends StatelessWidget {
  final UserViewModel viewModel;
  
  void _loadUser() {
    viewModel.loadUser(); // Chama ViewModel
  }
}

// 2️⃣ PRESENTATION (ViewModel usa UseCase)
class UserViewModel extends ChangeNotifier {
  final IGetUserUseCase getUserUseCase; // ✅ Depende de UseCase
  
  Future<void> loadUser() {
    final result = await getUserUseCase('user-123'); // Chama UseCase
    result.fold(
      (failure) => state = ErrorState(failure),
      (user) => state = LoadedState(user),
    );
  }
}

// 3️⃣ DOMAIN (UseCase orquestra lógica)
class GetUserUseCase implements IGetUserUseCase {
  final IUserRepository repository; // ✅ Depende de interface
  
  @override
  Future<Result<Failure, UserEntity>> call(String id) {
    return repository.getUser(id); // Chama Repository (através da interface)
  }
}

// 4️⃣ DATA (Repository implementa interface)
class UserRepository implements IUserRepository {
  final UserDatasource datasource; // ✅ Usa Datasource
  
  @override
  Future<Result<Failure, UserEntity>> getUser(String id) async {
    try {
      final model = await datasource.fetchUser(id); // Chama Datasource
      return Right(model.toEntity()); // Converte Model → Entity
    } catch (e) {
      return Left(ServerFailure());
    }
  }
}

// 5️⃣ DATA (Datasource faz chamada HTTP)
class UserDatasource {
  final http.Client client;
  
  Future<UserModel> fetchUser(String id) async {
    final response = await client.get('/users/$id');
    return UserModel.fromJson(response.data); // JSON → Model
  }
}
```

## 🎯 Benefícios da Clean Architecture

### 1. Testabilidade

```dart
// ✅ Fácil testar - mock de UseCase
test('ViewModel carrega usuário', () async {
  final mockUseCase = MockGetUserUseCase();
  final viewModel = UserViewModel(getUserUseCase: mockUseCase);
  
  when(mockUseCase.call('123'))
    .thenAnswer((_) => Right(UserEntity(id: '123', name: 'John')));
  
  await viewModel.loadUser();
  
  expect(viewModel.state, isA<LoadedState>());
});
```

### 2. Independência de Framework

```dart
// ✅ Domain não conhece Flutter
// Pode ser reutilizado em CLI, Web, Mobile
final class UserEntity {
  final String name;
  const UserEntity({required this.name});
}
```

### 3. Fácil Manutenção

```dart
// ✅ Trocar API não afeta Domain ou Presentation
// data/datasources/user_datasource.dart

// Antes: REST API
class UserDatasource {
  Future<UserModel> fetchUser(String id) {
    return api.get('/users/$id');
  }
}

// Depois: GraphQL
class UserDatasource {
  Future<UserModel> fetchUser(String id) {
    return graphql.query('{ user(id: "$id") { name } }');
  }
}

// ✅ Domain e Presentation continuam iguais!
```

## 📚 Referências

- [Clean Architecture - Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Flutter Clean Architecture](https://resocoder.com/flutter-clean-architecture-tdd/)
- [Dependency Rule](https://khalilstemmler.com/wiki/dependency-rule/)

## 📄 Licença

MIT
