# Clean Architecture

Inspeciona **imports** em arquivos sob `/domain/`, `/data/`, `/presentation/` e use cases (`/usecases/` ou `*_usecase.dart`) e falha quando a **regra de dependência** é violada.

## O que verifica

- Domain importando `data/` ou `presentation/`
- Data importando `presentation/` ou use cases
- Use case importando outro use case
- Presentation importando `data/` diretamente

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado (arquivo em presentation/)
import 'package:app/data/models/user_model.dart';

// ✅ Correto
import 'package:app/domain/entities/user_entity.dart';
import 'package:app/domain/usecases/get_user_usecase.dart';
```

## Referências

- [The Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
