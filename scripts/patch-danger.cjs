#!/usr/bin/env node

/**
 * DANGER BOT - POST INSTALL PATCH
 * ================================
 * Modifica o Danger JS após npm install para:
 * - Traduzir mensagens para Português (pt-BR)
 * - Exibir o nome e o link da seção `branding` do danger-bot.yaml
 * - Corrigir inline comments do Bitbucket Cloud
 *
 * O nome e o link não ficam gravados no Danger: os arquivos alterados chamam o
 * `getBranding()` do Danger Bot (dist/branding.js) ao serem carregados, então
 * mudar o danger-bot.yaml vale na próxima execução, sem reinstalar.
 *
 * Cada arquivo é patcheado a partir do original do Danger, guardado em
 * `<arquivo>.backup` na primeira vez: reaplicar o patch é seguro.
 *
 * Executa automaticamente via "postinstall" no package.json
 */

const fs = require("fs");
const path = require("path");

const PATCH_VERSION = require("../package.json").version;
const REPO_URL = "https://github.com/felipeduarte26/danger-bot";
const PRODUCT_NAME = "Danger Bot";
const BRANDING_MODULE = path.join(__dirname, "..", "dist", "branding.js");
const BRANDING = "__dangerBotBranding";

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
          "Branding: nome e link lidos de branding no danger-bot.yaml",
          "Tradução: mensagens em pt-BR",
          "Bitbucket Cloud: inline comments corrigidos (estratégia Danger Ruby)",
          "Bitbucket Cloud: build status key/url corrigidos",
          "Mensagem 'All green' traduzida para parabéns em pt-BR",
          "Condição: 'encontrou problemas' exibido somente com fails (warnings não contam)",
        ],
      },
      null,
      2
    ),
    "utf8"
  );
}

/**
 * Declaração injetada no topo de cada arquivo que usa o branding. O caminho do
 * `dist/branding.js` é relativo ao arquivo do Danger, então continua valendo se o
 * `node_modules` inteiro mudar de lugar. Sem o módulo, usa o branding padrão.
 */
function brandingDeclaration(filePath) {
  let modulePath = path.relative(path.dirname(filePath), BRANDING_MODULE).split(path.sep).join("/");
  if (!modulePath.startsWith(".")) modulePath = "./" + modulePath;
  const fallback = JSON.stringify({ name: PRODUCT_NAME, url: REPO_URL });

  return (
    `var ${BRANDING} = (function () {\n` +
    `    try { return require(${JSON.stringify(modulePath)}).getBranding(); }\n` +
    `    catch (_e) { return ${fallback}; }\n` +
    `})();\n`
  );
}

function injectBranding(content, filePath) {
  if (!content.includes(BRANDING)) return content;

  const declaration = brandingDeclaration(filePath);
  const strict = '"use strict";\n';
  return content.startsWith(strict)
    ? strict + declaration + content.slice(strict.length)
    : declaration + content;
}

/**
 * Aplica as substituições a um arquivo do Danger.
 * Cada substituição é [rótulo, textoOriginal, textoNovo], com string replace
 * exato (não regex). Parte sempre do original do Danger (`.backup`) e avisa
 * quando um trecho esperado não é encontrado, para uma atualização do Danger não
 * deixar o patch pela metade em silêncio.
 */
function patchFile(filePath, replacements, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⏭️  ${label}: arquivo nao encontrado`);
    return { patched: false, missing: replacements.length };
  }

  const backupPath = filePath + ".backup";
  const original = fs.readFileSync(fs.existsSync(backupPath) ? backupPath : filePath, "utf8");
  let content = original;
  const missing = [];

  for (const [name, oldText, newText] of replacements) {
    if (content.includes(oldText)) {
      content = content.split(oldText).join(newText);
    } else {
      missing.push(name);
    }
  }

  content = injectBranding(content, filePath);

  for (const name of missing) {
    console.log(`  ⚠️  ${label}: trecho nao encontrado (${name})`);
  }

  if (content === original) {
    console.log(`  ℹ️  ${label}: nenhuma substituicao aplicada`);
    return { patched: false, missing: missing.length };
  }

  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, original, "utf8");
  }
  fs.writeFileSync(filePath, content, "utf8");
  console.log(
    `  ✅ ${label}: ${replacements.length - missing.length}/${replacements.length} substituicao(oes)`
  );
  return { patched: true, missing: missing.length };
}

const RUNTIME_META = [
  "assinatura (nome e link)",
  '{ runtimeName: "dangerJS", runtimeHref: "https://danger.systems/js" }',
  `{ runtimeName: ${BRANDING}.name, runtimeHref: ${BRANDING}.url }`,
];

// Rodapé "Gerado por <nome> no commit <hash>": o nome vem do branding (RUNTIME_META)
const SIGNATURE_PT_BR = [
  ["rodape (Generated by)", '"Generated by ', '"Gerado por '],
  [
    "rodape (against)",
    'signature = "".concat(signature, " against ").concat(commitID);',
    'signature = "".concat(signature, " no commit ").concat(commitID);',
  ],
];

// É o bot que fala: usa sempre o nome do produto, não o branding
const SUMMARY_WITH_ISSUES = `${PRODUCT_NAME} encontrou alguns problemas. Não se preocupe, tudo pode ser corrigido.`;
const SUMMARY_APPROVED =
  "**Aprovado!** Nenhum erro encontrado — apenas alguns avisos de melhoria para considerar.";
const SUMMARY_CLEAN =
  "**Parabéns!** Nenhum problema encontrado. Código limpo e pronto para review. 🎉";

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
  const results = [];

  // ═══════════════════════════════════════════════════════════════
  // PATCH: bitbucketCloudTemplate.js
  // ═══════════════════════════════════════════════════════════════
  results.push(
    patchFile(
      path.join(dist, "runner", "templates", "bitbucketCloudTemplate.js"),
      [
        RUNTIME_META,
        ...SIGNATURE_PT_BR,
        [
          "emoji da assinatura",
          'var signatureEmoji = ":no_entry_sign:"',
          'var signatureEmoji = ":rocket:"',
        ],
        [
          "mensagem com problemas",
          'exports.messageForResultWithIssues = "".concat(warningEmoji, "  Danger found some issues. Don\'t worry, everything is fixable.");',
          `exports.messageForResultWithIssues = "".concat(warningEmoji, "  ${SUMMARY_WITH_ISSUES}");`,
        ],
        [
          "resumo em 3 cenarios",
          '    if (!results.fails.length && !results.warnings.length) {\n        summaryMessage = "".concat(successEmoji, "  All green. ").concat((0, DangerUtils_1.compliment)());\n    }\n    else {\n        summaryMessage = exports.messageForResultWithIssues;\n    }',
          `    if (results.fails.length) {\n        summaryMessage = exports.messageForResultWithIssues;\n    }\n    else if (results.warnings.length) {\n        summaryMessage = "".concat(successEmoji, "  ${SUMMARY_APPROVED}");\n    }\n    else {\n        summaryMessage = "".concat(successEmoji, "  ${SUMMARY_CLEAN}");\n    }`,
        ],
        [
          "link invisivel do comentario principal",
          String.raw`[](http://").concat((0, exports.dangerIDToString)(dangerID), ")\n  ");`,
          String.raw`[](").concat(__dangerBotBranding.url, " \"").concat((0, exports.dangerIDToString)(dangerID), "\")\n  ");`,
        ],
        [
          "inline template (estrategia Danger Ruby)",
          String.raw`return "\n[//]: # (".concat((0, exports.dangerIDToString)(dangerID), ")\n[//]: # (").concat((0, exports.fileLineToString)(file, line), ")\n").concat(results.fails.map(printViolation(noEntryEmoji)).join("\n"), "\n").concat(results.warnings.map(printViolation(warningEmoji)).join("\n"), "\n").concat(results.messages.map(printViolation(messageEmoji)).join("\n"), "\n").concat(results.markdowns.map(function (v) { return v.message; }).join("\n\n"), "\n  ");`,
          String.raw`// DANGER-BOT: link invisivel com dangerID + arquivo/linha no title para o Danger achar o comentario
    var metadata = (0, exports.dangerIDToString)(dangerID) + "  File: " + file + ";\n  Line: " + line + ";";
    var signature = "\n\n[](" + __dangerBotBranding.url + " \"" + metadata + "\")";
    return "".concat(results.fails.map(printViolation(noEntryEmoji)).join("\n"), "\n").concat(results.warnings.map(printViolation(warningEmoji)).join("\n"), "\n").concat(results.messages.map(printViolation(messageEmoji)).join("\n"), "\n").concat(results.markdowns.map(function (v) { return v.message; }).join("\n\n")).replace(/^\n+/, "").concat(signature, "\n  ");`,
        ],
      ],
      "bitbucketCloudTemplate.js"
    )
  );

  // ═══════════════════════════════════════════════════════════════
  // PATCH: githubIssueTemplate.js (também usado pelo GitLab)
  // ═══════════════════════════════════════════════════════════════
  results.push(
    patchFile(
      path.join(dist, "runner", "templates", "githubIssueTemplate.js"),
      [
        RUNTIME_META,
        ...SIGNATURE_PT_BR,
        [
          "mensagem com problemas",
          'exports.messageForResultWithIssues = "Found some issues. Don\'t worry, everything is fixable.";',
          `exports.messageForResultWithIssues = "${SUMMARY_WITH_ISSUES}";`,
        ],
        ["emoji da assinatura", ":no_entry_sign:", ":rocket:"],
        ["cabecalho de avisos", '"Warnings", "warning"', '"Avisos", "warning"'],
        ["cabecalho de mensagens", '"Messages", "book"', '"Mensagens", "book"'],
        ["cabecalho de erros", '"Fails", "no_entry_sign"', '"Erros", "rocket"'],
        // O Bitbucket mostra comentários HTML (<!-- -->) como texto: troca por link invisível
        [
          "inline template (inicio)",
          String.raw`return "\n<!--\n".concat(buildSummaryMessage(dangerID, results), "\n").concat((0, exports.fileLineToString)(file, line), "\n-->\n")`,
          String.raw`// DANGER-BOT: link invisivel em vez de <!-- --> (o Bitbucket mostra comentarios HTML como texto)
    var signature = "\n\n[](" + __dangerBotBranding.url + " \"" + (0, exports.dangerIDToString)(dangerID) + (0, exports.fileLineToString)(file, line) + "\")";
    return ""`,
        ],
        [
          "inline template (fim)",
          String.raw`.concat(results.markdowns.map(function (v) { return v.message; }).join("\n\n"), "\n  ");`,
          String.raw`.concat(results.markdowns.map(function (v) { return v.message; }).join("\n\n")).replace(/^\n+/, "").concat(signature, "\n  ");`,
        ],
      ],
      "githubIssueTemplate.js"
    )
  );

  // ═══════════════════════════════════════════════════════════════
  // PATCH: bitbucketServerTemplate.js
  // ═══════════════════════════════════════════════════════════════
  results.push(
    patchFile(
      path.join(dist, "runner", "templates", "bitbucketServerTemplate.js"),
      [
        RUNTIME_META,
        ...SIGNATURE_PT_BR,
        [
          "mensagem com problemas",
          'exports.messageForResultWithIssues = "".concat(warningEmoji, " Danger found some issues. Don\'t worry, everything is fixable.");',
          `exports.messageForResultWithIssues = "".concat(warningEmoji, " ${SUMMARY_WITH_ISSUES}");`,
        ],
      ],
      "bitbucketServerTemplate.js"
    )
  );

  // ═══════════════════════════════════════════════════════════════
  // PATCH: Executor.js
  // ═══════════════════════════════════════════════════════════════
  results.push(
    patchFile(
      path.join(dist, "runner", "Executor.js"),
      [
        // Lógica de 3 cenários no messageForResults: fails → problemas | warnings → aprovado | clean → parabéns
        [
          "resumo em 3 cenarios (inicio)",
          '    if (!results.fails.length && !results.warnings.length) {\n        return "All green. ".concat((0, DangerUtils_1.compliment)());\n    }\n    else {',
          "    if (results.fails.length) {",
        ],
        [
          "resumo em 3 cenarios (fim)",
          "            return githubIssueTemplate_1.messageForResultWithIssues;\n        }\n    }\n};",
          `            return githubIssueTemplate_1.messageForResultWithIssues;\n        }\n    }\n    else if (results.warnings.length) {\n        return "${SUMMARY_APPROVED}";\n    }\n    else {\n        return "${SUMMARY_CLEAN}";\n    }\n};`,
        ],
        // Sem isso, os inline comments usam o template do GitHub em vez do Bitbucket Cloud
        [
          "inline template com REPO_ACCESSTOKEN",
          'else if (process.env["DANGER_BITBUCKETCLOUD_OAUTH_KEY"] || process.env["DANGER_BITBUCKETCLOUD_USERNAME"]) {\n            comment = (0, bitbucketCloudTemplate_1.inlineTemplate)',
          'else if (process.env["DANGER_BITBUCKETCLOUD_OAUTH_KEY"] || process.env["DANGER_BITBUCKETCLOUD_USERNAME"] || process.env["DANGER_BITBUCKETCLOUD_REPO_ACCESSTOKEN"]) {\n            comment = (0, bitbucketCloudTemplate_1.inlineTemplate)',
        ],
      ],
      "Executor.js"
    )
  );

  // ═══════════════════════════════════════════════════════════════
  // PATCH: build status do Bitbucket Cloud/Server e do GitHub
  // ═══════════════════════════════════════════════════════════════
  const buildStatusReplacements = [
    ["chave do build status", 'key = "danger.systems"', `key = ${BRANDING}.name`],
    [
      "link do build status",
      'url: url || "http://danger.systems/js"',
      `url: url || ${BRANDING}.url`,
    ],
  ];
  results.push(
    patchFile(
      path.join(dist, "platforms", "BitBucketCloud.js"),
      buildStatusReplacements,
      "BitBucketCloud.js"
    )
  );
  results.push(
    patchFile(
      path.join(dist, "platforms", "BitBucketServer.js"),
      buildStatusReplacements,
      "BitBucketServer.js"
    )
  );
  results.push(
    patchFile(
      path.join(dist, "platforms", "github", "GitHubAPI.js"),
      [
        [
          "link do commit status",
          'target_url: url || "http://danger.systems/js"',
          `target_url: url || ${BRANDING}.url`,
        ],
        // O rodapé virou "Gerado por" (SIGNATURE_PT_BR): procurando "Generated by", o
        // Danger não acha o comentário anterior e cria um novo a cada execução.
        [
          "comentario anterior (Gerado por)",
          '.filter(function (comment) { return comment.body.includes("Generated by"); })',
          '.filter(function (comment) { return comment.body.includes("Gerado por"); })',
        ],
      ],
      "GitHubAPI.js"
    )
  );
  results.push(
    patchFile(
      path.join(dist, "platforms", "bitbucket_server", "BitBucketServerAPI.js"),
      [
        [
          "comentario anterior (Gerado por)",
          '.filter(function (comment) { return comment.text.includes("Generated by"); })',
          '.filter(function (comment) { return comment.text.includes("Gerado por"); })',
        ],
      ],
      "BitBucketServerAPI.js"
    )
  );

  // ═══════════════════════════════════════════════════════════════
  // PATCH: BitBucketCloudAPI.js (remover uuid check para matching de comentarios)
  // O uuid do REPO_ACCESS_TOKEN nem sempre bate com o user dos comentarios,
  // causando duplicatas. Usar apenas dangerIDMessage para identificar.
  // ═══════════════════════════════════════════════════════════════
  results.push(
    patchFile(
      path.join(dist, "platforms", "bitbucket_cloud", "BitBucketCloudAPI.js"),
      [
        [
          "uuid nos inline comments",
          "ownedByDanger: comment.content.raw.includes(dangerIDMessage) && comment.user.uuid === _this.uuid,",
          "ownedByDanger: comment.content.raw.includes(dangerIDMessage),",
        ],
        [
          "uuid no comentario principal",
          ".filter(function (comment) { return comment.content.raw.includes(dangerIDMessage); })\n                                .filter(function (comment) { return comment.user.uuid === _this.uuid; })",
          ".filter(function (comment) { return comment.content.raw.includes(dangerIDMessage); })",
        ],
      ],
      "BitBucketCloudAPI.js"
    )
  );

  // ═══════════════════════════════════════════════════════════════
  // RESULTADO
  // ═══════════════════════════════════════════════════════════════
  const totalPatched = results.filter((r) => r.patched).length;
  const totalMissing = results.reduce((sum, r) => sum + r.missing, 0);

  console.log("");

  if (totalMissing > 0) {
    console.log(
      `⚠️  ${totalMissing} trecho(s) do Danger nao encontrados: a versao do Danger pode ter mudado.`
    );
    console.log("   O patch ficou incompleto; confira as linhas acima.");
    console.log("");
  }

  if (totalPatched > 0) {
    console.log(`✅ ${totalPatched} arquivo(s) patcheado(s)`);
    console.log("");
    console.log("📝 Modificacoes:");
    console.log("  🏷️  Branding: nome e link de `branding` no danger-bot.yaml");
    console.log("  🇧🇷 Mensagens traduzidas para Portugues");
    console.log("  🔧 Bitbucket inline comments corrigidos");
    console.log("  🔧 Bitbucket build status key/url corrigidos");
    console.log('  🎉 "All green" → mensagem de parabéns em pt-BR');
    createPatchMarker(dangerPath);
  } else {
    console.log("⚠️  Nenhum patch aplicado");
  }

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
}

main();
