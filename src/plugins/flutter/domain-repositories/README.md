# Domain Repositories Plugin

Plugin que valida repository interfaces na camada Domain da Clean Architecture.

## 📋 Descrição

Repository interfaces definem contratos de acesso a dados. São abstrações que a camada Data implementa, seguindo o Dependency Inversion Principle.

## ✨ Funcionalidades

- ✅ **Nomenclatura**: `*_repository_interface.dart`
- ✅ **Classe**: `abstract interface class INomeRepository`
- ✅ **Prefixo I**: Identifica interfaces
- ✅ **Retorno**: `Result<Failure, T>` (nunca void)
- ✅ **Inversão de Dependência**: Domain não depende de Data

## 📦 Instalação

```typescript
import { domainRepositories } from '@danger-bot/flutter';

export default async () => {
  await domainRepositories()();
};
```

## 💡 Exemplo Completo

### Arquivo: user_repository_interface.dart

```dart
import 'package:dartz/dartz.dart';
import '../entities/user_entity.dart';
import '../failures/user_failure.dart';

// ✅ CORRETO
abstract interface class IUserRepository {
  // Buscar usuário
  Future<Result<UserFailure, UserEntity>> getUser(String id);
  
  // Buscar todos
  Future<Result<UserFailure, List<UserEntity>>> getAllUsers();
  
  // Criar usuário
  Future<Result<UserFailure, UserEntity>> createUser(UserEntity user);
  
  // Atualizar usuário
  Future<Result<UserFailure, UserEntity>> updateUser(UserEntity user);
  
  // Deletar usuário (retorna NoParams, não void)
  Future<Result<UserFailure, NoParams>> deleteUser(String id);
  
  // Buscar com filtro
  Future<Result<UserFailure, List<UserEntity>>> searchUsers({
    String? name,
    String? email,
    bool? isActive,
  });
}

// NoParams para operações sem retorno
class NoParams extends Equatable {
  const NoParams();
  
  @override
  List<Object> get props => [];
}
```

## ❌ Erros Comuns

### Erro 1: Nomenclatura Incorreta

```dart
// ❌ INCORRETO - Arquivo sem _interface
// domain/repositories/user_repository.dart
abstract interface class IUserRepository {}

// Problema: Confunde com implementação
// data/repositories/user_repository.dart  // ❌ Nome igual!

// ✅ CORRETO
// domain/repositories/user_repository_interface.dart
abstract interface class IUserRepository {}

// data/repositories/user_repository.dart  // ✅ Nome diferente
final class UserRepository implements IUserRepository {}
```

### Erro 2: Sem Prefixo I

```dart
// ❌ INCORRETO
abstract interface class UserRepository {}

// Problema: Não fica claro que é interface
final class UserRepository implements UserRepository {} // Confuso!

// ✅ CORRETO
abstract interface class IUserRepository {}
final class UserRepository implements IUserRepository {} // Claro!
```

### Erro 3: abstract class (não interface)

```dart
// ❌ INCORRETO - abstract class (pode ter implementação)
abstract class IUserRepository {
  Future<UserEntity> getUser(String id);
  
  // ❌ Pode ter implementação
  Future<void> logAccess() async {
    print('Access logged');
  }
}

// ✅ CORRETO - abstract interface class (só contrato)
abstract interface class IUserRepository {
  Future<Result<Failure, UserEntity>> getUser(String id);
  // ✅ Não pode ter implementação
}
```

### Erro 4: Retorno void

```dart
// ❌ INCORRETO - void não permite tratamento de erro
abstract interface class IUserRepository {
  Future<void> deleteUser(String id);  // ❌ E se falhar?
  void updateCache();  // ❌ E se falhar?
}

// ✅ CORRETO - Result permite tratamento de erro
abstract interface class IUserRepository {
  Future<Result<UserFailure, NoParams>> deleteUser(String id);
  Result<UserFailure, NoParams> updateCache();
}

// Uso
final result = await repository.deleteUser('123');
result.fold(
  (failure) => print('Erro: $failure'),
  (_) => print('Sucesso!'),
);
```

## 🎯 Por Quê Abstract Interface Class?

### Comparação

```dart
// ❌ abstract class - Pode ser estendida
abstract class IUserRepository {
  Future<UserEntity> getUser(String id);
}

class UserRepository extends IUserRepository {  // extends!
  @override
  Future<UserEntity> getUser(String id) async {
    // implementação
  }
}

// ✅ abstract interface class - Só pode ser implementada
abstract interface class IUserRepository {
  Future<Result<Failure, UserEntity>> getUser(String id);
}

class UserRepository implements IUserRepository {  // implements!
  @override
  Future<Result<Failure, UserEntity>> getUser(String id) async {
    // implementação
  }
}
```

**Benefícios**:
1. **Contrato Puro**: Não pode ter implementação
2. **Implementação Obrigatória**: Todos métodos devem ser implementados
3. **Clareza**: Deixa explícito que é uma interface

## 📐 Estrutura Completa

### Repository com CRUD

```dart
abstract interface class IProductRepository {
  // CREATE
  Future<Result<ProductFailure, ProductEntity>> create(ProductEntity product);
  
  // READ
  Future<Result<ProductFailure, ProductEntity>> getById(String id);
  Future<Result<ProductFailure, List<ProductEntity>>> getAll();
  Future<Result<ProductFailure, List<ProductEntity>>> search(String query);
  
  // UPDATE
  Future<Result<ProductFailure, ProductEntity>> update(ProductEntity product);
  
  // DELETE
  Future<Result<ProductFailure, NoParams>> delete(String id);
  
  // CUSTOM
  Future<Result<ProductFailure, List<ProductEntity>>> getByCategory(String category);
  Future<Result<ProductFailure, List<ProductEntity>>> getFeatured();
  Future<Result<ProductFailure, int>> getCount();
}
```

### Repository com Paginação

```dart
abstract interface class IPostRepository {
  Future<Result<PostFailure, PaginatedResult<PostEntity>>> getPosts({
    required int page,
    required int pageSize,
    String? category,
    String? author,
  });
}

// Entity para paginação
final class PaginatedResult<T> {
  final List<T> items;
  final int totalCount;
  final int currentPage;
  final int totalPages;
  
  const PaginatedResult({
    required this.items,
    required this.totalCount,
    required this.currentPage,
    required this.totalPages,
  });
  
  bool get hasNextPage => currentPage < totalPages;
  bool get hasPreviousPage => currentPage > 1;
}
```

### Repository com Stream

```dart
abstract interface class IMessageRepository {
  // Stream para dados em tempo real
  Stream<Result<MessageFailure, List<MessageEntity>>> watchMessages(String chatId);
  
  // Operações normais
  Future<Result<MessageFailure, MessageEntity>> sendMessage(MessageEntity message);
  Future<Result<MessageFailure, NoParams>> deleteMessage(String messageId);
}
```

## 🔄 Implementação na Data Layer

```dart
// Domain: interface
abstract interface class IUserRepository {
  Future<Result<UserFailure, UserEntity>> getUser(String id);
}

// Data: implementação
final class UserRepository implements IUserRepository {
  final IUserRemoteDatasource remoteDatasource;
  final IUserLocalDatasource localDatasource;
  final NetworkInfo networkInfo;
  
  UserRepository({
    required this.remoteDatasource,
    required this.localDatasource,
    required this.networkInfo,
  });
  
  @override
  Future<Result<UserFailure, UserEntity>> getUser(String id) async {
    // Verifica conexão
    if (await networkInfo.isConnected) {
      try {
        // Busca remoto
        final model = await remoteDatasource.getUser(id);
        // Salva cache local
        await localDatasource.cacheUser(model);
        // Retorna entity
        return Right(model.toEntity());
      } on ServerException {
        return Left(ServerFailure());
      }
    } else {
      // Sem conexão, busca cache
      try {
        final model = await localDatasource.getCachedUser(id);
        return Right(model.toEntity());
      } on CacheException {
        return Left(CacheFailure());
      }
    }
  }
}
```

## 🧪 Testabilidade

### Mock para Testes

```dart
// Test: Mock do repository
class MockUserRepository extends Mock implements IUserRepository {}

void main() {
  late MockUserRepository mockRepository;
  late GetUserUseCase usecase;
  
  setUp(() {
    mockRepository = MockUserRepository();
    usecase = GetUserUseCase(repository: mockRepository);
  });
  
  test('deve retornar user quando repository retornar sucesso', () async {
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
  
  test('deve retornar failure quando repository falhar', () async {
    // Arrange
    when(mockRepository.getUser('1'))
      .thenAnswer((_) async => Left(ServerFailure()));
    
    // Act
    final result = await usecase('1');
    
    // Assert
    expect(result.isLeft(), true);
    verify(mockRepository.getUser('1')).called(1);
  });
}
```

## 📚 Referências

- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

## 📄 Licença

MIT
