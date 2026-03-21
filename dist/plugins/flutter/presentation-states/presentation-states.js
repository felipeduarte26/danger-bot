"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Valida Presentation States
 */
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "presentation-states",
    description: "Valida Presentation States",
    enabled: true,
  },
  async () => {
    const danger = (0, _types_1.getDanger)();
    const { git } = danger;
    const files = git.created_files
      .concat(git.modified_files)
      .filter((f) => f.match(/_state\.dart$/) && f.match(/\/presentation\//));
    for (const file of files) {
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c) => c.content).join("\n");
        if (!fileText.match(/sealed\s+class\s+\w+State/)) {
          (0, _types_1.sendFail)(
            `## 🎨 STATE DEVE SER SEALED CLASS

Primeira classe do state deve ser \`sealed class\`.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ✅ CORRETO
sealed class ProductState {}
final class ProductInitialState extends ProductState {}
final class ProductLoadedState extends ProductState {}
\`\`\``,
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
