/**
 * Domain Entities Plugin
 * Valida arquivos dentro de /entities/:
 * - Nome do arquivo deve terminar com _entity.dart
 * - Classe deve ser final class
 * - Classe deve ter sufixo Entity
 * - Somente uma entity por arquivo
 * - Detecta subpastas incorretas (ex: extensions/ dentro de entities/)
 * - Valida enums: devem estar em /enums/, sufixo _enum.dart e Enum na classe
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

const NON_ENTITY_SUBFOLDERS = new Set(["extensions", "errors", "mixins", "typedefs"]);

const VALID_ENUM_PARENTS = new Set(["enums"]);

function getSubfolderAfterEntities(filePath: string): string | null {
  const parts = filePath.split("/");
  const entitiesIdx = parts.lastIndexOf("entities");
  if (entitiesIdx === -1 || entitiesIdx >= parts.length - 2) return null;
  return parts[entitiesIdx + 1];
}

function isEnumFile(content: string): boolean {
  return /^\s*enum\s+[A-Za-z_]\w*/m.test(content);
}

function parseEnums(content: string): { name: string; line: number }[] {
  const lines = content.split("\n");
  const enums: { name: string; line: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s*enum\s+([A-Za-z_]\w*)/);
    if (match) {
      enums.push({ name: match[1], line: i + 1 });
    }
  }
  return enums;
}

function validateEnum(file: string, content: string): boolean {
  const fileName = file.split("/").pop() || "";
  const enums = parseEnums(content);

  if (enums.length === 0) return false;

  const subfolder = getSubfolderAfterEntities(file);
  const isInEnumsFolder = subfolder === "enums";

  if (!isInEnumsFolder) {
    sendFormattedFail({
      title: "ENUM FORA DA PASTA ENUMS",
      description: `Arquivo enum \`${fileName}\` está solto em \`entities/\`. Deve ficar em \`entities/enums/\`.`,
      problem: {
        wrong: file.split("/").slice(-3).join("/"),
        correct: file.split("/").slice(-3, -1).join("/") + "/enums/" + fileName,
        wrongLabel: "Solto em entities/",
        correctLabel: "Dentro de entities/enums/",
      },
      action: {
        text: "Mova o arquivo para a subpasta `enums/`:",
        code: `entities/\n  ├── enums/\n  │   └── ${fileName}   ← aqui\n  └── ...`,
        language: "text",
      },
      objective: "Manter enums **organizados** em sua subpasta dedicada.",
      file,
      line: 1,
    });
  }

  if (!fileName.endsWith("_enum.dart") && !fileName.endsWith("enums.dart")) {
    sendFormattedFail({
      title: "NOMENCLATURA DE ENUM INCORRETA",
      description: `Arquivo deve terminar com \`_enum.dart\`.`,
      problem: {
        wrong: fileName,
        correct: `${fileName.replace(".dart", "")}_enum.dart`,
        wrongLabel: "Nome atual",
        correctLabel: "Nome correto",
      },
      action: {
        code: `// Renomeie o arquivo:\n// ${fileName} → ${fileName.replace(".dart", "")}_enum.dart`,
      },
      objective: "Manter **consistência** na nomenclatura de enums.",
      file,
      line: 1,
    });
  }

  for (const e of enums) {
    if (!e.name.endsWith("Enum")) {
      sendFormattedFail({
        title: "ENUM SEM SUFIXO",
        description: `O enum \`${e.name}\` deve terminar com \`Enum\`.`,
        problem: {
          wrong: `enum ${e.name} { }`,
          correct: `enum ${e.name}Enum { }`,
        },
        action: {
          code: `enum ${e.name}Enum { }`,
        },
        objective: "Manter **consistência** na nomenclatura de enums.",
        file,
        line: e.line,
      });
    }
  }

  return true;
}

export default createPlugin(
  {
    name: "domain-entities",
    description: "Valida Domain Entities e Enums",
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

      const subfolder = getSubfolderAfterEntities(file);

      if (subfolder && NON_ENTITY_SUBFOLDERS.has(subfolder)) {
        const parts = file.split("/");
        const entitiesIdx = parts.lastIndexOf("entities");
        const domainPath = parts.slice(0, entitiesIdx).join("/");
        const correctPath = `${domainPath}/${subfolder}/${parts.slice(entitiesIdx + 2).join("/")}`;

        sendFormattedFail({
          title: `${subfolder.toUpperCase()} DENTRO DE ENTITIES`,
          description: `\`${subfolder}/\` não deve ficar dentro de \`entities/\`. Deve ficar diretamente em \`domain/\`.`,
          problem: {
            wrong: file.split("/").slice(-4).join("/"),
            correct: correctPath.split("/").slice(-3).join("/"),
            wrongLabel: `Dentro de entities/${subfolder}/`,
            correctLabel: `Diretamente em domain/${subfolder}/`,
          },
          action: {
            text: `Mova a pasta \`${subfolder}/\` para \`domain/\`:`,
            code: `domain/\n  ├── entities/\n  ├── ${subfolder}/   ← aqui\n  ├── failures/\n  └── usecases/`,
            language: "text",
          },
          objective:
            "Manter a **estrutura Clean Architecture** organizada — cada conceito em sua pasta.",
          reference: {
            text: "Clean Architecture — Uncle Bob",
            url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
          },
          file,
          line: 1,
        });
        continue;
      }

      if (subfolder && VALID_ENUM_PARENTS.has(subfolder)) {
        const content = fs.readFileSync(file, "utf-8");
        validateEnum(file, content);
        continue;
      }

      const content = fs.readFileSync(file, "utf-8");

      if (isEnumFile(content)) {
        validateEnum(file, content);
        continue;
      }

      if (!fileName.endsWith("_entity.dart")) {
        sendFormattedFail({
          title: "NOMENCLATURA DE ENTITY INCORRETA",
          description: "Arquivo deve terminar com `_entity.dart`.",
          problem: {
            wrong: fileName,
            correct: `${fileName.replace(".dart", "")}_entity.dart`,
            wrongLabel: "Nome atual",
            correctLabel: "Nome correto",
          },
          action: {
            code: `// Renomeie o arquivo:\n// ${fileName} → ${fileName.replace(".dart", "")}_entity.dart`,
          },
          objective: "Manter **consistência** na nomenclatura da Domain Layer.",
          file,
          line: 1,
        });
        continue;
      }

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
        sendFormattedFail({
          title: "MÚLTIPLAS ENTITIES EM UM ARQUIVO",
          description: `Encontradas **${classes.length} classes**: ${classes.map((c) => `\`${c.name}\``).join(", ")}.`,
          problem: {
            wrong: classes.map((c) => `class ${c.name} { ... }`).join("\n"),
            correct: classes
              .map(
                (c) =>
                  `// ${c.name
                    .replace(/([A-Z])/g, "_$1")
                    .toLowerCase()
                    .slice(1)}_entity.dart\nfinal class ${c.name} { ... }`
              )
              .join("\n\n"),
            wrongLabel: `${classes.length} classes no mesmo arquivo`,
            correctLabel: "Uma classe por arquivo",
          },
          action: {
            code: classes
              .map(
                (c) =>
                  `// → ${c.name
                    .replace(/([A-Z])/g, "_$1")
                    .toLowerCase()
                    .slice(1)}.dart\nfinal class ${c.name} { }`
              )
              .join("\n"),
          },
          objective: "**Uma Entity por arquivo** — facilita navegação e manutenção.",
          file,
          line: classes[1].line,
        });
      }

      for (const cls of classes) {
        if (!cls.name.endsWith("Entity")) {
          sendFormattedFail({
            title: "ENTITY SEM SUFIXO",
            description: `A classe \`${cls.name}\` deve terminar com \`Entity\`.`,
            problem: {
              wrong: `class ${cls.name} { }`,
              correct: `final class ${cls.name}Entity { }`,
            },
            action: {
              code: `final class ${cls.name}Entity { }`,
            },
            objective: "Manter **consistência** na nomenclatura de Entities.",
            file,
            line: cls.line,
          });
        }

        if (!cls.isFinal) {
          sendFormattedFail({
            title: "ENTITY DEVE SER FINAL CLASS",
            description: `A classe \`${cls.name}\` deve usar \`final class\` para prevenir herança indevida.`,
            problem: {
              wrong: `class ${cls.name} {\n  final String name;\n}`,
              correct: `final class ${cls.name} {\n  final String name;\n  const ${cls.name}({required this.name});\n}`,
              wrongLabel: "Sem final",
              correctLabel: "Com final",
            },
            action: {
              code: `final class ${cls.name} {\n  // ...\n}`,
            },
            objective: "Garantir **imutabilidade** e design correto da Domain Layer.",
            file,
            line: cls.line,
          });
        }
      }
    }
  }
);
