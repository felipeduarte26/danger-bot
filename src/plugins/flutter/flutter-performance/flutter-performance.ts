/**
 * Detecta problemas de performance no build()
 */
import { createPlugin,  getDanger, sendFail  } from '@types';

export default createPlugin(
  {
    name: 'flutter-performance',
    description: 'Detecta problemas de performance no build()',
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const { git } = danger;
    const dartFiles = git.modified_files
      .concat(git.created_files)
      .filter((f: string) => f.endsWith('.dart'));
    
    for (const file of dartFiles) {
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c: any) => c.content).join('\n');
        
        // Detectar operações custosas no build()
        const buildMatch = fileText.match(/Widget\s+build\s*\([^)]*\)\s*\{([^}]+(?:\{[^}]+\})*[^}]+)\}/);
        if (buildMatch) {
          const buildContent = buildMatch[1];
          if (buildContent.match(/\.sort\(|\.where\(|\.map\(|for\s*\(|while\s*\(/)) {
            sendFail(
              `## ⚡ OPERAÇÃO CUSTOSA NO BUILD()

Operações custosas detectadas no método build().

---

### ⚠️ Problema
Build() é executado a cada rebuild.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
Widget build(BuildContext context) {
  final sorted = items.sort();
  return ListView(...);
}

// ✅ CORRETO
List<Item> get sortedItems => _cachedSort ??= items..sort();

Widget build(BuildContext context) {
  return ListView(children: sortedItems);
}
\`\`\`

---

### 🚀 Objetivo
Manter **60fps** com builds rápidos.`,
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