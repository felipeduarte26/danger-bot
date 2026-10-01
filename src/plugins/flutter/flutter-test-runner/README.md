# Flutter Test Runner

Executa os testes unitários relacionados aos arquivos da PR e publica o resultado no comentário do PR. Teste quebrando **falha o build**.

## O que faz

- Coleta testes da PR: arquivos `_test.dart` criados/modificados + testes correspondentes a source files alterados (`lib/x.dart` → `test/x_test.dart`, ou por nome em qualquer pasta de `test/`)
- Executa `flutter test --reporter json <arquivos>` com timeout de 5 minutos
- Parseia o output JSON e publica uma tabela com: passou, falhou, erros, ignorados e total
- Se houver falhas, emite um `fail` com a quantidade e os arquivos de teste quebrando

> A cobertura (`coverage/lcov.info`) não é gerada aqui: o `test-coverage-summary` lê o arquivo existente ou roda `flutter test --coverage` por conta própria.

## Camadas cobertas

Coleta testes para arquivos nas camadas: `/usecases/`, `/datasources/`, `/repositories/`, `/viewmodels/`, `/models/`, `/entities/`

## Ignora

- Barrel files, arquivos gerados (`.g.dart`, `.freezed.dart`)
- Se nenhum teste for encontrado (ou nenhum rodar), o plugin não reporta nada

## Severidade

- **Tipo:** `markdown` (tabela de resultados) e `fail` (quando algum teste falha ou dá erro)

## Exemplo de output

```text
✅ Testes da PR — 12 passou(aram)

| Métrica | Resultado |
| :--     | :--:      |
| Passou  | **12**    |
| Total   | 12        |
```

## Referências

- [Flutter: Testing](https://docs.flutter.dev/testing)
