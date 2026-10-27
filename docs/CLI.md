# CLI

Documentacao completa da CLI do Danger Bot.

A CLI e instalada automaticamente com o pacote e pode ser usada via `danger-bot` ou `npx danger-bot`.

---

## Comandos

| Comando | Alias | Descricao |
|---------|-------|-----------|
| `danger-bot dry-run` | `run` | Executar plugins localmente (sem CI/tokens) |
| `danger-bot inspect <arquivo.dart>` | - | Ver o que o modelo Dart enxerga num arquivo (para escrever plugins) |
| `danger-bot list` | `ls` | Listar todos os plugins |
| `danger-bot create-plugin` | `new` | Criar novo plugin interativamente |
| `danger-bot remove-plugin` | `rm` | Remover um plugin existente |
| `danger-bot generate-dangerfile` | `gen` | Gerar dangerfile de exemplo |
| `danger-bot validate <file>` | - | Validar estrutura de um plugin |
| `danger-bot init` | - | Gerar arquivo danger-bot.yaml de configuracao |
| `danger-bot info` | - | Informacoes do projeto |

---

## danger-bot dry-run

Executa os plugins localmente simulando o ambiente do Danger, sem precisar de CI, tokens ou PR aberto.

```bash
danger-bot dry-run --base develop
# ou
danger-bot run --base develop
```

**Opcoes:**

| Opcao | Descricao | Default |
|-------|-----------|---------|
| `-p, --project <path>` | Caminho do projeto a analisar | Diretorio atual |
| `-b, --base <branch>` | Branch base para comparacao | `main` |
| `--plugins <list>` | Plugins especificos (separados por virgula) | Todos |
| `--all` | Incluir plugins que precisam de API/CLI externa | `false` |
| `-v, --verbose` | Exibir detalhes completos | `false` |

**Exemplos:**

```bash
# Rodar no diretorio atual
danger-bot dry-run --base develop

# Rodar em outro projeto
danger-bot dry-run --project /caminho/projeto --base main

# Apenas plugins especificos (busca parcial)
danger-bot dry-run --plugins "model-entity,domain-entities,print-statement"

# Com detalhes
danger-bot dry-run --base develop -v
```

**Plugins ignorados por padrao** (precisam de servicos externos):
- `flutter-analyze`, `flutter-test-runner`, `test-coverage-summary` (Flutter CLI)
- `google-chat-notification` (webhook)
- `ai-code-review` (Gemini API)
- `spell-checker` (dicionario)
- `pr-summary` (contexto de PR real)

Use `--all` para incluir todos.

> Documentacao completa: [Teste Local](TESTE_LOCAL.md)

---

## danger-bot inspect

Mostra o que o [modelo Dart](MODELO_DART.md) enxerga num arquivo `.dart`, com os **nomes das propriedades** que um plugin usa: `file.path`, diretivas, classes e membros (`cls.fields`, `cls.methods`...), `file.calls()`, `file.strings`, `file.comments`, `file.localVariables()` e trechos não reconhecidos. Use antes de escrever a regra de um plugin, para saber qual propriedade dá o fato que você precisa ([Criando plugins](CRIANDO_PLUGINS.md)).

```bash
danger-bot inspect lib/features/order/data/models/order_model.dart
danger-bot inspect lib/x.dart --line 42              # só o que está na linha 42
danger-bot inspect lib/x.dart --only calls,strings   # só algumas seções
danger-bot inspect lib/x.dart --json                 # para scripts
```

**Opcoes:**

| Opcao | Descricao | Default |
|-------|-----------|---------|
| `--only <seções>` | Seções separadas por vírgula: `path`, `imports`, `classes`, `functions`, `variables`, `calls`, `strings`, `comments`, `locals`, `identifiers`, `errors` | Todas, menos `identifiers` |
| `-l, --line <n>` | Só os nós que contêm a linha `n` (a classe, o método, a chamada...) | - |
| `--json` | Saída em JSON | `false` |

**Saida** (`--only classes --line 37`):

```text
📄 lib/features/branch/data/models/branch_custom_holiday_model.dart  (só a linha 37)
   flags: só as verdadeiras · tipos e textos em uma linha (compact)

file.declarations (classes, enums, mixins, extensions) — 1
  L5-60     class BranchCustomHolidayModel {
            kind=class  name=BranchCustomHolidayModel  nameLine=5  isComplete
    cls.fields — 1
      L37       name
                type=String  nullability=nonNullable  isFinal  origin=body
```

Cada linha mostra a faixa de linhas do nó (`L5-60`), o texto em uma linha e as propriedades com o nome exato da API (`type`, `nullability`, `isFinal`...). Booleanos aparecem só quando verdadeiros. Roda no projeto Flutter (o caminho é relativo ao diretório atual) e lê o `dist/` do pacote instalado.

---

## danger-bot list

Lista todos os plugins disponiveis, organizados por plataforma.

```bash
danger-bot list
# ou
danger-bot ls
```

**Saida:**

```text
============================================================
DANGER BOT PLUGINS
============================================================

--- FLUTTER ---

[1] AI-CODE-REVIEW
    Platform: flutter
    Folder: ai-code-review/
    File: ai-code-review.ts
    Description: Code review com IA (Gemini) — analisa Clean Code, SOLID, segurança e bugs
    Status: DISABLED
    Documentation: README.md

[2] AVOID-GOD-CLASS
    ...

============================================================
Total: 48 plugin(s) across 1 platform(s)
```

> Comandos de desenvolvimento do pacote (`list`, `info`, `create-plugin`, `remove-plugin`) leem `src/plugins/` do diretorio atual: rode-os na raiz do repositorio do danger-bot. `dry-run`, `inspect`, `init` e `gen` sao para o projeto que usa o Danger Bot; `validate` recebe o caminho do arquivo e funciona em qualquer lugar.

---

## danger-bot create-plugin

Cria um novo plugin interativamente. A CLI pergunta:

1. **Plataforma** (Flutter/Dart ou Node.js)
2. **Nome do plugin** (sera convertido para kebab-case)
3. **Descricao** do que o plugin faz
4. **Tipo de regra**, que escolhe o template (todos leem o código pelo [modelo Dart](MODELO_DART.md))
5. Se o plugin vem **habilitado** por padrao

| Tipo | Template | Troque |
|------|----------|--------|
| 1. Call | `file.calls()`: a chamada errada e a mesma chamada corrigida (`fail`) | `WRONG_CALL`, `RIGHT_CALL` |
| 2. Class/structure | `file.classes` + `cls.hasMember(...) !== Presence.Absent`: membro obrigatório que falta (`fail`) | `TARGET_FOLDER`, `REQUIRED_MEMBER`, o membro de exemplo |
| 3. Text added in the PR | `readWithDiff` + `file.strings` + `isAdded`: texto nas linhas do PR (`warn`) | `TARGET_CALLEE`, o valor da correção |
| 4. Path/file | `file.path`: arquivo na pasta certa com o nome errado (`fail`) | `TARGET_FOLDER`, `REQUIRED_SUFFIX` |

```bash
danger-bot create-plugin
# ou
danger-bot new
```

**O que e gerado:**

```
src/plugins/flutter/meu-plugin/
├── meu-plugin.ts    # Template do tipo escolhido: modelo Dart + sendFormattedFail/Warn (padrao das mensagens)
├── index.ts         # Export default
└── README.md        # Na estrutura padrao: O que verifica, Severidade (a do tipo), Exemplo, Referencias
```

Troque as constantes do tipo (tabela acima) e os textos de exemplo da mensagem pela regra real, e os exemplos do README pelos do plugin. O código gerado passa no `npm run lint`, inclusive nas regras que barram regex e parser próprio em `src/plugins/`.

**Alem disso, a CLI automaticamente (Flutter):**

- Adiciona o export no barrel file `src/plugins/flutter/index.ts`
- Adiciona o **export por nome** em `src/index.ts` (bloco `export { ... } from "./plugins/flutter"`), para `import { meuPluginPlugin } from "@felipeduarte26/danger-bot"` funcionar
- Adiciona o `import` usado pelos arrays de categoria em `src/index.ts`
- Adiciona o `require("./plugins/flutter/meu-plugin").default` no `allFlutterPlugins`, **antes** do `google-chat-notification` (que precisa continuar sendo o ultimo)

As insercoes preservam o resto do arquivo (virgulas, comentarios e formatacao) e nao duplicam nada se o plugin ja estiver registrado. Se algum bloco nao for encontrado, a CLI mostra `[WARN]` para registrar manualmente. Colocar o plugin num array de categoria (`codeQualityPlugins`, `performancePlugins`...) continua manual — a CLI lembra no final.

**Exemplo de uso** (respostas depois dos `:`):

```text
$ danger-bot create-plugin

Select platform/language:
  1. Flutter/Dart
  2. Node.js
Platform (1-2) [1]: 1

Plugin name (e.g., "My Custom Plugin"): Hardcoded Text
Description: Texto fixo em Text() adicionado no PR

Rule type (template):
  1. Call — file.calls() — e.g. replace one API with another
  2. Class/structure — file.classes, cls.hasMember(), Presence — e.g. a model without a required method
  3. Text added in the PR — readWithDiff + file.strings (warn) — e.g. hardcoded text in Text()
  4. Path/file — file.path — e.g. a usecases file without the _usecase.dart suffix
Rule type (1-4) [1]: 3
Enable by default? (y/n) [y]: y

[OK] Created plugin folder: flutter/hardcoded-text/
[OK] Created plugin file: flutter/hardcoded-text/hardcoded-text.ts
...
Next steps:
  1. Implement the rule (Text added in the PR): src/plugins/flutter/hardcoded-text/hardcoded-text.ts
     (replace TARGET_CALLEE, the fixed value and the example texts of the message)
     Guide: docs/CRIANDO_PLUGINS.md · see the model of a file: db inspect <file.dart>
```

---

## danger-bot remove-plugin

Remove um plugin existente de forma interativa e segura.

```bash
danger-bot remove-plugin
# ou
danger-bot rm
```

**O que e removido** (o inverso do `create-plugin`):

- Pasta completa do plugin (`src/plugins/flutter/<nome>/`)
- Export do barrel file (`src/plugins/flutter/index.ts`)
- Em `src/index.ts`: o nome no bloco `export { ... } from "./plugins/flutter"`, no `import` das categorias, o `require(...)` do `allFlutterPlugins` e os arrays de categoria (`codeQualityPlugins`, `domainLayerPlugins`...)

O nome exportado e lido do barrel (ex.: `domain-usecases` → `domainUseCasesPlugin`). So as linhas do plugin sao removidas — o resto do arquivo fica como esta. A CLI pede confirmacao antes de remover.

---

## danger-bot generate-dangerfile

Gera um arquivo `dangerfile.example.ts` no diretorio atual (o projeto que vai usar o Danger Bot), usando `allFlutterPlugins` com o `executeDangerBot`.

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
| `import { createPlugin, ... }` | Erro | Import obrigatorio (pode vir junto com outros nomes) |
| `export default createPlugin` | Erro | Export obrigatorio |
| Campo `name` | Erro | Nome do plugin |
| Campo `description` | Erro | Descricao do plugin |
| Campo `enabled` | Aviso | Recomendado (default: true) |
| `async ()` | Aviso | Funcao run deve ser async |
| `/**` | Aviso | Documentacao JSDoc recomendada |

Com algum erro, o comando sai com codigo 1. Ele nao confere o padrao das mensagens (`sendFormattedFail`/`sendFormattedWarn`).

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

## danger-bot init

Gera um arquivo `danger-bot.yaml` na raiz do projeto com configuracao de exemplo.

```bash
danger-bot init
```

O arquivo permite configurar:

- **`local_plugins`**: caminhos para plugins customizados do seu projeto
- **`ignore_files`**: arquivos que devem ser ignorados por todos os plugins
- **`settings`**: configuracoes gerais (verbose, etc.)

Se o arquivo ja existir, a CLI pergunta se deseja sobrescrever.

**Exemplo de saida:**

```
✅ danger-bot.yaml criado com sucesso!

📄 Arquivo: /caminho/do/projeto/danger-bot.yaml

📝 Próximos passos:
   1. Edite o danger-bot.yaml com suas configurações
   2. Adicione plugins locais em local_plugins
   3. Liste arquivos para ignorar em ignore_files
```

> Documentacao completa: [Configuracao](CONFIGURACAO.md)

---

## danger-bot info

Mostra informacoes gerais do projeto.

```bash
danger-bot info
```

**Saida:**

```text
============================================================
DANGER BOT - PROJECT INFO
============================================================

Name:        @felipeduarte26/danger-bot
Version:     4.1.0
Description: Conjunto modular de plugins Danger JS

Platforms:

  flutter/ (48 plugins)
    - ai-code-review/
    - avoid-god-class/
    - ...

Total: 48 plugin(s) across 1 platform(s)

============================================================
```

So entram na contagem as pastas que tem o arquivo do plugin (`<pasta>/<nome>.ts`); pastas vazias ou em construcao sao ignoradas, como no `list`.

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
