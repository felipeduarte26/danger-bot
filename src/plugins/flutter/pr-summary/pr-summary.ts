/**
 * 📊 PR Summary Plugin
 *
 * Cria um sumário consolidado no topo da PR com estatísticas e overview
 *
 * IMPORTANTE: Usa markdown() diretamente para garantir que o sumário
 * apareça NO TOPO, antes de todos os fails, warnings e messages.
 */
import { createPlugin, getDanger, sendMarkdown } from "@types";

export default createPlugin(
  {
    name: "pr-summary",
    description: "Cria sumário consolidado da PR",
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const { git } = danger;

    // Coletar estatísticas
    const filesCreated = git.created_files.length;
    const filesModified = git.modified_files.length;
    const filesDeleted = git.deleted_files.length;
    const totalFiles = filesCreated + filesModified + filesDeleted;

    const linesAdded = git.insertions || 0;
    const linesDeleted = git.deletions || 0;
    const totalLines = linesAdded + linesDeleted;

    // Determinar tamanho da PR
    let sizeEmoji = "";
    let sizeLabel = "";
    if (totalLines === 0) {
      sizeEmoji = "⚪";
      sizeLabel = "Sem alterações de código";
    } else if (totalLines <= 80) {
      sizeEmoji = "🟢";
      sizeLabel = "PR pequena (ideal)";
    } else if (totalLines <= 200) {
      sizeEmoji = "🟡";
      sizeLabel = "PR média";
    } else if (totalLines <= 600) {
      sizeEmoji = "🟠";
      sizeLabel = "PR grande";
    } else {
      sizeEmoji = "🔴";
      sizeLabel = "PR muito grande";
    }

    // Contar arquivos Dart
    const dartFiles = [...git.modified_files, ...git.created_files, ...git.deleted_files].filter(
      (file: string) => file.endsWith(".dart")
    );

    // Construir sumário
    const summary = `## 📊 SUMÁRIO DA PR

${sizeEmoji} **Tamanho:** ${sizeLabel}

### 📁 Arquivos Alterados

- **Total:** ${totalFiles} arquivo(s)
- ✅ Criados: ${filesCreated}
- ✏️ Modificados: ${filesModified}
- ❌ Deletados: ${filesDeleted}
- 🎯 Arquivos Dart: ${dartFiles.length}

### 📏 Linhas de Código

- **Total:** ${totalLines} linha(s) alterada(s)
- ➕ Adicionadas: ${linesAdded}
- ➖ Removidas: ${linesDeleted}

---

📝 **Análise detalhada abaixo...**`;

    // Usar markdown() diretamente para garantir que apareça NO TOPO
    // markdown() sempre renderiza ANTES de fails, warnings e messages
    sendMarkdown(summary);
  }
);
