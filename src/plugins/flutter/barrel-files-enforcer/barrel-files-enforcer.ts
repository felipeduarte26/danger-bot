/**
 * Força uso de barrel files
 */
import { createPlugin, sendWarn, getAllChangedFiles } from "@types";

export default createPlugin(
  {
    name: "barrel-files-enforcer",
    description: "Força uso de barrel files",
    enabled: true,
  },
  async () => {
    // Verificar se pastas domain/data/presentation têm barrel files
    const folders = ["entities", "failures", "repositories", "usecases", "models", "datasources"];
    const allFiles = getAllChangedFiles();

    for (const folder of folders) {
      const filesInFolder = allFiles.filter(
        (f: string) =>
          f.includes(`/${folder}/`) && f.endsWith(".dart") && !f.endsWith(`${folder}.dart`)
      );

      if (filesInFolder.length > 0) {
        const barrelFile = allFiles.find((f: string) => f.endsWith(`/${folder}/${folder}.dart`));

        if (!barrelFile) {
          sendWarn(
            `## 📦 BARREL FILE AUSENTE

Pasta \`${folder}\` tem arquivos mas sem barrel file.

### ⚠️ Problema Identificado

Sem barrel file, imports ficam verbosos:

\`\`\`dart
// ❌ Sem barrel file
import '../domain/entities/user_entity.dart';
import '../domain/entities/product_entity.dart';
import '../domain/entities/order_entity.dart';

// ✅ Com barrel file
import '../domain/entities/entities.dart';
\`\`\`

### 🎯 AÇÃO NECESSÁRIA

**Crie arquivo:** \`${folder}/${folder}.dart\`

\`\`\`dart
// ${folder}.dart
export 'file1.dart';
export 'file2.dart';
export 'file3.dart';
\`\`\`

### 🚀 Objetivo

Simplificar **imports** e melhorar **organização**.

📖 [Guia completo sobre Barrel Files](https://medium.com/@ugamakelechi501/barrel-files-in-dart-and-flutter-a-guide-to-simplifying-imports-9b245dbe516a)`
          );
        }
      }
    }
  }
);
