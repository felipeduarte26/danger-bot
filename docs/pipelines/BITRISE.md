# 🚀 Configuração de CI/CD - Bitrise

> Guia completo para integrar o Danger Bot no Bitrise

---

## 📋 Visão Geral

Este guia mostra como configurar o Danger Bot no **Bitrise** para executar code review automático em Pull Requests do Bitbucket Cloud.

**O que você vai fazer:**
- ✅ Configurar workflow do Danger Bot
- ✅ Instalar dependências automaticamente
- ✅ Executar análise em cada PR
- ✅ Usar cache para otimizar builds

---

## 🎯 Pré-requisitos

Antes de começar:

- ✅ Projeto Flutter configurado no Bitrise
- ✅ Repositório no Bitbucket Cloud
- ✅ Access Token do Bitbucket (para comentar em PRs)
- ✅ Arquivo `dangerfile.ts` no repositório

---

## 🔐 Passo 1: Configurar Access Token

### 1.1 Criar Access Token no Bitbucket

1. Acesse: **Bitbucket** → **Personal Settings** → **App passwords**
2. Clique em **Create app password**
3. Configure:
   - **Label**: `Bitrise Danger Bot`
   - **Permissions**:
     - ✅ Repositories: Read, Write
     - ✅ Pull requests: Read, Write
4. Copie o token gerado (você não verá novamente!)

### 1.2 Adicionar Token no Bitrise

1. Acesse seu app no Bitrise
2. Vá em **Workflow Editor** → **Secrets**
3. Adicione um novo Secret:
   - **Key**: `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN_2`
   - **Value**: Cole o token do Bitbucket
   - **Expose for Pull Requests**: ✅ **Marcado** (importante!)

---

## ⚙️ Passo 2: Configurar Workflow

### 2.1 Criar Workflow do Danger Bot

Adicione ao seu `bitrise.yml`:

```yaml
---
format_version: '11'
default_step_lib_source: https://github.com/bitrise-io/bitrise-steplib.git
project_type: flutter

# Trigger: Executar em Pull Requests
trigger_map:
- pull_request_target_branch: develop
  type: pull_request
  workflow: danger_bot

workflows:
  danger_bot:
    description: "🤖 Danger Bot - Code Review Automático"
    steps:
    - activate-ssh-key: {}
    
    - git-clone:
        inputs:
        - clone_depth: 0
        - merge_pr: 'no'
    
    - flutter-installer@1:
        inputs:
        - version: 3.35.4
        - is_update: true
    
    # Cache para node_modules
    - restore-cache@1:
        title: "📦 Restore npm cache"
        inputs:
        - key: |
            npm-danger-bot-{{ .CommitHash }}
            npm-danger-bot-
    
    # Setup Node.js 22 e criar package.json
    - script@1:
        title: "📦 Setup Node.js 22 & Create package.json"
        inputs:
        - content: |
            #!/bin/bash
            set -euo pipefail

            echo "🚀 Configurando ambiente Node.js 22..."

            # Instalar Node.js 22 via nvm
            if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | sed 's/v//')" -lt 22 ]; then
              echo "📦 Instalando Node.js 22 via nvm..."
              curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
              export NVM_DIR="$HOME/.nvm"
              [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
              nvm install 22
              nvm use 22
            fi

            node --version
            npm --version

            # Criar package.json
            echo "📄 Criando package.json..."
            cat > package.json << 'PACKAGE_JSON'
            {
              "name": "esfera_web_danger",
              "version": "1.0.0",
              "private": true,
              "devDependencies": {
                "@diletta/danger-bot": "git+https://bitbucket.org/diletta/danger-bot.git#main",
                "danger": "^13.0.5",
                "@types/node": "^24.9.2",
                "typescript": "^5.9.3"
              }
            }
            PACKAGE_JSON
            
            echo "✅ package.json criado!"
            
            # Criar tsconfig.json
            echo "📄 Criando tsconfig.json..."
            cat > tsconfig.json << 'TSCONFIG_JSON'
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
            TSCONFIG_JSON
            
            echo "✅ tsconfig.json criado!"
    
    # Instalar dependências
    - script@1:
        title: "📦 Install Dependencies"
        inputs:
        - content: |
            #!/bin/bash
            set -euo pipefail
            
            echo "📦 Instalando dependências npm..."
            
            # Limpar instalações antigas
            echo "🧹 Limpando cache..."
            rm -rf node_modules package-lock.json
            npm cache clean --force
            
            # Verificar token
            if [ -z "${DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN_2:-}" ]; then
              echo "❌ ERRO: Token não configurado!"
              exit 1
            fi
            
            # Exportar token para Danger JS
            export DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN="${DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN_2}"
            
            # Instalar dependências
            npm install
            
            echo "✅ Dependências instaladas!"
    
    # Salvar cache
    - save-cache@1:
        title: "💾 Save npm cache"
        inputs:
        - key: npm-danger-bot-{{ .CommitHash }}
        - is_key_unique: 'false'
        - paths: node_modules
    
    # Executar Danger Bot
    - script@1:
        title: "🤖 Run Danger Bot"
        inputs:
        - content: |
            #!/bin/bash
            set -euo pipefail

            echo "🚀 Executando Danger Bot..."

            # Verificar dangerfile.ts
            test -f "$BITRISE_SOURCE_DIR/dangerfile.ts" || {
              echo "❌ dangerfile.ts não encontrado"
              exit 1
            }
            
            # Configurar credenciais Bitbucket Cloud
            echo "🔐 Configurando credenciais..."
            
            # Limpar variáveis que podem interferir
            unset DANGER_BITBUCKETCLOUD_USERNAME
            unset DANGER_BITBUCKETCLOUD_PASSWORD
            
            # Configurar token (Bearer Auth)
            export DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN="${DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN_2}"
            
            # UUID do Workspace (obtenha em: Bitbucket Settings > Workspace > UUID)
            export DANGER_BITBUCKETCLOUD_UUID="{seu-workspace-uuid}"
            
            # Metadados do PR
            export DANGER_BITBUCKETCLOUD_PR_ID="${BITRISE_PULL_REQUEST}"
            export DANGER_BITBUCKETCLOUD_REPO_SLUG="${BITRISEIO_GIT_REPOSITORY_OWNER}/${BITRISEIO_GIT_REPOSITORY_SLUG}"
            export DANGER_BITBUCKETCLOUD_REPO_FULL_NAME="${BITRISEIO_GIT_REPOSITORY_OWNER}/${BITRISEIO_GIT_REPOSITORY_SLUG}"
            
            # ID único para evitar duplicação de comentários
            export DANGER_ID="bitrise-${BITRISE_BUILD_SLUG:0:25}"
            
            echo "✅ Credenciais configuradas"
            echo "   - PR ID: ${DANGER_BITBUCKETCLOUD_PR_ID}"
            echo "   - Repo: ${DANGER_BITBUCKETCLOUD_REPO_SLUG}"
            
            # Executar Danger CI
            echo "🤖 Executando análise..."
            npx danger ci --dangerfile dangerfile.ts --id "$DANGER_ID" --verbose
            
            echo "✅ Danger Bot executado com sucesso!"
```

---

## 📁 Estrutura de Arquivos

O único arquivo que precisa estar no repositório é:

```
seu-projeto/
└── dangerfile.ts          # ✅ Único arquivo necessário
```

**Todos os outros arquivos são gerados automaticamente:**
- ❌ `package.json` → Criado pela pipeline
- ❌ `tsconfig.json` → Criado pela pipeline
- ❌ `node_modules/` → Instalado pela pipeline
- ❌ `.gitignore` → Não precisa (tudo é temporário)

---

## 🔍 Obtendo o Workspace UUID

Para obter o UUID do seu workspace no Bitbucket:

### Método 1: Via Settings
1. Acesse seu Workspace no Bitbucket
2. Vá em **Settings** → **Workspace settings**
3. O UUID aparece na URL: `https://bitbucket.org/{workspace}/workspace/settings/`
4. Ou veja na página de Settings (geralmente entre chaves: `{uuid}`)

### Método 2: Via API
```bash
curl -u "username:app_password" https://api.bitbucket.org/2.0/workspaces/seu-workspace
```

O UUID estará no campo `uuid` da resposta JSON.

---

## ⚡ Otimizações

### Cache de node_modules

O workflow já inclui cache automático:

```yaml
- restore-cache@1:
    inputs:
    - key: npm-danger-bot-{{ .CommitHash }}

- save-cache@1:
    inputs:
    - key: npm-danger-bot-{{ .CommitHash }}
    - paths: node_modules
```

**Benefícios:**
- ⚡ Builds 3-5x mais rápidos
- 💰 Menos tempo de CI = menos custos
- 🌱 Menos download de dependências

### Versão Específica do Danger Bot

Use tags para garantir estabilidade:

```json
{
  "devDependencies": {
    "@diletta/danger-bot": "git+https://bitbucket.org/diletta/danger-bot.git#main"
  }
}
```

---

## 🐛 Troubleshooting

### Erro: "dangerfile.ts not found"

**Solução:**
```bash
# Verificar se o arquivo existe no repositório
ls -la dangerfile.ts

# Verificar se não está no .gitignore
cat .gitignore | grep dangerfile
```

### Erro: "DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN not set"

**Solução:**
1. Verificar se o Secret está criado no Bitrise
2. Verificar se **"Expose for Pull Requests"** está marcado
3. Verificar o nome: deve ser `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN_2`

### Erro: "Unable to post comment"

**Solução:**
```bash
# Verificar permissões do token
# O token precisa de:
# - Repositories: Read, Write
# - Pull requests: Read, Write
```

### Erro: "Module '@diletta/danger-bot' not found"

**Solução:**
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Workflow não está sendo executado

**Solução:**
1. Verificar `trigger_map` no `bitrise.yml`
2. Confirmar que o PR está sendo aberto para a branch correta (ex: `develop`)
3. Verificar logs no Bitrise

---

## 📊 Monitoramento

### Verificar Execução

No Bitrise, você verá:

```
🤖 Danger Bot - Code Review Automático
├── 📦 Setup Node.js 22 & Create package.json
├── 📦 Install Dependencies
├── 💾 Save npm cache
└── 🤖 Run Danger Bot
    ✅ All checks passed
```

### Logs Importantes

```bash
# Token configurado
✅ Token configurado (40 caracteres)

# Dependências instaladas
✅ @diletta/danger-bot instalado
✅ danger instalado

# Danger executado
🤖 Starting Danger PR...
✅ Danger run complete
```

---

## 🎯 Exemplo Completo

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
        `**Branch**: ${pr.source?.branch?.name} → ${pr.destination?.branch?.name}`
      );
    }
    return true;
  },
  
  onSuccess: () => {
    sendMessage("✅ Análise concluída! Tudo certo.");
  },
  
  onError: (error) => {
    console.error("❌ Erro:", error);
  },
  
  onFinally: () => {
    sendMessage("📊 Build finalizado!");
  }
});
```

---

## 📚 Próximos Passos

- 📖 **[Ver todos os plugins](../GUIA_PLUGINS.md)**
- 🔧 **[Personalizar dangerfile](../EXEMPLOS.md)**
- 🔌 **[Criar plugin customizado](../CLI.md#create-plugin)**
- 🌍 **[Outras plataformas CI/CD](./README.md)**

---

## 💬 Suporte

- 📖 **Docs**: [Documentação completa](../)
- 💬 **Slack**: [#danger-bot](https://diletta.slack.com/archives/C09CZAH10J3)
- 💬 **Email**: felipe.duarte@dilettasolutions.com

---

<div align="center">

**🎉 Danger Bot configurado no Bitrise!**

[📚 Docs](../) • [🔧 Bitbucket Pipelines](./BITBUCKET_PIPELINES.md) • [🚀 GitHub Actions](./GITHUB_ACTIONS.md)

---

</div>

