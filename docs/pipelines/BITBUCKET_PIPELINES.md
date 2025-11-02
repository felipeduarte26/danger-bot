# 🚀 Configuração de CI/CD - Bitbucket Pipelines

> Guia completo para integrar o Danger Bot no Bitbucket Pipelines

---

## 📋 Visão Geral

Este guia mostra como configurar o Danger Bot diretamente no **Bitbucket Pipelines** para executar code review automático em Pull Requests.

**O que você vai fazer:**
- ✅ Configurar pipeline do Danger Bot
- ✅ Instalar dependências automaticamente
- ✅ Executar análise em cada PR
- ✅ Usar cache para otimizar builds

---

## 🎯 Pré-requisitos

Antes de começar:

- ✅ Repositório no Bitbucket Cloud
- ✅ Bitbucket Pipelines habilitado
- ✅ App Password do Bitbucket (para comentar em PRs)
- ✅ Arquivo `dangerfile.ts` no repositório

---

## 🔐 Passo 1: Configurar App Password

### 1.1 Criar App Password no Bitbucket

1. Acesse: **Bitbucket** → **Personal Settings** → **App passwords**
2. Clique em **Create app password**
3. Configure:
   - **Label**: `Bitbucket Pipelines Danger Bot`
   - **Permissions**:
     - ✅ Repositories: Read, Write
     - ✅ Pull requests: Read, Write
4. Copie o token gerado (você não verá novamente!)

### 1.2 Adicionar como Repository Variable

1. Acesse seu repositório no Bitbucket
2. Vá em **Repository settings** → **Pipelines** → **Repository variables**
3. Adicione uma nova variável:
   - **Name**: `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN`
   - **Value**: Cole o App Password
   - **Secured**: ✅ **Marcado** (importante!)

---

## ⚙️ Passo 2: Criar bitbucket-pipelines.yml

### 2.1 Configuração Completa

Crie `bitbucket-pipelines.yml` na raiz do projeto:

```yaml
image: cimg/node:22.19.0

definitions:
  caches:
    npm-danger: node_modules

pipelines:
  pull-requests:
    '**':  # Executa para todos os PRs
      - step:
          name: 🤖 Danger Bot - Code Review Automático
          caches:
            - npm-danger
          script:
            - echo "🚀 Iniciando Danger Bot..."
            
            # Verificar Node.js
            - node --version
            - npm --version
            
            # Criar package.json automaticamente
            - |
              cat > package.json << 'EOF'
              {
                "name": "danger-ci",
                "version": "1.0.0",
                "private": true,
                "devDependencies": {
                  "@diletta/danger-bot": "git+https://bitbucket.org/diletta/danger-bot.git#v1.8.0",
                  "danger": "^13.0.5",
                  "@types/node": "^24.9.2",
                  "typescript": "^5.9.3"
                }
              }
              EOF
            
            # Criar tsconfig.json
            - |
              cat > tsconfig.json << 'EOF'
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
                "include": ["dangerfile.ts"],
                "exclude": ["node_modules", "dist"]
              }
              EOF
            
            # Instalar dependências
            - echo "📦 Instalando dependências..."
            - npm install
            
            # Configurar variáveis do Danger
            - export DANGER_BITBUCKETCLOUD_UUID="${BITBUCKET_WORKSPACE_UUID}"
            - export DANGER_BITBUCKETCLOUD_REPO_SLUG="${BITBUCKET_REPO_SLUG}"
            - export DANGER_BITBUCKETCLOUD_REPO_FULL_NAME="${BITBUCKET_REPO_FULL_NAME}"
            - export DANGER_BITBUCKETCLOUD_PR_ID="${BITBUCKET_PR_ID}"
            
            # ID único para evitar duplicação
            - export DANGER_ID="bitbucket-${BITBUCKET_BUILD_NUMBER}"
            
            # Executar Danger
            - echo "🤖 Executando análise..."
            - npx danger ci --dangerfile dangerfile.ts --id "$DANGER_ID" --verbose
            
            - echo "✅ Danger Bot executado com sucesso!"
```

### 2.2 Configuração para Projetos Flutter

Se você tem um projeto Flutter, use esta configuração:

```yaml
image: ghcr.io/cirruslabs/flutter:3.35.4

definitions:
  caches:
    npm-danger: node_modules

pipelines:
  pull-requests:
    '**':
      - step:
          name: 🤖 Danger Bot - Code Review Automático
          caches:
            - npm-danger
          script:
            # Instalar Node.js 22
            - echo "📦 Instalando Node.js 22..."
            - apt-get update && apt-get install -y curl
            - curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
            - apt-get install -y nodejs
            
            - node --version
            - npm --version
            
            # Criar package.json
            - |
              cat > package.json << 'EOF'
              {
                "name": "flutter-danger-ci",
                "version": "1.0.0",
                "private": true,
                "devDependencies": {
                  "@diletta/danger-bot": "git+https://bitbucket.org/diletta/danger-bot.git#v1.8.0",
                  "danger": "^13.0.5",
                  "@types/node": "^24.9.2",
                  "typescript": "^5.9.3"
                }
              }
              EOF
            
            # Criar tsconfig.json
            - |
              cat > tsconfig.json << 'EOF'
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
                "include": ["dangerfile.ts"],
                "exclude": ["node_modules", "dist"]
              }
              EOF
            
            # Instalar dependências
            - npm install
            
            # Configurar Danger
            - export DANGER_BITBUCKETCLOUD_UUID="${BITBUCKET_WORKSPACE_UUID}"
            - export DANGER_BITBUCKETCLOUD_REPO_SLUG="${BITBUCKET_REPO_SLUG}"
            - export DANGER_BITBUCKETCLOUD_REPO_FULL_NAME="${BITBUCKET_REPO_FULL_NAME}"
            - export DANGER_BITBUCKETCLOUD_PR_ID="${BITBUCKET_PR_ID}"
            - export DANGER_ID="bitbucket-${BITBUCKET_BUILD_NUMBER}"
            
            # Executar Danger
            - npx danger ci --dangerfile dangerfile.ts --id "$DANGER_ID"
            
            - echo "✅ Danger Bot executado!"
```

---

## 📁 Estrutura de Arquivos

Arquivos necessários no repositório:

```
seu-projeto/
├── bitbucket-pipelines.yml    # ✅ Configuração da pipeline
└── dangerfile.ts              # ✅ Configuração do Danger Bot
```

**Gerados automaticamente pela pipeline:**
- ❌ `package.json` → Criado pela pipeline
- ❌ `tsconfig.json` → Criado pela pipeline
- ❌ `node_modules/` → Instalado pela pipeline

---

## 🌍 Variáveis de Ambiente

O Bitbucket Pipelines fornece automaticamente:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `BITBUCKET_WORKSPACE_UUID` | UUID do workspace | `{uuid}` |
| `BITBUCKET_REPO_SLUG` | Nome do repositório | `meu-repo` |
| `BITBUCKET_REPO_FULL_NAME` | Nome completo | `workspace/repo` |
| `BITBUCKET_PR_ID` | ID do Pull Request | `123` |
| `BITBUCKET_BUILD_NUMBER` | Número do build | `456` |

### Variáveis Necessárias

Configure manualmente em **Repository variables**:

| Nome | Descrição | Secured |
|------|-----------|---------|
| `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN` | App Password | ✅ Sim |

---

## ⚡ Otimizações

### Cache de node_modules

O cache é configurado assim:

```yaml
definitions:
  caches:
    npm-danger: node_modules

pipelines:
  pull-requests:
    '**':
      - step:
          caches:
            - npm-danger
```

**Benefícios:**
- ⚡ Builds 3-5x mais rápidos
- 💰 Menos minutos de pipeline usados
- 🌱 Menos downloads de dependências

### Executar Apenas em Branches Específicas

```yaml
pipelines:
  pull-requests:
    develop:  # Apenas PRs para develop
      - step:
          name: 🤖 Danger Bot
          # ...
    
    main:     # Apenas PRs para main
      - step:
          name: 🤖 Danger Bot
          # ...
```

### Paralelizar com Outros Steps

```yaml
pipelines:
  pull-requests:
    '**':
      - parallel:
          - step:
              name: 🤖 Danger Bot
              # ...
          
          - step:
              name: 🧪 Testes
              script:
                - flutter test
          
          - step:
              name: 🔍 Análise Estática
              script:
                - flutter analyze
```

---

## 🐛 Troubleshooting

### Erro: "dangerfile.ts not found"

**Solução:**
```yaml
script:
  - ls -la  # Ver arquivos no diretório
  - test -f dangerfile.ts || echo "❌ dangerfile.ts não existe"
```

### Erro: "DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN not set"

**Solução:**
1. Verificar se a variável está em **Repository settings** → **Repository variables**
2. Nome correto: `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN`
3. Marcada como **Secured**

### Erro: "Unable to post comment"

**Solução - Verificar permissões do App Password:**
```
Permissions necessárias:
✅ Repositories: Read, Write
✅ Pull requests: Read, Write
```

### Pipeline não executa

**Solução:**
```yaml
# Verificar se está configurado para PRs
pipelines:
  pull-requests:
    '**':  # ← Isso executa para TODOS os PRs
```

### Cache não está funcionando

**Solução:**
```yaml
# Verificar definição do cache
definitions:
  caches:
    npm-danger: node_modules  # ← Caminho correto

# Verificar uso do cache
- step:
    caches:
      - npm-danger  # ← Nome correto
```

---

## 📊 Monitoramento

### Ver Logs da Pipeline

1. Acesse **Pipelines** no seu repositório
2. Clique no build específico
3. Veja os logs de cada step

### Logs Importantes

```bash
# Node.js instalado
✅ Node.js v22.19.0

# Dependências instaladas
added 150 packages in 10s

# Danger executado
🤖 Starting Danger PR...
✅ Danger run complete
```

### Tempo de Execução

Espere aproximadamente:
- **Sem cache**: 2-3 minutos
- **Com cache**: 30-60 segundos

---

## 🎯 Exemplo Completo

### Estrutura do Projeto

```
meu-projeto/
├── bitbucket-pipelines.yml
├── dangerfile.ts
├── lib/
│   └── ...
├── test/
│   └── ...
└── pubspec.yaml
```

### bitbucket-pipelines.yml

```yaml
image: cimg/node:22.19.0

definitions:
  caches:
    npm-danger: node_modules

pipelines:
  pull-requests:
    '**':
      - step:
          name: 🤖 Danger Bot
          caches:
            - npm-danger
          script:
            - node --version
            - npm --version
            
            - |
              cat > package.json << 'EOF'
              {
                "name": "danger-ci",
                "private": true,
                "devDependencies": {
                  "@diletta/danger-bot": "git+https://bitbucket.org/diletta/danger-bot.git#v1.8.0",
                  "danger": "^13.0.5"
                }
              }
              EOF
            
            - |
              cat > tsconfig.json << 'EOF'
              {
                "compilerOptions": {
                  "target": "ES2020",
                  "module": "CommonJS",
                  "esModuleInterop": true,
                  "skipLibCheck": true
                },
                "include": ["dangerfile.ts"]
              }
              EOF
            
            - npm install
            
            - export DANGER_BITBUCKETCLOUD_UUID="${BITBUCKET_WORKSPACE_UUID}"
            - export DANGER_BITBUCKETCLOUD_REPO_SLUG="${BITBUCKET_REPO_SLUG}"
            - export DANGER_BITBUCKETCLOUD_REPO_FULL_NAME="${BITBUCKET_REPO_FULL_NAME}"
            - export DANGER_BITBUCKETCLOUD_PR_ID="${BITBUCKET_PR_ID}"
            - export DANGER_ID="bitbucket-${BITBUCKET_BUILD_NUMBER}"
            
            - npx danger ci --dangerfile dangerfile.ts --id "$DANGER_ID"
```

### dangerfile.ts

```typescript
import { allFlutterPlugins, executeDangerBot, sendMessage, getDanger } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins, {
  onBeforeRun: () => {
    const d = getDanger();
    const pr = d.bitbucket_cloud?.pr;
    
    if (pr) {
      sendMessage(
        `**🤖 Danger Bot - Análise Automática**\n\n` +
        `**Título**: ${pr.title}\n` +
        `**Autor**: ${pr.author?.display_name}\n` +
        `**Plugins ativos**: ${allFlutterPlugins.filter(p => p.config.enabled).length}/${allFlutterPlugins.length}`
      );
    }
    return true;
  },
  
  onSuccess: () => {
    sendMessage("✅ Análise concluída com sucesso!");
  }
});
```

---

## 🔄 Comparação: Bitbucket Pipelines vs Bitrise

| Aspecto | Bitbucket Pipelines | Bitrise |
|---------|---------------------|---------|
| **Setup** | Mais simples | Requer configuração externa |
| **Variáveis** | Automáticas | Precisa configurar manualmente |
| **Cache** | Nativo | Nativo |
| **UI** | Integrada ao Bitbucket | Interface separada |
| **Custo** | Incluído no Bitbucket | Separado |
| **Flexibilidade** | Boa | Excelente |

**Recomendação:**
- Use **Bitbucket Pipelines** se já usa Bitbucket (mais simples)
- Use **Bitrise** para projetos mobile complexos (mais features)

---

## 📚 Próximos Passos

- 📖 **[Ver todos os plugins](../GUIA_PLUGINS.md)**
- 🔧 **[Personalizar dangerfile](../EXEMPLOS.md)**
- 🔌 **[Criar plugin customizado](../CLI.md#create-plugin)**
- 🌍 **[Outras plataformas CI/CD](./README.md)**

---

## 💬 Suporte

- 📖 **Docs**: [Documentação completa](../)
- 🐛 **Issues**: [Bitbucket](https://bitbucket.org/diletta/danger-bot/issues)
- 💬 **Email**: felipe.duarte@dilettasolutions.com

---

<div align="center">

**🎉 Danger Bot configurado no Bitbucket Pipelines!**

[📚 Docs](../) • [🔧 Bitrise](./BITRISE.md) • [🚀 GitHub Actions](./GITHUB_ACTIONS.md)

---

**Feito com ❤️ pela [Diletta Solutions](https://dilettasolutions.com)**

</div>

