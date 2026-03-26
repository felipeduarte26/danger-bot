# Data Datasources

Valida arquivos em `/datasources/` (exceto `datasources.dart`): nomenclatura, contrato `abstract interface class` com prefixo **I** e sufixo **Datasource**, implementação `final class` com sufixo **Datasource**, e **um par interface+impl por arquivo**.

## O que verifica

- Nome do arquivo deve terminar com `_datasource.dart`
- Presença de `abstract interface class I…Datasource`
- Implementação `final class … implements …` com sufixo `Datasource`
- Não permite múltiplas interfaces ou múltiplas implementações no mesmo arquivo

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
final class UserRemote { }

// ✅ Correto
abstract interface class IUserRemoteDatasource {
  Future<List<UserModel>> fetchAll();
}

final class UserRemoteDatasource implements IUserRemoteDatasource {
  @override
  Future<List<UserModel>> fetchAll() async { /* ... */ }
}
```

## Referências

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
