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
 * Domain Entities Plugin
 * Valida arquivos dentro de /entities/:
 * - Nome do arquivo deve terminar com _entity.dart
 * - Classe deve ser final class
 * - Classe deve ter sufixo Entity
 * - Somente uma entity por arquivo
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
exports.default = (0, _types_1.createPlugin)(
  {
    name: "domain-entities",
    description: "Valida Domain Entities",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const files = [...git.created_files, ...git.modified_files].filter(
      (f) =>
        f.includes("/entities/") &&
        f.endsWith(".dart") &&
        !f.endsWith("entities.dart") &&
        fs.existsSync(f)
    );
    for (const file of files) {
      const fileName = file.split("/").pop() || "";
      if (!fileName.endsWith("_entity.dart")) {
        (0, _types_1.sendFail)(
          `NOMENCLATURA DE ENTITY INCORRETA

Arquivo deve terminar com \`_entity.dart\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ ${fileName}
// ✅ ${fileName.replace(".dart", "")}_entity.dart
\`\`\``,
          file,
          1
        );
        continue;
      }
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const classes = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("abstract")) continue;
        const classMatch = line.match(/(final\s+)?class\s+([A-Za-z_]\w*)/);
        if (classMatch) {
          classes.push({
            name: classMatch[2],
            line: i + 1,
            isFinal: !!classMatch[1],
          });
        }
      }
      if (classes.length === 0) continue;
      if (classes.length > 1) {
        (0, _types_1.sendFail)(
          `MÚLTIPLAS ENTITIES EM UM ARQUIVO

Encontradas **${classes.length} classes**: ${classes.map((c) => `\`${c.name}\``).join(", ")}.

### 🎯 AÇÃO NECESSÁRIA

Cada Entity deve estar em seu próprio arquivo.

### 🚀 Objetivo

**Uma Entity por arquivo** — facilita navegação e manutenção.`,
          file,
          classes[1].line
        );
      }
      for (const cls of classes) {
        if (!cls.name.endsWith("Entity")) {
          (0, _types_1.sendFail)(
            `ENTITY SEM SUFIXO

A classe \`${cls.name}\` deve terminar com \`Entity\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ class ${cls.name} { }
// ✅ final class ${cls.name}Entity { }
\`\`\``,
            file,
            cls.line
          );
        }
        if (!cls.isFinal) {
          (0, _types_1.sendFail)(
            `ENTITY DEVE SER FINAL CLASS

A classe \`${cls.name}\` deve usar \`final class\` para prevenir herança indevida.

### Problema Identificado

Sem \`final\`, a classe pode ser estendida, quebrando princípios da Domain Layer.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ Sem final
class ${cls.name} {
  final String name;
}

// ✅ Com final
final class ${cls.name} {
  final String name;
  const ${cls.name}({required this.name});
}
\`\`\`

### 🚀 Objetivo

Garantir **imutabilidade** e design correto da Domain Layer.`,
            file,
            cls.line
          );
        }
      }
    }
  }
);
