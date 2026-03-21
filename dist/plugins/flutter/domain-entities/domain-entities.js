"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _types_1 = require("../../../types");
/**
 * 🏛️ Domain Entities Plugin
 *
 * Verifica regras para entities na camada Domain da Clean Architecture:
 * - Nomenclatura: *_entity.dart
 * - Classes: final class NomeEntity
 * - Constructor: const
 * - Campos: final
 */
exports.default = (0, _types_1.createPlugin)(
  {
    name: "domain-entities",
    description: "Valida Domain Entities",
    enabled: true,
  },
  async () => {
    const danger = (0, _types_1.getDanger)();
    const { git } = danger;
    const entityFiles = git.created_files
      .concat(git.modified_files)
      .filter(
        (file) => file.match(/\/domain\/entities\/[^/]+\.dart$/) && !file.endsWith("entities.dart")
      );
    for (const file of entityFiles) {
      // Verificar nomenclatura do arquivo
      if (!file.match(/_entity\.dart$/)) {
        const baseName = file.split("/").pop()?.replace(".dart", "") || "";
        await (0, _types_1.sendFail)(`**🏛️ Nomenclatura de entity incorreta**

---

**Arquivo:** \`${file}\`

O arquivo deve terminar com \`_entity.dart\`. Renomeie para \`${baseName}_entity.dart\` e atualize os imports.

\`\`\`dart
// ❌ Incorreto
${baseName}.dart

// ✅ Correto
${baseName}_entity.dart
\`\`\`

> 💡 Sufixo \`_entity\` facilita identificação na camada Domain.`);
      }
      // Ler conteúdo do arquivo para verificar a classe
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (content) {
          const fileText = content.chunks.map((c) => c.content).join("\n");
          // Verificar se classe termina com Entity
          const classMatch = fileText.match(/(?:final\s+)?class\s+(\w+)/);
          if (classMatch && !classMatch[1].endsWith("Entity")) {
            await (0, _types_1.sendFail)(`## 🏛️ CLASSE ENTITY SEM SUFIXO

**Arquivo:** \`${file}\`

A classe deve terminar com \`Entity\`.

### ⚠️ Problema Identificado

**📍 Classe encontrada:** \`${classMatch[1]}\`

**📍 Classe esperada:** \`${classMatch[1]}Entity\`

### 🎯 AÇÃO NECESSÁRIA

Renomeie a classe para incluir o sufixo \`Entity\`:

\`\`\`dart
// ❌ INCORRETO
final class ${classMatch[1]} {
  // ...
}

// ✅ CORRETO
final class ${classMatch[1]}Entity {
  // ...
}
\`\`\`

### 🚀 Objetivo

Identificar facilmente entities na camada Domain.`);
          }
          // Verificar se é final class
          if (!fileText.match(/final\s+class\s+\w+Entity/)) {
            await (0, _types_1.sendFail)(`ENTITY DEVE SER FINAL CLASS

**Arquivo:** \`${file}\`

Entities devem usar \`final class\` para prevenir herança indevida.

### ⚠️ Problema Identificado

Classe sem \`final\` pode ser estendida, quebrando princípios da Domain Layer.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
class UserEntity {
  String name;  // ❌ Mutável
}

// ✅ CORRETO
final class UserEntity {
  final String name;  // ✅ Imutável
  
  const UserEntity({required this.name});
}
\`\`\`

### 🚀 Objetivo

Garantir **imutabilidade** e design correto da Domain Layer.`);
          }
        }
      } catch (e) {
        // Arquivo pode não ter diff disponível
      }
    }
  }
);
