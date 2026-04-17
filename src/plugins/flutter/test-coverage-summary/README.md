# Test Coverage Summary

Lê o arquivo `coverage/lcov.info` (gerado pelo `flutter-test-runner` ou por step anterior do CI) e mostra uma tabela de cobertura de testes no summary da PR.

## O que faz

- Parseia o `coverage/lcov.info` para extrair linhas cobertas e totais por arquivo
- Filtra somente arquivos Dart modificados/criados na PR (exclui `_test.dart`)
- Calcula cobertura percentual por arquivo e total
- Exibe tabela markdown com emojis de status (🟢 ≥80%, 🟡 ≥60%, 🟠 ≥40%, 🔴 <40%)

## Pré-requisito

O arquivo `coverage/lcov.info` deve existir na raiz do projeto. Se não existir, o plugin não reporta nada. O plugin `flutter-test-runner` gera este arquivo automaticamente ao usar `--coverage`.

## Severidade

- **Tipo:** informativo (usa `sendMarkdown`, não falha nem avisa)

## Exemplo de output

```
🟢 Cobertura de Testes — 85% (3 arquivo(s) da PR)

| Arquivo                         | Cobertura | Linhas |
| :--                             | :--:      | :--:   |
| `.../get_user_usecase.dart`     | 🟢 92%   | 23/25  |
| `.../user_datasource.dart`      | 🟡 75%   | 30/40  |
| `.../user_repository.dart`      | 🟢 88%   | 22/25  |
| **Total**                       | **🟢 83%** | **75/90** |
```

## Referências

- [Flutter: Code Coverage](https://docs.flutter.dev/testing/code-coverage)
