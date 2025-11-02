# 📦 Guia de Instalação

> Guia completo para instalar o Danger Bot em qualquer tipo de projeto

---

## 📋 Requisitos

Antes de começar, certifique-se de ter:

- ✅ **Node.js 22+** instalado
- ✅ **npm** ou **yarn**
- ✅ **Git** configurado
- ✅ Projeto em um repositório Git (GitHub, Bitbucket ou GitLab)

---

## 🚀 Instalação Rápida

### Para projetos que já têm package.json

```bash
# Instalar Danger Bot
npm install --save-dev danger @diletta/danger-bot@git+https://bitbucket.org/diletta/danger-bot.git#main

# Criar dangerfile.ts
cat > dangerfile.ts << 'EOF'
import { allFlutterPlugins, executeDangerBot } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins);
EOF

# Adicionar script
npm pkg set scripts.danger:ci="danger ci"

# Testar
npm run danger:ci
```

**Pronto! ✅**

---

## 📱 Instalação em Projetos Flutter (sem package.json)

Projetos Flutter normalmente **não têm** `package.json`. Vamos criar um!

### Passo 1: Inicializar Node.js

Na raiz do seu projeto Flutter, execute:

```bash
npm init -y
```

Isso cria um `package.json` básico.

### Passo 2: Configurar package.json

Edite o `package.json` criado:

```json
{
  "name": "seu-projeto-flutter",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "danger:ci": "danger ci",
    "danger:local": "danger local",
    "danger:pr": "danger pr"
  },
  "devDependencies": {
    "danger": "^13.0.5",
    "@diletta/danger-bot": "git+https://bitbucket.org/diletta/danger-bot.git#main",
    "@types/node": "^24.9.2",
    "typescript": "^5.9.3"
  }
}
```

### Passo 3: Instalar dependências

```bash
npm install
```

### Passo 4: Criar tsconfig.json

```bash
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
  "exclude": ["node_modules", "dist", "build", "android", "ios", "linux", "macos", "windows", "web"]
}
EOF
```

### Passo 5: Criar dangerfile.ts

```bash
cat > dangerfile.ts << 'EOF'
import { allFlutterPlugins, executeDangerBot, sendMessage, getDanger } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins, {
  onBeforeRun: () => {
    const d = getDanger();
    const pr = d.github?.pr || d.bitbucket_cloud?.pr || d.gitlab?.mr;
    
    if (pr) {
      sendMessage(
        `**🤖 Danger Bot - Análise Automática**\n\n` +
        `**Título**: ${pr.title}\n` +
        `**Plugins ativos**: ${allFlutterPlugins.filter(p => p.config.enabled).length}`
      );
    }
    
    return true;
  },
  
  onSuccess: () => {
    sendMessage("✅ Análise concluída com sucesso!");
  }
});
EOF
```

### Passo 6: Atualizar .gitignore

Adicione ao `.gitignore`:

```bash
# Node.js / Danger Bot
node_modules/
package-lock.json
dist/
```

### Passo 7: Testar localmente

```bash
npm run danger:local
```

**Estrutura final:**

```
seu-projeto-flutter/
├── lib/                    # Código Flutter
├── test/                   # Testes Flutter
├── pubspec.yaml           # Dependências Flutter
├── package.json           # ✅ Dependências Node.js/Danger
├── tsconfig.json          # ✅ Config TypeScript
├── dangerfile.ts          # ✅ Config Danger Bot
├── .gitignore             # ✅ Atualizado
└── node_modules/          # ❌ Não commitar (gitignored)
```

---

## 🔧 Instalação Personalizada

### Escolher plugins específicos

Ao invés de usar `allFlutterPlugins`, escolha apenas os que precisa:

```typescript
import {
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  executeDangerBot
} from "@diletta/danger-bot";

executeDangerBot([
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
]);
```

### Usar versão específica

```json
{
  "devDependencies": {
    "@diletta/danger-bot": "git+https://bitbucket.org/diletta/danger-bot.git#main"
  }
}
```

**Versões disponíveis:**
- `#main` - Branch principal (versão mais recente)

### Instalar via SSH (repositório privado)

```json
{
  "devDependencies": {
    "@diletta/danger-bot": "git+ssh://git@bitbucket.org/diletta/danger-bot.git#v1.8.0"
  }
}
```

---

## 🌍 Instalação por Plataforma

### GitHub

```json
{
  "devDependencies": {
    "danger": "^13.0.5",
    "@diletta/danger-bot": "git+https://bitbucket.org/diletta/danger-bot.git#main"
  }
}
```

**Variável de ambiente necessária:**
```bash
DANGER_GITHUB_API_TOKEN=seu_token_aqui
```

### Bitbucket Cloud

```json
{
  "devDependencies": {
    "danger": "^13.0.5",
    "@diletta/danger-bot": "git+https://bitbucket.org/diletta/danger-bot.git#main"
  }
}
```

**Variável de ambiente necessária:**
```bash
DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN=seu_token_aqui
```

### GitLab

```json
{
  "devDependencies": {
    "danger": "^13.0.5",
    "@diletta/danger-bot": "git+https://bitbucket.org/diletta/danger-bot.git#main"
  }
}
```

**Variável de ambiente necessária:**
```bash
DANGER_GITLAB_API_TOKEN=seu_token_aqui
```

---

## 🔐 Configurar Tokens

### Bitbucket Cloud (App Password)

1. Acesse: **Bitbucket** → **Personal Settings** → **App passwords**
2. Clique em **Create app password**
3. Configurar:
   - Label: `Danger Bot`
   - Permissions:
     - ✅ Repositories: Read, Write
     - ✅ Pull requests: Read, Write
4. Copie o token

**Configurar no CI/CD:**
- Nome: `DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN`
- Valor: Token copiado
- Secured: ✅ Sim

### GitHub (Personal Access Token)

1. Acesse: **GitHub** → **Settings** → **Developer settings** → **Personal access tokens**
2. Clique em **Generate new token**
3. Scopes:
   - ✅ `repo` (Full control)
   - ✅ `write:discussion`
4. Copie o token

**Configurar no CI/CD:**
- Nome: `DANGER_GITHUB_API_TOKEN`
- Valor: Token copiado

### GitLab (Access Token)

1. Acesse: **GitLab** → **User Settings** → **Access Tokens**
2. Criar token:
   - Name: `Danger Bot`
   - Scopes:
     - ✅ `api`
     - ✅ `write_repository`
3. Copie o token

**Configurar no CI/CD:**
- Nome: `DANGER_GITLAB_API_TOKEN`
- Valor: Token copiado

---

## 🧪 Verificar Instalação

### Teste 1: Verificar dependências

```bash
npm list danger @diletta/danger-bot
```

**Saída esperada:**
```
├── @diletta/danger-bot@1.8.0
└── danger@13.0.5
```

### Teste 2: Verificar TypeScript

```bash
npx tsc --noEmit
```

**Saída esperada:**
```
(Sem erros)
```

### Teste 3: Executar localmente

```bash
npm run danger:local
```

**Saída esperada:**
```
🤖 Starting Danger...
⚡ Executando plugin: pr-size-checker
✅ Plugin 'pr-size-checker' executado com sucesso
...
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module '@diletta/danger-bot'"

**Causa:** Dependência não instalada ou mal instalada

**Solução:**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Erro: "TypeScript compilation failed"

**Causa:** tsconfig.json incorreto ou ausente

**Solução:**
```bash
# Recriar tsconfig.json
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
```

### Erro: "danger: command not found"

**Causa:** danger não instalado ou não no PATH

**Solução:**
```bash
# Usar via npx
npx danger ci

# Ou instalar globalmente
npm install -g danger
```

### Erro: "EACCES: permission denied"

**Causa:** Permissões incorretas

**Solução (macOS/Linux):**
```bash
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Erro: "Unable to find dangerfile"

**Causa:** Arquivo não existe ou está em local errado

**Solução:**
```bash
# Verificar se existe
ls -la dangerfile.ts

# Deve estar na raiz do projeto
pwd
# /path/to/seu-projeto/dangerfile.ts
```

---

## 📚 Próximos Passos

Após instalar com sucesso:

1. 📖 **[Configurar CI/CD](pipelines/README.md)** - Executar em Pull Requests
2. 🔌 **[Explorar Plugins](GUIA_PLUGINS.md)** - Ver todos os plugins disponíveis
3. 💡 **[Ver Exemplos](EXEMPLOS.md)** - Casos de uso reais
4. 🤖 **[Usar CLI](CLI.md)** - Criar plugins personalizados

---

## 💬 Suporte

Problemas na instalação?

- 📖 **FAQ**: [FAQ.md](FAQ.md)
- 🐛 **Issues**: [Bitbucket](https://bitbucket.org/diletta/danger-bot/issues)
- 💬 **Email**: felipe.duarte@dilettasolutions.com

---

<div align="center">

**🎉 Instalação concluída! Próximo passo: [Configurar CI/CD](pipelines/README.md)**

[📚 Docs](.) • [🚀 Início Rápido](INICIO_RAPIDO.md) • [🔌 Plugins](GUIA_PLUGINS.md)

---

**Feito com ❤️ pela [Diletta Solutions](https://dilettasolutions.com)**

</div>

