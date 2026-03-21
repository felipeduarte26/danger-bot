#!/usr/bin/env node

/**
 * DANGER BOT - POST INSTALL PATCH
 * ================================
 * Modifica o Danger JS após npm install para:
 * - Traduzir mensagens para Português (pt-BR)
 * - Customizar branding (links, nomes, emojis)
 * - Corrigir inline comments do Bitbucket Cloud
 *
 * Executa automaticamente via "postinstall" no package.json
 */

const fs = require("fs");
const path = require("path");

const PATCH_VERSION = "3.1.0";
const REPO_URL = "https://github.com/felipeduarte26/danger-bot";
const BRAND_NAME = "Danger Bot";

console.log("");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🤖 DANGER BOT - POST INSTALL PATCH v" + PATCH_VERSION);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("");

function findDangerPath() {
  const possiblePaths = [
    path.join(process.cwd(), "..", "danger"),
    path.join(process.cwd(), "node_modules", "danger"),
    path.join(process.cwd(), "..", "..", "danger"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

function isPatchApplied(dangerPath) {
  const markerPath = path.join(dangerPath, ".danger-bot-patched");
  if (!fs.existsSync(markerPath)) return false;

  try {
    const info = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    if (info.version === PATCH_VERSION) {
      return true;
    }
    console.log(`⚠️  Patch desatualizado (${info.version} → ${PATCH_VERSION})`);
    fs.unlinkSync(markerPath);
    return false;
  } catch {
    return false;
  }
}

function createPatchMarker(dangerPath) {
  const markerPath = path.join(dangerPath, ".danger-bot-patched");
  fs.writeFileSync(
    markerPath,
    JSON.stringify(
      {
        patchedAt: new Date().toISOString(),
        version: PATCH_VERSION,
        patches: [
          "Branding: Danger Bot + GitHub repo URL",
          "Tradução: mensagens em pt-BR",
          "Bitbucket Cloud: inline comments corrigidos (estratégia Danger Ruby)",
          "Bitbucket Cloud: build status key/url corrigidos",
          "Removida mensagem 'All green'",
        ],
      },
      null,
      2
    ),
    "utf8"
  );
}

/**
 * Aplica substituicoes em um arquivo.
 * Cada substituicao e um par [textoOriginal, textoNovo].
 * Usa string replace exato (nao regex) para maxima confiabilidade.
 */
function patchFile(filePath, replacements, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⏭️  ${label}: arquivo nao encontrado`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  const original = content;
  let patchCount = 0;

  for (const [oldText, newText] of replacements) {
    if (content.includes(oldText)) {
      content = content.split(oldText).join(newText);
      patchCount++;
    }
  }

  if (patchCount > 0) {
    if (!fs.existsSync(filePath + ".backup")) {
      fs.writeFileSync(filePath + ".backup", original, "utf8");
    }
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`  ✅ ${label}: ${patchCount} substituicao(oes)`);
    return true;
  }

  console.log(`  ℹ️  ${label}: nenhuma substituicao necessaria`);
  return false;
}

function main() {
  const dangerPath = findDangerPath();

  if (!dangerPath) {
    console.log("⚠️  Danger JS nao encontrado. Patches serao aplicados quando instalar.");
    console.log("");
    return;
  }

  console.log(`📦 Danger JS: ${dangerPath}`);

  if (isPatchApplied(dangerPath)) {
    console.log("✅ Patches ja aplicados (v" + PATCH_VERSION + ")");
    console.log("");
    return;
  }

  console.log("🔨 Aplicando patches...");
  console.log("");

  const dist = path.join(dangerPath, "distribution");
  let totalPatched = 0;

  // ═══════════════════════════════════════════════════════════════
  // PATCH: bitbucketCloudTemplate.js
  // ═══════════════════════════════════════════════════════════════
  const bbCloudTemplate = path.join(dist, "runner", "templates", "bitbucketCloudTemplate.js");

  const bbCloudPatched = patchFile(
    bbCloudTemplate,
    [
      // Branding: runtimeName e runtimeHref
      [
        '{ runtimeName: "dangerJS", runtimeHref: "https://danger.systems/js" }',
        `{ runtimeName: "${BRAND_NAME}", runtimeHref: "${REPO_URL}" }`,
      ],
      [
        '{ runtimeName: "Danger Bot", runtimeHref: "https://github.com/felipeduarte26/danger-bot" }',
        `{ runtimeName: "${BRAND_NAME}", runtimeHref: "${REPO_URL}" }`,
      ],

      // Traduzir messageForResultWithIssues (original em ingles)
      [
        'exports.messageForResultWithIssues = "".concat(warningEmoji, "  Danger found some issues. Don\'t worry, everything is fixable.");',
        'exports.messageForResultWithIssues = "".concat(warningEmoji, "  Danger Bot encontrou alguns problemas. Nao se preocupe, tudo pode ser corrigido.");',
      ],
      // Traduzir messageForResultWithIssues (versao do patch antigo)
      [
        'exports.messageForResultWithIssues = "".concat(warningEmoji, "  Danger encontrou alguns problemas. Não se preocupe, tudo pode ser corrigido.");',
        'exports.messageForResultWithIssues = "".concat(warningEmoji, "  Danger Bot encontrou alguns problemas. Nao se preocupe, tudo pode ser corrigido.");',
      ],

      // Remover mensagem "All green" (varias formas possiveis)
      [
        'return "".concat(successEmoji, " ").concat((0, exports.dangerSignature)(results));',
        'return ""; // DANGER-BOT: Mensagem removida',
      ],
      [
        'summaryMessage = "".concat(successEmoji, "  All green. ").concat((0, DangerUtils_1.compliment)());',
        'summaryMessage = ""; // DANGER-BOT: Mensagem removida',
      ],

      // Emoji de signature: :no_entry_sign: -> :rocket:
      ['var signatureEmoji = ":no_entry_sign:"', 'var signatureEmoji = ":rocket:"'],

      // Inline template: corrigir URL dilettasolutions/danger.systems
      [
        'dilettasolutions.com',
        REPO_URL,
      ],
      [
        'danger.systems/js',
        REPO_URL,
      ],
      [
        'https://danger.systems',
        REPO_URL,
      ],
    ],
    "bitbucketCloudTemplate.js"
  );
  if (bbCloudPatched) totalPatched++;

  // Patch especial: template principal - trocar link http://dangerID por link com title
  if (fs.existsSync(bbCloudTemplate)) {
    let content = fs.readFileSync(bbCloudTemplate, "utf8");

    const oldMainLink = '[](http://".concat((0, exports.dangerIDToString)(dangerID), ")\\n  ");';
    if (content.includes(oldMainLink)) {
      const newMainLink = `[](\${REPO_URL} "".concat((0, exports.dangerIDToString)(dangerID), "\\")\n  ");`.replace("${REPO_URL}", REPO_URL);
      content = content.replace(oldMainLink, newMainLink);
      fs.writeFileSync(bbCloudTemplate, content, "utf8");
      console.log("  ✅ bitbucketCloudTemplate.js: link principal corrigido");
      totalPatched++;
    }
  }

  // Patch especial: inline template com estrategia Danger Ruby
  if (fs.existsSync(bbCloudTemplate)) {
    let content = fs.readFileSync(bbCloudTemplate, "utf8");

    const oldInlineReturn =
      'return "\\n[//]: # (".concat((0, exports.dangerIDToString)(dangerID), ")\\n[//]: # (").concat((0, exports.fileLineToString)(file, line), ")\\n").concat(results.fails.map(printViolation(noEntryEmoji)).join("\\n"), "\\n").concat(results.warnings.map(printViolation(warningEmoji)).join("\\n"), "\\n").concat(results.messages.map(printViolation(messageEmoji)).join("\\n"), "\\n").concat(results.markdowns.map(function (v) { return v.message; }).join("\\n\\n"), "\\n  ");';

    if (content.includes(oldInlineReturn)) {
      const newInlineReturn = `// DANGER-BOT: Estrategia Danger Ruby - link com title no final (invisivel no render)
    var signature = "\\n\\n[](${REPO_URL} \\"danger-id-".concat(dangerID, ";\\")");
    return "".concat(results.fails.map(printViolation(noEntryEmoji)).join("\\n"), "\\n").concat(results.warnings.map(printViolation(warningEmoji)).join("\\n"), "\\n").concat(results.messages.map(printViolation(messageEmoji)).join("\\n"), "\\n").concat(results.markdowns.map(function (v) { return v.message; }).join("\\n\\n")).replace(/^\\n+/, "").concat(signature, "\\n  ");`;

      content = content.replace(oldInlineReturn, newInlineReturn);
      fs.writeFileSync(bbCloudTemplate, content, "utf8");
      console.log("  ✅ bitbucketCloudTemplate.js: inline template corrigido (Danger Ruby)");
      totalPatched++;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PATCH: githubIssueTemplate.js
  // ═══════════════════════════════════════════════════════════════
  const githubTemplate = path.join(dist, "runner", "templates", "githubIssueTemplate.js");

  const githubPatched = patchFile(
    githubTemplate,
    [
      // Branding
      [
        '{ runtimeName: "dangerJS", runtimeHref: "https://danger.systems/js" }',
        `{ runtimeName: "${BRAND_NAME}", runtimeHref: "${REPO_URL}" }`,
      ],
      [
        '{ runtimeName: "Diletta Solutions", runtimeHref: "https://dilettasolutions.com" }',
        `{ runtimeName: "${BRAND_NAME}", runtimeHref: "${REPO_URL}" }`,
      ],

      // Traduzir messageForResultWithIssues
      [
        "exports.messageForResultWithIssues = \"Found some issues. Don't worry, everything is fixable.\";",
        `exports.messageForResultWithIssues = "${BRAND_NAME} encontrou alguns problemas. Nao se preocupe, tudo pode ser corrigido.";`,
      ],

      // Emoji :no_entry_sign: -> :rocket:
      [':no_entry_sign:', ':rocket:'],

      // Traduzir headers de tabela
      ['"Warnings", "warning"', '"Avisos", "warning"'],
      ['"Messages", "book"', '"Mensagens", "book"'],
      ['"Fails", "no_entry_sign"', '"Erros", "rocket"'],
    ],
    "githubIssueTemplate.js"
  );
  if (githubPatched) totalPatched++;

  // Patch especial: inlineTemplate do GitHub - substituir <!-- --> por link invisivel
  // Bitbucket Cloud renderiza <!-- --> como texto visivel
  if (fs.existsSync(githubTemplate)) {
    let content = fs.readFileSync(githubTemplate, "utf8");

    const oldGithubInline =
      'return "\\n<!--\\n".concat(buildSummaryMessage(dangerID, results), "\\n").concat((0, exports.fileLineToString)(file, line), "\\n-->\\n")';

    if (content.includes(oldGithubInline)) {
      const newGithubInline =
        `// DANGER-BOT: Usar link invisivel em vez de <!-- --> (Bitbucket mostra HTML comments como texto)
    var signature = "\\n\\n[](${REPO_URL} \\"" + (0, exports.dangerIDToString)(dangerID) + (0, exports.fileLineToString)(file, line) + "\\")";
    return ""`;

      content = content.replace(oldGithubInline, newGithubInline);

      const oldGithubInlineEnd = '.concat(results.markdowns.map(function (v) { return v.message; }).join("\\n\\n"), "\\n  ");';
      const newGithubInlineEnd = '.concat(results.markdowns.map(function (v) { return v.message; }).join("\\n\\n")).replace(/^\\n+/, "").concat(signature, "\\n  ");';

      content = content.replace(oldGithubInlineEnd, newGithubInlineEnd);

      fs.writeFileSync(githubTemplate, content, "utf8");
      console.log("  ✅ githubIssueTemplate.js: inline template corrigido (link invisivel)");
      totalPatched++;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PATCH: bitbucketServerTemplate.js
  // ═══════════════════════════════════════════════════════════════
  const bbServerTemplate = path.join(dist, "runner", "templates", "bitbucketServerTemplate.js");

  const bbServerPatched = patchFile(
    bbServerTemplate,
    [
      // Branding
      [
        '{ runtimeName: "dangerJS", runtimeHref: "https://danger.systems/js" }',
        `{ runtimeName: "${BRAND_NAME}", runtimeHref: "${REPO_URL}" }`,
      ],
      [
        '{ runtimeName: "Diletta Solutions", runtimeHref: "https://dilettasolutions.com" }',
        `{ runtimeName: "${BRAND_NAME}", runtimeHref: "${REPO_URL}" }`,
      ],

      // Traduzir messageForResultWithIssues
      [
        'exports.messageForResultWithIssues = "".concat(warningEmoji, " Danger found some issues. Don\'t worry, everything is fixable.");',
        `exports.messageForResultWithIssues = "".concat(warningEmoji, " ${BRAND_NAME} encontrou alguns problemas. Nao se preocupe, tudo pode ser corrigido.");`,
      ],
    ],
    "bitbucketServerTemplate.js"
  );
  if (bbServerPatched) totalPatched++;

  // ═══════════════════════════════════════════════════════════════
  // PATCH: Executor.js
  // ═══════════════════════════════════════════════════════════════
  const executorFile = path.join(dist, "runner", "Executor.js");

  const executorPatched = patchFile(
    executorFile,
    [
      // Remover "All green. Good on 'ya"
      [
        'return "".concat(tick, " All green. Good on \'ya.")',
        'return "" // DANGER-BOT: Mensagem removida',
      ],
      [
        'return "All green. ".concat',
        'return ""; // DANGER-BOT: Mensagem removida //',
      ],
      // Corrigir inlineCommentTemplate: adicionar REPO_ACCESSTOKEN na verificacao
      // Sem isso, inline comments usam template GitHub em vez de Bitbucket Cloud
      [
        'else if (process.env["DANGER_BITBUCKETCLOUD_OAUTH_KEY"] || process.env["DANGER_BITBUCKETCLOUD_USERNAME"]) {\n            comment = (0, bitbucketCloudTemplate_1.inlineTemplate)',
        'else if (process.env["DANGER_BITBUCKETCLOUD_OAUTH_KEY"] || process.env["DANGER_BITBUCKETCLOUD_USERNAME"] || process.env["DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN"]) {\n            comment = (0, bitbucketCloudTemplate_1.inlineTemplate)',
      ],
    ],
    "Executor.js"
  );
  if (executorPatched) totalPatched++;

  // ═══════════════════════════════════════════════════════════════
  // PATCH: BitBucketCloud.js (build status key/url)
  // ═══════════════════════════════════════════════════════════════
  const bbCloudPlatform = path.join(dist, "platforms", "BitBucketCloud.js");

  const bbCloudPlatformPatched = patchFile(
    bbCloudPlatform,
    [
      // key e url padrao do build status
      [
        'key = "danger.systems"',
        `key = "${BRAND_NAME}"`,
      ],
      [
        'key = "https://dilettasolutions.com"',
        `key = "${BRAND_NAME}"`,
      ],
      [
        'key = "Danger Bot"',
        `key = "${BRAND_NAME}"`,
      ],
      [
        'url: url || "https://danger.systems/js"',
        `url: url || "${REPO_URL}"`,
      ],
      [
        'url: url || "https://dilettasolutions.com"',
        `url: url || "${REPO_URL}"`,
      ],
      // runtimeName no platform
      [
        'runtimeName: "dangerJS"',
        `runtimeName: "${BRAND_NAME}"`,
      ],
      // Links danger.systems restantes (http e https)
      [
        'https://danger.systems/js',
        REPO_URL,
      ],
      [
        'http://danger.systems/js',
        REPO_URL,
      ],
      [
        'https://danger.systems',
        REPO_URL,
      ],
      [
        'http://danger.systems',
        REPO_URL,
      ],
      [
        'https://dilettasolutions.com',
        REPO_URL,
      ],
    ],
    "BitBucketCloud.js"
  );
  if (bbCloudPlatformPatched) totalPatched++;

  // ═══════════════════════════════════════════════════════════════
  // PATCH: BitBucketServer.js
  // ═══════════════════════════════════════════════════════════════
  const bbServerPlatform = path.join(dist, "platforms", "BitBucketServer.js");

  const bbServerPlatformPatched = patchFile(
    bbServerPlatform,
    [
      ['https://danger.systems/js', REPO_URL],
      ['http://danger.systems/js', REPO_URL],
      ['https://danger.systems', REPO_URL],
      ['https://dilettasolutions.com', REPO_URL],
      ['runtimeName: "dangerJS"', `runtimeName: "${BRAND_NAME}"`],
      ['key = "danger.systems"', `key = "${BRAND_NAME}"`],
    ],
    "BitBucketServer.js"
  );
  if (bbServerPlatformPatched) totalPatched++;

  // ═══════════════════════════════════════════════════════════════
  // PATCH: GitHubAPI.js
  // ═══════════════════════════════════════════════════════════════
  const githubAPI = path.join(dist, "platforms", "github", "GitHubAPI.js");

  const githubAPIPatched = patchFile(
    githubAPI,
    [
      ['https://danger.systems/js', REPO_URL],
      ['https://danger.systems', REPO_URL],
      ['https://dilettasolutions.com', REPO_URL],
      ['runtimeName: "dangerJS"', `runtimeName: "${BRAND_NAME}"`],
    ],
    "GitHubAPI.js"
  );
  if (githubAPIPatched) totalPatched++;

  // ═══════════════════════════════════════════════════════════════
  // PATCH GLOBAL: varrer todos os JS por referencias restantes
  // ═══════════════════════════════════════════════════════════════
  const platformFile = path.join(dist, "platforms", "platform.js");
  const allJsFiles = [
    bbCloudTemplate,
    githubTemplate,
    bbServerTemplate,
    executorFile,
    bbCloudPlatform,
    bbServerPlatform,
    githubAPI,
    platformFile,
  ];

  let globalFixCount = 0;
  for (const filePath of allJsFiles) {
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, "utf8");
    const before = content;

    content = content.split("http://danger.systems/js").join(REPO_URL);
    content = content.split("https://danger.systems/js").join(REPO_URL);
    content = content.split("http://danger.systems").join(REPO_URL);
    content = content.split("https://danger.systems").join(REPO_URL);
    content = content.split("https://dilettasolutions.com").join(REPO_URL);
    content = content.split("http://dilettasolutions.com").join(REPO_URL);
    content = content.split('key = "danger.systems"').join(`key = "${BRAND_NAME}"`);
    content = content.split('key: "danger.systems"').join(`key: "${BRAND_NAME}"`);

    if (content !== before) {
      fs.writeFileSync(filePath, content, "utf8");
      globalFixCount++;
    }
  }
  if (globalFixCount > 0) {
    console.log(`  ✅ Varredura global: ${globalFixCount} arquivo(s) com URLs corrigidas`);
    totalPatched += globalFixCount;
  }

  // ═══════════════════════════════════════════════════════════════
  // RESULTADO
  // ═══════════════════════════════════════════════════════════════
  console.log("");

  if (totalPatched > 0) {
    console.log(`✅ ${totalPatched} arquivo(s) patcheado(s)`);
    console.log("");
    console.log("📝 Modificacoes:");
    console.log(`  ✅ Branding: "${BRAND_NAME}" + ${REPO_URL}`);
    console.log("  🇧🇷 Mensagens traduzidas para Portugues");
    console.log("  🔧 Bitbucket inline comments corrigidos");
    console.log("  🔧 Bitbucket build status key/url corrigidos");
    console.log('  ❌ "All green" removido');
    createPatchMarker(dangerPath);
  } else {
    console.log("⚠️  Nenhum patch aplicado (arquivos podem ja estar modificados)");
  }

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
}

main();
