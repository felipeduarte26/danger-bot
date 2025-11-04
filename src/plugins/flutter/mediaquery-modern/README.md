# MediaQuery Modern Plugin

Força uso de APIs modernas do MediaQuery (Flutter 3.10+).

## 📋 Descrição

Detecta uso de `MediaQuery.of(context).size` (deprecated) e sugere APIs modernas como `MediaQuery.sizeOf(context)`.

## ✅ APIs Modernas
- `MediaQuery.sizeOf(context)` - Tamanho
- `MediaQuery.paddingOf(context)` - Padding
- `MediaQuery.viewInsetsOf(context)` - View insets

## 📦 Uso
```typescript
import { mediaqueryModern } from '@danger-bot/flutter';
export default async () => { await mediaqueryModern.run(); };
```
