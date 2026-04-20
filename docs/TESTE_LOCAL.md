# Teste Local (dry-run)

O comando `dry-run` permite executar todos os plugins do Danger Bot **localmente**, sem precisar de:

- CI/CD configurado
- Tokens de acesso (GitHub, Bitbucket)
- PR aberto
- Danger JS instalado separadamente

Ele simula o ambiente do Danger usando o `git diff` local e exibe no terminal exatamente o que seria comentado no PR.

---

## Pre-requisitos

| Requisito | Versao minima | Verificar |
|-----------|---------------|-----------|
| **Node.js** | >= 18 | `node --version` |
| **npm** | >= 9 | `npm --version` |
| **Git** | qualquer | `git --version` |

> **Nao precisa** instalar o Danger JS, configurar tokens ou ter PR aberto.

---

## Cenarios de uso

### Cenario A: Projeto Flutter sem package.json (danger-bot so na pipeline)

Se o danger-bot esta configurado apenas no CI/CD e o projeto Flutter nao tem `package.json`, configure o **link global** uma unica vez:

```bash
# Executar UMA VEZ no repositorio do danger-bot:
cd /caminho/para/danger-bot
npm link
```

Pronto! Agora use de qualquer pasta, em qualquer projeto:

```bash
cd /seu/projeto-flutter
danger-bot dry-run --base develop

# Ou use o alias curto:
db run -b develop
```

O `npm link` cria um atalho global. Qualquer alteracao no danger-bot ja reflete automaticamente (sem reinstalar).

#### Comandos disponiveis apos o link

| Comando | Equivalente |
|---------|-------------|
| `db run -b develop` | Forma curta |
| `db run -b develop -v` | Com detalhes |
| `db run --plugins "model-entity,domain"` | Plugins especificos |
| `danger-bot dry-run --base develop` | Forma completa |
| `danger-bot --help` | Ver todos os comandos |

### Cenario B: Projeto com package.json que ja tem danger-bot como dependencia

```bash
cd /seu/projeto
npm install
npx danger-bot dry-run --base develop
```

---

## Instalacao por Sistema Operacional

### macOS

Node.js e git geralmente ja estao disponiveis. Se nao:

```bash
# Instalar Node.js via Homebrew
brew install node

# Git ja vem com macOS (Xcode Command Line Tools)
# Se nao tiver:
xcode-select --install
```

Depois, no seu projeto Flutter que usa danger-bot:

```bash
npm install
npx danger-bot dry-run --base develop
```

Se preferir usar a CLI globalmente (sem `npx`):

```bash
npm install -g @felipeduarte26/danger-bot
danger-bot dry-run --base develop
```

### Linux (Ubuntu/Debian)

```bash
# Instalar Node.js (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Git
sudo apt-get install -y git
```

Depois, no seu projeto:

```bash
npm install
npx danger-bot dry-run --base develop
```

Ou instalar globalmente:

```bash
sudo npm install -g @felipeduarte26/danger-bot
danger-bot dry-run --base develop
```

### Windows

1. **Instalar Node.js**: Baixe em [nodejs.org](https://nodejs.org/) e instale (marque "Add to PATH")
2. **Instalar Git**: Baixe em [git-scm.com](https://git-scm.com/download/win) e instale (marque "Git from the command line and also from 3rd-party software")

Depois, no terminal (PowerShell ou CMD), no seu projeto:

```powershell
npm install
npx danger-bot dry-run --base develop
```

Ou instalar globalmente:

```powershell
npm install -g @felipeduarte26/danger-bot
danger-bot dry-run --base develop
```

> **Nota Windows**: Use PowerShell ou Git Bash. O CMD classico funciona mas pode ter problemas com caracteres Unicode na saida.

---

## Verificar se esta tudo pronto

Rode esses comandos para confirmar que o ambiente esta OK:

```bash
node --version    # Deve mostrar v18+
npm --version     # Deve mostrar 9+
git --version     # Deve mostrar qualquer versao
```

Se `npx danger-bot --help` mostrar a lista de comandos, esta tudo certo.

---

## Uso basico

```bash
npx danger-bot dry-run --base develop
```

Isso compara a branch atual com `develop` e executa os plugins sobre os arquivos modificados.

> **Importante**: Voce precisa estar em uma **feature branch**, nao na branch base.

---

## Opcoes

| Opcao | Descricao | Default |
|-------|-----------|---------|
| `-p, --project <path>` | Caminho do projeto a analisar | Diretorio atual |
| `-b, --base <branch>` | Branch base para comparacao | `main` |
| `--plugins <list>` | Plugins especificos (separados por virgula) | Todos (exceto os que precisam de API) |
| `--all` | Incluir plugins que precisam de API/CLI externa | `false` |
| `-v, --verbose` | Exibir detalhes completos | `false` |

---

## Exemplos

### Rodar no diretorio atual

```bash
npx danger-bot dry-run --base develop
```

### Apontar para outro projeto

```bash
npx danger-bot dry-run --project /caminho/do/projeto --base main
```

### Rodar plugins especificos

```bash
npx danger-bot dry-run --plugins "model-entity,domain-entities,print-statement"
```

Os nomes dos plugins sao buscados parcialmente -- nao precisa digitar o nome completo.

### Ver detalhes completos

```bash
npx danger-bot dry-run --base develop -v
```

### Incluir todos os plugins

```bash
npx danger-bot dry-run --base develop --all
```

---

## Plugins ignorados por padrao

Alguns plugins sao ignorados no dry-run porque dependem de servicos externos:

| Plugin | Motivo |
|--------|--------|
| `flutter-analyze` | Requer Flutter CLI |
| `flutter-test-runner` | Requer Flutter CLI |
| `test-coverage-summary` | Requer Flutter CLI |
| `google-chat-notification` | Envia notificacoes reais |
| `ai-code-review` | Requer API key do Gemini |
| `spell-checker` | Requer dicionario |
| `pr-summary` | Depende de contexto de PR real |

Use `--all` para incluir esses plugins (eles podem falhar se o servico nao estiver disponivel).

---

## Como funciona

1. O CLI le o `git diff` entre a branch atual e a branch base
2. Monta um mock do objeto `danger` com os arquivos modificados/criados/deletados
3. Executa os plugins sequencialmente
4. Coleta todos os `fail()`, `warn()`, `message()` e `markdown()` emitidos
5. Exibe os resultados formatados no terminal

### Saida do terminal

```
════════════════════════════════════════════════════════════
RESULTADOS DO DRY-RUN
════════════════════════════════════════════════════════════

Tempo: 50ms

Resumo: 8 erro(s)/inline, 2 aviso(s), 1 mensagem(ns)

────────────────────────────────────────────────────────────
ERROS GERAIS (2) -- falhariam o build
────────────────────────────────────────────────────────────
  1. PR muito grande -- 174 arquivos .dart alterados
  2. MODEL DEVE EXTENDER ENTITY -- 6 ocorrencia(s)

────────────────────────────────────────────────────────────
COMENTARIOS INLINE (6) -- comentarios em arquivos no PR
────────────────────────────────────────────────────────────
  1. MODEL DEVE EXTENDER ENTITY
     lib/features/data/models/brand_model.dart:8
  ...

════════════════════════════════════════════════════════════
O CI falharia com esses erros. Corrija antes de abrir/atualizar o PR.
════════════════════════════════════════════════════════════
```

---

## Fluxo recomendado de trabalho

```
1. Criar feature branch
2. Fazer alteracoes no codigo
3. Rodar dry-run para verificar
4. Corrigir problemas apontados
5. Commitar e abrir PR (CI confirma)
```

```bash
git checkout -b feature/minha-feature
# ... faz alteracoes ...
npx danger-bot dry-run --base develop
# ... corrige os problemas ...
git add . && git commit -m "feat: minha feature"
git push
```

---

## Troubleshooting

### "command not found: danger-bot"

O pacote nao esta instalado ou nao esta no PATH:

```bash
# Usar npx (nao precisa instalar global)
npx danger-bot dry-run --base develop

# Ou instalar globalmente
npm install -g @felipeduarte26/danger-bot
```

### "Erro ao carregar danger-bot. Execute npm run build primeiro"

Isso acontece quando voce esta rodando direto do repositorio do danger-bot (desenvolvimento). Execute:

```bash
npm run build
```

Se esta rodando de um projeto que usa danger-bot como dependencia, faca:

```bash
npm install
```

### "Nao foi possivel encontrar merge-base com 'main'"

A branch base nao existe localmente. Opcoes:

```bash
# Buscar branches do remote
git fetch origin

# Ou usar outra branch base
npx danger-bot dry-run --base develop
npx danger-bot dry-run --base origin/main
```

### "Voce esta na branch base"

O dry-run compara a branch atual com a base. Troque para uma feature branch:

```bash
git checkout minha-feature-branch
npx danger-bot dry-run --base develop
```

### Windows: caracteres estranhos no terminal

Use PowerShell (nao CMD) e configure UTF-8:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
npx danger-bot dry-run --base develop
```

Ou use o **Windows Terminal** (App da Microsoft Store) que suporta UTF-8 nativamente.

---

## Alias

O comando tambem aceita o alias `run`:

```bash
npx danger-bot run --base develop
```
