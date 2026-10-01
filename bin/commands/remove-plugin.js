/**
 * REMOVE PLUGIN COMMAND
 * =====================
 * Comando para remover plugins existentes
 */

import path from "path";
import fs from "fs";
import { question, closeReadline } from "../utils/readline-helper.js";
import { toCamelCase } from "../utils/string-helpers.js";
import { exists, readFile, writeFile } from "../utils/fs-helpers.js";

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Remover um plugin existente
 */
export async function removePlugin() {
  console.log("\n" + "=".repeat(60));
  console.log("REMOVE DANGER BOT PLUGIN");
  console.log("=".repeat(60) + "\n");

  // Listar plugins disponíveis
  const pluginsDir = path.join(process.cwd(), "src", "plugins");

  if (!exists(pluginsDir)) {
    console.error("Error: Plugins directory not found!");
    return;
  }

  // Listar plataformas
  const platforms = fs.readdirSync(pluginsDir).filter((item) => {
    const itemPath = path.join(pluginsDir, item);
    return fs.statSync(itemPath).isDirectory();
  });

  if (platforms.length === 0) {
    console.error("Error: No platforms found!");
    return;
  }

  console.log("Available platforms:");
  platforms.forEach((platform, index) => {
    console.log(`  ${index + 1}. ${platform}`);
  });

  const platformInput = await question(`\nSelect platform (1-${platforms.length}): `);
  const platformIndex = parseInt(platformInput) - 1;

  if (platformIndex < 0 || platformIndex >= platforms.length) {
    console.error("Error: Invalid platform selection!");
    closeReadline();
    return;
  }

  const platformFolder = platforms[platformIndex];
  const platformDir = path.join(pluginsDir, platformFolder);

  // Listar plugins da plataforma
  const plugins = fs.readdirSync(platformDir).filter((item) => {
    const itemPath = path.join(platformDir, item);
    return fs.statSync(itemPath).isDirectory() && item !== "node_modules";
  });

  if (plugins.length === 0) {
    console.error(`Error: No plugins found in ${platformFolder}!`);
    closeReadline();
    return;
  }

  console.log(`\nAvailable plugins in ${platformFolder}:`);
  plugins.forEach((plugin, index) => {
    console.log(`  ${index + 1}. ${plugin}`);
  });

  const pluginInput = await question(`\nSelect plugin to remove (1-${plugins.length}): `);
  const pluginIndex = parseInt(pluginInput) - 1;

  if (pluginIndex < 0 || pluginIndex >= plugins.length) {
    console.error("Error: Invalid plugin selection!");
    closeReadline();
    return;
  }

  const kebabName = plugins[pluginIndex];
  const platformIndexPath = path.join(platformDir, "index.ts");
  // O nome exportado vem do barrel (ex.: domain-usecases → domainUseCasesPlugin);
  // derivar da pasta só serve de fallback
  const exportName =
    (exists(platformIndexPath) && findExportName(readFile(platformIndexPath), kebabName)) ||
    `${toCamelCase(kebabName)}Plugin`;

  console.log(`\n⚠️  WARNING: This will permanently delete the plugin "${kebabName}"!`);
  const confirm = await question("Are you sure? (yes/no): ");

  if (confirm.toLowerCase() !== "yes") {
    console.log("\nCancelled. No changes made.");
    closeReadline();
    return;
  }

  closeReadline();

  console.log("\n" + "-".repeat(60));
  console.log("REMOVING PLUGIN...");
  console.log("-".repeat(60) + "\n");

  // Caminhos
  const pluginFolder = path.join(platformDir, kebabName);
  const mainIndexPath = path.join(process.cwd(), "src", "index.ts");

  // 1. Remover pasta do plugin
  if (exists(pluginFolder)) {
    fs.rmSync(pluginFolder, { recursive: true, force: true });
    console.log(`[OK] Removed plugin folder: ${platformFolder}/${kebabName}/`);
  }

  // 2. Remover do barrel file da plataforma
  if (exists(platformIndexPath)) {
    const platformIndexContent = readFile(platformIndexPath);
    const exportLineRe = new RegExp(
      `^export \\{ default as \\w+ \\} from ["']\\./${escapeRegExp(kebabName)}["'];\\r?\\n?`,
      "m"
    );

    if (exportLineRe.test(platformIndexContent)) {
      writeFile(platformIndexPath, platformIndexContent.replace(exportLineRe, ""));
      console.log(`[OK] Removed export from ${platformFolder}/index.ts`);
    }
  }

  // 3. Remover do src/index.ts (apenas para Flutter): os mesmos lugares que o
  //    create-plugin preenche, sem reescrever o resto do arquivo
  if (platformFolder === "flutter" && exists(mainIndexPath)) {
    let content = readFile(mainIndexPath);
    const original = content;

    for (const keyword of ["export", "import"]) {
      const result = removeFromNamedBlock(content, keyword, exportName);
      content = result.content;
      if (result.removed) console.log(`[OK] Removed from ${keyword} block in src/index.ts`);
    }

    const listed = removeAllFlutterPluginsEntry(content, kebabName);
    content = listed.content;
    if (listed.removed) console.log(`[OK] Removed from allFlutterPlugins in src/index.ts`);

    const categories = removeFromCategoryArrays(content, exportName);
    content = categories.content;
    for (const array of categories.arrays) {
      console.log(`[OK] Removed from ${array} in src/index.ts`);
    }

    if (content !== original) {
      writeFile(mainIndexPath, content);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("PLUGIN REMOVED SUCCESSFULLY!");
  console.log("=".repeat(60) + "\n");

  console.log("Removed:");
  console.log(`  ❌ ${platformFolder}/${kebabName}/ - Plugin folder deleted`);
  console.log(`  ❌ ${platformFolder}/index.ts - Export removed`);
  if (platformFolder === "flutter") {
    console.log(`  ❌ src/index.ts - ${exportName} removed (exports, imports, arrays)`);
  }
  console.log();
  console.log("Next steps:");
  console.log(`  1. Run: npm run build`);
  console.log(`  2. Commit the changes\n`);
}

/** Nome exportado pelo barrel da plataforma para a pasta do plugin. */
function findExportName(barrelContent, kebabName) {
  const re = new RegExp(
    `export \\{ default as (\\w+) \\} from ["']\\./${escapeRegExp(kebabName)}["'];`
  );
  return re.exec(barrelContent)?.[1] ?? null;
}

/**
 * Remove `name` da lista de `import { ... }` / `export { ... } from "./plugins/flutter";`.
 * Remove só a linha do item (formato um-por-linha do prettier); se o item estiver
 * numa linha com outros, remove apenas ele dessa linha.
 */
function removeFromNamedBlock(content, keyword, name) {
  const re = new RegExp(`${keyword}\\s*\\{([^}]*)\\}\\s*from\\s*["']\\./plugins/flutter["'];`);
  const match = re.exec(content);
  if (!match) return { content, removed: false };
  const body = match[1];
  const updated = removeListItem(body, name);
  if (updated === body) return { content, removed: false };
  const bodyStart = match.index + match[0].indexOf("{") + 1;
  return {
    content: content.slice(0, bodyStart) + updated + content.slice(bodyStart + body.length),
    removed: true,
  };
}

/** Remove a linha `require("./plugins/flutter/<kebab>").default,` do allFlutterPlugins. */
function removeAllFlutterPluginsEntry(content, kebabName) {
  const lineRe = new RegExp(
    `^[ \\t]*require\\(["']\\./plugins/flutter/${escapeRegExp(kebabName)}["']\\)\\.default,?[ \\t]*\\r?\\n`,
    "m"
  );
  const match = /export const allFlutterPlugins = \[[\s\S]*?\n\];/.exec(content);
  if (!match || !lineRe.test(match[0])) return { content, removed: false };
  const updated = match[0].replace(lineRe, "");
  return {
    content: content.slice(0, match.index) + updated + content.slice(match.index + match[0].length),
    removed: true,
  };
}

/** Remove o plugin dos arrays de categoria (`export const xxxPlugins = [ ... ];`). */
function removeFromCategoryArrays(content, name) {
  const arrays = [];
  const updated = content.replace(
    /(export const (\w+Plugins) = \[)([\s\S]*?)(\];)/g,
    (whole, open, arrayName, body, close) => {
      if (arrayName === "allFlutterPlugins") return whole;
      const newBody = removeListItem(body, name);
      if (newBody === body) return whole;
      arrays.push(arrayName);
      return open + newBody + close;
    }
  );
  return { content: updated, arrays };
}

/** Remove um identificador de uma lista separada por vírgulas, preservando o resto. */
function removeListItem(body, name) {
  const ownLine = new RegExp(`^[ \\t]*${escapeRegExp(name)}[ \\t]*,?[ \\t]*\\r?\\n`, "m");
  if (ownLine.test(body)) return body.replace(ownLine, "");
  const inline = new RegExp(
    `(^|[{,\\s])${escapeRegExp(name)}\\s*,\\s*|,\\s*${escapeRegExp(name)}(?=\\s*$)`
  );
  return body.replace(inline, "$1");
}
