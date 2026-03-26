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
  const conflictRe = /^CONFLICT \(.*?\):\s+.*?(?:in|merge)\s+(.+)$/;
  const lines = output.split("\n");
  for (const line of lines) {
    const match = line.match(conflictRe);
    if (!match) continue;
    const file = match[1].trim();
    const conflictLine = findConflictLineForFile(lines, file);
    conflicts.push({ file, line: conflictLine });
  }
  return conflicts;
}
function findConflictLineForFile(lines, file) {
  let inFileBlock = false;
  let currentLine = 0;
  for (const line of lines) {
    if (line.startsWith("changed in both") || line.startsWith("added in both")) {
      const nextLines = lines.slice(lines.indexOf(line), lines.indexOf(line) + 4).join("\n");
      inFileBlock = nextLines.includes(file);
      currentLine = 0;
      continue;
    }
    if (!inFileBlock) continue;
    const hunkMatch = line.match(/^@@ -\d+,?\d* \+(\d+),?\d* @@/);
    if (hunkMatch) {
      currentLine = parseInt(hunkMatch[1], 10);
      continue;
    }
    if (line.startsWith("+<<<<<<< ")) {
      return Math.max(currentLine, 1);
    }
    if (
      line.startsWith("merged") ||
      line.startsWith("changed in both") ||
      line.startsWith("added in both")
    ) {
      inFileBlock = false;
      continue;
    }
    if (!line.startsWith("-")) {
      currentLine++;
    }
  }
  return 1;
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
    const branchName = target.replace("origin/", "");
    try {
      (0, child_process_1.execSync)(`git fetch origin --quiet`, { timeout: 30000 });
    } catch {
      return;
    }
    const { exitCode, output } = runGitMergeTree(target);
    if (exitCode === 0) return;
    const conflicts = parseConflicts(output);
    if (conflicts.length === 0) return;
    for (const conflict of conflicts) {
      (0, _types_1.sendFormattedFail)({
        title: "CONFLITO DE MERGE DETECTADO",
        description: `Este arquivo possui **conflito** com o branch de destino \`${branchName}\`. O merge automático **não é possível**.`,
        problem: {
          wrong: `<<<<<<< .our (sua branch)\n  // suas alterações\n=======\n  // alterações no ${branchName}\n>>>>>>> .their (${branchName})`,
          correct: `// Código resolvido manualmente\n// Combinando as alterações de ambas as branches`,
          wrongLabel: "Conflito no arquivo",
          correctLabel: "Após resolução manual",
        },
        action: {
          text: "Resolva o conflito atualizando sua branch:",
          code: `git fetch origin\ngit merge origin/${branchName}\n# Resolva os conflitos, depois:\ngit add .\ngit commit -m "fix: resolver conflitos com ${branchName}"\ngit push`,
        },
        objective:
          "Garantir que a PR possa ser **mergeada sem conflitos**, evitando problemas no branch de destino.",
        reference: {
          text: "Git - Resolving Merge Conflicts",
          url: "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-using-the-command-line",
        },
        file: conflict.file,
        line: conflict.line,
      });
    }
  }
);
