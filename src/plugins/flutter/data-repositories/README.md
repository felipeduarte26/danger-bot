# Data Repositories Plugin

Plugin que valida repository implementations na camada Data.

## 📋 Descrição

Repositories implementam as interfaces definidas no Domain, usando Datasources.

## ✨ Regras

- ✅ Arquivo: \`*_repository.dart\` (não interface)
- ✅ Implementa interface do Domain
- ✅ Usa Datasources
- ✅ Converte Model ↔ Entity

## 📦 Uso

\`\`\`typescript
import { dataRepositories } from '@danger-bot/flutter';
export default async () => { await dataRepositories.run(); };
\`\`\`

## 💡 Exemplo Correto

\`\`\`dart
// Arquivo: user_repository.dart
import '../../domain/repositories/user_repository_interface.dart';
import '../../domain/entities/user_entity.dart';
import '../datasources/user_datasource.dart';
import '../models/user_model.dart';

final class UserRepository implements IUserRepository {
  final IUserDatasource remoteDatasource;
  final IUserDatasource localDatasource;
  
  UserRepository({
    required this.remoteDatasource,
    required this.localDatasource,
  });
  
  @override
  Future<Result<Failure, UserEntity>> getUser(String id) async {
    try {
      // Tenta remote primeiro
      final model = await remoteDatasource.fetchUser(id);
      // Salva local
      await localDatasource.saveUser(model);
      // Retorna Entity
      return Right(model.toEntity());
    } on ServerException {
      // Fallback para local
      try {
        final model = await localDatasource.fetchUser(id);
        return Right(model.toEntity());
      } catch (e) {
        return Left(CacheFailure());
      }
    } catch (e) {
      return Left(ServerFailure());
    }
  }
}
\`\`\`
