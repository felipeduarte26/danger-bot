# Domain Failures Plugin

Plugin que valida failures na camada Domain da Clean Architecture, garantindo hierarquias corretas com sealed classes.

## 📋 Descrição

Failures representam erros de negócio (não exceptions técnicas). Usando `sealed class`, o compilador garante que todos os casos sejam tratados.

## ✨ Funcionalidades

- ✅ **Primeira Classe Sealed**: `sealed class NomeFailure`
- ✅ **Subclasses Final**: `final class extends NomeFailure`
- ✅ **Sufixo Obrigatório**: Todas terminam com `Failure`
- ✅ **Pattern Matching**: Compilador garante exhaustiveness

## 📦 Instalação

```typescript
import { domainFailures } from '@danger-bot/flutter';

export default async () => {
  await domainFailures()();
};
```

## 💡 Exemplo Completo

### Arquivo: auth_failure.dart

```dart
// ✅ CORRETO - Sealed class permite exhaustiveness

sealed class AuthFailure {
  const AuthFailure();
}

final class InvalidCredentialsFailure extends AuthFailure {
  const InvalidCredentialsFailure();
}

final class UserNotFoundFailure extends AuthFailure {
  final String userId;
  const UserNotFoundFailure(this.userId);
}

final class AccountLockedFailure extends AuthFailure {
  final DateTime until;
  const AccountLockedFailure(this.until);
}

final class NetworkFailure extends AuthFailure {
  const NetworkFailure();
}

final class ServerFailure extends AuthFailure {
  final int statusCode;
  const ServerFailure(this.statusCode);
}
```

### Uso com Pattern Matching

```dart
// ✅ Compilador FORÇA você a tratar todos os casos
String getErrorMessage(AuthFailure failure) {
  return switch (failure) {
    InvalidCredentialsFailure() => 
      'Email ou senha incorretos',
    UserNotFoundFailure(userId: var id) => 
      'Usuário $id não encontrado',
    AccountLockedFailure(until: var date) => 
      'Conta bloqueada até ${date.toString()}',
    NetworkFailure() => 
      'Sem conexão com internet',
    ServerFailure(statusCode: var code) => 
      'Erro no servidor (código $code)',
    // ✅ Se adicionar novo Failure, compilador exige tratamento aqui!
  };
}

// ❌ Sem sealed, código compila mas pode crashar
String getErrorMessageUnsafe(Failure failure) {
  if (failure is InvalidCredentialsFailure) {
    return 'Email ou senha incorretos';
  }
  // ❌ Esqueceu outros casos = Runtime Error!
  return 'Erro desconhecido';
}
```

## ❌ Erros Comuns

### Erro 1: Class ao invés de Sealed

```dart
// ❌ INCORRETO - class normal
class AuthFailure {}
final class LoginFailure extends AuthFailure {}

// Problema: Compilador não força exhaustiveness
String getMessage(AuthFailure failure) {
  if (failure is LoginFailure) {
    return 'Login falhou';
  }
  // ❌ Outros casos não tratados, mas compila!
  return 'Erro';
}

// ✅ CORRETO - sealed class
sealed class AuthFailure {}
final class LoginFailure extends AuthFailure {}
final class LogoutFailure extends AuthFailure {}

// ✅ Compilador EXIGE todos os casos
String getMessage(AuthFailure failure) {
  return switch (failure) {
    LoginFailure() => 'Login falhou',
    LogoutFailure() => 'Logout falhou',
    // Se esquecer algum, não compila!
  };
}
```

### Erro 2: Abstract ao invés de Sealed

```dart
// ❌ INCORRETO - abstract permite extensão fora do arquivo
// arquivo: failures.dart
abstract class AuthFailure {}

// arquivo: outro_arquivo.dart
final class NovaFailure extends AuthFailure {} // ✅ Compila!

// Problema: Pattern matching não é exaustivo
String getMessage(AuthFailure failure) {
  return switch (failure) {
    LoginFailure() => 'Login falhou',
    // ❌ Não trata NovaFailure, mas compila!
  };
}

// ✅ CORRETO - sealed não permite extensão fora do arquivo
// arquivo: failures.dart
sealed class AuthFailure {}
final class LoginFailure extends AuthFailure {}

// arquivo: outro_arquivo.dart
final class NovaFailure extends AuthFailure {} // ❌ ERRO de compilação!
```

### Erro 3: Sem sufixo Failure

```dart
// ❌ INCORRETO
sealed class AuthError {}
final class InvalidCredentials extends AuthError {}

// ✅ CORRETO
sealed class AuthFailure {}
final class InvalidCredentialsFailure extends AuthFailure {}
```

## 🎯 Casos de Uso

### UseCase retornando Failure

```dart
// UseCase
final class LoginUseCase implements ILoginUseCase {
  final IAuthRepository repository;
  
  @override
  Future<Result<AuthFailure, UserEntity>> call(String email, String password) {
    return repository.login(email, password);
  }
}

// ViewModel tratando Failures
final class AuthViewModel extends ChangeNotifier {
  final ILoginUseCase loginUseCase;
  
  Future<void> login(String email, String password) async {
    final result = await loginUseCase(email, password);
    
    result.fold(
      (failure) => _handleFailure(failure),
      (user) => _handleSuccess(user),
    );
  }
  
  void _handleFailure(AuthFailure failure) {
    final message = switch (failure) {
      InvalidCredentialsFailure() => 
        'Email ou senha incorretos',
      UserNotFoundFailure() => 
        'Usuário não encontrado. Cadastre-se primeiro.',
      AccountLockedFailure(until: var date) => 
        'Sua conta está bloqueada até ${_formatDate(date)}',
      NetworkFailure() => 
        'Verifique sua conexão com internet',
      ServerFailure(statusCode: var code) => 
        'Erro no servidor. Tente novamente. (Código: $code)',
    };
    
    _showError(message);
  }
}
```

### Repository retornando Failure

```dart
final class AuthRepository implements IAuthRepository {
  final IAuthDatasource datasource;
  
  @override
  Future<Result<AuthFailure, UserEntity>> login(String email, String password) async {
    try {
      final model = await datasource.login(email, password);
      return Right(model.toEntity());
    } on InvalidCredentialsException {
      return Left(InvalidCredentialsFailure());
    } on UserNotFoundException catch (e) {
      return Left(UserNotFoundFailure(e.userId));
    } on NetworkException {
      return Left(NetworkFailure());
    } on ServerException catch (e) {
      return Left(ServerFailure(e.statusCode));
    } catch (e) {
      return Left(ServerFailure(500));
    }
  }
}
```

## 📊 Failure vs Exception

### Exception (Técnica - Data Layer)

```dart
// Exceptions são técnicas, não de negócio
class ServerException implements Exception {
  final int statusCode;
  ServerException(this.statusCode);
}

class NetworkException implements Exception {}
```

### Failure (Negócio - Domain Layer)

```dart
// Failures são de negócio, conhecidas pelo usuário
sealed class AuthFailure {}
final class InvalidCredentialsFailure extends AuthFailure {}
final class NetworkFailure extends AuthFailure {}
```

### Conversão Exception → Failure

```dart
// Data Layer captura Exception
try {
  final model = await datasource.login(email, password);
  return Right(model.toEntity());
} on ServerException catch (e) {
  // Converte Exception técnica → Failure de negócio
  return Left(ServerFailure(e.statusCode));
}
```

## 🎨 Organizando Failures

### Por Feature

```
domain/
  failures/
    auth_failure.dart       # Failures de autenticação
    product_failure.dart    # Failures de produtos
    payment_failure.dart    # Failures de pagamento
    failures.dart           # Barrel file
```

### Por Tipo

```
domain/
  failures/
    validation_failure.dart  # Validações
    network_failure.dart     # Rede
    database_failure.dart    # Banco de dados
    failures.dart            # Barrel file
```

## 📚 Referências

- [Sealed Classes - Dart 3](https://dart.dev/language/class-modifiers#sealed)
- [Pattern Matching](https://dart.dev/language/patterns)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

## 📄 Licença

MIT
