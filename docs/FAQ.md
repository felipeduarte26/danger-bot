# ❓ FAQ - Perguntas Frequentes

---

## 📦 Instalação

### Q: Preciso instalar o `danger` separadamente?

**R:** Sim! O `danger` é uma peer dependency. Instale:
```bash
npm install --save-dev danger @diletta/danger-bot@git+https://bitbucket.org/diletta/danger-bot.git#v1.8.0
```

### Q: Funciona em projetos Flutter sem package.json?

**R:** Sim! Basta criar um `package.json`:
```bash
npm init -y
```
Ver: [Guia de Instalação](INSTALACAO.md#projetos-flutter)

---

## 🔧 Configuração

### Q: Como desabilitar um plugin?

**R:**
```typescript
import { spellCheckerPlugin } from "@diletta/danger-bot";

spellCheckerPlugin.config.enabled = false;
```

### Q: Posso usar apenas alguns plugins?

**R:** Sim!
```typescript
import { prSizeCheckerPlugin, changelogCheckerPlugin } from "@diletta/danger-bot";

executeDangerBot([prSizeCheckerPlugin, changelogCheckerPlugin]);
```

---

## 🐛 Problemas Comuns

### Q: "Module not found: @diletta/danger-bot"

**R:** Reinstale:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Q: "danger is not defined"

**R:** Use os helpers:
```typescript
import { getDanger } from "@diletta/danger-bot";

const d = getDanger();
```

### Q: Plugin não está executando

**R:** Verifique se está habilitado:
```typescript
console.log(meuPlugin.config.enabled); // deve ser true
```

---

## 🚀 CI/CD

### Q: Qual plataforma usar?

**R:**
- Já usa Bitbucket? → [Bitbucket Pipelines](pipelines/BITBUCKET_PIPELINES.md)
- Já usa GitHub? → GitHub Actions
- Projetos mobile complexos? → [Bitrise](pipelines/BITRISE.md)

### Q: Como configurar tokens?

**R:** Ver [Guia de Instalação - Tokens](INSTALACAO.md#configurar-tokens)

---

## 🔌 Plugins

### Q: Como criar um plugin?

**R:**
```bash
danger-bot create-plugin
```
Ver: [Guia de Plugins](GUIA_PLUGINS.md#criar-plugin)

### Q: Onde ficam os plugins?

**R:** `src/plugins/{plataforma}/{nome-plugin}/`

---

## 💬 Suporte

Não encontrou sua resposta?

- 📖 [Documentação completa](.)
- 🐛 [Issues no Bitbucket](https://bitbucket.org/diletta/danger-bot/issues)
- 💬 felipe.duarte@dilettasolutions.com

---

<div align="center">

[📚 Docs](.) • [🚀 Início Rápido](INICIO_RAPIDO.md) • [📦 Instalação](INSTALACAO.md)

</div>

