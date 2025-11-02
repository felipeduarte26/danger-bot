# 🏗️ Arquitetura do Projeto

> Entenda como o Danger Bot está organizado

---

## 📁 Estrutura de Diretórios

```
danger-bot/
├── src/
│   ├── plugins/              # Plugins organizados por plataforma
│   │   └── flutter/          # Plugins Flutter/Dart
│   │       ├── pr-size-checker/
│   │       ├── changelog-checker/
│   │       ├── flutter-analyze/
│   │       ├── flutter-architecture/
│   │       ├── spell-checker/
│   │       └── portuguese-documentation/
│   ├── helpers.ts            # Helper functions (getDanger, sendMessage, etc)
│   ├── types.ts              # Types e interfaces
│   └── index.ts              # Barrel file principal
├── bin/
│   ├── cli.js                # CLI entry point
│   ├── commands/             # Comandos da CLI
│   ├── templates/            # Templates de código
│   └── utils/                # Utilitários
├── scripts/
│   ├── patch-danger.js       # Customizações do Danger JS
│   ├── setup_spell_check.sh # Setup spell checker
│   └── extract_dart_identifiers.js
├── docs/                     # Documentação
│   ├── pipelines/            # Guias CI/CD por plataforma
│   └── *.md                  # Guias gerais
└── dist/                     # Build output (TypeScript compilado)
```

---

## 🔌 Arquitetura de Plugins

### Padrão de Plugin

Cada plugin segue esta estrutura:

```
src/plugins/{plataforma}/{nome-plugin}/
├── {nome-plugin}.ts    # Implementação
├── index.ts            # Barrel file
└── README.md           # Documentação
```

### Interface DangerPlugin

```typescript
interface DangerPlugin {
  config: {
    name: string;
    description: string;
    enabled: boolean;
  };
  run(): Promise<void>;
}
```

---

## 🔄 Fluxo de Execução

```
dangerfile.ts
    ↓
executeDangerBot()
    ↓
onBeforeRun() [opcional]
    ↓
Para cada plugin:
    ├→ Verificar se enabled
    ├→ Executar plugin.run()
    └→ Capturar erros
    ↓
onSuccess() / onError() [opcional]
    ↓
onFinally() [opcional]
```

---

## 🛠️ CLI Modular

```
bin/
├── cli.js (63 linhas)        # Entry point minimalista
├── commands/                 # Cada comando em seu arquivo
│   ├── create-plugin.js
│   ├── list-plugins.js
│   ├── generate-dangerfile.js
│   ├── validate-plugin.js
│   └── info.js
├── templates/                # Templates de código
│   ├── plugin-template.js
│   ├── readme-template.js
│   └── dangerfile-template.js
└── utils/                    # Funções compartilhadas
    ├── string-helpers.js     # Conversões de string
    ├── readline-helper.js    # Interação com usuário
    └── fs-helpers.js         # Operações de arquivo
```

---

## 🎯 Padrões Aplicados

- ✅ **Separation of Concerns** - Cada módulo tem responsabilidade única
- ✅ **Single Responsibility** - Um arquivo, uma função
- ✅ **DRY** - Código reutilizável em utils/
- ✅ **Modular Architecture** - Plugins independentes

---
