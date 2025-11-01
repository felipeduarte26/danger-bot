# 📦 Guia de Instalação - Danger Bot

## 🎯 Para Projetos Flutter (Sem Node.js Configurado)

Este guia mostra como instalar o Danger Bot em um projeto Flutter que ainda **não tem** `package.json`.

---

## 📋 Pré-requisitos

- ✅ Node.js 18+ instalado
- ✅ Git configurado
- ✅ Projeto Flutter existente

### Verificar Node.js

```bash
node --version
# Deve mostrar: v18.x.x ou superior

npm --version
# Deve mostrar: 9.x.x ou superior
```

### Instalar Node.js (se não tiver)

**macOS:**

```bash
brew install node
```

**Linux:**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**

- Baixar de: https://nodejs.org/

---

## 🚀 Instalação Completa (Passo a Passo)

### 1️⃣ Navegar até o Projeto Flutter

```bash
cd /caminho/do/seu/projeto/flutter
```

### 2️⃣ Inicializar Node.js no Projeto

```bash
npm init -y
```

**Isso cria o arquivo `package.json` com configuração padrão:**

```json
{
  "name": "seu-projeto-flutter",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
```

### 3️⃣ Instalar Danger Bot

```bash
npm install --save-dev danger-bot@git+https://github.com/diletta/danger-bot.git#v1.0.0
```

**✅ Isso instala:**

- `danger-bot` (com todos os plugins)
- `danger` (automaticamente)
- `cspell`, `cld3-asm` e outras dependências

### 4️⃣ Instalar TypeScript

```bash
npm install --save-dev typescript @types/node
```

### 5️⃣ Criar Configuração TypeScript

Crie o arquivo `tsconfig.json` na raiz do projeto:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"]
  },
  "ts-node": {
    "compilerOptions": {
      "module": "CommonJS"
    }
  },
  "include": ["dangerfile.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 6️⃣ Criar Dangerfile

Crie o arquivo `dangerfile.ts` na raiz do projeto:

```typescript
import {
  changelogChecker,
  flutterAnalyze,
  flutterArchitecture,
  portugueseDocumentation,
  prSizeChecker,
  runPlugins,
  spellChecker,
} from "danger-bot";

// Selecione os plugins que deseja usar
const plugins = [
  flutterAnalyze,
  spellChecker,
  prSizeChecker,
  portugueseDocumentation,
  changelogChecker,
  flutterArchitecture,
];

// Executar análise
(async () => {
  try {
    const pr =
      danger.github?.pr || danger.bitbucket_cloud?.pr || danger.gitlab?.mr;

    if (pr) {
      message(
        `🔍 **Danger CI** executando análise automática\n\n` +
          `**Título**: ${pr.title}\n` +
          `📦 Plugins ativos: ${
            plugins.filter((p) => p.config.enabled).length
          }/${plugins.length}`
      );
    }

    await runPlugins(plugins);
    message("✅ **Danger CI** - Análise concluída com sucesso!");
  } catch (error) {
    message("⚠️ **Erro no Danger CI**: Verifique os logs do CI.");
    throw error;
  }
})();
```

### 7️⃣ Atualizar package.json com Scripts

Edite o `package.json` e adicione os scripts:

```json
{
  "name": "seu-projeto-flutter",
  "version": "1.0.0",
  "description": "Projeto Flutter com Danger Bot",
  "scripts": {
    "build": "tsc",
    "danger:ci": "npm run build && danger ci --dangerfile dist/dangerfile.js",
    "danger:pr": "npm run build && danger pr --dangerfile dist/dangerfile.js",
    "danger:local": "npm run build && danger local --dangerfile dist/dangerfile.js"
  },
  "devDependencies": {
    "danger-bot": "git+https://github.com/diletta/danger-bot.git#v1.0.0",
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0"
  }
}
```

### 8️⃣ Adicionar ao .gitignore

Adicione no arquivo `.gitignore`:

```
# Node.js
node_modules/
dist/
package-lock.json

# Arquivos temporários do Danger
temp_identifiers_for_spell_check.txt
temp_spell_check_metadata.json
cspell.config.json
```

### 9️⃣ Testar Localmente

```bash
# Compilar o dangerfile
npm run build

# Testar (simula um PR)
npm run danger:local
```

---

## 📁 Estrutura Final do Projeto

```
meu-projeto-flutter/
├── android/                    # Flutter Android
├── ios/                        # Flutter iOS
├── lib/                        # Código Flutter
├── test/                       # Testes Flutter
│
├── node_modules/               # ✅ Dependências Node.js (gitignored)
│   ├── danger/                 # ✅ Instalado automaticamente
│   └── danger-bot/             # ✅ Instalado
│       ├── dist/               # Plugins compilados
│       └── scripts/            # Scripts auxiliares
│
├── dist/                       # ✅ Dangerfile compilado (gitignored)
│   └── dangerfile.js
│
├── dangerfile.ts               # ✅ Configuração do Danger
├── tsconfig.json               # ✅ Configuração TypeScript
├── package.json                # ✅ Dependências Node.js
├── pubspec.yaml                # Flutter
├── .gitignore                  # ✅ Atualizado
└── README.md
```

---

## ⚙️ Configurar CI/CD

### GitHub Actions

Crie `.github/workflows/danger.yml`:

```yaml
name: Danger CI

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  danger:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout código
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Instalar dependências
        run: npm install

      - name: Executar Danger
        run: npm run danger:ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Bitbucket Pipelines

Crie `bitbucket-pipelines.yml`:

```yaml
pipelines:
  pull-requests:
    "**":
      - step:
          name: Danger CI
          image: node:18
          caches:
            - node
          script:
            - npm install
            - npm run danger:ci
```

### GitLab CI

Crie `.gitlab-ci.yml`:

```yaml
danger:
  image: node:18
  stage: test
  only:
    - merge_requests
  script:
    - npm install
    - npm run danger:ci
  variables:
    DANGER_GITLAB_HOST: $CI_SERVER_URL
    DANGER_GITLAB_API_TOKEN: $GITLAB_TOKEN
```

---

## 🎛️ Personalizar Plugins

### Habilitar/Desabilitar Plugins

```typescript
// dangerfile.ts
import { flutterAnalyze, prSizeChecker } from "danger-bot";

// Desabilitar temporariamente
flutterAnalyze.config.enabled = false;

// Usar apenas alguns plugins
const plugins = [prSizeChecker];
```

### Criar Plugin Personalizado

```typescript
// dangerfile.ts
import { createPlugin, runPlugins } from "danger-bot";

const meuPlugin = createPlugin(
  {
    name: "meu-plugin",
    description: "Meu plugin personalizado",
    enabled: true,
  },
  async () => {
    // Sua lógica aqui
    const hasTests = danger.git.created_files.some((f) =>
      f.includes("_test.dart")
    );

    if (!hasTests) {
      warn("⚠️ Considere adicionar testes para este PR");
    }
  }
);

const plugins = [meuPlugin];
await runPlugins(plugins);
```

---

## 🔧 Solução de Problemas

### Problema: `danger: command not found`

**Solução:** Certifique-se de executar via npm script:

```bash
# ❌ Errado
danger ci

# ✅ Correto
npm run danger:ci
```

### Problema: `Cannot find module 'danger-bot'`

**Solução:** Reinstale as dependências:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Problema: Scripts bash não funcionam no Windows

**Solução:** Use Git Bash ou WSL, ou desabilite o `spellChecker`:

```typescript
import { spellChecker } from "danger-bot";

// Desabilitar no Windows
if (process.platform === "win32") {
  spellChecker.config.enabled = false;
}
```

### Problema: Flutter analyze falha

**Solução:** Certifique-se que Flutter está instalado no ambiente de CI:

```yaml
# GitHub Actions
- name: Setup Flutter
  uses: subosito/flutter-action@v2
  with:
    flutter-version: "3.x"

- name: Flutter Doctor
  run: flutter doctor
```

---

## 📊 Comandos Úteis

```bash
# Instalar dependências
npm install

# Compilar dangerfile
npm run build

# Testar localmente
npm run danger:local

# Testar contra PR específico
npm run danger:pr https://github.com/usuario/repo/pull/123

# Executar em CI
npm run danger:ci

# Atualizar danger-bot
npm uninstall danger-bot
npm install danger-bot@git+https://felipeDuarteBarbosa@bitbucket.org/diletta/danger-bot.git#v1.1.0

# Ver versão instalada
npm list danger-bot
```

---

## 🎯 Próximos Passos

1. ✅ Instalar danger-bot
2. ✅ Criar dangerfile.ts
3. ✅ Testar localmente
4. ✅ Configurar CI/CD
5. ✅ Fazer primeiro PR para testar

---

## 📚 Documentação Adicional

- 📖 [README.md](README.md) - Visão geral
- 🚀 [PIPELINE_GUIDE.md](PIPELINE_GUIDE.md) - Guia de pipelines
- 📝 [SIMPLIFIED_INSTALL.md](SIMPLIFIED_INSTALL.md) - Instalação simplificada

---

## 💡 Dicas

**✅ Mantenha atualizado:**

```bash
# Verificar atualizações
git ls-remote https://github.com/diletta/danger-bot.git --tags

# Atualizar para nova versão
npm install danger-bot@git+https://felipeDuarteBarbosa@bitbucket.org/diletta/danger-bot.git#v1.1.0
```

**✅ Use em conjunto com linters:**
O Danger Bot complementa ferramentas como:

- `flutter analyze`
- `dart format`
- Testes automatizados

**✅ Configure regras personalizadas:**
Cada projeto pode ter necessidades diferentes. Adapte os plugins conforme necessário!

---

## 🆘 Suporte

- 🐛 Issues: [GitHub Issues](https://github.com/diletta/danger-bot/issues)
- 📖 Docs: Veja outros guias neste repositório

---
