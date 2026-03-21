"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _types_1 = require("../../../types");
/**
 * 📁 File Naming Plugin
 * Verifica se os arquivos .dart seguem a convenção snake_case
 */
exports.default = (0, _types_1.createPlugin)(
  {
    name: "file-naming",
    description: "Verifica nomenclatura de arquivos Dart (snake_case)",
    enabled: true,
  },
  async () => {
    const danger = (0, _types_1.getDanger)();
    const { git } = danger;
    const dartFilesAdded = git.created_files.filter(
      (file) => file.startsWith("lib/") && file.endsWith(".dart")
    );
    for (const file of dartFilesAdded) {
      const fileName = file.split("/").pop() || "";
      const validPattern = /^[a-z0-9_]+\.dart$/;
      if (!validPattern.test(fileName)) {
        const suggestion = fileName
          .replace(/([A-Z])/g, "_$1")
          .replace(/[-\s]+/g, "_")
          .toLowerCase()
          .replace(/^_/, "")
          .replace(/_+/g, "_");
        await (0, _types_1.sendFail)(
          `## 📁 NOMENCLATURA DE ARQUIVO INCORRETA

O arquivo \`${file}\` **não segue** a convenção de nomenclatura do Dart.

---

### ⚠️ Problema Identificado

Nomenclatura inconsistente dificulta:
- 🔍 Navegação no projeto
- 🤝 Colaboração entre desenvolvedores  
- 📚 Manutenibilidade do código
- ⚡ Ferramentas de busca e refatoração

**📍 Arquivo problemático:** \`${file}\`
**📍 Sugestão:** \`${suggestion}\`

---

### 🎯 AÇÃO NECESSÁRIA

**Regras da convenção snake_case:**

| ✅ Permitido | ❌ Não Permitido |
|--------------|------------------|
| Letras minúsculas (a-z) | Letras maiúsculas (A-Z) |
| Números (0-9) | Espaços em branco |
| Underscores (_) | Hífens (-) |
| | camelCase |
| | PascalCase |

---

### 💡 Exemplos de Correção

\`\`\`dart
// ❌ INCORRETO
lib/
  HomePage.dart              // PascalCase
  user-profile.dart          // kebab-case
  MyBigComponent.dart        // PascalCase
  user Profile.dart          // Espaços
  userData.dart              // camelCase

// ✅ CORRETO
lib/
  home_page.dart            // snake_case ✓
  user_profile.dart         // snake_case ✓
  my_big_component.dart     // snake_case ✓
  user_data.dart            // snake_case ✓
\`\`\`

---

### 🚀 Objetivo

Manter **consistência** com padrões oficiais do Dart/Flutter e facilitar colaboração.

> **Referência:** [Effective Dart: Style Guide](https://dart.dev/guides/language/effective-dart/style)`,
          file,
          1
        );
      }
    }
  }
);
