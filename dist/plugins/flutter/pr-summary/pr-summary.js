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
    const size =
      lines === 0
        ? { icon: "⚪", label: "Sem alterações" }
        : lines <= 80
          ? { icon: "🟢", label: "Pequena" }
          : lines <= 200
            ? { icon: "🟡", label: "Média" }
            : lines <= 600
              ? { icon: "🟠", label: "Grande" }
              : { icon: "🔴", label: "Muito grande" };
    const parts = [
      created > 0 ? `**+${created}** novo(s)` : null,
      modified > 0 ? `**${modified}** modificado(s)` : null,
      deleted > 0 ? `**-${deleted}** removido(s)` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    (0, _types_1.sendMarkdown)(
      [
        `### ${size.icon} PR ${size.label} — ${lines} linhas`,
        "",
        `**${total}** arquivo(s): ${parts}${dartCount > 0 ? ` · **${dartCount}** Dart` : ""}`,
        lines > 0 ? `**+${added}** adições · **-${removed}** remoções` : "",
      ]
        .filter((l) => l !== "")
        .join("\n")
    );
  }
);
