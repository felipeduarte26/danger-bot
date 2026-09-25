# Test File Checker

Verifica se arquivos criados ou modificados na PR possuem arquivo de teste correspondente. Foca nas camadas principais da Clean Architecture para garantir cobertura de testes.

## O que verifica

- Arquivos nas camadas: `/usecases/`, `/datasources/`, `/repositories/`, `/viewmodels/`, `/models/`, `/entities/`
- Mapeamento: `lib/(...)/file.dart` → `test/(...)/file_test.dart`, com o caminho do Danger (relativo à raiz: `lib/...`) e em monorepo (`packages/app/lib/...` → `packages/app/test/...`)
- O teste conta se existe no disco **ou** foi criado/alterado na PR — não precisa ser alterado junto
- Busca por nome em qualquer subpasta de `test/` como fallback (evita falsos positivos para testes em outra estrutura de pastas); a lista de testes é lida uma vez por execução

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
