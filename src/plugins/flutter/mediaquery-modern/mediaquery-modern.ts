/**
 * Força uso de APIs modernas do MediaQuery
 */
import { createPlugin, getDanger, sendFail, getDartFiles } from "@types";

export default createPlugin(
  {
    name: "mediaquery-modern",
    description: "Força uso de APIs modernas do MediaQuery",
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const dartFiles = getDartFiles();

    for (const file of dartFiles) {
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c: any) => c.content).join("\n");

        // Detectar MediaQuery.of(context).size DEPRECATED
        if (fileText.match(/MediaQuery\.of\(context\)\.size/)) {
          sendFail(
            `## 📱 MEDIAQUERY DEPRECATED

Uso de \`MediaQuery.of(context).size\` **deprecated**.

---

### ⚠️ Problema Identificado

API antiga causa:
- 🐛 Rebuilds desnecessários
- 📉 Performance reduzida
- ⚠️ Avisos do Flutter

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ DEPRECATED (Flutter 3.10+)
final size = MediaQuery.of(context).size;
final width = MediaQuery.of(context).size.width;
final padding = MediaQuery.of(context).padding;

// ✅ CORRETO (API Moderna)
final size = MediaQuery.sizeOf(context);
final width = MediaQuery.sizeOf(context).width;
final padding = MediaQuery.paddingOf(context);
\`\`\`

**APIs modernas disponíveis:**
- \`MediaQuery.sizeOf(context)\` - Tamanho da tela
- \`MediaQuery.paddingOf(context)\` - Padding (safe area)
- \`MediaQuery.viewInsetsOf(context)\` - View insets (keyboard)
- \`MediaQuery.orientationOf(context)\` - Orientação

**Benefícios:**
- ✅ Rebuilds mais eficientes (só quando necessário)
- ✅ Melhor performance
- ✅ API mais clara e específica

---

### 🚀 Objetivo

Usar **APIs modernas** do Flutter para melhor **performance**.

> **Migração:** Substitua \`MediaQuery.of(context)\` pelas APIs específicas!`,
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
