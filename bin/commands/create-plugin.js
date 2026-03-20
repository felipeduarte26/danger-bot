/**
 * CREATE PLUGIN COMMAND
 * =====================
 * Comando para criar novos plugins interativamente
 */

import path from "path";
import { question, closeReadline } from "../utils/readline-helper.js";
import { toKebabCase, toCamelCase } from "../utils/string-helpers.js";
import { exists, createDirectory, writeFile, readFile } from "../utils/fs-helpers.js";
import {
  generatePluginTemplate,
  generatePluginBarrel,
  generatePlatformBarrel,
} from "../templates/plugin-template.js";
import { generatePluginReadme } from "../templates/readme-template.js";

/**
 * Criar novo plugin interativamente
 */
export async function createPlugin() {
  console.log("\n" + "=".repeat(60));
  console.log("CREATE NEW DANGER BOT PLUGIN");
  console.log("=".repeat(60) + "\n");

  // 1. Perguntar a linguagem/plataforma
  console.log("Select platform/language:");
  console.log("  1. Flutter/Dart");
  console.log("  2. Node.js");

  const platformInput = await question("Platform (1-2) [1]: ");
  const platformChoice = platformInput || "1";

  let platformFolder = "flutter";
  let platformName = "Flutter/Dart";

  switch (platformChoice) {
    case "1":
      platformFolder = "flutter";
      platformName = "Flutter/Dart";
      break;
    case "2":
      platformFolder = "nodejs";
      platformName = "Node.js";
      break;
  }

  console.log(`\nSelected platform: ${platformName}\n`);

  const name = await question('Plugin name (e.g., "My Custom Plugin"): ');
  if (!name) {
    console.error("\nError: Plugin name is required!");
    closeReadline();
    return;
  }

  const description = await question("Description: ");
  if (!description) {
    console.error("\nError: Description is required!");
    closeReadline();
    return;
  }

  const enabledInput = await question("Enable by default? (y/n) [y]: ");
  const enabled =
    !enabledInput || enabledInput.toLowerCase() === "y" || enabledInput.toLowerCase() === "s";

  closeReadline();

  console.log("\n" + "-".repeat(60));
  console.log("CREATING PLUGIN...");
  console.log("-".repeat(60) + "\n");

  // Gerar nomes
  const kebabName = toKebabCase(name);
  const camelName = toCamelCase(name);
  const fileName = `${kebabName}.ts`;

  // Caminhos - agora dentro da pasta da plataforma
  const pluginsDir = path.join(process.cwd(), "src", "plugins");
  const platformDir = path.join(pluginsDir, platformFolder);
  const pluginFolder = path.join(platformDir, kebabName);
  const filePath = path.join(pluginFolder, fileName);
  const barrelPath = path.join(pluginFolder, "index.ts");
  const readmePath = path.join(pluginFolder, "README.md");
  const platformIndexPath = path.join(platformDir, "index.ts");

  // Verificar se já existe
  if (exists(pluginFolder)) {
    console.error(`\nError: Plugin already exists: ${pluginFolder}`);
    return;
  }

  // Criar diretório da plataforma se não existir
  if (!exists(platformDir)) {
    createDirectory(platformDir);
    console.log(`[OK] Created platform folder: ${platformFolder}/`);

    // Criar barrel file da plataforma
    const platformBarrelContent = generatePlatformBarrel(platformName);
    writeFile(platformIndexPath, platformBarrelContent);
    console.log(`[OK] Created platform barrel file: ${platformFolder}/index.ts`);
  }

  // Criar diretório do plugin
  createDirectory(pluginFolder);
  console.log(`[OK] Created plugin folder: ${platformFolder}/${kebabName}/`);

  // Gerar e escrever arquivo principal do plugin
  const content = generatePluginTemplate(name, description, enabled);
  writeFile(filePath, content);
  console.log(`[OK] Created plugin file: ${platformFolder}/${kebabName}/${fileName}`);

  // Criar barrel file (index.ts)
  const barrelContent = generatePluginBarrel(kebabName);
  writeFile(barrelPath, barrelContent);
  console.log(`[OK] Created barrel file: ${platformFolder}/${kebabName}/index.ts`);

  // Criar README.md
  const readmeContent = generatePluginReadme(name, description, kebabName, camelName);
  writeFile(readmePath, readmeContent);
  console.log(`[OK] Created documentation: ${platformFolder}/${kebabName}/README.md`);

  // Atualizar index.ts da plataforma
  if (exists(platformIndexPath)) {
    let platformIndexContent = readFile(platformIndexPath);

    // Adicionar export
    const exportLine = `export { default as ${camelName}Plugin } from "./${kebabName}";`;

    if (!platformIndexContent.includes(exportLine)) {
      // Encontrar onde adicionar (após os outros exports de plugins)
      const lastPluginExport = platformIndexContent.lastIndexOf("export { default as");
      if (lastPluginExport !== -1) {
        const endOfLine = platformIndexContent.indexOf("\n", lastPluginExport);
        platformIndexContent =
          platformIndexContent.slice(0, endOfLine + 1) +
          exportLine +
          "\n" +
          platformIndexContent.slice(endOfLine + 1);
      } else {
        // Se não houver outros plugins, adicionar no final
        platformIndexContent += `\n${exportLine}\n`;
      }

      writeFile(platformIndexPath, platformIndexContent);
      console.log(`[OK] Export added to ${platformFolder}/index.ts`);
    }
  }

  // Atualizar src/index.ts para adicionar no allFlutterPlugins (apenas para Flutter)
  if (platformFolder === "flutter") {
    const mainIndexPath = path.join(process.cwd(), "src", "index.ts");
    if (exists(mainIndexPath)) {
      let mainIndexContent = readFile(mainIndexPath);

      // 1. Adicionar no import
      const importRegex = /import\s*\{([^}]+)\}\s*from\s*["']\.\/plugins\/flutter["'];/;
      const importMatch = mainIndexContent.match(importRegex);

      if (importMatch) {
        const currentImports = importMatch[1];
        const newImport = `${camelName}Plugin`;

        // Verificar se já existe
        if (!currentImports.includes(newImport)) {
          // Adicionar no final da lista de imports
          const updatedImports = currentImports.trim() + `,\n  ${newImport}`;
          mainIndexContent = mainIndexContent.replace(
            importRegex,
            `import {\n  ${updatedImports}\n} from "./plugins/flutter";`
          );
          console.log(`[OK] Added to imports in src/index.ts`);
        }
      }

      // 2. Adicionar no array allFlutterPlugins
      const arrayRegex = /export const allFlutterPlugins = \[([\s\S]*?)\];/;
      const arrayMatch = mainIndexContent.match(arrayRegex);

      if (arrayMatch) {
        const currentPlugins = arrayMatch[1];
        const newPlugin = `${camelName}Plugin`;

        // Verificar se já existe
        if (!currentPlugins.includes(newPlugin)) {
          // Adicionar no final do array
          const updatedPlugins = currentPlugins.trim() + `,\n  ${newPlugin}`;
          mainIndexContent = mainIndexContent.replace(
            arrayRegex,
            `export const allFlutterPlugins = [\n  ${updatedPlugins}\n];`
          );
          console.log(`[OK] Added to allFlutterPlugins in src/index.ts`);
        }
      }

      writeFile(mainIndexPath, mainIndexContent);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("PLUGIN CREATED SUCCESSFULLY!");
  console.log("=".repeat(60) + "\n");

  console.log("Plugin structure:");
  console.log(`  src/plugins/${platformFolder}/${kebabName}/`);
  console.log(`  ├── ${fileName}      # Plugin implementation`);
  console.log(`  ├── index.ts        # Barrel file`);
  console.log(`  └── README.md       # Documentation`);
  console.log();
  console.log("Automatically updated:");
  console.log(`  ✅ ${platformFolder}/index.ts - Export added`);
  if (platformFolder === "flutter") {
    console.log(`  ✅ src/index.ts - Import added`);
    console.log(`  ✅ src/index.ts - Added to allFlutterPlugins`);
  }
  console.log();
  console.log("Next steps:");
  console.log(`  1. Edit: ${filePath}`);
  console.log(`  2. Update documentation: ${readmePath}`);
  console.log(`  3. Implement the plugin logic`);
  console.log(`  4. Run: npm run build`);
  console.log(`  5. Use: import { ${camelName}Plugin } from "@felipeduarte26/danger-bot"\n`);
}
