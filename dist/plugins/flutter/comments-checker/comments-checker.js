"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Verifica uso correto de comentários
 */
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "comments-checker",
    description: "Verifica uso correto de comentários",
    enabled: true,
  },
  async () => {
    const danger = (0, _types_1.getDanger)();
    const dartFiles = await (0, _types_1.getDartFiles)();
    for (const file of dartFiles) {
      try {
        const diff = await danger.git.structuredDiffForFile(file);
        if (!diff) continue;
        for (const chunk of diff.chunks) {
          const changes = chunk.changes ?? [];
          for (const change of changes) {
            if (change.type !== "add") continue;
            const line = change.content.replace(/^\+/, "").trim();
            if (!line.match(/^\/\/(?!\/)/)) continue;
            const lineNum = change.ln ?? change.ln2 ?? 0;
            (0, _types_1.sendFail)(
              `## 💬 COMENTÁRIO // PROIBIDO

Comentário \`//\` encontrado. Comentários \`//\` não geram documentação.

---

### ⚠️ Problema Identificado

\`\`\`dart
// ❌ ${line}
\`\`\`

---

### 🎯 AÇÃO NECESSÁRIA

Use comentários de documentação \`///\` ao invés de \`//\`:

\`\`\`dart
// ✅ CORRETO
/// ${line.replace(/^\/\/\s*/, "")}
\`\`\`

**Benefícios de \`///\`:**
- ✅ Gera documentação automática (DartDoc)
- ✅ Aparece no IDE (hover/autocomplete)
- ✅ Suporta Markdown

> **Regra:** Sempre use \`///\` para documentar código público!`,
              file,
              lineNum
            );
          }
        }
      } catch {
        // Ignore
      }
    }
  }
);
