# Domain UseCases Plugin

Plugin que valida usecases na camada Domain da Clean Architecture.

## 📋 Descrição

UseCases encapsulam lógica de negócio específica. Cada UseCase representa uma ação única que o usuário pode fazer (Login, GetProducts, DeleteUser, etc).

## ✨ Funcionalidades

- ✅ **Nomenclatura**: `*_usecase.dart`
- ✅ **Interface**: `abstract interface class INomeUseCase`
- ✅ **Implementação**: `final class NomeUseCase implements INomeUseCase`
- ✅ **Sufixo Correto**: `UseCase` (não `Usecase`)
- ✅ **Implements** (não extends)
- ✅ **Single Responsibility**: 1 UseCase = 1 ação

## 📦 Instalação

```typescript
import { domainUseCases } from '@danger-bot/flutter';

export default async () => {
  await domainUseCases()();
};
```

## 💡 Exemplo Completo

### Arquivo: get_user_usecase.dart

```dart
import 'package:dartz/dartz.dart';
import '../entities/user_entity.dart';
import '../failures/user_failure.dart';
import '../repositories/user_repository_interface.dart';

// ✅ Interface
abstract interface class IGetUserUseCase {
  Future<Result<UserFailure, UserEntity>> call(String userId);
}

// ✅ Implementação
final class GetUserUseCase implements IGetUserUseCase {
  final IUserRepository repository;
  
  const GetUserUseCase({required this.repository});
  
  @override
  Future<Result<UserFailure, UserEntity>> call(String userId) async {
    // Validação de entrada
    if (userId.isEmpty) {
      return Left(InvalidUserIdFailure());
    }
    
    // Chama repository
    return await repository.getUser(userId);
  }
}
```

## ❌ Erros Comuns

### Erro 1: Sufixo Incorreto

```dart
// ❌ INCORRETO - "Usecase" (c minúsculo)
abstract interface class IGetUserUsecase {}
final class GetUserUsecase implements IGetUserUsecase {}

// ✅ CORRETO - "UseCase" (C maiúsculo)
abstract interface class IGetUserUseCase {}
final class GetUserUseCase implements IGetUserUseCase {}
```

### Erro 2: extends ao invés de implements

```dart
// ❌ INCORRETO - extends
final class GetUserUseCase extends IGetUserUseCase {}

// ✅ CORRETO - implements
final class GetUserUseCase implements IGetUserUseCase {}
```

### Erro 3: Sem Interface

```dart
// ❌ INCORRETO - Só implementação
final class GetUserUseCase {
  final IUserRepository repository;
  Future<UserEntity> call(String id) { }
}

// Problema: Difícil mockar em testes
// Problema: Não segue Dependency Inversion

// ✅ CORRETO - Interface + Implementação
abstract interface class IGetUserUseCase {
  Future<Result<Failure, UserEntity>> call(String id);
}

final class GetUserUseCase implements IGetUserUseCase {
  final IUserRepository repository;
  
  @override
  Future<Result<Failure, UserEntity>> call(String id) {
    return repository.getUser(id);
  }
}
```

### Erro 4: Múltiplas Responsabilidades

```dart
// ❌ INCORRETO - UseCase faz múltiplas coisas
final class UserUseCase {
  Future<User> getUser(String id) {}
  Future<List<User>> getAllUsers() {}
  Future<void> deleteUser(String id) {}
  Future<User> updateUser(User user) {}
}

// ✅ CORRETO - Um UseCase por ação
final class GetUserUseCase implements IGetUserUseCase {}
final class GetAllUsersUseCase implements IGetAllUsersUseCase {}
final class DeleteUserUseCase implements IDeleteUserUseCase {}
final class UpdateUserUseCase implements IUpdateUserUseCase {}
```

## 🎯 Padrões de UseCases

### UseCase Simples (apenas delega)

```dart
abstract interface class IGetUserUseCase {
  Future<Result<UserFailure, UserEntity>> call(String id);
}

final class GetUserUseCase implements IGetUserUseCase {
  final IUserRepository repository;
  
  const GetUserUseCase({required this.repository});
  
  @override
  Future<Result<UserFailure, UserEntity>> call(String id) {
    return repository.getUser(id); // Apenas delega
  }
}
```

### UseCase com Validação

```dart
abstract interface class ICreateUserUseCase {
  Future<Result<UserFailure, UserEntity>> call({
    required String name,
    required String email,
    required String password,
  });
}

final class CreateUserUseCase implements ICreateUserUseCase {
  final IUserRepository repository;
  final IEmailValidator emailValidator;
  
  const CreateUserUseCase({
    required this.repository,
    required this.emailValidator,
  });
  
  @override
  Future<Result<UserFailure, UserEntity>> call({
    required String name,
    required String email,
    required String password,
  }) async {
    // ✅ Validações de negócio
    if (name.length < 3) {
      return Left(InvalidNameFailure('Nome deve ter 3+ caracteres'));
    }
    
    if (!emailValidator.isValid(email)) {
      return Left(InvalidEmailFailure());
    }
    
    if (password.length < 8) {
      return Left(WeakPasswordFailure('Senha deve ter 8+ caracteres'));
    }
    
    // Cria entity
    final user = UserEntity(
      id: '', // Será gerado pelo backend
      name: name,
      email: email,
    );
    
    // Delega para repository
    return await repository.createUser(user);
  }
}
```

### UseCase com Múltiplos Repositories

```dart
abstract interface class ITransferMoneyUseCase {
  Future<Result<TransferFailure, TransactionEntity>> call({
    required String fromAccountId,
    required String toAccountId,
    required double amount,
  });
}

final class TransferMoneyUseCase implements ITransferMoneyUseCase {
  final IAccountRepository accountRepository;
  final ITransactionRepository transactionRepository;
  final INotificationRepository notificationRepository;
  
  const TransferMoneyUseCase({
    required this.accountRepository,
    required this.transactionRepository,
    required this.notificationRepository,
  });
  
  @override
  Future<Result<TransferFailure, TransactionEntity>> call({
    required String fromAccountId,
    required String toAccountId,
    required double amount,
  }) async {
    // 1. Valida contas
    final fromResult = await accountRepository.getAccount(fromAccountId);
    if (fromResult.isLeft()) return Left(InvalidAccountFailure());
    
    final toResult = await accountRepository.getAccount(toAccountId);
    if (toResult.isLeft()) return Left(InvalidAccountFailure());
    
    final fromAccount = fromResult.getOrElse(() => throw Exception());
    final toAccount = toResult.getOrElse(() => throw Exception());
    
    // 2. Valida saldo
    if (fromAccount.balance < amount) {
      return Left(InsufficientBalanceFailure());
    }
    
    // 3. Cria transação
    final transaction = TransactionEntity(
      id: generateId(),
      from: fromAccountId,
      to: toAccountId,
      amount: amount,
      timestamp: DateTime.now(),
    );
    
    // 4. Processa transferência
    final transResult = await transactionRepository.create(transaction);
    if (transResult.isLeft()) return Left(TransactionFailedFailure());
    
    // 5. Envia notificação
    await notificationRepository.notify(
      userId: toAccountId,
      message: 'Você recebeu \$$amount',
    );
    
    return Right(transaction);
  }
}
```

### UseCase sem Parâmetros

```dart
abstract interface class IGetCurrentUserUseCase {
  Future<Result<UserFailure, UserEntity>> call();
}

final class GetCurrentUserUseCase implements IGetCurrentUserUseCase {
  final IAuthRepository authRepository;
  final IUserRepository userRepository;
  
  const GetCurrentUserUseCase({
    required this.authRepository,
    required this.userRepository,
  });
  
  @override
  Future<Result<UserFailure, UserEntity>> call() async {
    // Pega ID do usuário logado
    final authResult = await authRepository.getCurrentUserId();
    if (authResult.isLeft()) {
      return Left(NotAuthenticatedFailure());
    }
    
    final userId = authResult.getOrElse(() => '');
    
    // Busca dados do usuário
    return await userRepository.getUser(userId);
  }
}
```

### UseCase com Params Class

```dart
// Params class para múltiplos parâmetros
final class SearchUsersParams {
  final String? name;
  final String? email;
  final int? minAge;
  final int? maxAge;
  final bool? isActive;
  
  const SearchUsersParams({
    this.name,
    this.email,
    this.minAge,
    this.maxAge,
    this.isActive,
  });
}

abstract interface class ISearchUsersUseCase {
  Future<Result<UserFailure, List<UserEntity>>> call(SearchUsersParams params);
}

final class SearchUsersUseCase implements ISearchUsersUseCase {
  final IUserRepository repository;
  
  const SearchUsersUseCase({required this.repository});
  
  @override
  Future<Result<UserFailure, List<UserEntity>>> call(SearchUsersParams params) {
    return repository.searchUsers(
      name: params.name,
      email: params.email,
      minAge: params.minAge,
      maxAge: params.maxAge,
      isActive: params.isActive,
    );
  }
}
```

## 🔄 Uso em ViewModels

```dart
final class UserViewModel extends ChangeNotifier {
  final IGetUserUseCase getUserUseCase;
  final IUpdateUserUseCase updateUserUseCase;
  final IDeleteUserUseCase deleteUserUseCase;
  
  UserViewModel({
    required this.getUserUseCase,
    required this.updateUserUseCase,
    required this.deleteUserUseCase,
  });
  
  UserState _state = UserInitialState();
  UserState get state => _state;
  
  Future<void> loadUser(String id) async {
    _state = UserLoadingState();
    notifyListeners();
    
    final result = await getUserUseCase(id);
    
    result.fold(
      (failure) => _state = UserErrorState(failure.message),
      (user) => _state = UserLoadedState(user),
    );
    notifyListeners();
  }
  
  Future<void> updateUser(UserEntity user) async {
    final result = await updateUserUseCase(user);
    
    result.fold(
      (failure) => _showError(failure.message),
      (_) => _showSuccess('Usuário atualizado'),
    );
  }
  
  Future<void> deleteUser(String id) async {
    final result = await deleteUserUseCase(id);
    
    result.fold(
      (failure) => _showError(failure.message),
      (_) => Navigator.pop(),
    );
  }
}
```

## 🧪 Testabilidade

```dart
void main() {
  late MockUserRepository mockRepository;
  late GetUserUseCase usecase;
  
  setUp(() {
    mockRepository = MockUserRepository();
    usecase = GetUserUseCase(repository: mockRepository);
  });
  
  group('GetUserUseCase', () {
    test('deve retornar user quando id válido', () async {
      // Arrange
      final user = UserEntity(id: '1', name: 'John');
      when(mockRepository.getUser('1'))
        .thenAnswer((_) async => Right(user));
      
      // Act
      final result = await usecase('1');
      
      // Assert
      expect(result, Right(user));
      verify(mockRepository.getUser('1')).called(1);
    });
    
    test('deve retornar failure quando id vazio', () async {
      // Act
      final result = await usecase('');
      
      // Assert
      expect(result.isLeft(), true);
      verifyNever(mockRepository.getUser(any));
    });
  });
}
```

## 📚 Referências

- [Use Case - Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Single Responsibility Principle](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- [Dependency Inversion](https://en.wikipedia.org/wiki/Dependency_inversion_principle)

## 📄 Licença

MIT
