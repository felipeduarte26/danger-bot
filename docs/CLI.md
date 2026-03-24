# CLI

Documentacao completa da CLI do Danger Bot.

A CLI e instalada automaticamente com o pacote e pode ser usada via `danger-bot` ou `npx danger-bot`.

---

## Comandos

| Comando | Alias | Descricao |
|---------|-------|-----------|
| `danger-bot list` | `ls` | Listar todos os plugins |
| `danger-bot create-plugin` | `new` | Criar novo plugin interativamente |
| `danger-bot remove-plugin` | `rm` | Remover um plugin existente |
| `danger-bot generate-dangerfile` | `gen` | Gerar dangerfile de exemplo |
| `danger-bot validate <file>` | - | Validar estrutura de um plugin |
| `danger-bot info` | - | Informacoes do projeto |

---

## danger-bot list

Lista todos os plugins disponiveis, organizados por plataforma.

```bash
danger-bot list
# ou
danger-bot ls
```

**Saida:**

```
DANGER BOT - PLUGINS DISPONÍVEIS
=================================

flutter/ (26 plugins)

  PR & Validação:
    - pr-summary
    - pr-size-checker
    - pr-validation
    - changelog-checker

  Clean Architecture - Domain:
    - domain-entities
    - domain-failures
    - repositories
    - domain-usecases

  Clean Architecture - Data:
    - data-datasources
    - data-models

  Clean Architecture - Presentation:
    - presentation-viewmodels
    - presentation-try-catch-checker

  ...

Total: 26 plugin(s)
```

---

## danger-bot create-plugin

Cria um novo plugin interativamente. A CLI pergunta:

1. **Nome do plugin** (sera convertido para kebab-case)
2. **Descricao** do que o plugin faz

```bash
danger-bot create-plugin
# ou
danger-bot new
```

**O que e gerado:**

```
src/plugins/flutter/meu-plugin/
├── meu-plugin.ts    # Codigo do plugin com createPlugin
├── index.ts         # Export default
└── README.md        # Documentacao do plugin
```

**Alem disso, a CLI automaticamente:**

- Adiciona o export no barrel file `src/plugins/flutter/index.ts`
- Adiciona o plugin no array `allFlutterPlugins` em `src/index.ts`

**Exemplo de uso:**

```
$ danger-bot create-plugin

🔌 CRIAR NOVO PLUGIN
=====================

📝 Nome do plugin: code-coverage-checker
📝 Descrição: Verifica cobertura de testes do projeto

✅ Plugin criado com sucesso!

Arquivos criados:
  - src/plugins/flutter/code-coverage-checker/code-coverage-checker.ts
  - src/plugins/flutter/code-coverage-checker/index.ts
  - src/plugins/flutter/code-coverage-checker/README.md

Próximos passos:
  1. Edite: src/plugins/flutter/code-coverage-checker/code-coverage-checker.ts
  2. Implemente a lógica do plugin
  3. Teste: danger-bot validate src/plugins/flutter/code-coverage-checker/code-coverage-checker.ts
  4. Build: npm run build
  5. Use: import { codeCoverageCheckerPlugin } from "@felipeduarte26/danger-bot"
```

---

## danger-bot remove-plugin

Remove um plugin existente de forma interativa e segura.

```bash
danger-bot remove-plugin
# ou
danger-bot rm
```

**O que e removido:**

- Pasta completa do plugin (`src/plugins/flutter/<nome>/`)
- Export do barrel file (`src/plugins/flutter/index.ts`)
- Referencia no `allFlutterPlugins` (`src/index.ts`)

A CLI pede confirmacao antes de remover.

---

## danger-bot generate-dangerfile

Gera um arquivo `dangerfile.example.ts` com todos os plugins disponiveis.

```bash
danger-bot generate-dangerfile
# ou
danger-bot gen
```

**Saida:**

```
✅ Dangerfile de exemplo criado: dangerfile.example.ts

📝 Para usar:
   1. Renomeie para dangerfile.ts
   2. Customize conforme necessário
```

---

## danger-bot validate

Valida se um plugin segue o padrao correto.

```bash
danger-bot validate src/plugins/flutter/meu-plugin/meu-plugin.ts
```

**Verificacoes realizadas:**

| Verificacao | Tipo | Descricao |
|-------------|------|-----------|
| `import { createPlugin }` | Erro | Import obrigatorio |
| `export default createPlugin` | Erro | Export obrigatorio |
| Campo `name` | Erro | Nome do plugin |
| Campo `description` | Erro | Descricao do plugin |
| Campo `enabled` | Aviso | Recomendado (default: true) |
| `async ()` | Aviso | Funcao run deve ser async |
| `/**` | Aviso | Documentacao JSDoc recomendada |

**Exemplo de saida:**

```
🔍 Validando plugin...

✅ Plugin válido! Nenhum problema encontrado.
```

Ou com problemas:

```
🔍 Validando plugin...

❌ Erros encontrados:
   ❌ Falta import do createPlugin
   ❌ Falta campo "name"

⚠️ Avisos:
   ⚠️ Falta campo "enabled" (será true por padrão)
   ⚠️ Falta documentação JSDoc no topo do arquivo
```

---

## danger-bot info

Mostra informacoes gerais do projeto.

```bash
danger-bot info
```

**Saida:**

```
============================================================
DANGER BOT - PROJECT INFO
============================================================

Name:        @felipeduarte26/danger-bot
Version:     1.8.0
Description: Conjunto modular de plugins Danger JS

Platforms:

  flutter/ (26 plugins)
    - barrel-files-enforcer/
    - changelog-checker/
    - class-naming-convention/
    - clean-architecture/
    - comments-checker/
    - data-datasources/
    - data-models/
    - domain-entities/
    - domain-failures/
    - domain-usecases/
    - file-naming/
    - flutter-analyze/
    - flutter-performance/
    - flutter-widgets/
    - identifier-language/
    - late-final-checker/
    - mediaquery-modern/
    - memory-leak-detector/
    - pr-size-checker/
    - pr-summary/
    - pr-validation/
    - presentation-try-catch-checker/
    - presentation-viewmodels/
    - repositories/
    - security-checker/
    - spell-checker/

Total: 26 plugin(s) across 1 platform(s)

============================================================
```

---

## Uso com npx

Se o pacote esta instalado como dependencia do projeto:

```bash
npx danger-bot list
npx danger-bot info
npx danger-bot create-plugin
```

## Uso global

Para usar a CLI globalmente:

```bash
npm install -g @felipeduarte26/danger-bot
danger-bot list
```
