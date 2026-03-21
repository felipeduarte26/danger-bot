/**
 * Valida Data Repository implementations
 */
import { createPlugin, getDanger, sendFail } from "@types";

export default createPlugin(
  {
    name: "data-repositories",
    description: "Valida Data Repository implementations",
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const { git } = danger;
    const files = git.created_files
      .concat(git.modified_files)
      .filter(
        (f: string) =>
          f.match(/\/data\/repositories\/[^/]+\.dart$/) && !f.endsWith("repositories.dart")
      );

    for (const file of files) {
      if (!file.match(/_repository\.dart$/)) {
        sendFail(
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
