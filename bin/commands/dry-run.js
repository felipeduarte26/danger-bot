/**
 * DRY-RUN COMMAND
 * ================
 * Executa os plugins do Danger Bot localmente sem precisar do Danger JS,
 * tokens ou CI. Simula o ambiente do Danger usando git diff local.
 */

import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import { exists } from "../utils/fs-helpers.js";

const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb";

const c = supportsColor
  ? {
      reset: "\x1b[0m",
      bold: "\x1b[1m",
      dim: "\x1b[2m",
      italic: "\x1b[3m",
      underline: "\x1b[4m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",
      gray: "\x1b[90m",
    }
  : {
      reset: "",
      bold: "",
      dim: "",
      italic: "",
      underline: "",
      red: "",
      green: "",
      yellow: "",
      blue: "",
      magenta: "",
      cyan: "",
      white: "",
      gray: "",
    };

function createProgressBar(total) {
  const BAR_WIDTH = 28;
  const isTTY = process.stdout.isTTY;
  let current = 0;

  const render = (label, finished) => {
    if (!isTTY) return;
    const pct = total === 0 ? 100 : Math.round((current / total) * 100);
    const filled = total === 0 ? BAR_WIDTH : Math.round((current / total) * BAR_WIDTH);
    const empty = BAR_WIDTH - filled;
    const bar = `${c.cyan}${"█".repeat(filled)}${c.dim}${"░".repeat(empty)}${c.reset}`;
    const counter = `${c.dim}(${current}/${total})${c.reset}`;
    const name = label ? ` ${c.dim}${label.slice(0, 24).padEnd(24)}${c.reset}` : "";

    if (finished) {
      process.stdout.write(
        `\r${c.green}✅${c.reset} [${bar}] ${c.bold}${c.green}100%${c.reset} ${counter}\n`
      );
    } else {
      process.stdout.write(
        `\r⚡ [${bar}] ${c.yellow}${String(pct).padStart(3)}%${c.reset} ${counter}${name}`
      );
    }
  };

  return {
    start(firstName) {
      render(firstName, false);
    },
    tick(pluginName) {
      current++;
      render(current >= total ? "" : pluginName, current >= total);
    },
  };
}
/*
const SKIP_PLUGINS_DEFAULT = [
  "flutter-analyze",
  "flutter-test-runner",
  "test-coverage-summary",
  "google-chat-notification",
  "ai-code-review",
  "spell-checker",
  "pr-summary",
];
*/

const SKIP_PLUGINS_DEFAULT = [
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
  const runAll = options.all || false;
  const pluginFilter = options.plugins
    ? options.plugins.split(",").map((s) => s.trim().toLowerCase())
    : null;

  console.log("\n" + c.bold + c.cyan + "═".repeat(60) + c.reset);
  console.log(`${c.bold}${c.cyan}🤖 DANGER BOT — DRY RUN (execução local)${c.reset}`);
  console.log(c.bold + c.cyan + "═".repeat(60) + c.reset);
  console.log(`\n📂 Projeto: ${projectPath}`);
  console.log(`🌿 Branch base: ${baseBranch}`);

  if (!exists(projectPath)) {
    console.error(`\n❌ Diretório não encontrado: ${projectPath}`);
    process.exit(1);
  }

  const originalCwd = process.cwd();
  process.chdir(projectPath);

  const require = createRequire(import.meta.url);
  const { loadConfig, loadLocalPlugins } = require("../../dist/config.js");
  const {
    setIgnoredFiles,
    setVerbose,
    isIgnoredFile,
    getIgnoredFileMatches,
  } = require("../../dist/helpers.js");

  const config = loadConfig();
  const verbose = options.verbose || config.settings?.verbose || false;

  setVerbose(verbose);
  if (config.ignore_files) {
    setIgnoredFiles(config.ignore_files);
  }

  if (!exists(path.join(projectPath, ".git"))) {
    console.error("\n❌ Diretório não é um repositório git");
    process.chdir(originalCwd);
    process.exit(1);
  }

  const ignoredFiles = getIgnoredFileMatches();
  if (ignoredFiles.length > 0) {
    console.log(`🚫 ${ignoredFiles.length} arquivo(s) em ignore_files`);
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

  const {
    modifiedFiles: rawModified,
    createdFiles: rawCreated,
    deletedFiles,
    insertions,
    deletions,
  } = getGitDiffInfo(mergeBase);

  const ignoredChangedFiles = [
    ...new Set([...rawModified, ...rawCreated].filter((f) => isIgnoredFile(f))),
  ];
  const modifiedFiles = rawModified.filter((f) => !isIgnoredFile(f));
  const createdFiles = rawCreated.filter((f) => !isIgnoredFile(f));

  const allChangedFiles = [...new Set([...modifiedFiles, ...createdFiles])];
  const dartFiles = allChangedFiles.filter((f) => f.endsWith(".dart"));

  console.log(`   Arquivos modificados: ${modifiedFiles.length}`);
  console.log(`   Arquivos criados:     ${createdFiles.length}`);
  console.log(`   Arquivos deletados:   ${deletedFiles.length}`);
  console.log(`   Arquivos .dart:       ${dartFiles.length}`);
  if (ignoredChangedFiles.length > 0) {
    console.log(`   Arquivos ignorados:   ${ignoredChangedFiles.length} (via danger-bot.yaml)`);
    for (const file of ignoredChangedFiles) {
      console.log(`      - ${file}`);
    }
  }
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

  let dangerBot;
  try {
    dangerBot = require("../../dist/index.js");
  } catch (err) {
    console.error("\n❌ Erro ao carregar danger-bot. Execute 'npm run build' primeiro.");
    if (verbose) console.error(err);
    process.chdir(originalCwd);
    process.exit(1);
  }

  const allPluginsFromBot = dangerBot.allFlutterPlugins || [];
  let allPlugins = [...allPluginsFromBot];

  if (config.local_plugins?.length) {
    const localPlugins = await loadLocalPlugins(config.local_plugins);
    allPlugins = [...allPlugins, ...localPlugins];
  }

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
  console.log("─".repeat(60));

  const startTime = Date.now();
  const errors = [];

  if (!verbose) {
    const bar = createProgressBar(pluginsToRun.length);
    bar.start(pluginsToRun[0]?.config.name ?? "");

    for (let i = 0; i < pluginsToRun.length; i++) {
      const plugin = pluginsToRun[i];
      try {
        await plugin.run();
      } catch (err) {
        errors.push({ name: plugin.config.name, err });
      }
      bar.tick(pluginsToRun[i + 1]?.config.name ?? "");
    }

    for (const { name, err } of errors) {
      console.error(`   ${c.red}❌ Erro em '${name}': ${err.message}${c.reset}`);
    }
  } else {
    for (const plugin of pluginsToRun) {
      try {
        const pluginStart = Date.now();
        process.stdout.write(`   ⚡ ${plugin.config.name}...`);
        await plugin.run();
        const elapsed = Date.now() - pluginStart;
        console.log(` ${c.green}✅${c.reset} (${elapsed}ms)`);
      } catch (err) {
        console.log(` ${c.red}❌${c.reset}`);
        console.error(`   ${c.red}❌ Erro em '${plugin.config.name}': ${err.message}${c.reset}`);
        console.error(err.stack);
      }
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
    let currentNewLine = 0;

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
          currentNewLine = currentChunk.newStart;
        }
      } else if (currentChunk) {
        currentChunk.content += line + "\n";
        if (line.startsWith("+")) {
          currentChunk.changes.push({ type: "add", content: line.slice(1), ln: currentNewLine });
          currentNewLine++;
        } else if (line.startsWith("-")) {
          currentChunk.changes.push({ type: "del", content: line.slice(1) });
        } else {
          currentChunk.changes.push({ type: "normal", content: line.slice(1), ln: currentNewLine });
          currentNewLine++;
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

  console.log("\n" + c.bold + c.cyan + "═".repeat(60) + c.reset);
  console.log(`${c.bold}${c.cyan}📋 RESULTADOS DO DRY-RUN${c.reset}`);
  console.log(c.bold + c.cyan + "═".repeat(60) + c.reset);
  console.log(`\n⏱️  Tempo total: ${c.yellow}${elapsedMs}ms${c.reset}`);

  if (totalIssues === 0 && generalMarkdowns.length === 0) {
    console.log(
      `\n${c.green}🎉 Nenhum problema encontrado! Seu código está excelente.${c.reset}\n`
    );
    return;
  }

  const errTotal = results.fails.length + inlineComments.length;
  console.log(
    `\n📊 Resumo: ${c.red}${errTotal} erro(s)${c.reset}, ${c.yellow}${results.warns.length} aviso(s)${c.reset}, ${c.blue}${results.messages.length} mensagem(ns)${c.reset}\n`
  );

  if (results.fails.length > 0) {
    console.log(`${c.bold}${c.red}${"─".repeat(60)}${c.reset}`);
    console.log(
      `${c.bold}${c.red}❌ ERROS GERAIS (${results.fails.length})${c.reset} ${c.dim}— falhariam o build no CI${c.reset}`
    );
    console.log(`${c.bold}${c.red}${"─".repeat(60)}${c.reset}`);
    results.fails.forEach((item, i) => {
      console.log(`\n  ${c.bold}${i + 1}.${c.reset} ${formatResultItem(item, verbose)}`);
    });
    console.log("");
  }

  if (inlineComments.length > 0) {
    console.log(`${c.bold}${c.magenta}${"─".repeat(60)}${c.reset}`);
    console.log(
      `${c.bold}${c.magenta}📌 COMENTÁRIOS INLINE (${inlineComments.length})${c.reset} ${c.dim}— fixados em linhas específicas${c.reset}`
    );
    console.log(`${c.bold}${c.magenta}${"─".repeat(60)}${c.reset}`);
    inlineComments.forEach((item, i) => {
      console.log(`\n  ${c.bold}${i + 1}.${c.reset} ${formatResultItem(item, verbose)}`);
    });
    console.log("");
  }

  if (results.warns.length > 0) {
    console.log(`${c.bold}${c.yellow}${"─".repeat(60)}${c.reset}`);
    console.log(
      `${c.bold}${c.yellow}⚠️  AVISOS (${results.warns.length})${c.reset} ${c.dim}— sugestões de melhoria${c.reset}`
    );
    console.log(`${c.bold}${c.yellow}${"─".repeat(60)}${c.reset}`);
    results.warns.forEach((item, i) => {
      console.log(`\n  ${c.bold}${i + 1}.${c.reset} ${formatResultItem(item, verbose)}`);
    });
    console.log("");
  }

  if (results.messages.length > 0) {
    console.log(`${c.bold}${c.blue}${"─".repeat(60)}${c.reset}`);
    console.log(`${c.bold}${c.blue}💬 MENSAGENS (${results.messages.length})${c.reset}`);
    console.log(`${c.bold}${c.blue}${"─".repeat(60)}${c.reset}`);
    results.messages.forEach((item, i) => {
      console.log(`\n  ${c.bold}${i + 1}.${c.reset} ${formatResultItem(item, verbose)}`);
    });
    console.log("");
  }

  if (generalMarkdowns.length > 0 && verbose) {
    console.log(`${c.bold}${c.white}${"─".repeat(60)}${c.reset}`);
    console.log(`${c.bold}${c.white}📝 RELATÓRIO DETALHADO (${generalMarkdowns.length})${c.reset}`);
    console.log(`${c.bold}${c.white}${"─".repeat(60)}${c.reset}`);
    generalMarkdowns.forEach((item, i) => {
      console.log(`\n  ${c.bold}${i + 1}.${c.reset} ${formatResultItem(item, verbose)}`);
    });
    console.log("");
  }

  console.log(c.bold + c.cyan + "═".repeat(60) + c.reset);
  if (errTotal > 0) {
    console.log(
      `${c.bold}${c.red}⛔ O CI FALHARIA COM ESSES ERROS.${c.reset} Corrija-os antes de atualizar o PR.`
    );
  } else if (results.warns.length > 0) {
    console.log(
      `${c.bold}${c.yellow}✅ NENHUM ERRO CRÍTICO.${c.reset} Apenas avisos para revisar se desejar.`
    );
  } else {
    console.log(`${c.bold}${c.green}✅ TUDO LIMPO!${c.reset} O PR está pronto para ser enviado.`);
  }
  console.log(c.bold + c.cyan + "═".repeat(60) + c.reset + "\n");
}

function formatResultItem(item, verbose) {
  const location = item.file
    ? `${c.dim}📄 ${item.file}${item.line ? `:${item.line}` : ""}${c.reset}`
    : "";
  const msg = item.msg;
  const title = extractFirstLine(msg);

  const allLines = msg.split("\n");
  const nonCommentLines = allLines.filter(
    (l) => l.trim() !== "" && !l.trim().startsWith("&#8203;")
  );

  if (verbose) {
    const fullBody = allLines
      .map((line) => `     ${line}`)
      .join("\n")
      .replace(/### (.*)/g, `${c.bold}${c.underline}$1${c.reset}`)
      .replace(/\*\*(.*?)\*\*/g, `${c.bold}$1${c.reset}`)
      .replace(/`([^`]*)`/g, `${c.cyan}$1${c.reset}`);

    return `${c.bold}${c.white}${title}${c.reset}${location ? `\n     ${location}` : ""}\n\n${fullBody}`;
  }

  let explanation = "";
  if (nonCommentLines.length > 1) {
    explanation = nonCommentLines[1].trim();
    if (explanation.includes("Flutter Analyze") && nonCommentLines.length > 2) {
      explanation = nonCommentLines[2].trim();
    }
  }

  let suggestion = "";
  const actionIdx = allLines.findIndex((l) => l.includes("### 🎯 AÇÃO NECESSÁRIA"));
  if (actionIdx !== -1) {
    const codeStart = allLines.findIndex((l, i) => i > actionIdx && l.trim().startsWith("```"));
    if (codeStart !== -1) {
      const codeEnd = allLines.findIndex((l, i) => i > codeStart && l.trim().startsWith("```"));
      if (codeEnd !== -1) {
        suggestion = allLines
          .slice(codeStart + 1, codeEnd)
          .join(" ")
          .trim();
      }
    }
  }

  if (!suggestion) {
    const correctIdx = allLines.findIndex((l) => l.includes("✅ **"));
    if (correctIdx !== -1) {
      const codeStart = allLines.findIndex((l, i) => i > correctIdx && l.trim().startsWith("```"));
      if (codeStart !== -1) {
        const codeEnd = allLines.findIndex((l, i) => i > codeStart && l.trim().startsWith("```"));
        if (codeEnd !== -1) {
          suggestion = allLines
            .slice(codeStart + 1, codeEnd)
            .join(" ")
            .trim();
        }
      }
    }
  }

  const cleanExplanation = explanation
    .replace(/[*`_]/g, "")
    .replace(/^[-•]\s*/, "")
    .trim();

  let output = `${c.bold}${c.white}${title}${c.reset}`;
  if (location) {
    output += `\n     ${location}`;

    if (item.file && item.line) {
      try {
        const fullPath = path.resolve(item.file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, "utf8");
          const lines = content.split("\n");
          const lineCode = lines[item.line - 1]?.trim();
          if (lineCode) {
            output += `\n     ${c.dim}↳ ${c.italic}${lineCode}${c.reset}`;
          }
        }
      } catch {
        /* file read is non-critical for display */
      }
    }
  }

  if (cleanExplanation && cleanExplanation !== title) {
    output += `\n     ${c.yellow}💡 ${cleanExplanation}${c.reset}`;
  }

  if (suggestion) {
    const cleanSug = suggestion.replace(/^\/\/\s*/, "").trim();
    output += `\n     ${c.green}✅ Sugestão: ${c.italic}${cleanSug}${c.reset}`;
  }

  return output;
}

function extractFirstLine(msg) {
  if (!msg) return "Problema detectado";
  const firstLine = msg.split("\n")[0].trim();
  return (
    firstLine
      .replace(/^#+\s*/, "")
      .replace(/[*`_]/g, "")
      .replace(/🔍\s*/, "")
      .trim()
      .slice(0, 120) || "Problema detectado"
  );
}
