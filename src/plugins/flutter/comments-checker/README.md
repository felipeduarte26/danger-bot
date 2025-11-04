# Comments Checker Plugin

Proíbe comentários `//` e força uso de `///` (documentation comments).

## 📋 Descrição

Garante que todo código use comentários de documentação (`///`) ao invés de comentários simples (`//`), gerando documentação automática com DartDoc.

## ✅ Uso
```typescript
import { commentsChecker } from '@danger-bot/flutter';
export default async () => { await commentsChecker.run(); };
```

## 📚 Referência
- [Effective Dart: Documentation](https://dart.dev/guides/language/effective-dart/documentation)
