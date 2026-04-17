# Test File Checker

Verifica se arquivos criados ou modificados na PR possuem arquivo de teste correspondente. Foca nas camadas principais da Clean Architecture para garantir cobertura de testes.

## O que verifica

- Arquivos nas camadas: `/usecases/`, `/datasources/`, `/repositories/`, `/viewmodels/`, `/models/`, `/entities/`
- Mapeamento: `lib/(...)/file.dart` → `test/(...)/file_test.dart`
- Busca recursiva no diretório `test/` como fallback (evita falsos positivos para arquivos compartilhados ou movidos)

## Ignora

- Barrel files (nome do arquivo = nome da pasta pai, ex: `remote/remote.dart`)
- Arquivos gerados (`.g.dart`, `.freezed.dart`)
- Arquivos de teste (`_test.dart`)
- Interfaces de repository no domain (`_repository_interface.dart`)

## Severidade

- **Tipo:** `warn`

## Exemplo

```
// Arquivo modificado na PR:
lib/features/user/domain/usecases/get_user_usecase.dart

// Teste esperado:
test/features/user/domain/usecases/get_user_usecase_test.dart
```

## Referências

- [Flutter: Testing](https://docs.flutter.dev/testing)
