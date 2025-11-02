# 🤖 Danger Bot

[![Version](https://img.shields.io/badge/version-1.8.0-blue.svg)](https://bitbucket.org/diletta/danger-bot)
[![Node](https://img.shields.io/badge/node-%3E%3D22.19.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Diletta](https://img.shields.io/badge/Made%20by-Diletta%20Solutions-red.svg)](https://dilettasolutions.com)

> 🚀 Conjunto modular e profissional de plugins Danger JS para automação de code review

**Danger Bot** é uma solução completa para automatizar code review em projetos Flutter/Dart usando Danger JS. Com plugins prontos, CLI integrada e suporte para múltiplas plataformas de CI/CD.

---

## ✨ Destaques

- 🔌 **Plugins Prontos** - Selecione todos ou somente os plugins que faz sentido para o seu projeto
- 🤖 **CLI Integrada** - Crie e gerencie plugins facilmente
- 🌍 **Multi-Plataforma** - GitHub, Bitbucket, GitLab
- ⚡ **Zero Config** - Funciona out-of-the-box
- 📚 **Documentação Completa** - Projeto 100% documentado
- 🎨 **TypeScript** - Type-safe e moderno
- 🔧 **Customizável** - Crie seus próprios plugins
- 🚀 **CI/CD Ready** - Guias para Bitrise, Bitbucket Pipelines, GitHub Actions e mais

---

## 🚀 Início Rápido

```bash
# 1. Instalar
npm install --save-dev danger @diletta/danger-bot@git+https://bitbucket.org/diletta/danger-bot.git#v1.8.0

# 2. Criar dangerfile.ts
cat > dangerfile.ts << 'EOF'
import { allFlutterPlugins, executeDangerBot } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins);
EOF

# 3. Executar
npx danger ci
```

**Pronto! 🎉** Veja o [Guia de Início Rápido](docs/INICIO_RAPIDO.md) para mais detalhes.

---

## 📚 Documentação

### 🎯 Para Começar

| Documento                                     | Descrição                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| **[🚀 Início Rápido](docs/INICIO_RAPIDO.md)** | Comece em 5 minutos com TL;DR e guia passo a passo                        |
| **[📦 Instalação](docs/INSTALACAO.md)**       | Guia completo de instalação (incluindo projetos Flutter sem package.json) |
| **[❓ FAQ](docs/FAQ.md)**                     | Perguntas frequentes e troubleshooting                                    |

### 🔌 Plugins e API

| Documento                                      | Descrição                                              |
| ---------------------------------------------- | ------------------------------------------------------ |
| **[🔌 Guia de Plugins](docs/GUIA_PLUGINS.md)** | Como usar, configurar e criar plugins                  |
| **[🔧 API Reference](docs/API.md)**            | Referência completa da API (helpers, types, functions) |
| **[💡 Exemplos](docs/EXEMPLOS.md)**            | Casos de uso reais e exemplos práticos                 |

### 🛠️ Ferramentas

| Documento                                | Descrição                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| **[🤖 CLI](docs/CLI.md)**                | Documentação completa da CLI (todos os comandos)                       |
| **[🚀 CI/CD](docs/pipelines/README.md)** | Guias de configuração por plataforma (Bitrise, Bitbucket, GitHub, etc) |

### 👨‍💻 Para Desenvolvedores

| Documento                                         | Descrição                              |
| ------------------------------------------------- | -------------------------------------- |
| **[🏗️ Arquitetura](docs/ARQUITETURA.md)**         | Entenda como o projeto está organizado |
| **[🔧 Desenvolvimento](docs/DESENVOLVIMENTO.md)** | Como contribuir e desenvolver          |

---

## 🔌 Plugins Disponíveis

### 📦 Plugins Flutter/Dart (7 plugins)

| Plugin                       | Descrição                                     | Status          |
| ---------------------------- | --------------------------------------------- | --------------- |
| **pr-size-checker**          | Alerta sobre PRs muito grandes                | ✅ Habilitado   |
| **changelog-checker**        | Verifica se CHANGELOG.md foi atualizado       | ✅ Habilitado   |
| **flutter-analyze**          | Executa `flutter analyze` e reporta problemas | ✅ Habilitado   |
| **flutter-architecture**     | Valida padrões Clean Architecture             | ✅ Habilitado   |
| **spell-checker**            | Verifica ortografia em identificadores Dart   | ✅ Habilitado   |
| **portuguese-documentation** | Detecta documentação em português             | ✅ Habilitado   |
| **plugin-test**              | Plugin de teste/exemplo                       | 🔶 Desabilitado |

**Importar todos:**

```typescript
import { allFlutterPlugins } from "@diletta/danger-bot";
```

**Ver documentação completa:** [Guia de Plugins](docs/GUIA_PLUGINS.md)

---

## 🤖 CLI Integrada

Gerencie plugins facilmente com a CLI:

```bash
# Listar todos os plugins
danger-bot list

# Criar novo plugin
danger-bot create-plugin

# Gerar dangerfile de exemplo
danger-bot gen

# Validar plugin
danger-bot validate src/plugins/flutter/meu-plugin/meu-plugin.ts

# Ver informações do projeto
danger-bot info
```

**Ver documentação completa:** [Guia da CLI](docs/CLI.md)

---

## 🌍 Plataformas Suportadas

### Git Providers

✅ **GitHub** • ✅ **Bitbucket Cloud** • ✅ **Bitbucket Server** • ✅ **GitLab**

### CI/CD

| Plataforma              | Guia                                                 | Dificuldade    |
| ----------------------- | ---------------------------------------------------- | -------------- |
| **Bitrise**             | [📖 Ver guia](docs/pipelines/BITRISE.md)             | ⭐⭐ Média     |
| **Bitbucket Pipelines** | [📖 Ver guia](docs/pipelines/BITBUCKET_PIPELINES.md) | ⭐ Fácil       |
| **GitHub Actions**      | [📖 Ver guia](docs/pipelines/README.md)              | ⭐ Fácil       |
| **GitLab CI**           | [📖 Ver guia](docs/pipelines/README.md)              | ⭐ Fácil       |
| **CircleCI**            | [📖 Ver guia](docs/pipelines/README.md)              | ⭐⭐ Média     |
| **Jenkins**             | [📖 Ver guia](docs/pipelines/README.md)              | ⭐⭐⭐ Difícil |

**Ver todos os guias:** [Documentação CI/CD](docs/pipelines/README.md)

---

## 💡 Exemplos de Uso

### Básico

```typescript
import { allFlutterPlugins, executeDangerBot } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins);
```

### Com Callbacks

```typescript
import { allFlutterPlugins, executeDangerBot, sendMessage, getDanger } from "@diletta/danger-bot";

executeDangerBot(allFlutterPlugins, {
  onBeforeRun: () => {
    const d = getDanger();
    const pr = d.bitbucket_cloud?.pr;

    if (pr) {
      sendMessage(`**🤖 Análise Automática**\n\n**Título**: ${pr.title}`);
    }

    return true;
  },

  onSuccess: () => {
    sendMessage("✅ Análise concluída com sucesso!");
  },
});
```

### Plugins Seletivos

```typescript
import {
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  executeDangerBot,
} from "@diletta/danger-bot";

executeDangerBot([prSizeCheckerPlugin, changelogCheckerPlugin, flutterAnalyzePlugin]);
```

**Ver mais exemplos:** [Exemplos Práticos](docs/EXEMPLOS.md)

---

## 📁 Estrutura do Projeto

```
danger-bot/
├── src/
│   ├── plugins/              # Plugins organizados por plataforma
│   │   └── flutter/          # 7 plugins Flutter/Dart
│   ├── helpers.ts            # Helper functions
│   ├── types.ts              # Types e interfaces
│   └── index.ts              # Exports principais
├── bin/
│   ├── cli.js                # CLI entry point
│   ├── commands/             # Comandos da CLI
│   ├── templates/            # Templates de código
│   └── utils/                # Utilitários
├── scripts/
│   ├── patch-danger.js       # Customizações Danger JS
│   └── ...                   # Scripts auxiliares
├── docs/                     # 📚 Documentação completa
│   ├── pipelines/            # Guias CI/CD
│   └── *.md                  # Guias gerais
├── dist/                     # Build output (TypeScript → JavaScript)
└── README.md                 # Este arquivo
```

**Ver arquitetura completa:** [Arquitetura](docs/ARQUITETURA.md)

---

## 🛠️ Tecnologias

- **[TypeScript 5.9](https://www.typescriptlang.org/)** - Linguagem
- **[Danger JS 13](https://github.com/danger/danger-js)** - Framework base
- **[Commander 14](https://github.com/tj/commander.js)** - CLI
- **[CSpell 9](https://github.com/streetsidesoftware/cspell)** - Spell checking
- **[cld3-asm 4](https://www.npmjs.com/package/cld3-asm)** - Language detection
- **[Husky 9](https://github.com/typicode/husky)** - Git hooks
- **[ESLint 9](https://eslint.org/)** - Linting
- **[Prettier 3](https://prettier.io/)** - Formatting

---

## 🎯 Recursos

### ✨ Funcionalidades

- ✅ Plugins modulares e reutilizáveis
- ✅ CLI para criar e gerenciar plugins
- ✅ TypeScript com types completos
- ✅ Helpers para facilitar desenvolvimento
- ✅ Suporte a múltiplas plataformas Git
- ✅ Cache otimizado em CI/CD
- ✅ Documentação completa
- ✅ Conventional Commits + Husky
- ✅ ESLint + Prettier configurados
- ✅ Customizações do Danger JS (patches)

### 🔒 Qualidade

- ✅ **Git Hooks** - pre-commit, commit-msg, pre-push
- ✅ **ESLint** - Zero warnings permitidos
- ✅ **Prettier** - Código formatado automaticamente
- ✅ **TypeScript** - Type checking rigoroso
- ✅ **Conventional Commits** - Commits padronizados

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Veja o [Guia de Desenvolvimento](docs/DESENVOLVIMENTO.md).

### Passos

1. Clone o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: adicionar feature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

**Lembre-se:** Usamos [Conventional Commits](docs/DESENVOLVIMENTO.md#conventional-commits)

---

## 📋 Requisitos

- **Node.js** ≥ 22.19.0
- **npm** ou **yarn**
- **TypeScript** 5.9+ (instalado automaticamente)
- **Danger JS** 13+ (peer dependency)

---

## 👨‍💻 Autor

**Felipe Duarte Barbosa**

- Email: felipe.duarte@dilettasolutions.com
- Empresa: [Diletta Solutions](https://dilettasolutions.com)

---

## 🙏 Agradecimentos

- [Danger JS](https://github.com/danger/danger-js) - Framework base incrível
- [cld3-asm](https://github.com/dexman545/cld3-asm) - Language detection
- [cspell](https://github.com/streetsidesoftware/cspell) - Spell checking
- Todos os contribuidores e usuários! ❤️

---

## 📞 Suporte

Precisa de ajuda?

- 📖 **Documentação**: [docs/](docs/)
- 🐛 **Issues**: [Bitbucket Issues](https://bitbucket.org/diletta/danger-bot/issues)
- 💬 **Email**: felipe.duarte@dilettasolutions.com
- 💬 **Slack**: [#danger-bot](https://diletta.slack.com/archives/C09CZAH10J3)

---

## 🔗 Links Rápidos

### Documentação Essencial

- [🚀 Início Rápido](docs/INICIO_RAPIDO.md)
- [📦 Instalação](docs/INSTALACAO.md)
- [🔌 Guia de Plugins](docs/GUIA_PLUGINS.md)
- [🤖 CLI](docs/CLI.md)
- [🚀 CI/CD](docs/pipelines/README.md)

### Para Desenvolvedores

- [🏗️ Arquitetura](docs/ARQUITETURA.md)
- [🔧 Desenvolvimento](docs/DESENVOLVIMENTO.md)
- [🔧 API Reference](docs/API.md)
- [💡 Exemplos](docs/EXEMPLOS.md)

### Suporte

- [❓ FAQ](docs/FAQ.md)
- [🐛 Issues](https://bitbucket.org/diletta/danger-bot/issues)

---

<div align="center">

Se o **Danger Bot** foi útil para você, compartilhe com seus colegas de trabalho!

---

**Feito com ❤️ pela [Diletta Solutions](https://dilettasolutions.com)**

[![Diletta Solutions](https://img.shields.io/badge/Diletta-Solutions-red.svg?style=for-the-badge)](https://dilettasolutions.com)

---

**🤖 Automatize seu code review. Foque no que importa.**

</div>
