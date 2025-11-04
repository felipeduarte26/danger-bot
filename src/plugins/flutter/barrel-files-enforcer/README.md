# Barrel Files Enforcer Plugin

Força uso de barrel files para organizar exports.

## 📋 Descrição

Verifica se pastas importantes (entities, models, etc) têm barrel files (`entities.dart`) para simplificar imports.

## ✅ Uso
```typescript
import { barrelFilesEnforcer } from '@danger-bot/flutter';
export default async () => { await barrelFilesEnforcer()(); };
```

## 📚 O que é Barrel File?
Arquivo que re-exporta outros arquivos da mesma pasta, simplificando imports.
