/**
 * INFO COMMAND
 * ============
 * Comando para mostrar informações do projeto
 */

import path from "path";
import { exists, readFile, getDirectories } from "../utils/fs-helpers.js";

/**
 * Mostrar informações do projeto
 */
export function showInfo() {
  const packagePath = path.join(process.cwd(), "package.json");

  if (!exists(packagePath)) {
    console.error("\nError: package.json not found!");
    return;
  }

  const pkg = JSON.parse(readFile(packagePath));

  console.log("\n" + "=".repeat(60));
  console.log("DANGER BOT - PROJECT INFO");
  console.log("=".repeat(60) + "\n");

  console.log(`Name:        ${pkg.name}`);
  console.log(`Version:     ${pkg.version}`);
  console.log(`Description: ${pkg.description}`);
  console.log();

  // Listar plugins por plataforma
  const pluginsDir = path.join(process.cwd(), "src", "plugins");
  if (exists(pluginsDir)) {
    const platformFolders = getDirectories(pluginsDir);

    let totalPlugins = 0;
    console.log("Platforms:\n");

    platformFolders.forEach((platform) => {
      const platformPath = path.join(pluginsDir, platform);
      const pluginFolders = getDirectories(platformPath);

      console.log(`  ${platform}/ (${pluginFolders.length} plugins)`);
      pluginFolders.forEach((folder) => {
        console.log(`    - ${folder}/`);
      });
      console.log();

      totalPlugins += pluginFolders.length;
    });

    console.log(`Total: ${totalPlugins} plugin(s) across ${platformFolders.length} platform(s)`);
  }

  console.log("\n" + "=".repeat(60) + "\n");
}
