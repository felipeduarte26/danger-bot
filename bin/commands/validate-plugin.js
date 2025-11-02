/**
 * VALIDATE PLUGIN COMMAND
 * ========================
 * Comando para validar plugins
 */

import { exists, readFile } from "../utils/fs-helpers.js";

/**
 * Validar plugin
 * @param {string} pluginPath - Caminho do arquivo do plugin
 */
export function validatePlugin(pluginPath) {
  if (!exists(pluginPath)) {
    console.error(`❌ Arquivo não encontrado: ${pluginPath}`);
    return;
  }

  const content = readFile(pluginPath);
  const errors = [];
  const warnings = [];

  // Verificações obrigatórias
  if (!content.includes("import { createPlugin }")) {
    errors.push("❌ Falta import do createPlugin");
  }

  if (!content.includes("export default createPlugin")) {
    errors.push("❌ Falta export default createPlugin");
  }

  if (!content.match(/name:\s*["'][^"']+["']/)) {
    errors.push('❌ Falta campo "name"');
  }

  if (!content.match(/description:\s*["'][^"']+["']/)) {
    errors.push('❌ Falta campo "description"');
  }

  if (!content.match(/enabled:\s*(true|false)/)) {
    warnings.push('⚠️ Falta campo "enabled" (será true por padrão)');
  }

  // Verificações de boas práticas
  if (!content.includes("async ()")) {
    warnings.push("⚠️ Função run não é async");
  }

  if (!content.includes("/**")) {
    warnings.push("⚠️ Falta documentação JSDoc no topo do arquivo");
  }

  // Mostrar resultados
  console.log("\n🔍 Validando plugin...\n");

  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ Plugin válido! Nenhum problema encontrado.");
  } else {
    if (errors.length > 0) {
      console.log("❌ Erros encontrados:");
      errors.forEach((err) => console.log(`   ${err}`));
      console.log();
    }

    if (warnings.length > 0) {
      console.log("⚠️ Avisos:");
      warnings.forEach((warn) => console.log(`   ${warn}`));
      console.log();
    }
  }
}
