# Data Models Plugin

Plugin que valida models na camada Data.

## 📋 Descrição

Models são DTOs que fazem conversão entre JSON/DB e Entities. Devem ser imutáveis.

## ✨ Regras

- ✅ Arquivo: `*_model.dart`
- ✅ Classe: `final class NomeModel`
- ✅ Constructor: `const`
- ✅ Campos: `final`
- ✅ Métodos: `fromJson`, `toJson`, `toEntity`

## 📦 Uso

```typescript
import { dataModelsPlugin } from '@danger-bot/flutter';
export default async () => { await dataModelsPlugin.run(); };
```

## 💡 Exemplo Correto

```dart
// Arquivo: user_model.dart
import '../../domain/entities/user_entity.dart';

final class UserModel {
  final String id;
  final String name;
  final String email;
  
  const UserModel({
    required this.id,
    required this.name,
    required this.email,
  });
  
  // JSON → Model factory
  UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      name: json['name'],
      email: json['email'],
    );
  }
  
  // Model → JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
    };
  }
  
  // Model → Entity
  UserEntity toEntity() {
    return UserEntity(
      id: id,
      name: name,
      email: email,
    );
  }
  
  // Entity → Model factory
  UserModel.fromEntity(UserEntity entity) {
    return UserModel(
      id: entity.id,
      name: entity.name,
      email: entity.email,
    );
  }
}
```

## ❌ Exemplo Incorreto

```dart
// ❌ Arquivo: user.dart (deveria ser user_model.dart)
// ❌ Classe mutável class UserModel { String name; // ❌ Sem final }
```
