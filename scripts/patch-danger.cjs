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
 * Patch 3: Traduzir mensagens do Danger para Português
 */
function patchMessages(dangerPath) {
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
      "githubIssueTemplate.js"
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
      let filePatched = false;

      const translations = [
        // Mensagens de warning
        {
          search: /Danger found some issues\.\s*Don't worry, everything is fixable\./gi,
          replace: "Danger encontrou alguns problemas. Não se preocupe, tudo pode ser corrigido.",
        },
        {
          search: /["']warning["']/g,
          replace: '"atenção"',
        },
        // Mensagens de fail
        {
          search: /["']fails?["']/g,
          replace: '"erro"',
        },
        {
          search: /Failed!/gi,
          replace: "Erro!",
        },
        // Mensagens de mensagem
        {
          search: /["']messages?["']/g,
          replace: '"mensagem"',
        },
        // Headers
        {
          search: /## Failures/gi,
          replace: "## Erros",
        },
        {
          search: /## Warnings/gi,
          replace: "## Avisos",
        },
        {
          search: /## Messages/gi,
          replace: "## Mensagens",
        },
        // Plural
        {
          search: /(\d+)\s+failures?/gi,
          replace: "$1 erro(s)",
        },
        {
          search: /(\d+)\s+warnings?/gi,
          replace: "$1 aviso(s)",
        },
        {
          search: /(\d+)\s+messages?/gi,
          replace: "$1 mensagem(ns)",
        },
      ];

      translations.forEach(({ search, replace }) => {
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
        console.log(`  ✅ ${path.basename(filePath)} - Mensagens traduzidas`);
      }
    } catch (error) {
      console.error(`Erro em ${path.basename(filePath)}:`, error.message);
    }
  });

  return patchedCount > 0;
}

/**
 * Patch 4: Corrigir inline comments do Bitbucket usando estratégia do Danger Ruby
 * 
 * PROBLEMA: Bitbucket Cloud exibe comentários HTML na preview de inline comments
 * Aparece: <!-- 1 failure: ## 📋 Changelog n... 0 atenção: DangerID: danger-id-xxx -->
 * 
 * SOLUÇÃO DO DANGER RUBY: Usar atributo title de link markdown ao invés de HTML comment
 * O title está no RAW mas é invisível no render do Bitbucket!
 * 
 * Exemplo Ruby: [Danger](https://danger.systems/ "generated_by_danger")
 *                                                  ^^^^^^^^^^^^^^^^^^^^^^
 *                                                  Invisível mas no RAW!
 */
function patchBitbucketInlineTemplate(dangerPath) {
  const filePath = path.join(
    dangerPath,
    "distribution",
    "runner",
    "templates",
    "bitbucketCloudTemplate.js"
  );

  if (!fs.existsSync(filePath)) {
    console.log("  ⚠️  bitbucketCloudTemplate.js não encontrado");
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, "utf8");
    const originalContent = content;

    // Substituir os comentários markdown [//]: # que são exibidos no Bitbucket
    // por um link invisível com title (estratégia do Danger Ruby)
    
    // Verificar se já foi aplicado
    if (content.includes('DANGER-BOT: Usar estratégia do Danger Ruby')) {
      console.log("  ℹ️  Inline template já está modificado (estratégia Danger Ruby aplicada)");
      return false;
    }
    
    // String replace simples ao invés de regex complexo
    // O formato no arquivo é: return "\n[//]: # (".concat(...
    const oldCode = 'return "\\n[//]: # (".concat((0, exports.dangerIDToString)(dangerID), ")\\n[//]: # (").concat((0, exports.fileLineToString)(file, line), ")\\n").concat(';
    
    const newCode = `// DANGER-BOT: Usar estratégia do Danger Ruby - link com title ao invés de [//]: #
    // O Bitbucket NÃO exibe o atributo "title" de links, mas ele fica no RAW content
    var signature = "[](https://dilettasolutions.com \\"danger-id-".concat(dangerID, "\\")");
    return signature.concat("\\n\\n").concat(`;
    
    if (content.includes(oldCode)) {
      content = content.replace(oldCode, newCode);
      fs.writeFileSync(filePath, content, "utf8");
      console.log("  ✅ Bitbucket inline template corrigido (estratégia Danger Ruby)");
      return true;
    } else {
      console.log("  ⚠️  Inline template: formato não reconhecido ou já modificado");
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Erro ao aplicar patch: ${error.message}`);
    return false;
  }
}

/**
 * Criar marcador de patch aplicado
 */
function createPatchMarker(dangerPath) {
  const markerPath = path.join(dangerPath, ".danger-bot-patched");
  const info = {
    patchedAt: new Date().toISOString(),
    version: "2.2.0", // Atualizado para refletir novo patch
    patches: [
      'Removed "All green. Good on \'ya" message',
      "Changed links from danger.systems to https://dilettasolutions.com",
      'Changed "dangerJS" to "Diletta Solutions"',
      "Changed emoji from :no_entry_sign: to :rocket:",
      "Translated messages to Portuguese (pt-BR)",
      "Fixed Bitbucket inline comments metadata visibility (Danger Ruby strategy)",
    ],
  };
  fs.writeFileSync(markerPath, JSON.stringify(info, null, 2), "utf8");
}

/**
 * Verificar se patch já foi aplicado e se é a versão correta
 */
function isPatchApplied(dangerPath) {
  const markerPath = path.join(dangerPath, ".danger-bot-patched");
  const CURRENT_PATCH_VERSION = "2.2.0"; // Atualizado para nova versão

  if (!fs.existsSync(markerPath)) {
    return false;
  }

  try {
    const info = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    // Verificar se a versão do patch é a mesma ou mais recente
    if (info.version !== CURRENT_PATCH_VERSION) {
      console.log(`⚠️  Patch desatualizado (${info.version} → ${CURRENT_PATCH_VERSION})`);
      console.log("🔄 Removendo marker antigo para reaplicar...");
      console.log("");
      // Remover marker antigo para forçar reaplicação
      fs.unlinkSync(markerPath);
      return false;
    }
    return true;
  } catch {
    // Se não conseguir ler, assume que precisa reaplicar
    return false;
  }
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
  if (patchMessages(dangerPath)) patchesApplied++;
  if (patchBitbucketInlineTemplate(dangerPath)) patchesApplied++;

  console.log("");

  if (patchesApplied > 0) {
    console.log("✅ PATCHES APLICADOS!");
    console.log("");
    console.log("📝 Modificações:");
    console.log('  ❌ "All green. Good on \'ya" → REMOVIDO');
    console.log("  ✅ danger.systems → https://dilettasolutions.com");
    console.log('  ✅ "dangerJS" → "Diletta Solutions"');
    console.log("  ✅ Emoji: 🚫 (:no_entry_sign:) → 🚀 (:rocket:)");
    console.log("  🇧🇷 Mensagens traduzidas para Português");
    console.log("  🔧 Bitbucket inline comments corrigidos (estratégia Danger Ruby)");
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
