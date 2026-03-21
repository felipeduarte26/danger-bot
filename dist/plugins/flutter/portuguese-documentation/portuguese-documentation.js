"use strict";
/**
 * 🌐 PORTUGUESE DOCUMENTATION CHECKER PLUGIN
 * ==========================================
 * Detecta documentação em português quando o padrão é inglês
 *
 * FUNCIONALIDADES:
 * ✅ Analisa apenas comentários de documentação (///)
 * ✅ Usa cld3 (Compact Language Detector v3) - mesmo do Google Chrome
 * ✅ Detecção precisa de idioma
 * ✅ Ignora templates Dart ({@template}, {@macro}, etc)
 * ✅ Comenta inline no PR
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
const fs = __importStar(require("fs"));
let cld3Module = null;
let cld3Identifier = null;
async function getIdentifier() {
  if (cld3Identifier) return cld3Identifier;
  try {
    const cld3 = require("cld3-asm");
    if (typeof cld3.loadModule === "function") {
      const mod = await cld3.loadModule();
      cld3Identifier = mod.create(0, 512);
      return cld3Identifier;
    }
    if (typeof cld3.createIdentifier === "function") {
      cld3Identifier = cld3.createIdentifier();
      return cld3Identifier;
    }
    if (cld3.default && typeof cld3.default.loadModule === "function") {
      const mod = await cld3.default.loadModule();
      cld3Identifier = mod.create(0, 512);
      return cld3Identifier;
    }
    console.warn("⚠️ cld3-asm: API nao reconhecida");
    return null;
  } catch (error) {
    console.warn("⚠️ cld3-asm nao disponivel:", error.message);
    return null;
  }
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "portuguese-documentation",
    description: "Detecta documentação em português (padrão é inglês)",
    enabled: true,
  },
  async () => {
    const identifier = await getIdentifier();
    if (!identifier) {
      message("⚠️ **Verificação de idioma**: cld3 não disponível neste ambiente.");
      return;
    }
    cld3Module = identifier;
    const dartFiles = [
      ...(0, _types_1.getDanger)().git.modified_files,
      ...(0, _types_1.getDanger)().git.created_files,
    ].filter((f) => f.endsWith(".dart") && fs.existsSync(f));
    if (dartFiles.length === 0) {
      message("ℹ️ **Verificação de idioma**: Nenhum arquivo Dart para verificar.");
      return;
    }
    let totalPortugueseBlocks = 0;
    for (const file of dartFiles) {
      try {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");
        // Extrair blocos de documentação (///)
        const docBlocks = extractDocumentationBlocks(lines);
        // Verificar cada bloco
        for (const block of docBlocks) {
          const blockText = block.lines.map((l) => l.text).join(" ");
          if (isPortugueseText(blockText)) {
            totalPortugueseBlocks++;
            const lineCount = block.lines.length;
            const warningMessage =
              `**DOCUMENTAÇÃO EM PORTUGUÊS DETECTADA**\n\n` +
              `Esta documentação está em português, mas o padrão do projeto é comentários em inglês.\n\n` +
              `**Ação**: Traduza para inglês ou justifique o uso de português.\n\n` +
              (lineCount === 1 ? `📝 Comentário único` : `📝 Bloco de ${lineCount} linhas`);
            warn(warningMessage, file, block.startLine);
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao verificar ${file}:`, error);
      }
    }
    if (totalPortugueseBlocks > 0) {
      message(`🌐 **Documentação em português**: ${totalPortugueseBlocks} bloco(s) detectado(s)`);
    } else {
      message("✅ **Documentação**: Todas em inglês (padrão do projeto)");
    }
  }
);
/**
 * Extrai blocos de documentação (///)
 */
function extractDocumentationBlocks(lines) {
  const blocks = [];
  let currentBlock = [];
  let startLine = 0;
  lines.forEach((line, index) => {
    if (line.trim().startsWith("///")) {
      const text = line.replace(/^\s*\/\/\/\s*/, "").trim();
      if (currentBlock.length === 0) {
        startLine = index + 1;
      }
      currentBlock.push({
        text,
        line: index + 1,
        isEmpty: text.length === 0,
      });
    } else {
      // Finalizar bloco se houver
      if (currentBlock.length > 0) {
        // Remover linhas vazias do início e fim
        const nonEmpty = currentBlock.filter((l) => !l.isEmpty);
        if (nonEmpty.length > 0) {
          blocks.push({
            lines: currentBlock,
            startLine,
            endLine: currentBlock[currentBlock.length - 1].line,
          });
        }
        currentBlock = [];
      }
    }
  });
  // Bloco final
  if (currentBlock.length > 0) {
    const nonEmpty = currentBlock.filter((l) => !l.isEmpty);
    if (nonEmpty.length > 0) {
      blocks.push({
        lines: currentBlock,
        startLine,
        endLine: currentBlock[currentBlock.length - 1].line,
      });
    }
  }
  return blocks;
}
/**
 * Detecta se texto está em português usando CLD3
 */
function isPortugueseText(text) {
  if (!text || text.trim().length < 3) return false;
  if (!cld3Module) return false;
  const dartTemplates = [
    /^\{@template\s+[^}]+\}$/,
    /^\{@endtemplate\}$/,
    /^\{@macro\s+[^}]+\}$/,
    /^\{@tool\s+[^}]+\}$/,
    /^\{@animation\s+[^}]+\}$/,
    /^\{@inject_html\}$/,
    /^\{@youtube\s+[^}]+\}$/,
  ];
  if (dartTemplates.some((pattern) => pattern.test(text.trim()))) {
    return false;
  }
  const cleanText = text
    .replace(/`[^`]*`/g, "")
    .replace(/\{@template\s+[^}]+\}/g, "")
    .replace(/\{@endtemplate\}/g, "")
    .replace(/\{@macro\s+[^}]+\}/g, "")
    .replace(/\{[^}]*\}/g, "")
    .trim();
  if (cleanText.length < 3) return false;
  try {
    const result = cld3Module.findLanguage(cleanText);
    if (!result) return false;
    return result.language === "pt" && result.probability > 0.5;
  } catch (error) {
    console.error("❌ Erro CLD3:", error);
    return false;
  }
}
