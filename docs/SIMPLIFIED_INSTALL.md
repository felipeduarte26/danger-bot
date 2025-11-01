# ✅ CONFIGURAÇÃO SIMPLIFICADA - Danger Incluído!

## 🎯 Mudança Importante

O `danger` agora é uma **dependência direta** do `danger-bot`, não mais uma `peerDependency`.

### ✅ ANTES (Usuário precisava instalar 2 pacotes):

```json
{
  "devDependencies": {
    "danger-bot": "git+https://github.com/diletta/danger-bot.git#v1.0.0",
    "danger": "^13.0.0"  // ← Cliente precisava saber disso
  }
}
```

### ✅ AGORA (Usuário instala apenas 1 pacote):

```json
{
  "devDependencies": {
    "danger-bot": "git+https://github.com/genial-solutions/danger-bot.git#v1.0.0"
    // ✅ danger vem automaticamente junto!
  }
}
```

---

## 🚀 Como Usar (Super Simples)

### No Esfera Web (ou qualquer projeto):

```bash
# 1. Instalar apenas o danger-bot
npm install danger-bot@git+https://github.com/diletta/danger-bot.git#v1.0.0

# ✅ O danger é instalado automaticamente junto!
```

### `package.json` do Esfera Web:

```json
{
  "name": "esfera-web",
  "scripts": {
    "danger:ci": "npm run build && danger ci --dangerfile dist/dangerfile.js",
    "danger:pr": "npm run build && danger pr --dangerfile dist/dangerfile.js",
    "danger:local": "npm run build && danger local --dangerfile dist/dangerfile.js",
    "build": "tsc"
  },
  "devDependencies": {
    "danger-bot": "git+https://github.com/diletta/danger-bot.git#v1.0.0",
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0"
  }
}
```

**✅ APENAS 1 dependência! O cliente não precisa saber que usa Danger JS.**

---

## 📦 O Que Acontece Por Trás

### `danger-bot/package.json`:

```json
{
  "name": "@diletta/danger-bot",
  "dependencies": {
    "danger": "^13.0.0",        // ← Instalado automaticamente
    "cld3-asm": "^4.0.0",
    "cspell": "^8.0.0",
    // ... outros
  }
}
```

Quando alguém instala o `danger-bot`, o npm automaticamente instala todas as `dependencies`, incluindo o `danger`.

---

## 🎁 Vantagens

✅ **Cliente instala apenas 1 pacote**  
✅ **Cliente não precisa saber sobre Danger JS**  
✅ **Versão do Danger gerenciada pelo danger-bot**  
✅ **Instalação mais simples**  
✅ **Menos confusão**  

---

## 🌳 Estrutura de Instalação

```
projeto-cliente/
└── node_modules/
    ├── danger-bot/              ← Instalado pelo cliente
    │   ├── dist/
    │   ├── scripts/
    │   └── package.json
    │
    └── danger/                  ← Instalado AUTOMATICAMENTE
        └── (ferramenta Danger JS)
```

O cliente vê apenas `danger-bot` no `package.json`, mas o `danger` está lá nos `node_modules`, instalado automaticamente.

---

## 📝 Scripts de Uso (Cliente Final)

O cliente só precisa saber sobre o `danger-bot`:

```bash
# Instalar
npm install danger-bot@git+https://github.com/diletta/danger-bot.git#v1.0.0

# Usar (os comandos são do danger, mas cliente não precisa saber)
npm run danger:ci
```

---

## 🎯 Exemplo Completo

### 1. Cliente cria `dangerfile.ts`:

```typescript
import {
  flutterAnalyze,
  prSizeChecker,
  runPlugins,
} from "danger-bot";  // ← Só precisa conhecer danger-bot

const plugins = [flutterAnalyze, prSizeChecker];

(async () => {
  await runPlugins(plugins);
  message("✅ Análise concluída!");
})();
```

### 2. Cliente adiciona scripts no `package.json`:

```json
{
  "scripts": {
    "danger:ci": "npm run build && danger ci --dangerfile dist/dangerfile.js"
  }
}
```

### 3. Cliente usa em pipeline:

```yaml
# .github/workflows/danger.yml
- run: npm install
- run: npm run danger:ci
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Cliente nunca precisa mencionar "Danger JS"!**

---

## 🔄 Comparação

| Item | Antes (peerDependency) | Agora (dependency) |
|------|------------------------|-------------------|
| Instalação | 2 pacotes | 1 pacote |
| Cliente sabe do Danger? | ✅ Sim | ❌ Não |
| Gerenciamento de versão | Cliente | danger-bot |
| Simplicidade | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## ✅ Pronto!

Agora o `danger-bot` é um **pacote completo e independente**. O cliente instala apenas ele e tudo funciona automaticamente! 🎉

