# 🚀 Configuração de CI/CD - Guias por Plataforma

> Documentação completa para integrar o Danger Bot em diferentes plataformas de CI/CD

---

## 📋 Plataformas Disponíveis

Escolha sua plataforma e siga o guia específico:

### ☁️ Cloud CI/CD

| Plataforma | Documentação | Dificuldade | Tempo Setup |
|------------|--------------|-------------|-------------|
| **Bitrise** | [📖 BITRISE.md](./BITRISE.md) | ⭐⭐ Média | ~15 min |
| **Bitbucket Pipelines** | [📖 BITBUCKET_PIPELINES.md](./BITBUCKET_PIPELINES.md) | ⭐ Fácil | ~10 min |
| **GitHub Actions** | [📖 GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md) | ⭐ Fácil | ~10 min |
| **GitLab CI** | [📖 GITLAB_CI.md](./GITLAB_CI.md) | ⭐ Fácil | ~10 min |
| **CircleCI** | [📖 CIRCLE_CI.md](./CIRCLE_CI.md) | ⭐⭐ Média | ~15 min |

### 🏢 Self-Hosted

| Plataforma | Documentação | Dificuldade | Tempo Setup |
|------------|--------------|-------------|-------------|
| **Jenkins** | [📖 JENKINS.md](./JENKINS.md) | ⭐⭐⭐ Difícil | ~30 min |
| **Travis CI** | [📖 TRAVIS_CI.md](./TRAVIS_CI.md) | ⭐⭐ Média | ~15 min |

---

## 🎯 Escolher Plataforma

### Você já usa Bitbucket?

**✅ Use [Bitbucket Pipelines](./BITBUCKET_PIPELINES.md)**
- Integração nativa
- Variáveis de ambiente automáticas
- Setup mais simples

**ou [Bitrise](./BITRISE.md)**
- Mais recursos para mobile
- Interface visual
- Cache otimizado

### Você usa GitHub?

**✅ Use [GitHub Actions](./GITHUB_ACTIONS.md)**
- Integração perfeita
- Marketplace de actions
- Gratuito para repositórios públicos

### Você usa GitLab?

**✅ Use [GitLab CI](./GITLAB_CI.md)**
- Integração nativa
- Runners compartilhados
- CI/CD incluído

---

## 📦 Requisitos Gerais

Todas as plataformas precisam:

1. **Node.js 22+** instalado
2. **Access Token** do Git provider (para comentar em PRs)
3. **dangerfile.ts** no repositório
4. **Variáveis de ambiente** configuradas

---

## 🔐 Configuração de Tokens

### Bitbucket Cloud

```bash
# Nome da variável
DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN

# Permissões necessárias
- Repositories: Read, Write
- Pull requests: Read, Write
```

**Como criar:**
1. Bitbucket → Personal Settings → App passwords
2. Create app password
3. Selecionar permissões
4. Copiar token

### GitHub

```bash
# Nome da variável
DANGER_GITHUB_API_TOKEN

# Permissões necessárias
- repo (Full control)
- write:discussion
```

**Como criar:**
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token
3. Selecionar scopes
4. Copiar token

### GitLab

```bash
# Nome da variável
DANGER_GITLAB_API_TOKEN

# Permissões necessárias
- api
- write_repository
```

**Como criar:**
1. GitLab → User Settings → Access Tokens
2. Add new token
3. Selecionar scopes
4. Copiar token

---

## 📁 Estrutura Base

Independente da plataforma, você precisa:

```
seu-projeto/
├── dangerfile.ts           # ✅ Configuração do Danger Bot
├── .github/                # (Se usar GitHub Actions)
│   └── workflows/
│       └── danger.yml
├── .gitlab-ci.yml          # (Se usar GitLab CI)
├── bitbucket-pipelines.yml # (Se usar Bitbucket Pipelines)
└── bitrise.yml             # (Se usar Bitrise)
```

---

## 🎯 Exemplo Universal de dangerfile.ts

Este exemplo funciona em todas as plataformas:

```typescript
import { allFlutterPlugins, executeDangerBot, sendMessage, getDanger } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins, {
  onBeforeRun: () => {
    const d = getDanger();
    
    // Detectar plataforma automaticamente
    const pr = d.github?.pr || d.bitbucket_cloud?.pr || d.gitlab?.mr;
    const platform = d.github ? 'GitHub' : 
                    d.bitbucket_cloud ? 'Bitbucket' : 
                    d.gitlab ? 'GitLab' : 'Unknown';
    
    if (pr) {
      sendMessage(
        `**🤖 Danger Bot - Análise Automática**\n\n` +
        `**Plataforma**: ${platform}\n` +
        `**Título**: ${pr.title}\n` +
        `**Plugins ativos**: ${allFlutterPlugins.filter(p => p.config.enabled).length}/${allFlutterPlugins.length}`
      );
    }
    
    return true;
  },
  
  onSuccess: () => {
    sendMessage("✅ Análise concluída com sucesso!");
  },
  
  onError: (error) => {
    console.error("❌ Erro:", error);
  },
  
  onFinally: () => {
    sendMessage("📊 Pipeline finalizado!");
  }
});
```

---

## ⚡ Otimizações Comuns

### Cache de node_modules

Todas as plataformas suportam cache:

```yaml
# Bitbucket Pipelines
caches:
  - node

# GitHub Actions
- uses: actions/cache@v3
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}

# GitLab CI
cache:
  paths:
    - node_modules/
```

### Executar Apenas em PRs

```yaml
# Bitbucket Pipelines
pull-requests:
  '**':
    - step: ...

# GitHub Actions
on:
  pull_request:

# GitLab CI
only:
  - merge_requests
```

---

## 🐛 Troubleshooting Geral

### Problema: Token não funciona

**Verificar:**
1. ✅ Token tem permissões corretas?
2. ✅ Variável está configurada no CI?
3. ✅ Variável está **secured/protected**?
4. ✅ Nome da variável está correto?

### Problema: dangerfile.ts not found

**Solução:**
```bash
# Verificar se o arquivo existe
ls -la dangerfile.ts

# Verificar se não está no .gitignore
cat .gitignore | grep dangerfile
```

### Problema: "Unable to post comment"

**Causas comuns:**
- Token sem permissões de write
- Token expirado
- Workspace/Repo incorreto

### Problema: Build muito lento

**Otimizações:**
1. ✅ Habilitar cache de node_modules
2. ✅ Usar versão específica do danger-bot (tag)
3. ✅ Instalar apenas dependências necessárias

---

## 📊 Comparação de Plataformas

| Recurso | Bitbucket<br/>Pipelines | GitHub<br/>Actions | GitLab<br/>CI | Bitrise | CircleCI |
|---------|-------------------------|---------------------|---------------|---------|----------|
| **Setup** | ⭐⭐ Fácil | ⭐⭐ Fácil | ⭐⭐ Fácil | ⭐ Média | ⭐ Média |
| **Cache** | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| **Grátis** | 50 min/mês | ✅ Ilimitado<br/>(público) | ✅ 400 min/mês | 🔶 Limited | 🔶 Limited |
| **Mobile** | 🔶 OK | ✅ Bom | ✅ Bom | ✅ Excelente | ✅ Excelente |
| **Docs** | ✅ Boas | ✅ Excelentes | ✅ Boas | ✅ Boas | ✅ Boas |

---

## 📚 Recursos Adicionais

### Documentação Oficial

- **[Bitbucket Pipelines](https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/)**
- **[GitHub Actions](https://docs.github.com/actions)**
- **[GitLab CI](https://docs.gitlab.com/ee/ci/)**
- **[Bitrise](https://devcenter.bitrise.io/)**
- **[CircleCI](https://circleci.com/docs/)**
- **[Jenkins](https://www.jenkins.io/doc/)**

### Guias do Danger Bot

- 📖 **[Guia de Instalação](../INSTALACAO.md)**
- 🚀 **[Início Rápido](../INICIO_RAPIDO.md)**
- 🔌 **[Guia de Plugins](../GUIA_PLUGINS.md)**
- 💡 **[Exemplos](../EXEMPLOS.md)**

---

## 💬 Suporte

Precisa de ajuda com sua plataforma específica?

- 📖 **Docs**: [Documentação completa](../)
- 🐛 **Issues**: [Bitbucket](https://bitbucket.org/diletta/danger-bot/issues)
- 💬 **Email**: felipe.duarte@dilettasolutions.com

---

<div align="center">

**🚀 Escolha sua plataforma e comece agora!**

[🔧 Bitrise](./BITRISE.md) • [☁️ Bitbucket Pipelines](./BITBUCKET_PIPELINES.md) • [🐙 GitHub Actions](./GITHUB_ACTIONS.md)

---

**Feito com ❤️ pela [Diletta Solutions](https://dilettasolutions.com)**

</div>

