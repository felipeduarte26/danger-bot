// Cenário de um PR real do clone do esfera: worktree no head + diff no formato do Danger
// (parse-diff: add/del com `ln`, normal com `ln1`/`ln2`, conteúdo com o prefixo +/-/espaço).
// uso: node make-git-scenario.cjs <clone> <base> <head> <nome>
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { P } = require("./paths.cjs");

const [clone, base, head, name] = process.argv.slice(2);
const git = (...args) => execFileSync("git", ["-C", clone, ...args], { encoding: "utf8", maxBuffer: 1 << 28 });

const project = path.join(P, "projects", name);
if (!fs.existsSync(project)) {
  fs.mkdirSync(path.dirname(project), { recursive: true });
  git("worktree", "add", "--detach", project, head);
  fs.symlinkSync(path.join(P, "node_modules"), path.join(project, "node_modules"));
}

const mergeBase = git("merge-base", base, head).trim();
const created = [], modified = [], deleted = [];
for (const line of git("diff", "--name-status", "--no-renames", mergeBase, head).split("\n").filter(Boolean)) {
  const [status, file] = line.split("\t");
  if (status === "A") created.push(file);
  else if (status === "D") deleted.push(file);
  else modified.push(file);
}

function parseDiff(text) {
  const chunks = [];
  let chunk = null, ln1 = 0, ln2 = 0;
  for (const line of text.split("\n")) {
    const h = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (h) {
      ln1 = +h[1]; ln2 = +h[3];
      chunk = { content: line, changes: [], oldStart: ln1, oldLines: +(h[2] ?? 1), newStart: ln2, newLines: +(h[4] ?? 1) };
      chunks.push(chunk);
      continue;
    }
    if (!chunk || line.startsWith("\\")) continue;
    if (line.startsWith("+")) chunk.changes.push({ type: "add", add: true, ln: ln2++, content: line });
    else if (line.startsWith("-")) chunk.changes.push({ type: "del", del: true, ln: ln1++, content: line });
    else if (line.startsWith(" ") || line === "") chunk.changes.push({ type: "normal", normal: true, ln1: ln1++, ln2: ln2++, content: line });
  }
  return { chunks };
}

const diffs = {};
for (const file of [...created, ...modified]) {
  const text = git("diff", "-U3", "--no-renames", mergeBase, head, "--", file);
  diffs[file] = parseDiff(text.split("\n").slice(text.split("\n").findIndex((l) => l.startsWith("@@"))).join("\n"));
}
const subject = git("log", "-1", "--format=%s", head).trim();
fs.writeFileSync(
  path.join(P, "scenarios", `${name}.json`),
  JSON.stringify({
    prTitle: subject,
    prBody: "## Descrição\n\nAlterações do PR original do esfera, usadas como cenário de paridade.\n\n## Como testar\n\nRodar o app.",
    created, modified, deleted, diffs,
  })
);
console.log(name, { created: created.length, modified: modified.length, deleted: deleted.length });
