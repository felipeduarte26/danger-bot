/**
 * PR Validation Plugin
 * Valida aspectos gerais do PR:
 * - descrição com pelo menos 15 caracteres (GitHub ou Bitbucket Cloud);
 * - `changelog.md`/`CHANGELOG.md` da raiz criado ou modificado (se o projeto não tem changelog na
 *   raiz, reprova pedindo para criar);
 * - `pubspec.lock` modificado sem o `pubspec.yaml` (só os da raiz);
 * - tamanho do PR em linhas (mensagem informativa ou aviso).
 */
import {
  createPlugin,
  getDanger,
  getLineStats,
  getPRDescription,
  sendFormattedFail,
  sendMessage,
  sendWarn,
} from "@types";
import * as fs from "fs";

const MIN_DESCRIPTION_LENGTH = 15;
const REQUIRE_CHANGELOG = true;

/** Nomes que contam como "changelog atualizado" (só na raiz). */
const CHANGELOG_NAMES = ["changelog.md", "CHANGELOG.md"];
/** Nomes procurados na raiz para saber se o projeto tem changelog. */
const CHANGELOG_PATHS = ["changelog.md", "CHANGELOG.md", "Changelog.md", "CHANGELOG.MD"];

export default createPlugin(
  {
    name: "pr-validation",
    description: "Valida descrição, changelog e aspectos gerais do PR",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();
    const changedFiles = new Set([...git.modified_files, ...git.created_files]);

    const prDescription = getPRDescription();

    if (prDescription.length < MIN_DESCRIPTION_LENGTH) {
      sendFormattedFail({
        title: "DESCRIÇÃO DO PR MUITO CURTA",
        description: `A descrição tem apenas **${prDescription.length} caracteres** (mínimo: ${MIN_DESCRIPTION_LENGTH}).`,
        problem: {
          wrong: prDescription || "(vazio)",
          correct: `## Contexto\nDescrição do motivo da mudança.\n\n## Mudanças\n- O que foi alterado\n\n## Testes\n- Como foi testado`,
          wrongLabel: "Descrição atual",
          correctLabel: "Exemplo de boa descrição",
        },
        action: {
          text: "Inclua na descrição: **Contexto**, **Mudanças**, **Impacto** e **Testes**.",
          code: `## Contexto\nPor que essa mudança foi necessária?\n\n## Mudanças\n- O que foi alterado?\n\n## Impacto\n- Como afeta o sistema/usuários?\n\n## Testes\n- Como foi testado?`,
        },
        objective: "Descrições claras facilitam **revisão** e **compreensão** das mudanças.",
        file: "README.md",
        line: 1,
      });
    }

    if (REQUIRE_CHANGELOG) {
      const changelogModified = CHANGELOG_NAMES.some((name) => changedFiles.has(name));

      if (!changelogModified) {
        // caminho relativo à raiz do projeto (cwd do Danger)
        const hasChangelog = CHANGELOG_PATHS.some((p) => fs.existsSync(p));

        if (!hasChangelog) {
          sendFormattedFail({
            title: "CHANGELOG NÃO ENCONTRADO",
            description: "Este projeto não possui um arquivo `changelog.md` na raiz.",
            problem: {
              wrong: `// Sem changelog no projeto`,
              correct: `# Changelog\n\n## [x.x.x] - DD/MM/AAAA\n\n### 🛠️ Fixed\n- [TICKET-000: Descrição](link)`,
              wrongLabel: "Sem rastreamento de mudanças",
              correctLabel: "Com changelog estruturado",
            },
            action: {
              text: "Crie o arquivo `changelog.md` na raiz do projeto:",
              code: `# Changelog\n\n## [x.x.x] - DD/MM/AAAA (Pre-Release)\n\n### 🛠️ Fixed\n- [TICKET-000: Descrição da correção](link)\n\n### 🆕 Added\n- [TICKET-000: Descrição](link)\n\n### 🔄 Changed\n- [TICKET-000: Descrição](link)`,
            },
            objective: "Rastrear **histórico de mudanças** e facilitar rollbacks.",
            file: "changelog.md",
            line: 1,
          });
        } else {
          sendFormattedFail({
            title: "CHANGELOG NÃO ATUALIZADO",
            description: "O arquivo `changelog.md` existe mas **não foi modificado** nesta PR.",
            problem: {
              wrong: `// changelog.md não modificado nesta PR`,
              correct: `## [x.x.x] - DD/MM/AAAA\n\n### 🆕 Added\n- [TICKET-000: Mudança desta PR](link)`,
              wrongLabel: "Changelog desatualizado",
              correctLabel: "Changelog com as mudanças da PR",
            },
            action: {
              text: "Adicione suas mudanças ao changelog:",
              code: `## [x.x.x] - DD/MM/AAAA\n\n### 🛠️ Fixed\n- [TICKET-000: Descrição](link)\n\n### 🆕 Added\n- [TICKET-000: Descrição](link)`,
            },
            objective: "Cada PR deve documentar suas mudanças para manter o **histórico claro**.",
            file: "changelog.md",
            line: 1,
          });
        }
      }
    }

    const pubspecYamlChanged = git.modified_files.includes("pubspec.yaml");
    const pubspecLockChanged = git.modified_files.includes("pubspec.lock");

    if (pubspecLockChanged && !pubspecYamlChanged) {
      sendFormattedFail({
        title: "PUBSPEC.LOCK MODIFICADO SEM PUBSPEC.YAML",
        description:
          "O `pubspec.lock` foi alterado mas o `pubspec.yaml` não. Pode indicar inconsistência de dependências.",
        problem: {
          wrong: `// pubspec.lock alterado, pubspec.yaml não`,
          correct: `// Ambos alterados juntos\npubspec.yaml  ← define dependências\npubspec.lock  ← resolve versões`,
        },
        action: {
          text: "Execute localmente e verifique:",
          code: `flutter pub get\ngit diff pubspec.lock\ngit add pubspec.lock\ngit commit -m "chore: sincroniza pubspec.lock"`,
        },
        objective: "Manter **sincronização** entre pubspec.yaml e pubspec.lock.",
        file: "pubspec.lock",
        line: 1,
      });
    }

    // git.insertions/deletions só existem no dry-run: no CI as linhas vêm do diff
    const { added, removed } = await getLineStats();
    const linesChanged = added + removed;
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
