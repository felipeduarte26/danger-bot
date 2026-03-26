# Data Models

Valida arquivos em `/models/` (exceto `models.dart`): sufixo `_model.dart`, **uma** classe model por arquivo, nome da classe terminando em **Model**, campos de instância devem ser **final** (imutabilidade).

## O que verifica

- Nome: `*_model.dart`
- Mais de uma classe concreta no arquivo
- Classe sem sufixo `Model`
- Campo declarado sem `final`/`const`/`static`/`late`/`@override` (heurística de tipos comuns)

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
class UserModel {
  String name;
}

// ✅ Correto
class UserModel {
  const UserModel({required this.name});
  final String name;
}
```

## Referências

- [Effective Dart — Design](https://dart.dev/effective-dart/design)
