"use strict";
/**
 * 🔤 SPELL CHECKER PLUGIN
 * ======================
 * Verifica ortografia em identificadores Dart usando cspell
 */
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
const _types_1 = require("../../../types");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
exports.default = (0, _types_1.createPlugin)(
  {
    name: "spell-checker",
    description: "Verifica ortografia em identificadores Dart",
    enabled: true,
  },
  async () => {
    const dartFiles = [
      ...(0, _types_1.getDanger)().git.modified_files,
      ...(0, _types_1.getDanger)().git.created_files,
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
      const extractScript = fs.existsSync(localExtractScript)
        ? localExtractScript
        : extractScriptPath;
      // Setup cspell
      (0, child_process_1.execSync)(`bash ${setupScript}`, { stdio: "pipe" });
      // Extrair identificadores
      (0, child_process_1.execSync)(`node ${extractScript} ${dartFiles.join(" ")}`, {
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
        (0, child_process_1.execSync)(
          "./node_modules/.bin/cspell --config cspell.config.json --no-progress --no-summary temp_identifiers_for_spell_check.txt",
          { encoding: "utf-8", stdio: "pipe" }
        );
      } catch (error) {
        cspellOutput = error.stdout || "";
      }
      // Parse resultados
      const metadata = JSON.parse(fs.readFileSync("temp_spell_check_metadata.json", "utf-8"));
      const errors = parseCspellOutput(cspellOutput, metadata);
      // Reportar erros
      if (errors.length > 0) {
        for (const err of errors) {
          const typeMap = {
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
      [
        "temp_identifiers_for_spell_check.txt",
        "temp_spell_check_metadata.json",
        "cspell.config.json",
      ].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
    } catch (error) {
      message("⚠️ Erro na verificação ortográfica");
    }
  }
);
function parseCspellOutput(output, metadata) {
  const errors = [];
  const regex = /temp_identifiers_for_spell_check\.txt:\d+:\d+\s*-\s*Unknown word \(([^)]+)\)/;
  for (const line of output.split("\n")) {
    const match = line.match(regex);
    if (match) {
      const word = match[1];
      const matches = metadata.filter((m) => m.word.toLowerCase() === word.toLowerCase());
      errors.push(...matches);
    }
  }
  return errors.filter(
    (e, i, self) =>
      i ===
      self.findIndex(
        (x) => x.originalFile === e.originalFile && x.line === e.line && x.word === e.word
      )
  );
}
