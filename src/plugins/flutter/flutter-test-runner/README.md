# Flutter Test Runner

Executa os testes unitários relacionados aos arquivos da PR e reporta os resultados diretamente no comentário do PR. Testes que falham são reportados como **warnings** — não quebram a pipeline.

## O que faz

- Coleta testes da PR: arquivos `_test.dart` modificados + testes correspondentes a source files alterados
- Executa `flutter test --reporter json --coverage` com timeout de 5 minutos
- Parseia o output JSON e gera um sumário com: passou, falhou, erros, ignorados, tempo
- Reporta até 10 falhas detalhadas como warnings
- Gera `coverage/lcov.info` para ser consumido pelo plugin `test-coverage-summary`

## Camadas cobertas

Coleta testes para arquivos nas camadas: `/usecases/`, `/datasources/`, `/repositories/`, `/viewmodels/`, `/models/`, `/entities/`

## Ignora

- Barrel files, arquivos gerados (`.g.dart`, `.freezed.dart`)
- Se nenhum teste for encontrado, o plugin não reporta nada

## Severidade

- **Tipo:** `warn` (falhas de teste não quebram o CI)

## Exemplo de output

```
✅ Testes da PR — 12 passou(aram) (3.2s)

| Métrica    | Resultado |
| :--        | :--:      |
| Passou     | 12        |
| Total      | 12        |
| Tempo      | 3.2s      |
```

## Referências

- [Flutter: Testing](https://docs.flutter.dev/testing)
