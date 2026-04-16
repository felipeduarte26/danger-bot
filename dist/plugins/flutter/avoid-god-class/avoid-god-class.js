"use strict";
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
/**
 * Avoid God Class Plugin
 * Detecta classes muito grandes que violam o princípio de responsabilidade única.
 * Verifica número de métodos públicos e total de linhas da classe.
 *
 * Thresholds:
 * - Mais de 300 linhas → warning (padrão)
 * - Mais de 400 linhas → warning (ViewModels: *_viewmodel.dart que extends ViewModelBase)
 * - Mais de 600 linhas → warning (arquivos em presentation/)
 * - Mais de 15 métodos públicos → warning
 * - Exclui: classes geradas (.g.dart, .freezed.dart), enums, mixins, extensions
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const MAX_CLASS_LINES = 300;
const MAX_CLASS_LINES_PRESENTATION = 600;
const MAX_CLASS_LINES_VIEWMODEL = 400;
const MAX_PUBLIC_METHODS = 15;
function isViewModelFile(filePath) {
  return filePath.replace(/\\/g, "/").endsWith("_viewmodel.dart");
}
function getMaxClassLines(filePath, cls) {
  if (isViewModelFile(filePath) && cls.extendsFrom === "ViewModelBase") {
    return MAX_CLASS_LINES_VIEWMODEL;
  }
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("/presentation/")) {
    return MAX_CLASS_LINES_PRESENTATION;
  }
  return MAX_CLASS_LINES;
}
function countConstructorLines(lines, className, startIdx, endIdx) {
  let total = 0;
  const pattern = new RegExp(`^(?:const\\s+|factory\\s+)?${className}(?:\\.[a-zA-Z_]\\w*)?\\s*\\(`);
  let classParenDepth = 0;
  let classBraceDepth = 0;
  let ctorParenDepth = 0;
  let ctorParamsComplete = false;
  let ctorBodyBraceDepth = 0;
  let ctorFoundBody = false;
  for (let i = startIdx; i <= endIdx; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const depthBeforeLine = classBraceDepth;
    updateClassDepth(line);
    if (depthBeforeLine !== 1 || !pattern.test(trimmed)) continue;
    total++;
    ctorParenDepth = 0;
    ctorParamsComplete = false;
    ctorBodyBraceDepth = 0;
    ctorFoundBody = false;
    processCtorChars(line);
    if (isCtorDone(trimmed)) continue;
    for (let j = i + 1; j <= endIdx; j++) {
      total++;
      const jLine = lines[j];
      updateClassDepth(jLine);
      processCtorChars(jLine);
      if (isCtorDone(lines[j].trim())) {
        i = j;
        break;
      }
    }
  }
  return total;
  function updateClassDepth(line) {
    for (const ch of line) {
      if (ch === "(") classParenDepth++;
      if (ch === ")") classParenDepth--;
      if (classParenDepth === 0) {
        if (ch === "{") classBraceDepth++;
        if (ch === "}") classBraceDepth--;
      }
    }
  }
  function processCtorChars(line) {
    for (const ch of line) {
      if (!ctorParamsComplete) {
        if (ch === "(") ctorParenDepth++;
        if (ch === ")") {
          ctorParenDepth--;
          if (ctorParenDepth <= 0) ctorParamsComplete = true;
        }
      } else {
        if (ch === "{") {
          ctorBodyBraceDepth++;
          ctorFoundBody = true;
        }
        if (ch === "}") ctorBodyBraceDepth--;
      }
    }
  }
  function isCtorDone(trimmedLine) {
    if (!ctorParamsComplete) return false;
    if (!ctorFoundBody && trimmedLine.endsWith(";")) return true;
    if (ctorFoundBody && ctorBodyBraceDepth <= 0) return true;
    return false;
  }
}
function parseClasses(lines) {
  const classes = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.match(/^\s*enum\s+/) || line.match(/^\s*mixin\s+/) || line.match(/^\s*extension\s+/)) {
      i++;
      continue;
    }
    const classMatch = line.match(
      /^\s*(?:abstract\s+)?(?:final\s+)?(?:base\s+)?(?:sealed\s+)?(?:interface\s+)?class\s+([A-Za-z_]\w*)/
    );
    if (classMatch) {
      const className = classMatch[1];
      const startLine = i;
      let braceDepth = 0;
      let foundOpen = false;
      const publicMethods = [];
      let extendsFrom = null;
      for (let k = i; k < lines.length; k++) {
        const extMatch = lines[k].match(/extends\s+([A-Za-z_]\w*)/);
        if (extMatch) {
          extendsFrom = extMatch[1];
          break;
        }
        if (lines[k].includes("{")) break;
      }
      for (let j = i; j < lines.length; j++) {
        const cl = lines[j];
        for (const ch of cl) {
          if (ch === "{") {
            braceDepth++;
            foundOpen = true;
          }
          if (ch === "}") braceDepth--;
        }
        if (foundOpen && braceDepth === 1) {
          const methodMatch = cl.match(
            /^\s+(?:static\s+)?(?:Future<[^>]*>|Stream<[^>]*>|void|bool|int|double|String|List<[^>]*>|Map<[^>]*>|Set<[^>]*>|[\w<>,?\s]+?)\s+([a-z]\w*)\s*[(<]/
          );
          if (methodMatch && !methodMatch[1].startsWith("_") && !cl.includes("@override")) {
            publicMethods.push(methodMatch[1]);
          }
        }
        if (foundOpen && braceDepth <= 0) {
          const constructorLineCount = countConstructorLines(lines, className, startLine, j);
          classes.push({
            name: className,
            startLine: startLine + 1,
            lineCount: j - startLine + 1,
            constructorLineCount,
            publicMethods,
            extendsFrom,
          });
          i = j;
          break;
        }
      }
    }
    i++;
  }
  return classes;
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "avoid-god-class",
    description: "Detecta classes muito grandes que violam o princípio de responsabilidade única",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f) =>
        f.endsWith(".dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        !f.endsWith("_test.dart") &&
        fs.existsSync(f)
    );
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const classes = parseClasses(lines);
      for (const cls of classes) {
        const maxLines = getMaxClassLines(file, cls);
        const isViewModel = isViewModelFile(file) && cls.extendsFrom === "ViewModelBase";
        const effectiveLineCount = isViewModel
          ? cls.lineCount - cls.constructorLineCount
          : cls.lineCount;
        if (effectiveLineCount > maxLines) {
          const lineDetail =
            isViewModel && cls.constructorLineCount > 0
              ? `**${effectiveLineCount} linhas** (${cls.lineCount} total, ${cls.constructorLineCount} de construtor ignoradas)`
              : `**${effectiveLineCount} linhas**`;
          (0, _types_1.sendFormattedFail)({
            title: "CLASSE MUITO GRANDE",
            description: `A classe \`${cls.name}\` tem ${lineDetail} (máximo recomendado: ${maxLines}).`,
            problem: {
              wrong: `class ${cls.name} { // ${effectiveLineCount} linhas }`,
              correct: `class ${cls.name}A { // responsabilidade A }\nclass ${cls.name}B { // responsabilidade B }`,
              wrongLabel: `${effectiveLineCount} linhas — difícil de manter`,
              correctLabel: "Dividida por responsabilidade",
            },
            action: {
              text: "Considere extrair responsabilidades para classes menores:",
              code: `// Identifique grupos de métodos relacionados\n// e extraia para classes dedicadas.\n// Ex: métodos de validação → ${cls.name}Validator\n// Ex: métodos de formatação → ${cls.name}Formatter`,
            },
            objective:
              "Seguir o **Princípio de Responsabilidade Única** (SRP) — cada classe deve ter um único motivo para mudar.",
            reference: {
              text: "SOLID: Single Responsibility Principle",
              url: "https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html",
            },
            file,
            line: cls.startLine,
          });
        }
        if (cls.publicMethods.length > MAX_PUBLIC_METHODS) {
          (0, _types_1.sendFormattedFail)({
            title: "CLASSE COM MUITOS MÉTODOS PÚBLICOS",
            description: `A classe \`${cls.name}\` tem **${cls.publicMethods.length} métodos públicos** (máximo recomendado: ${MAX_PUBLIC_METHODS}).`,
            problem: {
              wrong: `class ${cls.name} {\n${cls.publicMethods
                .slice(0, 5)
                .map((m) => `  void ${m}() { }`)
                .join("\n")}\n  // ... +${cls.publicMethods.length - 5} métodos\n}`,
              correct: `class ${cls.name} {\n  // Apenas métodos da responsabilidade principal\n}`,
              wrongLabel: `${cls.publicMethods.length} métodos públicos`,
              correctLabel: "Responsabilidade focada",
            },
            action: {
              text: "Agrupe métodos por responsabilidade e extraia para classes dedicadas.",
              code: `// Muitos métodos públicos indicam múltiplas responsabilidades.\n// Considere padrões como:\n// - Strategy para comportamentos variáveis\n// - Facade para simplificar interfaces complexas\n// - Delegation para distribuir responsabilidades`,
            },
            objective: "Manter classes **coesas** e com **baixo acoplamento**.",
            reference: {
              text: "SOLID: Single Responsibility Principle",
              url: "https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html",
            },
            file,
            line: cls.startLine,
          });
        }
      }
    }
  }
);
