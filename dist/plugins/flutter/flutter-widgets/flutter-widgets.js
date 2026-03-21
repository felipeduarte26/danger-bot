"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Verifica estrutura de widgets Flutter
 */
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "flutter-widgets",
    description: "Verifica estrutura de widgets Flutter",
    enabled: true,
  },
  async () => {
    const danger = (0, _types_1.getDanger)();
    const { git } = danger;
    const dartFiles = git.modified_files
      .concat(git.created_files)
      .filter((f) => f.endsWith(".dart") && f.match(/\/presentation\//));
    for (const file of dartFiles) {
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c) => c.content).join("\n");
        // Verificar ordem de funções
        if (fileText.match(/class\s+\w+\s+extends\s+(StatefulWidget|StatelessWidget|State)</)) {
          const lines = fileText.split("\n");
          let lastOverrideLine = -1;
          let firstNonOverrideLine = -1;
          lines.forEach((line, idx) => {
            if (line.trim() === "@override") lastOverrideLine = idx;
            if (
              line.match(/^\s*(?:void|Future|Widget)\s+\w+\s*\(/) &&
              !line.includes("@override")
            ) {
              if (firstNonOverrideLine === -1) firstNonOverrideLine = idx;
            }
          });
          if (firstNonOverrideLine > 0 && lastOverrideLine > firstNonOverrideLine) {
            (0, _types_1.sendFail)(
              `## 📱 ORDEM DE FUNÇÕES INCORRETA

Funções @override devem vir primeiro.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ✅ CORRETO
class MyWidget extends StatefulWidget {
  @override
  void initState() { }
  
  @override
  Widget build(BuildContext context) { }
  
  void _myFunction() { }  // Depois dos @override
}
\`\`\``,
              file,
              1
            );
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  }
);
