import { createPlugin, getDanger, sendFormattedFail, sendMessage, sendWarn } from "@types";
import * as fs from "fs";
import * as path from "path";

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

    const prDescription = danger.github?.pr?.body || danger.bitbucket_cloud?.pr?.description || "";

    if (prDescription.length < minDescriptionLength) {
      sendFormattedFail({
        title: "DESCRIÇÃO DO PR MUITO CURTA",
        description: `A descrição tem apenas **${prDescription.length} caracteres** (mínimo: ${minDescriptionLength}).`,
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

    const dartFiles = git.modified_files
      .concat(git.created_files)
      .concat(git.deleted_files)
      .filter((file: string) => file.endsWith(".dart"));

    if (dartFiles.length > maxDartFiles) {
      const suggestedPRs = Math.ceil(dartFiles.length / 40);
      sendWarn(
        `🚨 **PR CRÍTICA** — ${dartFiles.length} arquivos .dart alterados (limite: ${maxDartFiles}). Sugestão: quebrar em **${suggestedPRs} PRs** menores.`
      );
    } else if (dartFiles.length > 80) {
      sendWarn(
        `⚠️ **PR grande** — ${dartFiles.length} arquivos .dart alterados. PRs menores (30-40 arquivos) facilitam revisões.`
      );
    } else if (dartFiles.length > 60) {
      sendMessage(`📏 PR média-grande — **${dartFiles.length} arquivo(s) .dart** alterado(s).`);
    } else if (dartFiles.length > 0) {
      sendMessage(`✅ Tamanho ideal de PR — **${dartFiles.length} arquivo(s) .dart** alterado(s).`);
    }

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
