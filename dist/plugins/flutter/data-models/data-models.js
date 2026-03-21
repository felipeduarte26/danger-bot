"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Valida Data Models
 */
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "data-models",
    description: "Valida Data Models",
    enabled: true,
  },
  async () => {
    const danger = (0, _types_1.getDanger)();
    const { git } = danger;
    const files = git.created_files
      .concat(git.modified_files)
      .filter((f) => f.match(/\/data\/models\/[^/]+\.dart$/) && !f.endsWith("models.dart"));
    for (const file of files) {
      if (!file.match(/_model\.dart$/)) {
        await (0, _types_1.sendFail)(
          `## 📦 NOMENCLATURA DE MODEL INCORRETA

Arquivo deve terminar com \`_model.dart\`.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ user.dart
// ✅ user_model.dart
\`\`\``,
          file,
          1
        );
      }
    }
  }
);
