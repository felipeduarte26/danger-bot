# Late Final Checker Plugin

Detecta uso de `late final` e sugere alternativas mais seguras.

## 📋 Descrição

O plugin identifica declarações `late final` que podem causar runtime errors e sugere alternativas mais seguras como inicialização no constructor ou uso de nullable.

## ✅ Uso
```typescript
import { lateFinalChecker } from '@danger-bot/flutter';
export default async () => { await lateFinalChecker.run(); };
```

## 📚 Referência
- [Effective Dart: Late Variables](https://dart.dev/guides/language/effective-dart/usage#avoid-using-late-variables-if-you-need-to-check-whether-they-are-initialized)
