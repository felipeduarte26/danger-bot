/**
 * DRY-RUN COMMAND
 * ================
 * Executa os plugins do Danger Bot localmente sem precisar do Danger JS,
 * tokens ou CI. Simula o ambiente do Danger usando git diff local.
 */

import { execSync } from "child_process";
import path from "path";
import { createRequire } from "module";
import { exists } from "../utils/fs-helpers.js";

const SKIP_PLUGINS_DEFAULT = [
  "flutter-analyze",
  "flutter-test-runner",
  "test-coverage-summary",
  "google-chat-notification",
  "ai-code-review",
  "spell-checker",
  "pr-summary",
];

/**
 * @param {object} options
 * @param {string} [options.project]
 * @param {string} [options.base]
 * @param {string} [options.plugins]
 * @param {boolean} [options.verbose]
 * @param {boolean} [options.all]
 */
export async function dryRun(options) {
  const projectPath = path.resolve(options.project || process.cwd());
  const baseBranch = options.base || "main";
  const verbose = options.verbose || false;
  const runAll = options.all || false;
  const pluginFilter = options.plugins
    ? options.plugins.split(",").map((s) => s.trim().toLowerCase())
    : null;

  console.log("\n" + "═".repeat(60));
  console.log("🤖 DANGER BOT — DRY RUN (execução local)");
  console.log("═".repeat(60));
  console.log(`\n📂 Projeto: ${projectPath}`);
  console.log(`🌿 Branch base: ${baseBranch}`);

  if (!exists(projectPath)) {
    console.error(`\n❌ Diretório não encontrado: ${projectPath}`);
    process.exit(1);
  }

  const originalCwd = process.cwd();
  process.chdir(projectPath);

  if (!exists(path.join(projectPath, ".git"))) {
    console.error("\n❌ Diretório não é um repositório git");
    process.chdir(originalCwd);
    process.exit(1);
  }

  const currentBranch = execSafe("git rev-parse --abbrev-ref HEAD").trim();
  console.log(`📍 Branch atual: ${currentBranch}`);

  if (currentBranch === baseBranch) {
    console.error(
      `\n❌ Você está na branch base (${baseBranch}). Mude para uma feature branch para ver o diff.`
    );
    console.log("   Dica: git checkout <sua-feature-branch>\n");
    process.chdir(originalCwd);
    process.exit(1);
  }

  const mergeBase = findMergeBase(baseBranch, currentBranch);
  if (!mergeBase) {
    console.error(`\n❌ Não foi possível encontrar merge-base com '${baseBranch}'.`);
    console.log(`   Verifique se a branch '${baseBranch}' existe.\n`);
    process.chdir(originalCwd);
    process.exit(1);
  }

  console.log("\n📊 Analisando diff...\n");

  const { modifiedFiles, createdFiles, deletedFiles, insertions, deletions } =
    getGitDiffInfo(mergeBase);

  const allChangedFiles = [...new Set([...modifiedFiles, ...createdFiles])];
  const dartFiles = allChangedFiles.filter((f) => f.endsWith(".dart"));

  console.log(`   Arquivos modificados: ${modifiedFiles.length}`);
  console.log(`   Arquivos criados:     ${createdFiles.length}`);
  console.log(`   Arquivos deletados:   ${deletedFiles.length}`);
  console.log(`   Arquivos .dart:       ${dartFiles.length}`);
  console.log(`   Linhas: +${insertions} / -${deletions}`);

  if (allChangedFiles.length === 0) {
    console.log("\n⚠️  Nenhuma alteração encontrada no diff. Nada para analisar.\n");
    process.chdir(originalCwd);
    return;
  }

  const results = { fails: [], warns: [], messages: [], markdowns: [] };

  setupDangerMock(results, {
    modifiedFiles,
    createdFiles,
    deletedFiles,
    insertions,
    deletions,
    mergeBase,
    currentBranch,
  });

  const require = createRequire(import.meta.url);
  let dangerBot;
  try {
    dangerBot = require("../../dist/index.js");
  } catch (err) {
    console.error("\n❌ Erro ao carregar danger-bot. Execute 'npm run build' primeiro.");
    if (verbose) console.error(err);
    process.chdir(originalCwd);
    process.exit(1);
  }

  const allPlugins = dangerBot.allFlutterPlugins || [];

  let pluginsToRun = allPlugins.filter((p) => {
    if (!p.config.enabled) return false;

    const name = p.config.name.toLowerCase();

    if (pluginFilter) {
      return pluginFilter.some(
        (f) => name.includes(f) || name.replace(/[- ]/g, "").includes(f.replace(/[- ]/g, ""))
      );
    }

    if (!runAll && SKIP_PLUGINS_DEFAULT.includes(name)) {
      return false;
    }

    return true;
  });

  if (pluginsToRun.length === 0) {
    console.log("\n⚠️  Nenhum plugin para executar com os filtros atuais.\n");
    process.chdir(originalCwd);
    return;
  }

  const skippedCount = allPlugins.length - pluginsToRun.length;
  console.log(`\n🔌 Plugins: ${pluginsToRun.length} para executar, ${skippedCount} ignorados`);

  if (verbose) {
    console.log("\n   Executando:");
    pluginsToRun.forEach((p) => console.log(`   ├─ ${p.config.name}`));
    if (skippedCount > 0) {
      console.log("\n   Ignorados:");
      allPlugins
        .filter((p) => !pluginsToRun.includes(p))
        .forEach((p) => console.log(`   ├─ ${p.config.name} (skip)`));
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log("⚡ Executando plugins...");
  console.log("─".repeat(60) + "\n");

  const startTime = Date.now();

  for (const plugin of pluginsToRun) {
    try {
      const pluginStart = Date.now();
      if (verbose) process.stdout.write(`   ⚡ ${plugin.config.name}...`);
      await plugin.run();
      const elapsed = Date.now() - pluginStart;
      if (verbose) console.log(` ✅ (${elapsed}ms)`);
    } catch (err) {
      if (verbose) console.log(` ❌`);
      console.error(`   ❌ Erro em '${plugin.config.name}': ${err.message}`);
      if (verbose) console.error(err.stack);
    }
  }

  if (dangerBot.flushSummaries) {
    dangerBot.flushSummaries();
  }

  const totalElapsed = Date.now() - startTime;

  displayResults(results, verbose, totalElapsed);
  process.chdir(originalCwd);
}

function execSafe(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  } catch {
    return "";
  }
}

function findMergeBase(baseBranch, currentBranch) {
  let mergeBase = execSafe(`git merge-base ${baseBranch} ${currentBranch}`).trim();
  if (!mergeBase) {
    mergeBase = execSafe(`git merge-base origin/${baseBranch} ${currentBranch}`).trim();
  }
  return mergeBase || null;
}

function getGitDiffInfo(mergeBase) {
  const diffOutput = execSafe(`git diff --name-status ${mergeBase}...HEAD`);
  const lines = diffOutput.trim().split("\n").filter(Boolean);

  const modifiedFiles = [];
  const createdFiles = [];
  const deletedFiles = [];

  for (const line of lines) {
    const [status, ...fileParts] = line.split("\t");
    const file = fileParts.join("\t");
    if (!file) continue;

    if (status === "A") {
      createdFiles.push(file);
    } else if (status === "D") {
      deletedFiles.push(file);
    } else {
      modifiedFiles.push(file);
    }
  }

  const statOutput = execSafe(`git diff --stat ${mergeBase}...HEAD`);
  let insertions = 0;
  let deletions = 0;
  const statMatch = statOutput.match(/(\d+) insertion.+?(\d+) deletion/);
  if (statMatch) {
    insertions = parseInt(statMatch[1], 10);
    deletions = parseInt(statMatch[2], 10);
  } else {
    const insertMatch = statOutput.match(/(\d+) insertion/);
    const deleteMatch = statOutput.match(/(\d+) deletion/);
    if (insertMatch) insertions = parseInt(insertMatch[1], 10);
    if (deleteMatch) deletions = parseInt(deleteMatch[1], 10);
  }

  return { modifiedFiles, createdFiles, deletedFiles, insertions, deletions };
}

function setupDangerMock(results, gitInfo) {
  const {
    modifiedFiles,
    createdFiles,
    deletedFiles,
    insertions,
    deletions,
    mergeBase,
    currentBranch,
  } = gitInfo;

  const prTitle = execSafe("git log -1 --format=%s").trim() || "Local dry-run";

  const structuredDiffForFile = async (file) => {
    const diff = execSafe(`git diff ${mergeBase}...HEAD -- "${file}"`);
    if (!diff) return null;

    const chunks = [];
    let currentChunk = null;

    for (const line of diff.split("\n")) {
      if (line.startsWith("@@")) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = {
          content: "",
          changes: [],
          oldStart: 0,
          oldLines: 0,
          newStart: 0,
          newLines: 0,
        };
        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (match) {
          currentChunk.oldStart = parseInt(match[1], 10);
          currentChunk.oldLines = parseInt(match[2] || "1", 10);
          currentChunk.newStart = parseInt(match[3], 10);
          currentChunk.newLines = parseInt(match[4] || "1", 10);
        }
      } else if (currentChunk) {
        currentChunk.content += line + "\n";
        if (line.startsWith("+")) {
          currentChunk.changes.push({ type: "add", content: line.slice(1) });
        } else if (line.startsWith("-")) {
          currentChunk.changes.push({ type: "del", content: line.slice(1) });
        } else {
          currentChunk.changes.push({ type: "normal", content: line.slice(1) });
        }
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    return { chunks };
  };

  const diffForFile = async (file) => {
    const diff = execSafe(`git diff ${mergeBase}...HEAD -- "${file}"`);
    if (!diff) return null;
    return {
      before: execSafe(`git show ${mergeBase}:"${file}"`),
      after: execSafe(`git show HEAD:"${file}"`),
      diff: diff,
      added: diff
        .split("\n")
        .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
        .join("\n"),
      removed: diff
        .split("\n")
        .filter((l) => l.startsWith("-") && !l.startsWith("---"))
        .join("\n"),
    };
  };

  global.danger = {
    git: {
      modified_files: modifiedFiles,
      created_files: createdFiles,
      deleted_files: deletedFiles,
      insertions,
      deletions,
      structuredDiffForFile,
      diffForFile,
      commits: [{ message: prTitle, sha: execSafe("git rev-parse HEAD").trim() }],
      base: mergeBase,
      head: execSafe("git rev-parse HEAD").trim(),
    },
    github: {
      pr: {
        title: prTitle,
        body: "",
        number: 0,
        user: { login: "local" },
        head: { ref: currentBranch },
        base: { ref: "main" },
      },
      thisPR: { owner: "local", repo: "dry-run", number: 0 },
      api: {},
    },
    bitbucket_cloud: {
      pr: {
        title: prTitle,
        description: "",
        author: { display_name: "local" },
      },
    },
    bitbucket_server: {
      pr: {
        title: prTitle,
        description: "",
      },
    },
  };

  global.fail = (msg, file, line) => {
    results.fails.push({ msg: cleanMsg(msg), file, line });
  };
  global.warn = (msg, file, line) => {
    results.warns.push({ msg: cleanMsg(msg), file, line });
  };
  global.message = (msg, file, line) => {
    results.messages.push({ msg: cleanMsg(msg), file, line });
  };
  global.markdown = (msg, file, line) => {
    results.markdowns.push({ msg: cleanMsg(msg), file, line });
  };
  global.schedule = async (fn) => {
    try {
      await fn();
    } catch {
      /* ignore schedule errors in dry-run */
    }
  };
}

function cleanMsg(msg) {
  if (typeof msg !== "string") return String(msg);
  return msg.replace(/&#8203;/g, "").trim();
}

function displayResults(results, verbose, elapsedMs) {
  const inlineComments = results.markdowns.filter((m) => m.file);
  const generalMarkdowns = results.markdowns.filter((m) => !m.file);

  const totalIssues =
    results.fails.length + results.warns.length + inlineComments.length + results.messages.length;

  console.log("\n" + "═".repeat(60));
  console.log("📋 RESULTADOS DO DRY-RUN");
  console.log("═".repeat(60));
  console.log(`\n⏱️  Tempo: ${elapsedMs}ms`);

  if (totalIssues === 0 && generalMarkdowns.length === 0) {
    console.log("\n🎉 Nenhum problema encontrado! Tudo OK.\n");
    return;
  }

  const errTotal = results.fails.length + inlineComments.length;
  console.log(
    `\n📊 Resumo: ${errTotal} erro(s)/inline, ${results.warns.length} aviso(s), ${results.messages.length} mensagem(ns)\n`
  );

  if (results.fails.length > 0) {
    console.log("─".repeat(60));
    console.log(`❌ ERROS GERAIS (${results.fails.length}) — falhariam o build`);
    console.log("─".repeat(60));
    results.fails.forEach((item, i) => {
      console.log(`\n  ${i + 1}. ${formatResultItem(item, verbose)}`);
    });
  }

  if (inlineComments.length > 0) {
    console.log("\n" + "─".repeat(60));
    console.log(`📌 COMENTÁRIOS INLINE (${inlineComments.length}) — comentários em arquivos no PR`);
    console.log("─".repeat(60));
    inlineComments.forEach((item, i) => {
      console.log(`\n  ${i + 1}. ${formatResultItem(item, verbose)}`);
    });
  }

  if (results.warns.length > 0) {
    console.log("\n" + "─".repeat(60));
    console.log(`⚠️  AVISOS (${results.warns.length})`);
    console.log("─".repeat(60));
    results.warns.forEach((item, i) => {
      console.log(`\n  ${i + 1}. ${formatResultItem(item, verbose)}`);
    });
  }

  if (results.messages.length > 0) {
    console.log("\n" + "─".repeat(60));
    console.log(`💬 MENSAGENS (${results.messages.length})`);
    console.log("─".repeat(60));
    results.messages.forEach((item, i) => {
      console.log(`\n  ${i + 1}. ${formatResultItem(item, verbose)}`);
    });
  }

  if (generalMarkdowns.length > 0 && verbose) {
    console.log("\n" + "─".repeat(60));
    console.log(`📝 MARKDOWN GERAL (${generalMarkdowns.length})`);
    console.log("─".repeat(60));
    generalMarkdowns.forEach((item, i) => {
      console.log(`\n  ${i + 1}. ${formatResultItem(item, verbose)}`);
    });
  }

  console.log("\n" + "═".repeat(60));
  if (errTotal > 0) {
    console.log("⛔ O CI falharia com esses erros. Corrija antes de abrir/atualizar o PR.");
  } else if (results.warns.length > 0) {
    console.log("✅ Nenhum erro crítico. Apenas avisos para revisar.");
  } else {
    console.log("✅ Nenhum problema encontrado.");
  }
  console.log("═".repeat(60) + "\n");
}

function formatResultItem(item, verbose) {
  const location = item.file ? `📄 ${item.file}${item.line ? `:${item.line}` : ""}` : "";
  const title = extractFirstLine(item.msg);

  if (verbose) {
    return `${title}\n     ${location}\n     ${item.msg.split("\n").slice(1, 5).join("\n     ")}`;
  }

  return location ? `${title}\n     ${location}` : title;
}

function extractFirstLine(msg) {
  const firstLine = msg.split("\n")[0].trim();
  return (
    firstLine
      .replace(/^#+\s*/, "")
      .replace(/[*`]/g, "")
      .trim()
      .slice(0, 120) || "Problema detectado"
  );
}
