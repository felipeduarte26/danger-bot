"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Valida Data Repository implementations
 */
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "data-repositories",
    description: "Valida Data Repository implementations",
    enabled: true,
  },
  async () => {
    const danger = (0, _types_1.getDanger)();
    const { git } = danger;
    const files = git.created_files
      .concat(git.modified_files)
      .filter(
        (f) => f.match(/\/data\/repositories\/[^/]+\.dart$/) && !f.endsWith("repositories.dart")
      );
    for (const file of files) {
      if (!file.match(/_repository\.dart$/)) {
        (0, _types_1.sendFail)(
          `## 🏪 NOMENCLATURA DE REPOSITORY INCORRETA

Arquivo deve terminar com \`_repository.dart\` (implementação, não interface).

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// Domain (interface): user_repository_interface.dart
// Data (implementação): user_repository.dart ✅
\`\`\``,
          file,
          1
        );
      }
    }
  }
);
