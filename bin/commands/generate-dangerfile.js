/**
 * GENERATE DANGERFILE COMMAND
 * ============================
 * Comando para gerar dangerfile de exemplo
 */

import path from "path";
import { exists, listDirectory, readFile, writeFile } from "../utils/fs-helpers.js";
import { toCamelCase } from "../utils/string-helpers.js";
import { generateDangerfileTemplate } from "../templates/dangerfile-template.js";

/**
 * Gerar dangerfile de exemplo
 */
export function generateDangerfile() {
  const pluginsDir = path.join(process.cwd(), "src", "plugins");

  if (!exists(pluginsDir)) {
    console.log("❌ Diretório de plugins não encontrado!");
    return;
  }

  const files = listDirectory(pluginsDir).filter((f) => f.endsWith(".ts"));

  // Extrair nomes dos plugins
  const plugins = files.map((file) => {
    const content = readFile(path.join(pluginsDir, file));
    const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
    const name = nameMatch ? nameMatch[1] : file.replace(".ts", "");
    const camelName = toCamelCase(name);
    return `${camelName}Plugin`;
  });

  const dangerfileContent = generateDangerfileTemplate(plugins);

  const outputPath = path.join(process.cwd(), "dangerfile.example.ts");
  writeFile(outputPath, dangerfileContent);

  console.log(`\n✅ Dangerfile de exemplo criado: ${outputPath}`);
  console.log("\n📝 Para usar:");
  console.log("   1. Renomeie para dangerfile.ts");
  console.log("   2. Customize conforme necessário");
}
