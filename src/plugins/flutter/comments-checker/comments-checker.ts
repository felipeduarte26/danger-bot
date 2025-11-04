/**
 * Verifica uso correto de comentários
 */
import { createPlugin,  getDanger, sendFail, getDartFiles  } from '@types';

export default createPlugin(
  {
    name: 'comments-checker',
    description: 'Verifica uso correto de comentários',
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const dartFiles = getDartFiles();
    
    for (const file of dartFiles) {
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c: any) => c.content).join('\n');
        
        const lines = fileText.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Detectar comentário // (mas não ///)
          if (line.match(/^\/\/(?!\/)/)) {
            sendFail(
              `## 💬 COMENTÁRIO // PROIBIDO

Comentário \`//\` encontrado na linha ${i + 1}.

---

### ⚠️ Problema Identificado

Comentários \`//\` não geram documentação.

---

### 🎯 AÇÃO NECESSÁRIA

**Use comentários de documentação:**

\`\`\`dart
// ❌ INCORRETO
// Esta função calcula o total
double calculateTotal(List<double> values) {
  return values.reduce((a, b) => a + b);
}

// ✅ CORRETO
/// Calcula o total somando todos os valores da lista.
///
/// Retorna a soma de todos os elementos em [values].
/// Se a lista estiver vazia, retorna 0.0.
///
/// Exemplo:
/// \`\`\`dart
/// final total = calculateTotal([1.0, 2.0, 3.0]); // 6.0
/// \`\`\`
double calculateTotal(List<double> values) {
  if (values.isEmpty) return 0.0;
  return values.reduce((a, b) => a + b);
}
\`\`\`

**Benefícios de \`///\`:**
- ✅ Gera documentação automática
- ✅ Aparece no IDE (hover/autocomplete)
- ✅ Pode incluir exemplos e links
- ✅ Suporta Markdown

---

### 🚀 Objetivo

Gerar **documentação automática** com DartDoc.

> **Regra:** Sempre use \`///\` para documentar código público!`,
              file,
              i + 1
            );
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    }
);