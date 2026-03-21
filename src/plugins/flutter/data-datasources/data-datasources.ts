/**
 * Valida Data Sources
 */
import { createPlugin, getDanger, sendFail } from "@types";

export default createPlugin(
  {
    name: "data-datasources",
    description: "Valida Data Sources",
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const { git } = danger;
    const files = git.created_files
      .concat(git.modified_files)
      .filter(
        (f: string) =>
          f.match(/\/data\/datasources\/[^/]+\.dart$/) && !f.endsWith("datasources.dart")
      );

    for (const file of files) {
      if (!file.match(/_datasource\.dart$/)) {
        sendFail(
          `## 🗄️ NOMENCLATURA DE DATASOURCE INCORRETA

Arquivo deve terminar com \`_datasource.dart\`.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ user_api.dart
// ✅ user_datasource.dart
\`\`\``,
          file,
          1
        );
      }
    }
  }
);
