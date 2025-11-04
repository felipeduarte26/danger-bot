# Domain Entities Plugin

Plugin que valida as regras para entities na camada Domain da Clean Architecture.

## 📋 Descrição

Garante que todas as entities na camada Domain sigam os padrões da Clean Architecture, incluindo nomenclatura de arquivos, classes imutáveis, uso de `final class`, e constructors `const`.

## ✨ Funcionalidades

- ✅ **Nomenclatura de Arquivo**: Valida sufixo `_entity.dart`
- ✅ **Nomenclatura de Classe**: Valida sufixo `Entity` na classe
- ✅ **Imutabilidade**: Garante uso de `final class`
- ✅ **Constructor Const**: Verifica uso de `const` constructor
- ✅ **Campos Finais**: Valida que todos os campos são `final`
- ✅ **Mensagens Educativas**: Explica princípios da Clean Architecture

## 📦 Instalação

```typescript
import { domainEntities } from '@danger-bot/flutter';

export default async () => {
  await domainEntities()();
};
```

## 📊 Regras Aplicadas

### 1. Nomenclatura de Arquivo

**Regra**: Arquivos devem terminar com `_entity.dart`

```
✅ CORRETO:
domain/entities/user_entity.dart
domain/entities/product_entity.dart
domain/entities/order_entity.dart

❌ INCORRETO:
domain/entities/user.dart
domain/entities/User.dart
domain/entities/user_model.dart
```

### 2. Nomenclatura de Classe

**Regra**: Classes devem terminar com `Entity`

```dart
// ✅ CORRETO
final class UserEntity { }
final class ProductEntity { }
final class OrderEntity { }

// ❌ INCORRETO
final class User { }
final class UserModel { }
final class UserDTO { }
```

### 3. Uso de `final class`

**Regra**: Entities devem ser `final class` (não podem ser estendidas)

```dart
// ✅ CORRETO
final class UserEntity {
  final String id;
  final String name;
  
  const UserEntity({
    required this.id,
    required this.name,
  });
}

// ❌ INCORRETO
class UserEntity { }  // Pode ser estendida
abstract class UserEntity { }  // Abstract é para contratos
sealed class UserEntity { }  // Sealed é para hierarchies
```

**Por quê `final class`?**
- Previne herança não intencional
- Garante imutabilidade
- Performance: compilador pode otimizar
- Clareza: deixa explícito que é uma entity de valor

### 4. Constructor Const

**Regra**: Entities devem ter constructor `const`

```dart
// ✅ CORRETO
final class UserEntity {
  final String id;
  final String name;
  
  const UserEntity({
    required this.id,
    required this.name,
  });
}

// ❌ INCORRETO
final class UserEntity {
  final String id;
  final String name;
  
  UserEntity({  // Sem 'const'
    required this.id,
    required this.name,
  });
}
```

**Benefícios do `const`:**
- Compile-time constants
- Economia de memória (instâncias iguais compartilham memória)
- Performance melhorada
- Garante verdadeira imutabilidade

### 5. Campos Finais

**Regra**: Todos os campos devem ser `final`

```dart
// ✅ CORRETO
final class UserEntity {
  final String id;
  final String name;
  final String email;
  final DateTime createdAt;
}

// ❌ INCORRETO
final class UserEntity {
  String id;  // Mutável
  var name;   // Mutável
  final String email;
}
```

## 💡 Exemplos Completos

### Entity Simples

```dart
// Arquivo: user_entity.dart

final class UserEntity {
  final String id;
  final String name;
  final String email;

  const UserEntity({
    required this.id,
    required this.name,
    required this.email,
  });
}
```

### Entity com Métodos

```dart
// Arquivo: user_entity.dart

import 'package:equatable/equatable.dart';

final class UserEntity extends Equatable {
  final String id;
  final String name;
  final String email;
  final bool isActive;

  const UserEntity({
    required this.id,
    required this.name,
    required this.email,
    this.isActive = true,
  });

  // Métodos que retornam novas instâncias (imutabilidade)
  UserEntity copyWith({
    String? id,
    String? name,
    String? email,
    bool? isActive,
  }) {
    return UserEntity(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      isActive: isActive ?? this.isActive,
    );
  }

  // Para comparação
  @override
  List<Object?> get props => [id, name, email, isActive];
}
```

### Entity Complexa

```dart
// Arquivo: order_entity.dart

import 'package:equatable/equatable.dart';
import 'product_entity.dart';
import 'user_entity.dart';

final class OrderEntity extends Equatable {
  final String id;
  final UserEntity user;
  final List<ProductEntity> products;
  final double totalAmount;
  final DateTime createdAt;
  final OrderStatus status;

  const OrderEntity({
    required this.id,
    required this.user,
    required this.products,
    required this.totalAmount,
    required this.createdAt,
    required this.status,
  });

  // Computed properties (não armazenam estado)
  int get totalItems => products.length;
  
  bool get isPaid => status == OrderStatus.paid;
  
  bool get canCancel => 
    status == OrderStatus.pending || 
    status == OrderStatus.processing;

  OrderEntity copyWith({
    String? id,
    UserEntity? user,
    List<ProductEntity>? products,
    double? totalAmount,
    DateTime? createdAt,
    OrderStatus? status,
  }) {
    return OrderEntity(
      id: id ?? this.id,
      user: user ?? this.user,
      products: products ?? this.products,
      totalAmount: totalAmount ?? this.totalAmount,
      createdAt: createdAt ?? this.createdAt,
      status: status ?? this.status,
    );
  }

  @override
  List<Object?> get props => [
    id, user, products, totalAmount, createdAt, status
  ];
}

enum OrderStatus {
  pending,
  processing,
  paid,
  shipped,
  delivered,
  cancelled;
}
```

## 🎯 Clean Architecture: Domain Layer

### O Que é uma Entity?

**Entity** representa um **conceito de negócio** fundamental. É um objeto que:

- ✅ Tem identidade única (geralmente um ID)
- ✅ É **imutável** (não muda após criação)
- ✅ Contém apenas **lógica de negócio** (não UI, não persistência)
- ✅ É **independente** de frameworks
- ✅ Define **regras de negócio**

### Entity vs Model vs DTO

| Aspecto | Entity (Domain) | Model (Data) | DTO (API) |
|---------|----------------|--------------|-----------|
| **Camada** | Domain | Data | Data |
| **Propósito** | Regras de negócio | Conversão de dados | Transporte de dados |
| **Mutabilidade** | Imutável | Imutável | Pode ser mutável |
| **Dependências** | Nenhuma | JSON, APIs | JSON, APIs |
| **Sufixo** | `Entity` | `Model` | `DTO` ou `Response` |

```dart
// 🏛️ ENTITY (Domain)
final class UserEntity {
  final String id;
  final String name;
  final String email;
  
  const UserEntity({...});
  
  // Lógica de negócio
  bool get isEmailValid => email.contains('@');
}

// 📦 MODEL (Data)
final class UserModel {
  final String id;
  final String name;
  final String email;
  
  // Conversão de/para JSON
  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(...);
  Map<String, dynamic> toJson() => {...};
  
  // Conversão para Entity
  UserEntity toEntity() => UserEntity(id: id, name: name, email: email);
}

// 🌐 DTO (Data - opcional)
class UserResponseDTO {
  String? id;
  String? name;
  String? email;
  
  UserResponseDTO.fromJson(Map<String, dynamic> json)
    : id = json['id'],
      name = json['name'],
      email = json['email'];
}
```

## 🚨 Erros Comuns e Soluções

### Erro 1: Entity Mutável

```dart
// ❌ PROBLEMA
class UserEntity {
  String name;  // Mutável
  
  UserEntity(this.name);
  
  void updateName(String newName) {
    name = newName;  // Mutação!
  }
}

// ✅ SOLUÇÃO
final class UserEntity {
  final String name;
  
  const UserEntity({required this.name});
  
  // Retorna nova instância
  UserEntity withName(String newName) {
    return UserEntity(name: newName);
  }
}
```

### Erro 2: Lógica de UI na Entity

```dart
// ❌ PROBLEMA
final class UserEntity {
  final String name;
  
  const UserEntity({required this.name});
  
  // Lógica de UI não pertence aqui!
  Color getUserColor() {
    return name.length > 10 ? Colors.blue : Colors.red;
  }
}

// ✅ SOLUÇÃO
final class UserEntity {
  final String name;
  
  const UserEntity({required this.name});
  
  // Apenas lógica de negócio
  bool get hasLongName => name.length > 10;
}

// UI (Presentation Layer)
class UserWidget extends StatelessWidget {
  final UserEntity user;
  
  Color get userColor {
    return user.hasLongName ? Colors.blue : Colors.red;
  }
}
```

### Erro 3: Dependência de Framework

```dart
// ❌ PROBLEMA
import 'package:flutter/material.dart';  // ❌ Flutter na Domain!

final class UserEntity {
  final String name;
  final Color favoriteColor;  // ❌ UI na Domain!
  
  const UserEntity({required this.name, required this.favoriteColor});
}

// ✅ SOLUÇÃO
final class UserEntity {
  final String name;
  final String favoriteColorHex;  // ✅ Representação pura
  
  const UserEntity({required this.name, required this.favoriteColorHex});
}
```

## 🔗 Integração com Outros Plugins

```typescript
import { 
  domainEntities,
  domainFailures,
  domainRepositories,
  domainUseCases,
  cleanArchitecture 
} from '@danger-bot/flutter';

export default async () => {
  // Validar toda a camada Domain
  await domainEntities()();
  await domainFailures()();
  await domainRepositories()();
  await domainUseCases()();
  
  // Validar arquitetura
  await cleanArchitecture()();
};
```

## 📚 Referências

- [Clean Architecture - Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Effective Dart](https://dart.dev/guides/language/effective-dart)
- [Flutter Clean Architecture](https://resocoder.com/flutter-clean-architecture-tdd/)

## 📄 Licença

MIT
