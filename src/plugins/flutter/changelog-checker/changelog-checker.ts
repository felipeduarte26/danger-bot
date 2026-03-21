/**
 * 📄 CHANGELOG CHECKER PLUGIN
 * ==========================
 * Verifica se o CHANGELOG foi atualizado quando necessário
 */

import { createPlugin, getDanger, sendWarn } from "@types";

export default createPlugin(
  {
    name: "changelog-checker",
    description: "Verifica se o CHANGELOG.md foi atualizado",
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const modifiedFiles = danger.git.modified_files;
    const createdFiles = danger.git.created_files;
    const allFiles = [...modifiedFiles, ...createdFiles];

    // Verificar se CHANGELOG foi modificado
    const changelogModified = allFiles.some((file: string) =>
      file.toLowerCase().includes("changelog")
    );

    // Arquivos que requerem atualização do CHANGELOG
    const significantChanges = allFiles.filter((file: string) => {
      // Ignorar arquivos de teste, docs, config
      if (file.match(/\.(test|spec)\./)) return false;
      if (file.match(/^(docs|test|tests|__tests__)\//)) return false;
      if (file.match(/\.(md|txt|json|yaml|yml)$/)) return false;

      // Contar apenas arquivos de código fonte
      return file.match(/\.(dart|ts|js|tsx|jsx)$/);
    });

    if (significantChanges.length > 0 && !changelogModified) {
      sendWarn(
        `**CHANGELOG não atualizado**

Este PR modifica **${significantChanges.length} arquivo(s) de código**.

**Por favor, atualize o CHANGELOG.md com:**

- Resumo das mudanças
- Impacto para usuários/desenvolvedores
- Breaking changes (se houver)

**Arquivos modificados:**

${significantChanges
  .slice(0, 5)
  .map((f: string) => `- ${f}`)
  .join("\n")}` +
          (significantChanges.length > 5
            ? `\n- ... e mais ${significantChanges.length - 5} arquivo(s)`
            : "")
      );
    }
  }
);
