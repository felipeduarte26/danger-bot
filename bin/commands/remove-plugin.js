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
  const camelName = toCamelCase(kebabName);

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
  const platformIndexPath = path.join(platformDir, "index.ts");
  const mainIndexPath = path.join(process.cwd(), "src", "index.ts");

  // 1. Remover pasta do plugin
  if (exists(pluginFolder)) {
    fs.rmSync(pluginFolder, { recursive: true, force: true });
    console.log(`[OK] Removed plugin folder: ${platformFolder}/${kebabName}/`);
  }

  // 2. Remover do barrel file da plataforma
  if (exists(platformIndexPath)) {
    let platformIndexContent = readFile(platformIndexPath);
    const exportLine = `export { default as ${camelName}Plugin } from "./${kebabName}";`;

    if (platformIndexContent.includes(exportLine)) {
      platformIndexContent = platformIndexContent.replace(exportLine + "\n", "");
      writeFile(platformIndexPath, platformIndexContent);
      console.log(`[OK] Removed export from ${platformFolder}/index.ts`);
    }
  }

  // 3. Remover do src/index.ts (apenas para Flutter)
  if (platformFolder === "flutter" && exists(mainIndexPath)) {
    let mainIndexContent = readFile(mainIndexPath);
    let modified = false;

    // Remover do import
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*["']\.\/plugins\/flutter["'];/;
    const importMatch = mainIndexContent.match(importRegex);

    if (importMatch) {
      const currentImports = importMatch[1];
      const pluginName = `${camelName}Plugin`;

      if (currentImports.includes(pluginName)) {
        // Remover o plugin do import
        const imports = currentImports
          .split(",")
          .map((imp) => imp.trim())
          .filter((imp) => imp && imp !== pluginName);

        if (imports.length > 0) {
          const updatedImports = imports.join(",\n  ");
          mainIndexContent = mainIndexContent.replace(
            importRegex,
            `import {\n  ${updatedImports}\n} from "./plugins/flutter";`
          );
        } else {
          // Se não sobrou nenhum import, remover a linha toda
          mainIndexContent = mainIndexContent.replace(importRegex + "\n", "");
        }
        console.log(`[OK] Removed from imports in src/index.ts`);
        modified = true;
      }
    }

    // Remover do array allFlutterPlugins
    const arrayRegex = /export const allFlutterPlugins = \[([\s\S]*?)\];/;
    const arrayMatch = mainIndexContent.match(arrayRegex);

    if (arrayMatch) {
      const currentPlugins = arrayMatch[1];
      const pluginName = `${camelName}Plugin`;

      if (currentPlugins.includes(pluginName)) {
        // Remover o plugin do array
        const plugins = currentPlugins
          .split(",")
          .map((plugin) => plugin.trim())
          .filter((plugin) => plugin && plugin !== pluginName);

        if (plugins.length > 0) {
          const updatedPlugins = plugins.join(",\n  ");
          mainIndexContent = mainIndexContent.replace(
            arrayRegex,
            `export const allFlutterPlugins = [\n  ${updatedPlugins}\n];`
          );
        } else {
          // Se não sobrou nenhum plugin, deixar array vazio
          mainIndexContent = mainIndexContent.replace(
            arrayRegex,
            "export const allFlutterPlugins = [];"
          );
        }
        console.log(`[OK] Removed from allFlutterPlugins in src/index.ts`);
        modified = true;
      }
    }

    if (modified) {
      writeFile(mainIndexPath, mainIndexContent);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("PLUGIN REMOVED SUCCESSFULLY!");
  console.log("=".repeat(60) + "\n");

  console.log("Removed:");
  console.log(`  ❌ ${platformFolder}/${kebabName}/ - Plugin folder deleted`);
  console.log(`  ❌ ${platformFolder}/index.ts - Export removed`);
  if (platformFolder === "flutter") {
    console.log(`  ❌ src/index.ts - Import removed`);
    console.log(`  ❌ src/index.ts - Removed from allFlutterPlugins`);
  }
  console.log();
  console.log("Next steps:");
  console.log(`  1. Run: npm run build`);
  console.log(`  2. Commit the changes\n`);
}
