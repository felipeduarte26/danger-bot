"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Força uso de barrel files
 */
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "barrel-files-enforcer",
    description: "Força uso de barrel files",
    enabled: true,
  },
  async () => {
    const folders = ["entities", "failures", "repositories", "usecases", "models", "datasources"];
    const allFiles = (0, _types_1.getAllChangedFiles)();
    for (const folder of folders) {
      const filesInFolder = allFiles.filter(
        (f) => f.includes(`/${folder}/`) && f.endsWith(".dart") && !f.endsWith(`${folder}.dart`)
      );
      if (filesInFolder.length === 0) continue;
      const barrelFile = allFiles.find((f) => f.endsWith(`/${folder}/${folder}.dart`));
      if (barrelFile) continue;
      const targetFile = filesInFolder[0];
      await (0, _types_1.sendFail)(
        `BARREL FILE AUSENTE

Pasta \`${folder}\` tem arquivos mas sem barrel file.

### Problema Identificado

Sem barrel file, imports ficam verbosos:

\`\`\`dart
// ❌ Sem barrel file
import '../domain/${folder}/user_entity.dart';
import '../domain/${folder}/product_entity.dart';
import '../domain/${folder}/order_entity.dart';

// ✅ Com barrel file
import '../domain/${folder}/${folder}.dart';
\`\`\`

### 🎯 AÇÃO NECESSÁRIA

**Crie arquivo:** \`${folder}/${folder}.dart\`

\`\`\`dart
// ${folder}.dart
${filesInFolder.map((f) => `export '${f.split("/").pop()}';`).join("\n")}
\`\`\`

### 🚀 Objetivo

Simplificar **imports** e melhorar **organização**.

📖 [Guia completo sobre Barrel Files](https://medium.com/@ugamakelechi501/barrel-files-in-dart-and-flutter-a-guide-to-simplifying-imports-9b245dbe516a)`,
        targetFile,
        1
      );
    }
  }
);
