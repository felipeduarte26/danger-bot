#!/usr/bin/env node

/**
 * DANGER BOT - POST INSTALL PATCH
 * ================================
 * Script que modifica o código do Danger JS após instalação
 * para customizar mensagens e links
 *
 * Executa automaticamente após npm install
 */

const fs = require("fs");
const path = require("path");

console.log("🔧 Danger Bot: Aplicando patches no Danger JS...");

/**
 * Encontra o diretório do Danger JS
 */
function findDangerPath() {
  const possiblePaths = [
    // No projeto que instalou danger-bot
    path.join(process.cwd(), "..", "danger"),
    // No próprio danger-bot (dev)
    path.join(process.cwd(), "node_modules", "danger"),
    // Quando instalado como dependência
    path.join(process.cwd(), "..", "..", "danger"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Patch 1: Remover mensagem "All green. Good on 'ya"
 */
function patchExecutor(dangerPath) {
  const filesToPatch = [
    path.join(dangerPath, "distribution", "runner", "Executor.js"),
    path.join(
      dangerPath,
      "distribution",
      "runner",
      "templates",
      "bitbucketCloudTemplate.js"
    ),
    path.join(
      dangerPath,
      "distribution",
      "runner",
      "templates",
      "gitHubIssueTemplate.js"
    ),
    path.join(
      dangerPath,
      "distribution",
      "runner",
      "templates",
      "gitLabNoteTemplate.js"
    ),
  ];

  let patchedCount = 0;

  filesToPatch.forEach((filePath) => {
    if (!fs.existsSync(filePath)) return;

    try {
      let content = fs.readFileSync(filePath, "utf8");
      const originalContent = content;

      const replacements = [
        {
          pattern: /return\s+["'`]All green\.\s+["'`]\.concat\([^)]+\);?/g,
          replacement: 'return ""; // DANGER-BOT: Mensagem removida',
        },
        {
          pattern:
            /summaryMessage\s*=\s*["'`]["'`]\.concat\([^)]*All green[^;]+;?/g,
          replacement: 'summaryMessage = ""; // DANGER-BOT: Mensagem removida',
        },
        {
          pattern: /["'`][^"'`]*All green[^"'`]*["'`]/g,
          replacement: '""',
        },
      ];

      let patched = false;
      replacements.forEach(({ pattern, replacement }) => {
        if (pattern.test(content)) {
          content = content.replace(pattern, replacement);
          patched = true;
        }
      });

      if (patched) {
        if (!fs.existsSync(filePath + ".backup")) {
          fs.writeFileSync(filePath + ".backup", originalContent);
        }
        fs.writeFileSync(filePath, content, "utf8");
        patchedCount++;
        console.log(`${path.basename(filePath)} patched`);
      }
    } catch (error) {
      console.error(`Erro em ${path.basename(filePath)}:`, error.message);
    }
  });

  return patchedCount > 0;
}

/**
 * Patch 2: Customizar links (danger.systems → Diletta Solutions)
 */
function patchLinks(dangerPath) {
  const filesToPatch = [
    path.join(
      dangerPath,
      "distribution",
      "runner",
      "templates",
      "bitbucketCloudTemplate.js"
    ),
    path.join(
      dangerPath,
      "distribution",
      "runner",
      "templates",
      "githubIssueTemplate.js"
    ),
    path.join(
      dangerPath,
      "distribution",
      "runner",
      "templates",
      "bitbucketServerTemplate.js"
    ),
    path.join(
      dangerPath,
      "distribution",
      "runner",
      "templates",
      "gitLabNoteTemplate.js"
    ),
    path.join(dangerPath, "distribution", "platforms", "BitBucketCloud.js"),
    path.join(dangerPath, "distribution", "platforms", "BitBucketServer.js"),
    path.join(
      dangerPath,
      "distribution",
      "platforms",
      "github",
      "GitHubAPI.js"
    ),
  ];

  let patchedCount = 0;

  filesToPatch.forEach((filePath) => {
    if (!fs.existsSync(filePath)) return;

    try {
      let content = fs.readFileSync(filePath, "utf8");
      const originalContent = content;
      let filePatched = false;

      const replacements = [
        {
          search: /(https?:\/\/)?danger\.systems(\/js)?/gi,
          replace: "https://dilettasolutions.com",
        },
        {
          search: /(https?:\/\/)?github\.com\/felipeduarte26/gi,
          replace: "https://dilettasolutions.com",
        },
        {
          search: /runtimeName:\s*["']dangerJS["']/gi,
          replace: 'runtimeName: "Diletta Solutions"',
        },
        {
          search: /runtimeName:\s*["']Danger Bot["']/gi,
          replace: 'runtimeName: "Diletta Solutions"',
        },
        {
          search: /key\s*=\s*["']danger\.systems["']/gi,
          replace: 'key = "Diletta Solutions"',
        },
        {
          search: /key\s*=\s*["']Danger Bot["']/gi,
          replace: 'key = "Diletta Solutions"',
        },
        {
          search: /:no_entry_sign:/gi,
          replace: ":rocket:",
        },
        {
          search: /signatureEmoji\s*=\s*["']:no_entry_sign:["']/gi,
          replace: 'signatureEmoji = ":rocket:"',
        },
      ];

      replacements.forEach(({ search, replace }) => {
        if (search.test(content)) {
          content = content.replace(search, replace);
          filePatched = true;
        }
      });

      if (filePatched) {
        if (!fs.existsSync(filePath + ".backup")) {
          fs.writeFileSync(filePath + ".backup", originalContent);
        }
        fs.writeFileSync(filePath, content, "utf8");
        patchedCount++;
        console.log(`${path.basename(filePath)} patched`);
      }
    } catch (error) {
      console.error(`Erro em ${path.basename(filePath)}:`, error.message);
    }
  });

  return patchedCount > 0;
}

/**
 * Criar marcador de patch aplicado
 */
function createPatchMarker(dangerPath) {
  const markerPath = path.join(dangerPath, ".danger-bot-patched");
  const info = {
    patchedAt: new Date().toISOString(),
    version: "1.8.0",
    patches: [
      'Removed "All green. Good on \'ya" message',
      "Changed links from danger.systems to https://dilettasolutions.com",
      'Changed "dangerJS" to "Diletta Solutions"',
      "Changed emoji from :no_entry_sign: to :rocket:",
    ],
  };
  fs.writeFileSync(markerPath, JSON.stringify(info, null, 2), "utf8");
}

/**
 * Verificar se patch já foi aplicado
 */
function isPatchApplied(dangerPath) {
  return fs.existsSync(path.join(dangerPath, ".danger-bot-patched"));
}

function main() {
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 DANGER BOT - POST INSTALL");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  const dangerPath = findDangerPath();

  if (!dangerPath) {
    console.log("⚠️  Danger JS não encontrado.");
    console.log("ℹ️  Patches serão aplicados quando instalar o Danger.");
    console.log("");
    return;
  }

  console.log(`📦 Danger JS: ${dangerPath}`);

  if (isPatchApplied(dangerPath)) {
    console.log("✅ Patches já aplicados anteriormente.");
    console.log("");
    return;
  }

  console.log("🔨 Aplicando patches...");
  console.log("");

  let patchesApplied = 0;

  if (patchExecutor(dangerPath)) patchesApplied++;
  if (patchLinks(dangerPath)) patchesApplied++;

  console.log("");

  if (patchesApplied > 0) {
    console.log("✅ PATCHES APLICADOS!");
    console.log("");
    console.log("📝 Modificações:");
    console.log('  ❌ "All green. Good on \'ya" → REMOVIDO');
    console.log("  ✅ danger.systems → https://dilettasolutions.com");
    console.log('  ✅ "dangerJS" → "Diletta Solutions"');
    console.log("  ✅ Emoji: 🚫 (:no_entry_sign:) → 🚀 (:rocket:)");
    console.log("");
    createPatchMarker(dangerPath);
  } else {
    console.log("⚠️  Nenhum patch aplicado (pode já estar modificado)");
    console.log("");
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
}

main();
