/**
 * Detecta violações de Clean Architecture
 */
import { createPlugin,  getDanger, sendFail, getAllChangedFiles  } from '@types';

export default createPlugin(
  {
    name: 'clean-architecture',
    description: 'Detecta violações de Clean Architecture',
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const allFiles = getAllChangedFiles();
    
    for (const file of allFiles) {
      if (!file.endsWith('.dart')) continue;
      
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c: any) => c.content).join('\n');
        
        // Domain não pode importar Data ou Presentation
        if (file.includes('/domain/')) {
          if (fileText.match(/import.*\/data\//)) {
            sendFail(
              `## 🏛️ VIOLAÇÃO CLEAN ARCHITECTURE - DOMAIN → DATA

Domain Layer **não pode** importar Data Layer.

---

### ⚠️ Problema
Dependência invertida! Domain deve ser independente.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
import '../data/models/user_model.dart';

// ✅ CORRETO
import '../domain/entities/user_entity.dart';
\`\`\`

---

### 🚀 Objetivo
Manter **independência** da Domain Layer.`,
              file,
              1
            );
          }
          if (fileText.match(/import.*\/presentation\//)) {
            sendFail(
              `## 🏛️ VIOLAÇÃO CLEAN ARCHITECTURE - DOMAIN → PRESENTATION

Domain Layer **não pode** importar Presentation Layer.

---

### 🎯 AÇÃO NECESSÁRIA
Remova imports de arquivos da pasta /presentation/.`,
              file,
              1
            );
          }
        }
        
        // Data não pode importar Presentation
        if (file.includes('/data/')) {
          if (fileText.match(/import.*\/presentation\//)) {
            sendFail(
              `## 🏪 VIOLAÇÃO CLEAN ARCHITECTURE - DATA → PRESENTATION

Data Layer **não pode** importar Presentation Layer.

---

### ⚠️ Problema
Data deve ser independente de UI.

---

### 🎯 AÇÃO NECESSÁRIA
Remova imports de arquivos da pasta /presentation/.`,
              file,
              1
            );
          }
        }
        
        // Presentation não pode importar Data diretamente (deve usar Domain)
        if (file.includes('/presentation/') && file.match(/_viewmodel\.dart$/)) {
          if (fileText.match(/I\w*Repository/)) {
            sendFail(
              `## 🎨 VIOLAÇÃO - VIEWMODEL USA REPOSITORY

ViewModel deve usar **UseCases**, não Repositories.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
class UserViewModel {
  final IUserRepository repository;
}

// ✅ CORRETO
class UserViewModel {
  final IGetUserUseCase getUserUseCase;
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