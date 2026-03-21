/**
 * Verifica estrutura de widgets Flutter
 */
import { createPlugin, getDanger, sendFail } from "@types";

export default createPlugin(
  {
    name: "flutter-widgets",
    description: "Verifica estrutura de widgets Flutter",
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const { git } = danger;
    const dartFiles = git.modified_files
      .concat(git.created_files)
      .filter((f: string) => f.endsWith(".dart") && f.match(/\/presentation\//));

    for (const file of dartFiles) {
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c: any) => c.content).join("\n");

        // Verificar ordem de funções
        if (fileText.match(/class\s+\w+\s+extends\s+(StatefulWidget|StatelessWidget|State)</)) {
          const lines = fileText.split("\n");
          let lastOverrideLine = -1;
          let firstNonOverrideLine = -1;

          lines.forEach((line: string, idx: number) => {
            if (line.trim() === "@override") lastOverrideLine = idx;
            if (
              line.match(/^\s*(?:void|Future|Widget)\s+\w+\s*\(/) &&
              !line.includes("@override")
            ) {
              if (firstNonOverrideLine === -1) firstNonOverrideLine = idx;
            }
          });

          if (firstNonOverrideLine > 0 && lastOverrideLine > firstNonOverrideLine) {
            sendFail(
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
