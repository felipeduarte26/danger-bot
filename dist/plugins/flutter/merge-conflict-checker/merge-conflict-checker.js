"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Merge Conflict Checker Plugin
 * Detecta conflitos de merge entre o branch atual e o branch de destino
 * usando `git merge-tree` para simular o merge sem alterar o working directory.
 */
const _types_1 = require("../../../types");
const child_process_1 = require("child_process");
function getTargetBranch() {
  const d = global.danger || globalThis.danger;
  const ghBase = d?.github?.pr?.base?.ref;
  if (ghBase) return `origin/${ghBase}`;
  const bbBase = d?.bitbucket_cloud?.pr?.destination?.branch?.name;
  if (bbBase) return `origin/${bbBase}`;
  const glBase = d?.gitlab?.mr?.target_branch;
  if (glBase) return `origin/${glBase}`;
  return null;
}
function runGitMergeTree(target) {
  try {
    const output = (0, child_process_1.execSync)(`git merge-tree --write-tree HEAD ${target}`, {
      encoding: "utf-8",
      timeout: 30000,
    });
    return { exitCode: 0, output };
  } catch (err) {
    return { exitCode: err.status ?? 1, output: err.stdout ?? "" };
  }
}
function parseConflicts(output) {
  const conflicts = [];
  const lines = output.split("\n");
  let currentFile = null;
  for (const line of lines) {
    const conflictMatch = line.match(/^CONFLICT \(.*?\):\s+.*?(?:in|merge)\s+(.+)$/);
    if (conflictMatch) {
      currentFile = conflictMatch[1].trim();
      if (!conflicts.find((c) => c.file === currentFile)) {
        conflicts.push({ file: currentFile, markers: [] });
      }
      continue;
    }
    if (currentFile && line.startsWith("+<<<<<<< ")) {
      const lineNum = findConflictLine(output, currentFile);
      if (lineNum > 0) {
        const conflict = conflicts.find((c) => c.file === currentFile);
        if (conflict && !conflict.markers.includes(lineNum)) {
          conflict.markers.push(lineNum);
        }
      }
    }
  }
  return conflicts;
}
function findConflictLine(output, file) {
  const lines = output.split("\n");
  let inFile = false;
  let lineCounter = 0;
  for (const line of lines) {
    if (
      line.includes(file) &&
      (line.startsWith("CONFLICT") || line.startsWith("changed in both"))
    ) {
      inFile = true;
      lineCounter = 0;
      continue;
    }
    if (inFile) {
      const hunkMatch = line.match(/^@@ -\d+,?\d* \+(\d+),?\d* @@/);
      if (hunkMatch) {
        lineCounter = parseInt(hunkMatch[1], 10);
        continue;
      }
      if (line.startsWith("+<<<<<<< ")) {
        return lineCounter;
      }
      if (!line.startsWith("-")) {
        lineCounter++;
      }
    }
  }
  return 0;
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "merge-conflict-checker",
    description: "Detecta conflitos de merge entre o branch atual e o branch de destino",
    enabled: true,
  },
  async () => {
    const target = getTargetBranch();
    if (!target) return;
    try {
      (0, child_process_1.execSync)(`git fetch origin --quiet`, { timeout: 30000 });
    } catch {
      return;
    }
    const { exitCode, output } = runGitMergeTree(target);
    if (exitCode === 0) return;
    const conflicts = parseConflicts(output);
    if (conflicts.length === 0) return;
    const fileList = conflicts.map((c) => `\`${c.file}\``).join("\n- ");
    for (const conflict of conflicts) {
      const line = conflict.markers.length > 0 ? conflict.markers[0] : undefined;
      (0, _types_1.sendFail)(
        `CONFLITO DE MERGE DETECTADO

O arquivo \`${conflict.file}\` possui **conflito** com o branch de destino \`${target.replace("origin/", "")}\`.

### Problema Identificado

\`\`\`
<<<<<<< HEAD (sua branch)
  // suas alterações
=======
  // alterações no ${target.replace("origin/", "")}
>>>>>>> ${target.replace("origin/", "")}
\`\`\`

O merge automático **não é possível** neste arquivo. Existem alterações concorrentes que precisam ser resolvidas manualmente.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`bash
# ❌ PR com conflito — não pode ser mergeada

# ✅ Resolva o conflito atualizando sua branch
git fetch origin
git merge origin/${target.replace("origin/", "")}

# Resolva os conflitos nos arquivos marcados
# Depois faça commit e push
git add .
git commit -m "fix: resolver conflitos com ${target.replace("origin/", "")}"
git push
\`\`\`

### 🚀 Objetivo

Garantir que a PR possa ser **mergeada sem conflitos**, evitando problemas no branch de destino.

📖 [Git - Resolving Merge Conflicts](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-using-the-command-line)`,
        conflict.file,
        line
      );
    }
    if (conflicts.length > 1) {
      (0, _types_1.sendFail)(`MÚLTIPLOS CONFLITOS DE MERGE

Esta PR possui conflitos em **${conflicts.length} arquivo(s)** com o branch \`${target.replace("origin/", "")}\`:

- ${fileList}

### 🎯 AÇÃO NECESSÁRIA

Atualize sua branch antes de prosseguir com o merge.

📖 [Git - Resolving Merge Conflicts](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-using-the-command-line)`);
    }
  }
);
