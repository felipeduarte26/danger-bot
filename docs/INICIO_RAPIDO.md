# 🚀 Início Rápido

> Comece a usar o Danger Bot em menos de 5 minutos!

---

## ⚡ TL;DR

```bash
# 1. Instalar
npm install --save-dev danger @diletta/danger-bot@git+https://bitbucket.org/diletta/danger-bot.git#main

# 2. Criar dangerfile.ts
cat > dangerfile.ts << 'EOF'
import { allFlutterPlugins, executeDangerBot } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins);
EOF

# 3. Adicionar ao package.json
npm pkg set scripts.danger:ci="danger ci"

# 4. Executar
npm run danger:ci
```

**Pronto! 🎉**

---

## 📋 Passo a Passo Detalhado

### 1️⃣ Instalação

```bash
npm install --save-dev danger @diletta/danger-bot@git+https://bitbucket.org/diletta/danger-bot.git#main
```

> **Nota**: Se seu projeto não tem `package.json`, veja o [Guia de Instalação Completo](INSTALACAO.md#projetos-sem-packagejson)

---

### 2️⃣ Criar Dangerfile

Crie um arquivo `dangerfile.ts` na raiz do projeto:

```typescript
import { allFlutterPlugins, executeDangerBot } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins);
```

**Ou com plugins específicos:**

```typescript
import {
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  executeDangerBot,
} from "@diletta/danger-bot";

executeDangerBot([prSizeCheckerPlugin, changelogCheckerPlugin, flutterAnalyzePlugin]);
```

---

### 3️⃣ Configurar Scripts

Adicione ao `package.json`:

```json
{
  "scripts": {
    "danger:ci": "danger ci",
    "danger:pr": "danger pr https://github.com/user/repo/pull/123",
    "danger:local": "danger local"
  }
}
```

---

### 4️⃣ Testar Localmente

```bash
# Testar sem fazer commit
npm run danger:local

# Testar em um PR específico
npm run danger:pr
```

---

### 5️⃣ Configurar CI/CD

#### GitHub Actions

```yaml
# .github/workflows/danger.yml
name: Danger
on: [pull_request]

jobs:
  danger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "22"
      - run: npm install
      - run: npm run danger:ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Bitbucket Pipelines

```yaml
# bitrise.yml (adicione ao workflow existente)
- npm install
- npm run danger:ci
```

> 📚 **Ver guia completo**: [Configuração de Pipelines](PIPELINES.md)

---

## 🎯 Plugins Disponíveis

> 📖 **Importar todos**: `import { allFlutterPlugins } from "@diletta/danger-bot";`

---

## ⚙️ Personalização Rápida

### Desabilitar um Plugin

```typescript
import { flutterAnalyzePlugin, executeDangerBot } from "@diletta/danger-bot";

// Desabilitar temporariamente
flutterAnalyzePlugin.config.enabled = false;

executeDangerBot([flutterAnalyzePlugin]);
```

### Com Callbacks

```typescript
import { allFlutterPlugins, executeDangerBot, sendMessage } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins, {
  onBeforeRun: () => {
    sendMessage("🔍 Iniciando análise automática...");
    return true; // Continuar
  },

  onSuccess: () => {
    sendMessage("✅ Análise concluída com sucesso!");
  },

  onError: (error) => {
    console.error("Erro:", error);
  },
  
  onFinally: () => {
    sendMessage("📊 Análise finalizada!");
  }
});
```

---

## 🛠️ CLI do Danger Bot

O Danger Bot vem com uma CLI integrada:

```bash
# Listar todos os plugins disponíveis
danger-bot list

# Ver informações do projeto
danger-bot info

# Criar um novo plugin
danger-bot create-plugin

# Gerar dangerfile de exemplo
danger-bot gen

# Validar um plugin
danger-bot validate src/plugins/meu-plugin/meu-plugin.ts
```

> 📚 **Documentação completa**: [Guia da CLI](CLI.md)

---

## 🎓 Próximos Passos

Agora que você já tem o básico funcionando:

1. 📖 **[Guia de Plugins](GUIA_PLUGINS.md)** - Aprenda a usar e criar plugins
2. 🔧 **[API Reference](API.md)** - Conheça todas as funções disponíveis
3. 💡 **[Exemplos](EXEMPLOS.md)** - Veja casos de uso reais
4. 🚀 **[Pipelines](PIPELINES.md)** - Configure seu CI/CD
5. 📝 **[Commits](COMMITS.md)** - Aprenda sobre Conventional Commits

---

## ❓ Problemas Comuns

### Erro: "Module not found"

```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Erro: "danger is not defined"

```bash
# Instalar Danger como peer dependency
npm install --save-dev danger
```

### Plugin não está executando

```typescript
// Verificar se o plugin está habilitado
console.log(meuPlugin.config.enabled); // deve ser true
```

> 🐛 **Mais soluções**: [FAQ](FAQ.md)

---

## 💬 Suporte

- 📖 **Documentação**: [docs/](.)
- 💬 **Slack**: [#danger-bot](https://diletta.slack.com/archives/C09CZAH10J3)
- 💬 **Email**: felipe.duarte@dilettasolutions.com

---

<div align="center">

**🎉 Parabéns! Você está pronto para usar o Danger Bot!**

[📚 Ver Documentação Completa](.) • [🔌 Criar Plugin](GUIA_PLUGINS.md#criar-plugin) • [⚙️ Configuração Avançada](API.md)

</div>
