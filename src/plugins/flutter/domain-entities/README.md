# Domain Entities

Valida arquivos em `/entities/`: estrutura de pastas, entities `*_entity.dart`, enums em `entities/enums/` com `*_enum.dart`, e regras de classe.

## O que verifica

- Subpastas proibidas dentro de `entities/` (`extensions`, `errors`, `mixins`, `typedefs`) → devem ir para `domain/`
- Enums fora de `entities/enums/`, nome de arquivo enum, sufixo `Enum` no tipo
- Entity: arquivo `*_entity.dart`, **uma** `final class` por arquivo, sufixo **Entity**, uso de `final class`

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
class UserEntity {
  final String name;
}

// ✅ Correto
final class UserEntity {
  const UserEntity({required this.name});
  final String name;
}
```

## Referências

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
