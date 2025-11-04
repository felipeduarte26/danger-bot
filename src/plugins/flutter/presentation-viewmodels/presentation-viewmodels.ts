/**
 * Valida Presentation ViewModels
 */
import { createPlugin,  getDanger, sendFail  } from '@types';

export default createPlugin(
  {
    name: 'presentation-viewmodels',
    description: 'Valida Presentation ViewModels',
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const { git } = danger;
    const files = git.created_files
      .concat(git.modified_files)
      .filter((f: string) => f.match(/_viewmodel\.dart$/));
    
    for (const file of files) {
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c: any) => c.content).join('\n');
        
        // Verificar se ViewModel usa Repository diretamente
        if (fileText.match(/I\w*Repository\w*\s+\w+/)) {
          sendFail(
            `## 🎮 VIEWMODEL NÃO PODE USAR REPOSITORY DIRETAMENTE

ViewModel deve depender de **UseCases**, não Repositories.

---

### ⚠️ Problema
Violação da Clean Architecture.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
final class ProductViewModel {
  final IProductRepository repository;
}

// ✅ CORRETO
final class ProductViewModel {
  final IGetProductsUseCase getProductsUseCase;
}
\`\`\`

---

### 🚀 Objetivo
Manter **separação de responsabilidades**.`,
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