/**
 * Valida Data Models
 */
import { createPlugin,  getDanger, sendFail  } from '@types';

export default createPlugin(
  {
    name: 'data-models',
    description: 'Valida Data Models',
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const { git } = danger;
    const files = git.created_files
      .concat(git.modified_files)
      .filter((f: string) => f.match(/\/data\/models\/[^/]+\.dart$/) && !f.endsWith('models.dart'));
    
    for (const file of files) {
      if (!file.match(/_model\.dart$/)) {
        sendFail(
          `## 📦 NOMENCLATURA DE MODEL INCORRETA

Arquivo deve terminar com \`_model.dart\`.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ user.dart
// ✅ user_model.dart
\`\`\``,
          file,
          1
        );
      }
    }
    }
);