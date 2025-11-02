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
    const d = getDanger();
    const modifiedFiles = d.git.modified_files;
    const createdFiles = d.git.created_files;
    const allFiles = [...modifiedFiles, ...createdFiles];

    // Verificar se CHANGELOG foi modificado
    const changelogModified = allFiles.some(file => 
      file.toLowerCase().includes("changelog")
    );

    // Arquivos que requerem atualização do CHANGELOG
    const significantChanges = allFiles.filter(file => {
      // Ignorar arquivos de teste, docs, config
      if (file.match(/\.(test|spec)\./)) return false;
      if (file.match(/^(docs|test|tests|__tests__)\//)) return false;
      if (file.match(/\.(md|txt|json|yaml|yml)$/)) return false;
      
      // Contar apenas arquivos de código fonte
      return file.match(/\.(dart|ts|js|tsx|jsx)$/);
    });

    if (significantChanges.length > 0 && !changelogModified) {
      sendWarn(
        `📝 **CHANGELOG não atualizado**\n\n` +
        `Este PR modifica **${significantChanges.length} arquivo(s) de código**.\n\n` +
        `**Por favor, atualize o CHANGELOG.md** com:\n` +
        `- Resumo das mudanças\n` +
        `- Impacto para usuários/desenvolvedores\n` +
        `- Breaking changes (se houver)\n\n` +
        `Arquivos modificados:\n${significantChanges.slice(0, 5).map(f => `- ${f}`).join('\n')}` +
        (significantChanges.length > 5 ? `\n- ... e mais ${significantChanges.length - 5} arquivo(s)` : '')
      );
    }
  }
);

