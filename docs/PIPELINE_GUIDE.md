# 🚀 DANGER BOT - GUIA DE USO EM PIPELINES

## ✅ O Projeto Está APTO para Pipelines!

Sim! O **Danger Bot** foi projetado para funcionar perfeitamente em pipelines de CI/CD. Todos os scripts necessários estão incluídos no pacote npm.

## 📦 O Que Está Incluído

```
danger-bot/
├── dist/                    # Plugins compilados
├── scripts/                 # Scripts auxiliares (incluídos no pacote npm)
│   ├── setup_spell_check.sh
│   └── extract_dart_identifiers.js
├── package.json
└── README.md
```

## 🔧 Como Funciona em Pipelines

### 1. Detecção Automática de Scripts

O **spell-checker** agora detecta automaticamente onde os scripts estão:

```typescript
// ✅ Busca primeiro no projeto local (se existir pasta scripts/)
// ✅ Depois busca no danger-bot instalado (node_modules/@diletta/danger-bot/scripts/)

const setupScript = fs.existsSync("scripts/setup_spell_check.sh")
  ? "scripts/setup_spell_check.sh" // Local
  : `${dangerBotPath}scripts/setup_spell_check.sh`; // Do pacote npm
```

### 2. Instalação Automática de Dependências

O pipeline só precisa executar:

```bash
npm install
```

Isso instalará:

- ✅ `danger`
- ✅ `@diletta/danger-bot` (com scripts incluídos)
- ✅ `cspell` e dicionários
- ✅ `cld3-asm` (para detecção de idioma)

## 🎯 Configuração de Pipelines

### GitHub Actions

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
          fetch-depth: 0 # Importante para o Danger ter acesso ao histórico

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
          services:
            - docker
```

### GitLab CI

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

### CircleCI

```yaml
version: 2.1

jobs:
  danger:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - restore_cache:
          keys:
            - node-deps-{{ checksum "package.json" }}
      - run:
          name: Install Dependencies
          command: npm install
      - save_cache:
          key: node-deps-{{ checksum "package.json" }}
          paths:
            - node_modules
      - run:
          name: Run Danger
          command: npm run danger:ci

workflows:
  version: 2
  pr-check:
    jobs:
      - danger:
          filters:
            branches:
              ignore: main
```

### Travis CI

```yaml
language: node_js
node_js:
  - "18"

cache:
  directories:
    - node_modules

script:
  - npm run danger:ci

branches:
  except:
    - main
```

### Jenkins (Jenkinsfile)

```groovy
pipeline {
    agent {
        docker {
            image 'node:18'
        }
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm install'
            }
        }

        stage('Danger CI') {
            when {
                changeRequest()
            }
            steps {
                sh 'npm run danger:ci'
            }
        }
    }
}
```

## 🔐 Variáveis de Ambiente Necessárias

### GitHub

```bash
GITHUB_TOKEN=<seu_token>
```

### Bitbucket Cloud

```bash
BITBUCKET_TOKEN=<seu_token>
```

### GitLab

```bash
DANGER_GITLAB_HOST=<gitlab_url>
DANGER_GITLAB_API_TOKEN=<seu_token>
```

## ⚙️ Configuração do Projeto

### 1. package.json

```json
{
  "scripts": {
    "danger:ci": "danger ci",
    "danger:pr": "danger pr",
    "danger:local": "danger local"
  },
  "devDependencies": {
    "@diletta/danger-bot": "^1.0.0",
    "danger": "^13.0.0"
  }
}
```

### 2. dangerfile.ts

```typescript
import {
  changelogChecker,
  flutterAnalyze,
  flutterArchitecture,
  portugueseDocumentation,
  prSizeChecker,
  runPlugins,
  spellChecker,
} from "@diletta/danger-bot";

const plugins = [
  flutterAnalyze,
  spellChecker,
  prSizeChecker,
  portugueseDocumentation,
  changelogChecker,
  flutterArchitecture,
];

(async () => {
  try {
    const pr =
      danger.github?.pr || danger.bitbucket_cloud?.pr || danger.gitlab?.mr;

    if (pr) {
      message(`🔍 Analisando PR: ${pr.title}`);
    }

    await runPlugins(plugins);
    message("✅ Análise concluída!");
  } catch (error) {
    message("⚠️ Erro na análise");
    throw error;
  }
})();
```

### 3. tsconfig.json

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

## 🧪 Testando Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Testar contra um PR específico
npm run danger:pr https://github.com/seu-usuario/seu-repo/pull/123

# 3. Ou usar modo local (simula PR)
npm run danger:local
```

## ✅ Checklist de Funcionamento em Pipeline

- [x] **Scripts incluídos no pacote npm** (pasta `scripts/`)
- [x] **Detecção automática de scripts** (local ou do pacote)
- [x] **Todas as dependências no package.json**
- [x] **Compatível com múltiplos CI/CD**
- [x] **Suporta GitHub, Bitbucket, GitLab**
- [x] **Funciona sem Flutter instalado** (apenas Node.js necessário para alguns plugins)
- [x] **Scripts bash compatíveis com Linux/macOS**

## ⚠️ Requisitos do Ambiente de Pipeline

### Obrigatórios:

- ✅ Node.js 18+ instalado
- ✅ Acesso ao repositório Git
- ✅ Token de API configurado

### Opcionais (dependendo dos plugins usados):

- 🔧 Flutter SDK (apenas para `flutter-analyze`)
- 🔧 Bash shell (para `spell-checker`)

## 🎨 Personalizando para Seu Pipeline

### Desabilitar plugins que precisam de Flutter

Se seu pipeline não tem Flutter instalado:

```typescript
// dangerfile.ts
flutterAnalyze.config.enabled = false; // Desabilitar temporariamente
```

### Configurar palavras personalizadas (spell-checker)

Crie `.vscode/settings.json`:

```json
{
  "cSpell.words": ["esfera", "diletta", "customWord1", "customWord2"]
}
```

## 📊 Exemplo de Saída no PR

O Danger Bot comenta automaticamente no PR:

```markdown
🔍 **Danger CI** executando análise automática

**Título**: Feature: Add new component
📦 Plugins ativos: 6/6

---

✅ **Tamanho do PR**: 234 linhas (OK)

🔍 **Flutter Analyze**: Analisando 5 arquivo(s)...
✅ **Flutter Analyze**: Nenhum problema encontrado!

🔤 **cspell**: Verificando 5 arquivo(s)...
✅ **cspell**: Nenhum erro ortográfico!

🌐 **Documentação em português**: 0 bloco(s) detectado(s)
✅ **Documentação**: Todas em inglês (padrão do projeto)

---

✅ **Danger CI** - Análise concluída com sucesso!
```

## 🚀 Publicação no NPM

Para disponibilizar para outros projetos:

```bash
cd danger-bot

# Login no npm
npm login

# Publicar (os scripts/ serão incluídos automaticamente)
npm publish --access public
```

## 💡 Dicas de Performance em Pipeline

1. **Cache de node_modules**: Configure cache no CI para acelerar instalação
2. **Shallow clone**: Use `fetch-depth: 0` apenas se necessário
3. **Plugins seletivos**: Desabilite plugins pesados em PRs pequenos
4. **Parallel jobs**: Execute Danger em paralelo com outros testes

---

✅ **Conclusão**: O Danger Bot está 100% pronto para uso em pipelines!
