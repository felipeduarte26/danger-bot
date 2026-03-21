"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Valida Presentation ViewModels
 */
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "presentation-viewmodels",
    description: "Valida Presentation ViewModels",
    enabled: true,
  },
  async () => {
    const danger = (0, _types_1.getDanger)();
    const { git } = danger;
    const files = git.created_files
      .concat(git.modified_files)
      .filter((f) => f.match(/_viewmodel\.dart$/));
    for (const file of files) {
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c) => c.content).join("\n");
        // Verificar se ViewModel usa Repository diretamente
        if (fileText.match(/I\w*Repository\w*\s+\w+/)) {
          await (0, _types_1.sendFail)(
            `## 🎮 VIEWMODEL NÃO PODE USAR REPOSITORY DIRETAMENTE

ViewModel deve depender de **UseCases**, não Repositories.

---

### ⚠️ Problema
Violação da Clean Architecture.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
final class ProductViewModel {
  final IProductRepository repository;
}

// ✅ CORRETO
final class ProductViewModel {
  final IGetProductsUseCase getProductsUseCase;
}
\`\`\`

---

### 🚀 Objetivo
Manter **separação de responsabilidades**.`,
            file,
            1
          );
        }
      } catch (e) {
        // Ignore
      }
    }
  }
);
