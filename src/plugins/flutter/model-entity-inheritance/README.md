# Model Entity Inheritance

Valida se Models em `/data/models/` que possuem Entity correspondente em `/domain/entities/` fazem `extends` da Entity, evitando duplicação de campos. Também detecta `toEntity()` redundante quando o Model já herda da Entity.

## O que verifica

### Regra 1 — Model deve extender Entity

- Model sem `extends` com Entity correspondente (mesmo nome base, sufixo diferente)
- Todos os campos da Entity (nome + tipo) existem no Model → Model deve extender Entity
- Se Model é `final class`, indica que deve remover `final` para permitir herança

### Regra 2 — toEntity() desnecessário

- Model já faz `extends Entity`
- Model não tem campos adicionais (0 campos próprios ou apenas re-declarações)
- Model tem método `toEntity()` → redundante (Liskov Substitution Principle)

## Quando NÃO dispara (evita falsos positivos)

- Model já possui `extends` (Regra 1)
- Entity correspondente não existe no filesystem
- Tipos dos campos diferem (ex: `PickingStatusModelEnum` vs `PickingStatusEntityEnum`)
- Entity é barrel file (sem declaração de classe)
- Model é arquivo gerado (`.g.dart`, `.freezed.dart`)
- Model é barrel file
- Model tem campos extras não presentes na Entity (Regra 2)

## Severidade

- **Tipo:** `fail`

## Exemplos

### Regra 1 — Model sem herança

```dart
// ❌ Errado — campos duplicados
final class FixationModel {
  final int id;
  final String name;

  FixationEntity toEntity() => FixationEntity(id: id, name: name);
}

// ✅ Correto — herança evita duplicação
class FixationModel extends FixationEntity {
  const FixationModel({required super.id, required super.name});

  factory FixationModel.fromMap(Map<String, dynamic> map) => ...;
}
```

### Regra 2 — toEntity() redundante

```dart
// ❌ Errado — toEntity() cria objeto desnecessário
class FixationModel extends FixationEntity {
  const FixationModel({required super.id, required super.name});

  FixationEntity toEntity() => FixationEntity(id: id, name: name);
}

// ✅ Correto — use o Model diretamente (ele já É uma Entity)
class FixationModel extends FixationEntity {
  const FixationModel({required super.id, required super.name});

  // repository.save(model) — funciona porque Model é Entity
}
```

## Referências

- [Effective Dart — Design](https://dart.dev/effective-dart/design)
- [Dart 3 Class Modifiers](https://dart.dev/language/class-modifiers)
- [Liskov Substitution Principle](https://en.wikipedia.org/wiki/Liskov_substitution_principle)
