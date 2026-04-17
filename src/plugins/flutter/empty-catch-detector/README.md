# Empty Catch Detector

Detecta blocos `catch` vazios ou que contêm apenas comentários em código Dart. Catch vazio engole erros silenciosamente, tornando bugs extremamente difíceis de rastrear e mascarando problemas reais em produção.

## O que verifica

- Blocos `catch` com corpo vazio (apenas whitespace ou comentários)
- Padrões: `catch (e) {}`, `on Exception catch (e) {}`, `on TypeError {}`
- Não flageia catch com `rethrow`, `return`, `throw`, `break`, `continue` ou qualquer statement real
- Exclui arquivos de teste (`_test.dart`, `/test/`, `/testing/`) e gerados (`.g.dart`, `.freezed.dart`, `.mocks.dart`)

## Severidade

- **Tipo:** `fail`

## Exemplo

```dart
// ❌ Errado
try {
  await repository.save(data);
} catch (e) {
  // silenciado
}

// ✅ Correto
try {
  await repository.save(data);
} catch (e, stackTrace) {
  logger.error('Falha ao salvar', error: e, stackTrace: stackTrace);
  rethrow;
}
```

## Referências

- [Dart Linter: empty_catches](https://dart.dev/tools/linter-rules/empty_catches)
- Clean Code — Robert C. Martin, Cap. 7: Error Handling
