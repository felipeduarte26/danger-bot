# Flutter Analyze

Executa `flutter analyze` **somente** nos arquivos `.dart` criados/modificados (exclui `.g.dart`, `.freezed.dart`, `.mocks.dart`). Usa `--fatal-warnings` e `--fatal-infos`. Cada diagnóstico relevante vira **`fail`** no PR com mensagem traduzida quando há mapeamento.

## O que verifica

- Saída do analyzer filtrada às linhas que citam os arquivos alterados
- Parsing de severidade `error` / `warning` / `info`, arquivo, linha e regra
- Mensagens traduzidas para as regras e diagnósticos mapeados — inclusive os do Dart 3.13 (primary constructors: `use_primary_constructors`, `use_declaring_parameters`, `unnecessary_primary_constructor_body`, `empty_container_bodies` e os erros de compilação como `primary_constructor_body_without_declaration`) e `migrate_design_widgets` (Flutter). Sem mapeamento, mostra a mensagem original do analyzer
- Link para a documentação: `dart.dev/tools/diagnostics/...` para diagnósticos do compilador, `dart.dev/tools/linter-rules/...` para lints. Códigos sem página oficial (ex.: `use_primary_constructors`, que ainda está em teste) mostram só o nome da regra

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
