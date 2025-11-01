# 🎉 DANGER BOT - PROJETO CRIADO COM SUCESSO!

## 📁 Estrutura do Projeto

```
danger-bot/
├── src/
│   ├── plugins/
│   │   ├── pr-size-checker.ts           ✅
│   │   ├── changelog-checker.ts         ✅
│   │   ├── flutter-analyze.ts           ✅
│   │   ├── flutter-architecture.ts      ✅
│   │   ├── spell-checker.ts             ✅
│   │   └── portuguese-documentation.ts  ✅
│   ├── types.ts                         ✅
│   ├── danger-globals.d.ts              ✅
│   └── index.ts                         ✅
├── dist/                                ✅ (Compilado)
├── package.json                         ✅
├── tsconfig.json                        ✅
├── LICENSE                              ✅
├── README.md                            ✅
├── .gitignore                           ✅
└── .npmignore                           ✅
```

## 🚀 Como Usar

### Opção 1: Link Local (Desenvolvimento/Testes)

```bash
# 1. No danger-bot
cd /Users/felipeduarte/Projetos/GenialSolutions/danger-bot
npm link

# 2. No esfera_web
cd /Users/felipeduarte/Projetos/Diletta/esfera/esfera_web
npm link @diletta/danger-bot

# 3. Testar
npm run danger:local
```

### Opção 2: Publicar no NPM

```bash
cd /Users/felipeduarte/Projetos/GenialSolutions/danger-bot

# Login (primeira vez)
npm login

# Publicar
npm publish --access public

# No outro projeto
npm install @diletta/danger-bot
```

### Opção 3: GitHub Package Registry

```bash
# 1. Criar repositório no GitHub
# 2. Atualizar package.json:

{
  "name": "@seu-usuario/danger-bot",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}

# 3. Publicar
npm publish
```

## 📦 Instalação em Outros Projetos

### Via NPM (após publicar):
```bash
npm install --save-dev @diletta/danger-bot danger
```

### Via Git:
```bash
npm install --save-dev git+https://github.com/diletta/danger-bot.git danger
```

### Via Path Local:
```bash
npm install --save-dev ../danger-bot danger
```

## 💡 Exemplo de Uso

```typescript
// dangerfile.ts
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
    const pr = danger.github?.pr || danger.bitbucket_cloud?.pr;
    
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

## 🔧 Configuração do CI

### GitHub Actions

```yaml
name: Danger CI

on: [pull_request]

jobs:
  danger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run Danger
        run: npm run danger:ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Bitbucket Pipelines

```yaml
pipelines:
  pull-requests:
    '**':
      - step:
          name: Danger CI
          image: node:18
          script:
            - npm install
            - npm run danger:ci
```

## 🎯 Plugins Disponíveis

| Plugin | Descrição | Status |
|--------|-----------|--------|
| `prSizeChecker` | Verifica tamanho do PR | ✅ |
| `changelogChecker` | Verifica CHANGELOG | ✅ |
| `flutterAnalyze` | Analisa código Dart | ✅ |
| `flutterArchitecture` | Valida arquitetura | ✅ |
| `spellChecker` | Verifica ortografia | ✅ |
| `portugueseDocumentation` | Detecta docs em PT | ✅ |

## 🛠️ Desenvolvimento

### Adicionar Novo Plugin

```typescript
// src/plugins/meu-plugin.ts
import { createPlugin } from "../types";

export default createPlugin(
  {
    name: "meu-plugin",
    description: "Descrição",
    enabled: true,
  },
  async () => {
    // Lógica do plugin
    message("Executando meu plugin!");
  }
);

// src/index.ts - Exportar
export { default as meuPlugin } from "./plugins/meu-plugin";
```

### Rebuild

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

## 📚 Próximos Passos

### 1. Configurar Repositório Git

```bash
cd /Users/felipeduarte/Projetos/GenialSolutions/danger-bot
git init
git add .
git commit -m "feat: Initial commit - Danger Bot v1.0.0"
git remote add origin https://github.com/diletta/danger-bot.git
git push -u origin main
```

### 2. Publicar no NPM

```bash
npm login
npm publish --access public
```

### 3. Atualizar Projetos

```bash
# Em cada projeto Flutter/Dart
npm install @diletta/danger-bot
# Atualizar dangerfile.ts
```

## 🎁 Benefícios

✅ **Modular**: Cada plugin é independente  
✅ **Reutilizável**: Use em múltiplos projetos  
✅ **Manutenível**: Atualização centralizada  
✅ **Extensível**: Crie novos plugins facilmente  
✅ **Testável**: Teste localmente antes de publicar  
✅ **Documentado**: README completo  
✅ **TypeScript**: Type-safe  
✅ **Open Source**: MIT License  

## 📞 Suporte

- 📧 Email: support@genialsolutions.com
- 🐛 Issues: GitHub Issues
- 📖 Docs: README.md

---

**Criado com ❤️ por Genial Solutions**

