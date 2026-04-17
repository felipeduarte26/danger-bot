# Print Statement Detector

Detecta chamadas de `print()`, `debugPrint()`, `debugPrintStack()` e `printError()` em código Dart de produção. Prints de debug esquecidos poluem o console, podem expor dados sensíveis e dificultam a depuração de problemas reais.

## O que verifica

- Chamadas `print()`, `debugPrint()`, `debugPrintStack()` e `printError()`
- Ignora ocorrências dentro de comentários, blocos `/* */` e multi-line strings (`'''`/`"""`)
- Ignora conteúdo dentro de strings literais (single e double quote)
- Exclui arquivos de teste (`_test.dart`, `/test/`, `/testing/`), gerados (`.g.dart`, `.freezed.dart`, `.mocks.dart`) e `/generated/`

## Severidade

- **Tipo:** `warn`

## Exemplo

```dart
// ❌ Errado
void fetchData() {
  print('response: $data');
  debugPrint('debug info');
}

// ✅ Correto
import 'package:logging/logging.dart';
final _log = Logger('MyClass');

void fetchData() {
  _log.info('response received');
}
```

## Referências

- [Dart Linter: avoid_print](https://dart.dev/tools/linter-rules/avoid_print)
