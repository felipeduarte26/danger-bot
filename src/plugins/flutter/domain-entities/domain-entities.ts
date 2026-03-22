/**
 * Domain Entities Plugin
 * Valida arquivos dentro de /entities/:
 * - Nome do arquivo deve terminar com _entity.dart
 * - Classe deve ser final class
 * - Classe deve ter sufixo Entity
 * - Somente uma entity por arquivo
 */
import { createPlugin, getDanger, sendFail } from "@types";
import * as fs from "fs";

export default createPlugin(
  {
    name: "domain-entities",
    description: "Valida Domain Entities",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const files = [...git.created_files, ...git.modified_files].filter(
      (f: string) =>
        f.includes("/entities/") &&
        f.endsWith(".dart") &&
        !f.endsWith("entities.dart") &&
        fs.existsSync(f)
    );

    for (const file of files) {
      const fileName = file.split("/").pop() || "";

      if (!fileName.endsWith("_entity.dart")) {
        sendFail(
          `NOMENCLATURA DE ENTITY INCORRETA

Arquivo deve terminar com \`_entity.dart\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ ${fileName}
// ✅ ${fileName.replace(".dart", "")}_entity.dart
\`\`\``,
          file,
          1
        );
        continue;
      }

      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      const classes: { name: string; line: number; isFinal: boolean }[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("abstract")) continue;

        const classMatch = line.match(/(final\s+)?class\s+([A-Za-z_]\w*)/);
        if (classMatch) {
          classes.push({
            name: classMatch[2],
            line: i + 1,
            isFinal: !!classMatch[1],
          });
        }
      }

      if (classes.length === 0) continue;

      if (classes.length > 1) {
        sendFail(
          `MÚLTIPLAS ENTITIES EM UM ARQUIVO

Encontradas **${classes.length} classes**: ${classes.map((c) => `\`${c.name}\``).join(", ")}.

### 🎯 AÇÃO NECESSÁRIA

Cada Entity deve estar em seu próprio arquivo.

### 🚀 Objetivo

**Uma Entity por arquivo** — facilita navegação e manutenção.`,
          file,
          classes[1].line
        );
      }

      for (const cls of classes) {
        if (!cls.name.endsWith("Entity")) {
          sendFail(
            `ENTITY SEM SUFIXO

A classe \`${cls.name}\` deve terminar com \`Entity\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ class ${cls.name} { }
// ✅ final class ${cls.name}Entity { }
\`\`\``,
            file,
            cls.line
          );
        }

        if (!cls.isFinal) {
          sendFail(
            `ENTITY DEVE SER FINAL CLASS

A classe \`${cls.name}\` deve usar \`final class\` para prevenir herança indevida.

### Problema Identificado

Sem \`final\`, a classe pode ser estendida, quebrando princípios da Domain Layer.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ Sem final
class ${cls.name} {
  final String name;
}

// ✅ Com final
final class ${cls.name} {
  final String name;
  const ${cls.name}({required this.name});
}
\`\`\`

### 🚀 Objetivo

Garantir **imutabilidade** e design correto da Domain Layer.`,
            file,
            cls.line
          );
        }
      }
    }
  }
);
