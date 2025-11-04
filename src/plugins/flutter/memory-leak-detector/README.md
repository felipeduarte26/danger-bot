# Memory Leak Detector Plugin

Detecta potenciais vazamentos de memória em Controllers, Timers e Streams.

## 📋 Descrição

Identifica recursos que precisam ser dispostos mas não têm método `dispose()` ou `cancel()` correspondente.

## ✅ Detecta
- Controllers sem `.dispose()`
- Timers sem `.cancel()`
- StreamSubscriptions sem `.cancel()`

## 📦 Uso
```typescript
import { memoryLeakDetector } from '@danger-bot/flutter';
export default async () => { await memoryLeakDetector.run(); };
```
