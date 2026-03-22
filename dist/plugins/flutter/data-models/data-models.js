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
 * Data Models Plugin
 * Valida arquivos dentro de /models/:
 * - Nome do arquivo deve terminar com _model.dart
 * - Classe deve ter sufixo Model
 * - Campos devem ser final (imutabilidade)
 * - Somente uma classe Model por arquivo
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
exports.default = (0, _types_1.createPlugin)(
  {
    name: "data-models",
    description: "Valida Data Models",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const files = [...git.created_files, ...git.modified_files].filter(
      (f) =>
        f.includes("/models/") &&
        f.endsWith(".dart") &&
        !f.endsWith("models.dart") &&
        fs.existsSync(f)
    );
    for (const file of files) {
      const fileName = file.split("/").pop() || "";
      if (!fileName.endsWith("_model.dart")) {
        (0, _types_1.sendFail)(
          `NOMENCLATURA DE MODEL INCORRETA

Arquivo deve terminar com \`_model.dart\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ ${fileName}
// ✅ ${fileName.replace(".dart", "")}_model.dart
\`\`\``,
          file,
          1
        );
        continue;
      }
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const classes = [];
      let hasNonFinalField = false;
      let nonFinalFieldLine = 0;
      let nonFinalFieldName = "";
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const classMatch = line.match(/(?:final\s+)?class\s+([A-Za-z_]\w*)/);
        if (classMatch && !line.includes("abstract")) {
          classes.push({ name: classMatch[1], line: i + 1 });
        }
        if (classes.length > 0 && !hasNonFinalField) {
          const fieldMatch = line.match(
            /^\s+(?!final\s|static\s|const\s|late\s|@override)((?:String|int|double|bool|num|List|Map|Set|DateTime|[A-Z]\w*)[?<\s][\w<>,?\s]*)\s+(\w+)\s*;/
          );
          if (fieldMatch) {
            hasNonFinalField = true;
            nonFinalFieldLine = i + 1;
            nonFinalFieldName = fieldMatch[2];
          }
        }
      }
      if (classes.length > 1) {
        (0, _types_1.sendFail)(
          `MÚLTIPLAS CLASSES EM UM ARQUIVO MODEL

Encontradas **${classes.length} classes** neste arquivo: ${classes.map((c) => `\`${c.name}\``).join(", ")}.

### Problema Identificado

Cada Model deve estar em seu próprio arquivo para manter organização e facilitar manutenção.

### 🎯 AÇÃO NECESSÁRIA

Separe cada classe em um arquivo individual:

${classes.map((c) => `- \`${c.name}\` → \`${toSnakeCase(c.name)}.dart\``).join("\n")}

### 🚀 Objetivo

**Uma classe por arquivo** — facilita navegação e reduz conflitos de merge.`,
          file,
          classes[1].line
        );
      }
      for (const cls of classes) {
        if (!cls.name.endsWith("Model")) {
          (0, _types_1.sendFail)(
            `CLASSE DE MODEL SEM SUFIXO

A classe \`${cls.name}\` deve terminar com \`Model\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ class ${cls.name} { }
// ✅ class ${cls.name}Model { }
\`\`\``,
            file,
            cls.line
          );
        }
      }
      if (hasNonFinalField) {
        (0, _types_1.sendFail)(
          `MODEL COM CAMPO MUTÁVEL

Campo \`${nonFinalFieldName}\` não é \`final\`. Models devem ser **imutáveis**.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ Mutável
String ${nonFinalFieldName};

// ✅ Imutável
final String ${nonFinalFieldName};
\`\`\`

### 🚀 Objetivo

Models imutáveis são **thread-safe** e mais previsíveis.`,
          file,
          nonFinalFieldLine
        );
      }
    }
  }
);
function toSnakeCase(name) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}
