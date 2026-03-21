"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * PR Summary Plugin
 * Gera um sumário compacto no topo do comentário da PR
 */
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "pr-summary",
    description: "Cria sumário consolidado da PR",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const created = git.created_files.length;
    const modified = git.modified_files.length;
    const deleted = git.deleted_files.length;
    const total = created + modified + deleted;
    const added = git.insertions || 0;
    const removed = git.deletions || 0;
    const lines = added + removed;
    const dartCount = [...git.modified_files, ...git.created_files, ...git.deleted_files].filter(
      (f) => f.endsWith(".dart")
    ).length;
    const sizeLabel =
      lines === 0
        ? "Sem alterações de código"
        : lines <= 80
          ? "PR pequena — ideal para revisão"
          : lines <= 200
            ? "PR média"
            : lines <= 600
              ? "PR grande — considere dividir"
              : "PR muito grande — divida em partes menores";
    const fileDetails = [
      created > 0 ? `+${created} novo(s)` : null,
      modified > 0 ? `${modified} modificado(s)` : null,
      deleted > 0 ? `-${deleted} removido(s)` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const rows = [
      `| Métrica | Valor |`,
      `| :-- | :-- |`,
      `| **Arquivos** | ${total} (${fileDetails}) |`,
      dartCount > 0 ? `| **Dart** | ${dartCount} arquivo(s) |` : null,
      lines > 0 ? `| **Linhas** | +${added} / -${removed} |` : null,
    ]
      .filter(Boolean)
      .join("\n");
    (0, _types_1.sendMarkdown)([`**${sizeLabel}**`, "", rows].join("\n"));
  }
);
