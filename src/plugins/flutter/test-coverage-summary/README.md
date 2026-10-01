# Test Coverage Summary

Mostra uma tabela de cobertura de testes no summary da PR a partir do `coverage/lcov.info`, e um checklist de plataformas para o autor marcar.

## O que faz

- A tabela só aparece quando a PR tem testes relacionados (mesma coleta do `flutter-test-runner`: `_test.dart` alterados + testes dos arquivos das camadas testáveis)
- Usa o `coverage/lcov.info` da raiz se ele já existir (ex.: gerado por um step anterior do CI); senão roda `flutter test --coverage <testes da PR>` (timeout de 5 minutos)
- Parseia o lcov para extrair linhas cobertas e totais por arquivo
- Filtra somente arquivos Dart modificados/criados na PR (exclui `_test.dart`)
- Calcula cobertura percentual por arquivo e total
- Exibe tabela markdown com emojis de status (🟢 ≥80%, 🟡 ≥60%, 🟠 ≥40%, 🔴 <40%)
- Se não conseguir gerar o lcov, publica "Cobertura de Testes — indisponível"
- Sempre que a PR altera Dart (fora de testes), publica o checklist: Android, iOS, Web e UI responsiva

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
