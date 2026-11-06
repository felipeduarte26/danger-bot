#!/usr/bin/env node
/**
 * Roda uma regra sobre um projeto Flutter inteiro, como se o PR tivesse criado todos os arquivos
 * `.dart`, e confere se os achados são os mesmos com o código formatado em outras larguras.
 *
 * A regra pode ser um plugin do pacote (pelo nome) ou uma regra local do projeto (`.ts`/`.js`,
 * importada no `dangerfile.ts` ou apontada em `local_plugins`). Ela roda com o diretório do projeto
 * como cwd, então o `danger-bot.yaml` dele vale (`paths.features`, `ignore_files` não: todos os
 * arquivos entram).
 *
 * uso: node tools/rule-check/check.cjs --project <dir> --rule <plugin|arquivo.ts>
 *        [--widths 40,160] [--lint] [--full] [--dist <dist>] [-v]
 * Detalhes no README.md desta pasta.
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const REPO = path.resolve(__dirname, "..", "..");
const TIMEOUT_MS = 10 * 60 * 1000;

function parseArgs(argv) {
  const args = {
    widths: [],
    full: false,
    lint: false,
    verbose: false,
    dist: path.join(REPO, "dist"),
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--project") args.project = argv[++i];
    else if (arg === "--rule") args.rule = argv[++i];
    else if (arg === "--widths")
      args.widths = argv[++i]
        .split(",")
        .map(Number)
        .filter((w) => w > 0);
    else if (arg === "--dist") args.dist = argv[++i];
    else if (arg === "--full") args.full = true;
    else if (arg === "--lint") args.lint = true;
    else if (arg === "-v" || arg === "--verbose") args.verbose = true;
    else if (arg === "--child") args.child = true;
    else if (arg === "--files") args.filesFrom = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "-h" || arg === "--help") args.help = true;
    else throw new Error(`argumento desconhecido: ${arg}`);
  }
  return args;
}

const isRulePath = (rule) => /\.(ts|js|cjs)$/.test(rule) || rule.includes("/");

// ─── processo filho: roda a regra num diretório ────────────────────────────────

function loadRule(rule, dist) {
  const modulePath = isRulePath(rule)
    ? path.resolve(rule)
    : path.join(dist, "plugins", "flutter", rule);
  const mod = require(modulePath);
  // CommonJS compilado do TypeScript pode chegar como { default: { default: plugin } }
  const plugin = [mod?.default?.default, mod?.default, mod].find(
    (m) => m && typeof m.run === "function"
  );
  if (!plugin) throw new Error(`${rule}: não exporta um plugin (config + run())`);
  return plugin;
}

function runChild(args) {
  const dist = path.resolve(args.dist);
  const files = JSON.parse(fs.readFileSync(args.filesFrom, "utf8"));

  // a regra local importa o pacote: "@felipeduarte26/danger-bot" (e "@types") vão para o dist
  const Module = require("module");
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (request === "@felipeduarte26/danger-bot" || request === "@types")
      return path.join(dist, "index.js");
    return resolve.call(this, request, ...rest);
  };
  // regra local em TypeScript: só apaga os tipos, como o Danger faz
  const ts = require(require.resolve("typescript", { paths: [REPO] }));
  require.extensions[".ts"] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
      fileName: filename,
    });
    module._compile(outputText, filename);
  };
  // sem rede: o identifier-language não fica esperando o Google Translate
  globalThis.fetch = () => Promise.reject(new Error("offline (rule-check)"));

  const read = (file) => fs.readFileSync(file, "utf8");
  const findings = [];
  global.danger = {
    git: {
      modified_files: [],
      created_files: files,
      deleted_files: [],
      // arquivo inteiro adicionado, no formato do Danger real (prefixo "+")
      structuredDiffForFile: async (file) => ({
        chunks: [
          {
            changes: read(file)
              .split("\n")
              .map((l, i) => ({ type: "add", content: "+" + l, ln: i + 1 })),
          },
        ],
      }),
      diffForFile: async (file) => ({
        before: "",
        after: read(file),
        added: read(file),
        removed: "",
        diff: "",
      }),
    },
  };
  for (const type of ["fail", "warn", "message"]) {
    global[type] = (message) =>
      findings.push({ type, file: null, line: null, message: String(message) });
  }
  global.markdown = (message, file, line) =>
    findings.push({
      type: "inline",
      file: file ?? null,
      line: line ?? null,
      message: String(message),
    });

  const plugin = loadRule(args.rule, dist);
  Promise.resolve(plugin.run())
    .then(() =>
      fs.writeFileSync(
        args.out,
        JSON.stringify({ name: plugin.config?.name ?? args.rule, findings })
      )
    )
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

// ─── processo principal ───────────────────────────────────────────────────────

/** Os `.dart` do projeto (versionados no git; fora do git, os de lib/ e test/). */
function projectFiles(dir) {
  try {
    const out = execFileSync("git", ["ls-files", "-z", "--", "*.dart"], {
      cwd: dir,
      encoding: "utf8",
      maxBuffer: 1 << 28,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .split("\0")
      .filter(Boolean)
      .filter((f) => fs.existsSync(path.join(dir, f)))
      .sort();
  } catch {
    const found = [];
    const walk = (rel) => {
      for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
        const child = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(child);
        else if (entry.name.endsWith(".dart")) found.push(child);
      }
    };
    for (const top of ["lib", "test"]) if (fs.existsSync(path.join(dir, top))) walk(top);
    return found.sort();
  }
}

function runIn(dir, files, args) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rule-check-run-"));
  const filesFrom = path.join(tmp, "files.json");
  const out = path.join(tmp, "out.json");
  fs.writeFileSync(filesFrom, JSON.stringify(files));
  const child = spawnSync(
    process.execPath,
    [
      __filename,
      "--child",
      "--rule",
      args.rule,
      "--dist",
      args.dist,
      "--files",
      filesFrom,
      "--out",
      out,
    ],
    { cwd: dir, encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: 1 << 28 }
  );
  if (args.verbose && child.stdout) process.stderr.write(child.stdout);
  if (child.status !== 0 || !fs.existsSync(out)) {
    process.stderr.write(child.stderr || "");
    throw new Error(`a regra falhou em ${dir} (código ${child.status ?? child.signal})`);
  }
  const result = JSON.parse(fs.readFileSync(out, "utf8"));
  fs.rmSync(tmp, { recursive: true, force: true });
  return result;
}

const titleOf = (finding) => finding.message.split("\n").find((l) => l.trim() !== "") ?? "";
/** Chave sem número de linha: a mesma regra no mesmo arquivo, com qualquer quebra de linha. */
const keyOf = (finding) => `${finding.type} ${finding.file ?? "-"} ${titleOf(finding)}`;

/** Cópia dos `.dart` (e da configuração) formatada com `dart format --page-width`. */
function formattedCopy(project, files, width) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `rule-check-${width}-`));
  for (const file of files) {
    fs.mkdirSync(path.join(dir, path.dirname(file)), { recursive: true });
    fs.copyFileSync(path.join(project, file), path.join(dir, file));
  }
  for (const extra of [
    "danger-bot.yaml",
    "danger-bot.yml",
    "pubspec.yaml",
    ".vscode/settings.json",
  ]) {
    if (!fs.existsSync(path.join(project, extra))) continue;
    fs.mkdirSync(path.join(dir, path.dirname(extra)), { recursive: true });
    fs.copyFileSync(path.join(project, extra), path.join(dir, extra));
  }
  const format = spawnSync("dart", ["format", "--page-width", String(width), "."], {
    cwd: dir,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
  });
  if (format.error || format.status !== 0) {
    throw new Error(
      `dart format falhou (${format.error?.message ?? format.stderr.trim()}). O dart está no PATH?`
    );
  }
  return dir;
}

function lint(rule) {
  const file = path.resolve(rule);
  const eslint = path.join(REPO, "node_modules", ".bin", "eslint");
  const config = path.join(__dirname, "eslint.config.mjs");
  const result = spawnSync(eslint, ["-c", config, "--no-config-lookup", path.basename(file)], {
    cwd: path.dirname(file),
    encoding: "utf8",
  });
  return { ok: result.status === 0, output: (result.stdout + result.stderr).trim() };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.child) return runChild(args);
  if (args.help || !args.project || !args.rule) {
    console.log(
      fs
        .readFileSync(__filename, "utf8")
        .split("*/")[0]
        .replace(/^#!.*\n\/\*\*?/, "")
    );
    process.exit(args.help ? 0 : 1);
  }
  const project = path.resolve(args.project);
  args.dist = path.resolve(args.dist);
  if (isRulePath(args.rule)) args.rule = path.resolve(args.rule);
  const files = projectFiles(project);
  let exitCode = 0;

  if (args.lint) {
    if (!isRulePath(args.rule)) {
      console.log("lint: só para regra local (plugin do pacote: npm run lint)\n");
    } else {
      const result = lint(args.rule);
      console.log(
        result.ok ? "lint do modelo: ok\n" : `lint do modelo: FALHOU\n${result.output}\n`
      );
      if (!result.ok) exitCode = 1;
    }
  }

  const base = runIn(project, files, args);
  const findings = base.findings
    .slice()
    .sort((a, b) => keyOf(a).localeCompare(keyOf(b)) || (a.line ?? 0) - (b.line ?? 0));
  console.log(
    `regra: ${base.name}${isRulePath(args.rule) ? ` (${path.relative(process.cwd(), args.rule)})` : " (plugin do pacote)"}`
  );
  console.log(`projeto: ${project} (${files.length} arquivos .dart, todos como criados no PR)`);
  console.log(`${findings.length} achado(s):`);
  for (const f of findings) {
    const where = f.file ? `${f.file}${f.line ? `:${f.line}` : ""}` : `(${f.type}, sem arquivo)`;
    console.log(`  ${where}  ${titleOf(f)}`);
  }
  if (args.full) {
    for (const f of findings)
      console.log(`\n──── ${f.file ?? f.type}${f.line ? `:${f.line}` : ""}\n${f.message}`);
  }

  if (args.widths.length > 0) {
    console.log("\nlarguras (arquivo + título, sem o número da linha):");
    const baseKeys = findings.map(keyOf).sort();
    for (const width of args.widths) {
      const dir = formattedCopy(project, files, width);
      const other = runIn(dir, files, args).findings.map(keyOf).sort();
      fs.rmSync(dir, { recursive: true, force: true });
      const remaining = other.slice();
      const onlyBase = [];
      for (const key of baseKeys) {
        const i = remaining.indexOf(key);
        if (i >= 0) remaining.splice(i, 1);
        else onlyBase.push(key);
      }
      if (onlyBase.length === 0 && remaining.length === 0) {
        console.log(`  ${width} colunas: igual (${other.length} achado(s))`);
        continue;
      }
      exitCode = exitCode || 2;
      console.log(
        `  ${width} colunas: DIFERENTE (${onlyBase.length} só no original, ${remaining.length} só em ${width})`
      );
      for (const key of onlyBase.slice(0, 10)) console.log(`    só no original: ${key}`);
      for (const key of remaining.slice(0, 10)) console.log(`    só em ${width}: ${key}`);
    }
  }
  process.exit(exitCode);
}

main();
