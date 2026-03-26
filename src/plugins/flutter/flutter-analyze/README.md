# Flutter Analyze

Executa `flutter analyze` **somente** nos arquivos `.dart` criados/modificados (exclui `.g.dart`, `.freezed.dart`, `.mocks.dart`). Usa `--fatal-warnings` e `--fatal-infos`. Cada diagnóstico relevante vira **`fail`** no PR com mensagem traduzida quando há mapeamento.

## O que verifica

- Saída do analyzer filtrada às linhas que citam os arquivos alterados
- Parsing de severidade `error` / `warning` / `info`, arquivo, linha e regra

## Severidade

- **Tipo:** `fail` (e `message` quando não há problemas ou não há Dart alterado)

## Exemplo

```dart
// ❌ Errado (ex.: unused_import)
import 'dart:io';

void main() {}

// ✅ Correto
void main() {}
```

## Referências

- [Dart diagnostic messages](https://dart.dev/tools/diagnostic-messages)
- [Linter rules](https://dart.dev/tools/linter-rules)
