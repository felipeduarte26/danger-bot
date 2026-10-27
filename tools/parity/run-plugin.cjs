// Roda UM plugin de um dist sobre um cenário e grava tudo o que ele publicou.
// uso: node run-plugin.cjs <dist> <projeto> <cenario.json> <plugin> <saida.json>
"use strict";
const fs = require("fs");
const path = require("path");
const { P } = require("./paths.cjs");

const [distArg, projectArg, scenarioArg, pluginName, outArg] = process.argv.slice(2);
const dist = path.resolve(distArg);
const project = path.resolve(projectArg);
const scenario = JSON.parse(fs.readFileSync(path.resolve(scenarioArg), "utf8"));
const out = path.resolve(outArg);

process.chdir(project);
process.env.GEMINI_API_KEY = "fake-key";
process.env.GOOGLE_CHAT_WEBHOOK = "https://chat.example.invalid/hook";
// Rede: o Google Translate fica offline; Gemini e webhook respondem vazio e o envio é registrado.
const fetchLog = [];
globalThis.fetch = (url, init) => {
  const u = String(url);
  if (/translate/.test(u)) return Promise.reject(new Error("offline (harness)"));
  fetchLog.push(`fetch ${u.replace(/key=[^&]+/, "key=*")} ${String(init?.body ?? "").length}:${String(init?.body ?? "").slice(0, 400)}`);
  const body = { candidates: [{ content: { parts: [{ text: "[]" }] } }] };
  return Promise.resolve({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
};

// Ferramentas externas (flutter/dart/git remoto) respondem com o texto fixo do cenário.
const cp = require("child_process");
const fakes = (scenario.fakes || []).map((f) => ({ re: new RegExp(f.match), output: f.output, fail: f.fail }));
const commands = [];
function fakeFor(cmd) {
  const text = Array.isArray(cmd) ? cmd.join(" ") : String(cmd);
  if (/(^|\s|\/)(flutter|dart|fvm)\s/.test(text + " ") || /\bgit\s+(fetch|merge-tree|merge-base|blame)\b/.test(text)) {
    commands.push(text);
    const fake = fakes.find((f) => f.re.test(text));
    if (fake && fake.fail) {
      const err = new Error(`fake failure: ${text}`);
      err.stdout = fake.output || "";
      err.stderr = "";
      err.status = 1;
      throw err;
    }
    return fake ? fake.output : "";
  }
  return null;
}
for (const fn of ["execSync", "execFileSync"]) {
  const original = cp[fn];
  cp[fn] = function (cmd, ...rest) {
    const full = fn === "execFileSync" ? [cmd, ...(Array.isArray(rest[0]) ? rest[0] : [])].join(" ") : cmd;
    const fake = fakeFor(full);
    if (fake !== null) {
      const opts = (fn === "execFileSync" ? rest[1] : rest[0]) || {};
      return opts.encoding ? fake : Buffer.from(fake);
    }
    return original.call(this, cmd, ...rest);
  };
}
for (const fn of ["exec", "execFile"]) {
  const original = cp[fn];
  cp[fn] = function (cmd, ...rest) {
    const args = fn === "execFile" && Array.isArray(rest[0]) ? rest[0] : [];
    const full = [cmd, ...args].join(" ");
    const callback = rest.find((r) => typeof r === "function");
    let fake;
    try {
      fake = fakeFor(full);
    } catch (err) {
      if (callback) process.nextTick(() => callback(err, err.stdout, err.stderr));
      return { on() {}, stdout: null, stderr: null };
    }
    if (fake !== null) {
      if (callback) process.nextTick(() => callback(null, fake, ""));
      return { on() {}, stdout: null, stderr: null };
    }
    return original.call(this, cmd, ...rest);
  };
}
{
  const original = cp.spawnSync;
  cp.spawnSync = function (cmd, args, ...rest) {
    const full = [cmd, ...(args || [])].join(" ");
    const fake = fakeFor(full);
    if (fake !== null) return { status: 0, stdout: fake, stderr: "", output: [null, fake, ""] };
    return original.call(this, cmd, args, ...rest);
  };
}

// Mock do Danger
const events = [];
const results = { fails: [], warnings: [], messages: [], markdowns: [] };
const scheduled = [];
const record = (type, bucket) => (message, file, line) => {
  events.push({ type, file: file ?? null, line: line ?? null, message: String(message) });
  results[bucket].push({ message: String(message), file, line });
};
global.fail = record("fail", "fails");
global.warn = record("warn", "warnings");
global.message = record("message", "messages");
global.markdown = record("markdown", "markdowns");
global.results = results;
global.schedule = (p) => scheduled.push(typeof p === "function" ? Promise.resolve().then(p) : p);
global.peril = undefined;

function readFile(file) {
  try {
    return fs.readFileSync(path.join(project, file), "utf8");
  } catch {
    return null;
  }
}

function fullAddDiff(file) {
  const content = readFile(file);
  if (content === null) return null;
  const lines = content.split("\n");
  return {
    chunks: [
      {
        content: `@@ -0,0 +1,${lines.length} @@`,
        changes: lines.map((l, i) => ({ type: "add", add: true, ln: i + 1, content: "+" + l })),
        oldStart: 0,
        oldLines: 0,
        newStart: 1,
        newLines: lines.length,
      },
    ],
  };
}

const diffs = scenario.diffs || {};
const git = {
  modified_files: [...(scenario.modified || [])],
  created_files: [...(scenario.created || [])],
  deleted_files: [...(scenario.deleted || [])],
  commits: scenario.commits || [],
  base: scenario.base || "base",
  head: scenario.head || "head",
  structuredDiffForFile: async (file) => {
    if (diffs[file] !== undefined) return diffs[file];
    if (scenario.fullDiff) return fullAddDiff(file);
    return null;
  },
  diffForFile: async (file) => {
    const structured = diffs[file] !== undefined ? diffs[file] : scenario.fullDiff ? fullAddDiff(file) : null;
    if (!structured) return null;
    const changes = structured.chunks.flatMap((c) => c.changes);
    return {
      before: "",
      after: readFile(file) ?? "",
      diff: changes.map((c) => c.content).join("\n"),
      added: changes.filter((c) => c.type === "add").map((c) => c.content).join("\n"),
      removed: changes.filter((c) => c.type === "del").map((c) => c.content).join("\n"),
    };
  },
  fileMatch: () => ({ modified: false, created: false, deleted: false, edited: false }),
};
global.danger = { git, utils: {} };
if (scenario.platform === "bitbucket_cloud") {
  global.danger.bitbucket_cloud = { pr: { title: scenario.prTitle || "", description: scenario.prBody || "" } };
} else {
  global.danger.github = {
    pr: { title: scenario.prTitle || "", body: scenario.prBody || "", additions: 0, deletions: 0, html_url: "" },
  };
}

async function main() {
  const helpers = require(path.join(dist, "helpers.js"));
  const all = JSON.parse(fs.readFileSync(path.join(P, "plugin-names.json"), "utf8"));
  helpers.setActivePlugins(scenario.activePlugins || all);
  // carrega só o módulo do plugin: um plugin quebrado não derruba os outros
  const plugin = require(path.join(dist, "plugins", "flutter", pluginName)).default;
  if (!plugin) throw new Error(`plugin ${pluginName} não encontrado em ${dist}`);
  const started = Date.now();
  let error = null;
  try {
    await plugin.run();
    await Promise.all(scheduled);
  } catch (err) {
    error = String(err && err.stack ? err.stack.split("\n")[0] : err);
  }
  helpers.flushSummaries();
  fs.writeFileSync(
    out,
    JSON.stringify({ plugin: pluginName, ms: Date.now() - started, error, commands: [...commands, ...fetchLog], events }, null, 1)
  );
}

main().catch((err) => {
  fs.writeFileSync(out, JSON.stringify({ plugin: pluginName, error: String(err.stack || err), events }, null, 1));
  process.exitCode = 1;
});
