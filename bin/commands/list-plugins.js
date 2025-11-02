/**
 * LIST PLUGINS COMMAND
 * ====================
 * Comando para listar todos os plugins disponíveis
 */

import path from "path";
import { exists, getDirectories, getFiles, readFile } from "../utils/fs-helpers.js";

/**
 * Listar todos os plugins
 */
export function listPlugins() {
  const pluginsDir = path.join(process.cwd(), "src", "plugins");

  if (!exists(pluginsDir)) {
    console.log("\nError: Plugins directory not found!");
    return;
  }

  // Agora temos pastas por plataforma (flutter, nodejs, etc)
  const platformFolders = getDirectories(pluginsDir);

  console.log("\n" + "=".repeat(60));
  console.log("DANGER BOT PLUGINS");
  console.log("=".repeat(60) + "\n");

  let totalPlugins = 0;

  platformFolders.forEach((platform) => {
    const platformPath = path.join(pluginsDir, platform);
    const pluginFolders = getDirectories(platformPath);

    if (pluginFolders.length === 0) return;

    console.log(`--- ${platform.toUpperCase()} ---\n`);

    pluginFolders.forEach((folder) => {
      // Buscar arquivo .ts dentro da pasta (ignorar index.ts)
      const pluginFolder = path.join(platformPath, folder);
      const files = getFiles(pluginFolder, ".ts").filter((f) => f !== "index.ts");

      if (files.length === 0) return;

      const pluginFile = path.join(pluginFolder, files[0]);
      const content = readFile(pluginFile);

      // Extrair informações do plugin
      const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
      const descMatch = content.match(/description:\s*["']([^"']+)["']/);
      const enabledMatch = content.match(/enabled:\s*(true|false)/);

      const name = nameMatch ? nameMatch[1] : folder;
      const desc = descMatch ? descMatch[1] : "No description";
      const enabled = enabledMatch ? enabledMatch[1] === "true" : true;

      console.log(`[${totalPlugins + 1}] ${name.toUpperCase()}`);
      console.log(`    Platform: ${platform}`);
      console.log(`    Folder: ${folder}/`);
      console.log(`    File: ${files[0]}`);
      console.log(`    Description: ${desc}`);
      console.log(`    Status: ${enabled ? "ENABLED" : "DISABLED"}`);

      // Verificar se tem README
      const readmePath = path.join(pluginFolder, "README.md");
      if (exists(readmePath)) {
        console.log(`    Documentation: README.md`);
      }
      console.log();

      totalPlugins++;
    });
  });

  console.log("=".repeat(60));
  console.log(`Total: ${totalPlugins} plugin(s) across ${platformFolders.length} platform(s)\n`);
}
