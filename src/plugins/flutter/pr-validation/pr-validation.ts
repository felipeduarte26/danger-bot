import { createPlugin, getDanger, sendFail, sendMessage, sendWarn } from "@types";
import * as fs from "fs";
import * as path from "path";

/**
 * 📋 PR Validation Plugin
 *
 * Valida aspectos gerais de uma Pull Request para garantir qualidade e documentação adequada.
 */
export default createPlugin(
  {
    name: "pr-validation",
    description: "Valida descrição, changelog e aspectos gerais do PR",
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const { git } = danger;

    const minDescriptionLength = 15;
    const maxDartFiles = 180;
    const requireChangelog = true;

    // 1. VERIFICAR DESCRIÇÃO DO PR
    const prDescription = danger.github?.pr?.body || danger.bitbucket_cloud?.pr?.description || "";

    if (prDescription.length < minDescriptionLength) {
      sendFail(
        `\n## 📝 Descrição do PR muito curta

A descrição tem apenas ${prDescription.length} caracteres (mínimo: ${minDescriptionLength}).

Descrição atual:
\`\`\`
${prDescription || "(vazio)"}
\`\`\`

### Por que isso é importante?

Descrições curtas dificultam a revisão e compreensão das mudanças.

### O que incluir na descrição?

1. **Contexto** — Por que essa mudança foi necessária?
2. **Mudanças** — O que foi alterado?
3. **Impacto** — Como isso afeta o sistema/usuários?
4. **Testes** — Como foi testado?

### Exemplo:

\`\`\`markdown
## Contexto
Usuários com emails longos não conseguiam fazer login.

## Mudanças
- Aumentei limite do campo email para 255 caracteres
- Atualizei validações no frontend
- Adicionei testes

## Impacto
- Usuários com emails longos agora conseguem fazer login
- ⚠️ Requer migração no deploy

## Testes
- ✅ Login com emails longos funcionando
- ✅ 15 testes unitários passando
\`\`\``,
        "README.md",
        1
      );
    }

    // 2. VERIFICAR CHANGELOG OBRIGATÓRIO
    if (requireChangelog) {
      const changelogModified =
        git.modified_files.includes("changelog.md") ||
        git.modified_files.includes("CHANGELOG.md") ||
        git.created_files.includes("changelog.md") ||
        git.created_files.includes("CHANGELOG.md");

      if (!changelogModified) {
        const changelogPaths = ["changelog.md", "CHANGELOG.md", "Changelog.md", "CHANGELOG.MD"];

        const hasChangelog = changelogPaths.some((p) => {
          try {
            return fs.existsSync(path.join(process.cwd(), p));
          } catch {
            return false;
          }
        });

        if (!hasChangelog) {
          sendFail(
            `\n## 📋 Changelog não encontrado

Este projeto não possui um arquivo \`changelog.md\` na raiz.

### Por que isso é importante?

Sem changelog, fica difícil:

- 🔍 Rastrear histórico de mudanças
- 🐛 Identificar quando bugs foram introduzidos
- 📢 Comunicar mudanças para a equipe
- ↩️ Fazer rollback seguro

### O que fazer?

1. Crie o arquivo \`changelog.md\` na raiz do projeto
2. Use este template:

\`\`\`markdown
# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.
O formato é inspirado em [Keep a Changelog](https://keepachangelog.com/).

## [x.x.x] - DD/MM/AAAA (Pre-Release)

### 🛠️ Fixed

- [TICKET-000: Descrição da correção](https://link-para-o-ticket)

### 🆕 Added

- [TICKET-000: Descrição da nova funcionalidade](https://link-para-o-ticket)

### 🔄 Changed

- [TICKET-000: Descrição da alteração](https://link-para-o-ticket)
\`\`\`

3. Documente as mudanças desta PR`,
            "changelog.md",
            1
          );
        } else {
          sendFail(
            `\nChangelog não foi atualizado

O arquivo \`changelog.md\` existe, mas não foi modificado nesta PR.

### Por que preciso atualizar?

Cada PR deve documentar suas mudanças para manter o histórico claro.

### O que fazer?

1. Abra o arquivo \`changelog.md\`
2. Localize a versão atual (ou crie uma nova seção)
3. Adicione suas mudanças nas categorias correspondentes:

\`\`\`markdown
## [x.x.x] - DD/MM/AAAA (Pre-Release)

### 🛠️ Fixed

- [TICKET-000: Descrição da correção](https://link-para-o-ticket)

### 🆕 Added

- [TICKET-000: Descrição da nova funcionalidade](https://link-para-o-ticket)

### 🔄 Changed

- [TICKET-000: Descrição da alteração](https://link-para-o-ticket)
\`\`\`

4. Commit e push

💡 Dica: Sempre inclua o link do ticket do Jira para rastreabilidade!`,
            "changelog.md",
            1
          );
        }
      }
    }

    // 3. VERIFICAR SINCRONIZAÇÃO PUBSPEC
    const pubspecYamlChanged = git.modified_files.includes("pubspec.yaml");
    const pubspecLockChanged = git.modified_files.includes("pubspec.lock");

    if (pubspecLockChanged && !pubspecYamlChanged) {
      sendFail(
        `\n## 📦 pubspec.lock modificado sem pubspec.yaml

O \`pubspec.lock\` foi alterado mas o \`pubspec.yaml\` não.

### Por que isso é um problema?

Pode indicar:

- Dependências desatualizadas
- Conflitos de versão entre ambientes
- Inconsistência na resolução de deps

### O que fazer?

1. Execute localmente:
\`\`\`bash
flutter pub get
\`\`\`

2. Verifique diferenças:
\`\`\`bash
git diff pubspec.lock
\`\`\`

3. Se houver diferenças, commite:
\`\`\`bash
git add pubspec.lock
git commit -m "chore: sincroniza pubspec.lock"
git push
\`\`\`

4. Se não houver diferenças: pode ignorar (diferença de plataforma/cache)`,
        "pubspec.lock",
        1
      );
    }

    // 4. VERIFICAR TAMANHO DA PR (ARQUIVOS DART)
    const dartFiles = git.modified_files
      .concat(git.created_files)
      .concat(git.deleted_files)
      .filter((file: string) => file.endsWith(".dart"));

    if (dartFiles.length > maxDartFiles) {
      const suggestedPRs = Math.ceil(dartFiles.length / 40);
      sendWarn(
        `\n## 🚨 PR CRÍTICA — MUITOS ARQUIVOS DART

Esta PR alterou **${dartFiles.length} arquivos .dart**!

### ⚠️ Problema Identificado

PRs com mais de **${maxDartFiles} arquivos** Dart são:
- 😰 Extremamente difíceis de revisar
- 🐛 Maior probabilidade de bugs passarem
- ⏰ Demoram muito para serem aprovadas
- 🔀 Mais conflitos de merge

**📊 Análise:**
- Arquivos alterados: **${dartFiles.length}**
- Limite recomendado: **${maxDartFiles}**
- Sugestão: Quebrar em **${suggestedPRs} PRs** menores

### 🎯 AÇÃO NECESSÁRIA

**Como quebrar esta PR:**

1. **Identifique** grupos lógicos de mudanças
2. **Separe** por feature, módulo ou camada
3. **Crie** PRs menores (30-40 arquivos cada)
4. **Ordene** por dependência (base → features)

### 💡 Exemplo de Quebra

\`\`\`
📦 PR Original: ${dartFiles.length} arquivos
   └─ ❌ Difícil revisar, muitos conflitos

Quebrar em ${suggestedPRs} PRs menores:

1️⃣ PR: Refatoração de Models
   └─ ✅ Base para outras mudanças

2️⃣ PR: Novos UseCases e Repositories
   └─ ✅ Contexto claro

3️⃣ PR: ViewModels e States
   └─ ✅ Lógica isolada

4️⃣ PR: UI e Widgets
   └─ ✅ Visual separado

5️⃣ PR: Testes e Ajustes Finais
   └─ ✅ Validação completa
\`\`\`

> **Regra de ouro:** PRs menores = revisões melhores = menos bugs em produção!`
      );
    } else if (dartFiles.length > 80) {
      sendWarn(
        `⚠️ PR GRANDE — Esta PR alterou **${dartFiles.length} arquivos .dart**. PRs menores (30-40 arquivos) facilitam revisões mais detalhadas.`
      );
    } else if (dartFiles.length > 60) {
      sendMessage(
        `📏 PR MÉDIA-GRANDE — Esta PR alterou **${dartFiles.length} arquivos .dart**. Está no limite aceitável, mas PRs menores são preferíveis.`
      );
    } else if (dartFiles.length > 0) {
      sendMessage(`✅ Tamanho Ideal de PR — **${dartFiles.length} arquivo(s) .dart** alterado(s).`);
    }

    // 5. VERIFICAÇÃO DE LINHAS DE CÓDIGO
    const linesChanged = (git.insertions || 0) + (git.deletions || 0);
    const filesCreated = git.created_files.length;
    const filesModified = git.modified_files.length;
    const filesDeleted = git.deleted_files.length;
    const totalFiles = filesCreated + filesModified + filesDeleted;

    if (linesChanged === 0 && totalFiles === 0) {
      sendMessage("ℹ️ Nenhuma linha de código alterada nesta PR.");
    } else if (linesChanged === 0 && totalFiles > 0) {
      sendMessage(`ℹ️ **${totalFiles} arquivo(s) alterado(s)**`);
    } else if (linesChanged <= 80) {
      sendMessage(
        `✅ **Ótimo**: PR pequeno e focado (**${linesChanged} linhas** em ${totalFiles} arquivo(s))`
      );
    } else if (linesChanged <= 200) {
      sendMessage(
        `👍 **Bom**: PR de tamanho médio (**${linesChanged} linhas** em ${totalFiles} arquivo(s))`
      );
    } else if (linesChanged <= 600) {
      sendWarn(
        `⚠️ **Atenção**: PR grande (**${linesChanged} linhas** em ${totalFiles} arquivo(s)). Considere quebrar em PRs menores.`
      );
    } else {
      sendWarn(
        `🚨 **PR Muito Grande**: **${linesChanged} linhas** em ${totalFiles} arquivo(s)! Forte recomendação de quebrar em múltiplos PRs menores.`
      );
    }
  }
);
