/**
 * 🔤 SPELL CHECKER PLUGIN
 * ======================
 * Verifica ortografia em identificadores Dart usando cspell
 */

import { createPlugin, getDanger, sendMessage, sendWarn, sendFail } from "@types";
import { execSync } from "child_process";
import * as fs from "fs";

export default createPlugin(
  {
    name: "spell-checker",
    description: "Verifica ortografia em identificadores Dart",
    enabled: true,
  },
  async () => {
    const dartFiles = [
      ...getDanger().git.modified_files,
      ...getDanger().git.created_files,
    ].filter(
      (f) =>
        f.endsWith(".dart") &&
        !f.includes(".g.dart") &&
        !f.includes(".freezed.dart") &&
        !f.includes(".mocks.dart") &&
        fs.existsSync(f)
    );

    if (dartFiles.length === 0) {
      message("ℹ️ **cspell**: Nenhum arquivo Dart para verificar.");
      return;
    }

    message(`🔤 **cspell**: Verificando ${dartFiles.length} arquivo(s)...`);

    try {
      // Encontrar o caminho dos scripts do danger-bot
      const dangerBotPath = require.resolve("@diletta/danger-bot").replace(/dist.*$/, "");
      const setupScriptPath = `${dangerBotPath}scripts/setup_spell_check.sh`;
      const extractScriptPath = `${dangerBotPath}scripts/extract_dart_identifiers.js`;

      // Verificar se scripts existem localmente (projeto sem danger-bot instalado)
      const localSetupScript = "scripts/setup_spell_check.sh";
      const localExtractScript = "scripts/extract_dart_identifiers.js";
      
      const setupScript = fs.existsSync(localSetupScript) ? localSetupScript : setupScriptPath;
      const extractScript = fs.existsSync(localExtractScript) ? localExtractScript : extractScriptPath;

      // Setup cspell
      execSync(`bash ${setupScript}`, { stdio: "pipe" });

      // Extrair identificadores
      execSync(`node ${extractScript} ${dartFiles.join(" ")}`, {
        stdio: "pipe",
      });

      // Verificar se arquivos foram criados
      if (
        !fs.existsSync("temp_identifiers_for_spell_check.txt") ||
        !fs.existsSync("temp_spell_check_metadata.json")
      ) {
        message("⚠️ Arquivos temporários não criados");
        return;
      }

      // Executar cspell
      let cspellOutput = "";
      try {
        execSync(
          "./node_modules/.bin/cspell --config cspell.config.json --no-progress --no-summary temp_identifiers_for_spell_check.txt",
          { encoding: "utf-8", stdio: "pipe" }
        );
      } catch (error: any) {
        cspellOutput = error.stdout || "";
      }

      // Parse resultados
      const metadata = JSON.parse(
        fs.readFileSync("temp_spell_check_metadata.json", "utf-8")
      );
      const errors = parseCspellOutput(cspellOutput, metadata);

      // Reportar erros
      if (errors.length > 0) {
        for (const err of errors) {
          const typeMap: Record<string, string> = {
            class: "classe",
            method: "método",
            variable: "variável",
            parameter: "parâmetro",
          };

          fail(
            `**ERRO ORTOGRÁFICO**: \`${err.word}\` em ${typeMap[err.type] || err.type} \`${err.identifier}\`\n\n` +
              `\`\`\`dart\n${err.context}\n\`\`\`\n\n` +
              `**Ação**: Corrija ou adicione ao dicionário (.vscode/settings.json)`,
            err.file,
            err.line
          );
        }

        message(
          `⚠️ ${errors.length} erro(s) ortográfico(s) em ${new Set(errors.map((e) => e.file)).size} arquivo(s)`
        );
      } else {
        message("✅ **cspell**: Nenhum erro ortográfico!");
      }

      // Cleanup
      ["temp_identifiers_for_spell_check.txt", "temp_spell_check_metadata.json", "cspell.config.json"].forEach(
        (f) => fs.existsSync(f) && fs.unlinkSync(f)
      );
    } catch (error) {
      message("⚠️ Erro na verificação ortográfica");
    }
  }
);

function parseCspellOutput(output: string, metadata: any[]): any[] {
  const errors: any[] = [];
  const regex =
    /temp_identifiers_for_spell_check\.txt:\d+:\d+\s*-\s*Unknown word \(([^)]+)\)/;

  for (const line of output.split("\n")) {
    const match = line.match(regex);
    if (match) {
      const word = match[1];
      const matches = metadata.filter(
        (m) => m.word.toLowerCase() === word.toLowerCase()
      );
      errors.push(...matches);
    }
  }

  return errors.filter(
    (e, i, self) =>
      i ===
      self.findIndex(
        (x) =>
          x.originalFile === e.originalFile &&
          x.line === e.line &&
          x.word === e.word
      )
  );
}

