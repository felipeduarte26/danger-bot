# Data Datasources Plugin

Plugin que valida nomenclatura de datasources na camada Data.

## 📋 Descrição

Datasources fazem chamadas HTTP, acessam database local, etc. Devem seguir nomenclatura padrão.

## ✨ Regras

- ✅ Arquivo: \`*_datasource.dart\`
- ✅ Interface + Implementação
- ✅ Sufixo: \`Datasource\`

## 📦 Uso

\`\`\`typescript
import { dataDatasources } from '@danger-bot/flutter';
export default async () => { await dataDatasources.run(); };
\`\`\`

## 💡 Exemplo Correto

\`\`\`dart
// Arquivo: user_datasource.dart

// Interface
abstract interface class IUserDatasource {
  Future<UserModel> fetchUser(String id);
  Future<void> saveUser(UserModel user);
}

// Implementação Remote
final class UserRemoteDatasource implements IUserDatasource {
  final http.Client client;
  
  UserRemoteDatasource({required this.client});
  
  @override
  Future<UserModel> fetchUser(String id) async {
    final response = await client.get('/users/$id');
    return UserModel.fromJson(response.data);
  }
  
  @override
  Future<void> saveUser(UserModel user) async {
    await client.post('/users', body: user.toJson());
  }
}

// Implementação Local
final class UserLocalDatasource implements IUserDatasource {
  final Database db;
  
  @override
  Future<UserModel> fetchUser(String id) async {
    final data = await db.query('users', where: 'id = ?', whereArgs: [id]);
    return UserModel.fromMap(data.first);
  }
}
\`\`\`

## ❌ Exemplo Incorreto

\`\`\`dart
// ❌ Arquivo: user_api.dart (deveria ser user_datasource.dart)
// ❌ Classe: UserApi (deveria ter Datasource no nome)
\`\`\`
