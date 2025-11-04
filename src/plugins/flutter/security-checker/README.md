# Security Checker Plugin

Detecta problemas de segurança no código.

## 📋 Descrição

Identifica API keys hardcoded, uso de `eval()`, e outras vulnerabilidades de segurança.

## 🔒 Detecta
- API keys hardcoded (Google, OpenAI, AWS)
- Uso de `eval()`
- Secrets no código fonte

## 📦 Uso
```typescript
import { securityChecker } from '@danger-bot/flutter';
export default async () => { await securityChecker()(); };
```

## 📚 Referência
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
