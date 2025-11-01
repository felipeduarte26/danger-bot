# 🤖 Danger Bot

[![npm version](https://img.shields.io/npm/v/@diletta/danger-bot.svg)](https://www.npmjs.com/package/@diletta/danger-bot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Conjunto modular e reutilizável de plugins Danger JS para projetos Flutter e Dart

**Danger Bot** é uma coleção de plugins profissionais para [Danger JS](https://github.com/danger/danger-js) focada em projetos Flutter/Dart. Automatize revisões de código, verifique padrões de arquitetura, ortografia, documentação e muito mais!

---

## 🚀 Quick Start

```bash
# Instalar
npm install --save-dev danger-bot@git+https://github.com/diletta/danger-bot.git#v1.0.0

# Criar dangerfile.ts
# (Veja exemplos em docs/INSTALLATION.md)

# Executar
npm run danger:ci
```

---

## ✨ Funcionalidades

- 📏 **PR Size Checker** - Alerta sobre PRs muito grandes
- 📄 **Changelog Checker** - Verifica se o CHANGELOG foi atualizado
- 🔍 **Flutter Analyze** - Executa `flutter analyze` e reporta problemas traduzidos
- 🏗️ **Flutter Architecture** - Valida padrões de arquitetura Flutter/Dart
- 🔤 **Spell Checker** - Verifica ortografia em identificadores Dart
- 🌐 **Portuguese Documentation** - Detecta documentação em português
- 🤖 **CLI Integrada** - Ferramentas para criar e gerenciar plugins

---

## 📚 Documentação

### Para Começar

| Documento                                                    | Descrição                                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **[📖 Guia de Instalação](docs/INSTALLATION.md)**            | Instalação completa, especialmente para projetos Flutter sem `package.json` |
| **[⚡ Instalação Simplificada](docs/SIMPLIFIED_INSTALL.md)** | Por que o `danger` vem incluído automaticamente                             |
| **[🤖 Guia da CLI](docs/CLI_GUIDE.md)**                      | Como usar a CLI para criar e gerenciar plugins                              |

### Para Produção

| Documento                                          | Descrição                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| **[🚀 Guia de Pipelines](docs/PIPELINE_GUIDE.md)** | Configuração completa para CI/CD (GitHub Actions, GitLab, Bitbucket, etc) |
| **[✅ Pipeline Ready](docs/PIPELINE_READY.md)**    | Confirmação de que o projeto está pronto para pipelines                   |

### Para Desenvolvedores

| Documento                                        | Descrição                                             |
| ------------------------------------------------ | ----------------------------------------------------- |
| **[🏗️ Arquitetura](docs/ARCHITECTURE.md)**       | Estrutura modular dos plugins, barrel files e padrões |
| **[🔧 Setup & Publicação](docs/SETUP_GUIDE.md)** | Como desenvolver, testar e publicar o danger-bot      |

### Índice Completo

📋 **[Índice de Toda Documentação](docs/DOCS_INDEX.md)** - Busca rápida por caso de uso

---

## 🎯 Exemplo Básico

```typescript
// dangerfile.ts
import {
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  runPlugins,
} from "@diletta/danger-bot";

const plugins = [
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
];

(async () => {
  await runPlugins(plugins);
})();
```

```json
// package.json
{
  "scripts": {
    "danger:ci": "danger ci",
    "danger:pr": "danger pr"
  },
  "devDependencies": {
    "danger-bot": "git+https://github.com/diletta/danger-bot.git#v1.0.0"
  }
}
```

---

## 🤖 CLI Integrada

Crie e gerencie plugins facilmente:

```bash
# Criar novo plugin
danger-bot create-plugin

# Listar todos os plugins
danger-bot list

# Ver informações
danger-bot info

# Gerar dangerfile de exemplo
danger-bot generate-dangerfile
```

📖 **[Ver guia completo da CLI](docs/CLI_GUIDE.md)**

---

## 🌍 Plataformas Suportadas

### Git Providers

✅ GitHub • ✅ Bitbucket Cloud • ✅ Bitbucket Server • ✅ GitLab

### CI/CD

✅ GitHub Actions • ✅ GitLab CI • ✅ Bitbucket Pipelines • ✅ CircleCI • ✅ Travis CI • ✅ Jenkins

---

## 📦 Plugins Disponíveis

| Plugin                       | Descrição                       | Documentação                                                |
| ---------------------------- | ------------------------------- | ----------------------------------------------------------- |
| **pr-size-checker**          | Verifica tamanho do PR          | [📖 README](src/plugins/pr-size-checker/README.md)          |
| **changelog-checker**        | Valida atualização do CHANGELOG | [📖 README](src/plugins/changelog-checker/README.md)        |
| **flutter-analyze**          | Executa flutter analyze         | [📖 README](src/plugins/flutter-analyze/README.md)          |
| **flutter-architecture**     | Valida arquitetura Flutter      | [📖 README](src/plugins/flutter-architecture/README.md)     |
| **spell-checker**            | Verifica ortografia             | [📖 README](src/plugins/spell-checker/README.md)            |
| **portuguese-documentation** | Detecta docs em português       | [📖 README](src/plugins/portuguese-documentation/README.md) |

---

## 📁 Estrutura do Projeto

```
danger-bot/
├── src/
│   ├── plugins/                    # Plugins (cada um em sua pasta)
│   │   ├── pr-size-checker/
│   │   │   ├── pr-size-checker.ts
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   └── ... (outros plugins)
│   ├── types.ts                    # Tipos e helpers
│   └── index.ts                    # Exports principais
├── bin/
│   └── cli.js                      # CLI do danger-bot
├── scripts/                        # Scripts auxiliares
│   ├── setup_spell_check.sh
│   └── extract_dart_identifiers.js
├── docs/                           # 📚 Documentação
│   ├── INSTALLATION.md
│   ├── PIPELINE_GUIDE.md
│   ├── CLI_GUIDE.md
│   ├── ARCHITECTURE.md
│   └── ... (outros guias)
├── dist/                           # Build output
└── README.md                       # Este arquivo
```

---

## 🤝 Como Contribuir

1. Crie uma branch (`git checkout -b feature/MinhaFeature`)
2. Commit suas mudanças (`git commit -m 'Add: Minha feature'`)
3. Push para a branch (`git push origin feature/MinhaFeature`)
4. Abra um Pull Request

📖 **[Ver guia de desenvolvimento](docs/SETUP_GUIDE.md)**

---

## 📄 Licença

MIT © [Diletta](https://github.com/diletta)

---

## 📞 Suporte

- 🐛 **Issues**: [GitHub Issues](https://github.com/diletta/danger-bot/issues)
- 📖 **Docs**: [Documentação Completa](docs/DOCS_INDEX.md)
- 💬 **Email**: support@diletta.com

---

## 🙏 Agradecimentos

- [Danger JS](https://github.com/danger/danger-js) - Framework base
- [cld3-asm](https://github.com/dexman545/cld3-asm) - Detecção de idioma
- [cspell](https://github.com/streetsidesoftware/cspell) - Verificação ortográfica

---

<div align="center">
  
**Feito com ❤️ pela equipe Diletta**

[Documentação](docs/DOCS_INDEX.md) • [Instalação](docs/INSTALLATION.md) • [CLI](docs/CLI_GUIDE.md) • [Pipelines](docs/PIPELINE_GUIDE.md)

</div>
