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
 * Barrel Files Enforcer Plugin
 * Analisa imports dos arquivos Dart e sugere barrel files quando
 * multiplos imports vem da mesma pasta.
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const IMPORT_RE = /^import\s+['"]package:([^'"]+)['"];/;
const DART_CORE_RE = /^import\s+['"]dart:/;
const RELATIVE_RE = /^import\s+['"]\.\./;
exports.default = (0, _types_1.createPlugin)(
  {
    name: "barrel-files-enforcer",
    description: "Sugere barrel files quando múltiplos imports vêm da mesma pasta",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f) =>
        f.endsWith(".dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        fs.existsSync(f)
    );
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const packageImports = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (DART_CORE_RE.test(line)) continue;
        if (RELATIVE_RE.test(line)) continue;
        const match = line.match(IMPORT_RE);
        if (match) {
          packageImports.push({ path: match[1], line: i + 1 });
        }
      }
      if (packageImports.length < 2) continue;
      const groups = groupByFolder(packageImports);
      for (const group of groups) {
        if (group.imports.length < 2) continue;
        const folderName = group.folder.split("/").pop() || group.folder;
        const barrelName = `${folderName}.dart`;
        const alreadyUsesBarrel = group.imports.some(
          (imp) =>
            imp.endsWith(`/${barrelName}`) || imp.endsWith(`/${folderName}/${folderName}.dart`)
        );
        if (alreadyUsesBarrel) continue;
        const importLines = group.imports.map((imp) => `import 'package:${imp}';`).join("\n");
        const packagePrefix = group.imports[0].split("/").slice(0, -1).join("/");
        (0, _types_1.sendFail)(
          `BARREL FILE RECOMENDADO

**${group.imports.length} imports** da mesma pasta \`${folderName}/\` poderiam usar um barrel file.

### Problema Identificado

Imports verbosos da mesma pasta:

\`\`\`dart
// ❌ Atual — ${group.imports.length} imports separados
${importLines}

// ✅ Com barrel file — 1 import
import 'package:${packagePrefix}/${barrelName}';
\`\`\`

### 🎯 AÇÃO NECESSÁRIA

Crie \`${barrelName}\` na pasta \`${folderName}/\`:

\`\`\`dart
${group.imports.map((imp) => `export '${imp.split("/").pop()}';`).join("\n")}
\`\`\`

### 🚀 Objetivo

Simplificar **imports** e melhorar **organização**.

📖 [Guia completo sobre Barrel Files](https://medium.com/@ugamakelechi501/barrel-files-in-dart-and-flutter-a-guide-to-simplifying-imports-9b245dbe516a)`,
          file,
          group.lines[0]
        );
      }
    }
  }
);
function groupByFolder(imports) {
  const map = new Map();
  for (const imp of imports) {
    const parts = imp.path.split("/");
    if (parts.length < 2) continue;
    const folder = parts.slice(0, -1).join("/");
    let group = map.get(folder);
    if (!group) {
      group = { folder, imports: [], lines: [] };
      map.set(folder, group);
    }
    group.imports.push(imp.path);
    group.lines.push(imp.line);
  }
  return Array.from(map.values());
}
