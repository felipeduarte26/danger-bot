"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Valida Data Sources
 */
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)({
    name: 'data-datasources',
    description: 'Valida Data Sources',
    enabled: true,
}, async () => {
    const danger = (0, _types_1.getDanger)();
    const { git } = danger;
    const files = git.created_files
        .concat(git.modified_files)
        .filter((f) => f.match(/\/data\/datasources\/[^/]+\.dart$/) && !f.endsWith('datasources.dart'));
    for (const file of files) {
        if (!file.match(/_datasource\.dart$/)) {
            (0, _types_1.sendFail)(`## 🗄️ NOMENCLATURA DE DATASOURCE INCORRETA

Arquivo deve terminar com \`_datasource.dart\`.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ user_api.dart
// ✅ user_datasource.dart
\`\`\``, file, 1);
        }
    }
});
