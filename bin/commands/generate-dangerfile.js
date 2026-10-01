/**
 * GENERATE DANGERFILE COMMAND
 * ============================
 * Comando para gerar dangerfile de exemplo
 */

import path from "path";
import { writeFile } from "../utils/fs-helpers.js";
import { generateDangerfileTemplate } from "../templates/dangerfile-template.js";

/**
 * Gerar dangerfile de exemplo no diretório atual (projeto que usa o Danger Bot)
 */
export function generateDangerfile() {
  const outputPath = path.join(process.cwd(), "dangerfile.example.ts");
  writeFile(outputPath, generateDangerfileTemplate());

  console.log(`\n✅ Dangerfile de exemplo criado: ${outputPath}`);
  console.log("\n📝 Para usar:");
  console.log("   1. Renomeie para dangerfile.ts");
  console.log("   2. Customize conforme necessário");
}
