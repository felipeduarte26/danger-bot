/**
 * Data Models Plugin
 * Valida arquivos dentro de /models/:
 * - Nome do arquivo deve terminar com _model.dart
 * - Classe deve ter sufixo Model
 * - Campos devem ser final (imutabilidade)
 * - Somente uma classe Model por arquivo
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

export default createPlugin(
  {
    name: "data-models",
    description: "Valida Data Models",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const files = [...git.created_files, ...git.modified_files].filter(
      (f: string) =>
        f.includes("/models/") &&
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith("models.dart") &&
        fs.existsSync(f)
    );

    for (const file of files) {
      const fileName = file.split("/").pop() || "";

      if (!fileName.endsWith("_model.dart")) {
        sendFormattedFail({
          title: "NOMENCLATURA DE MODEL INCORRETA",
          description: "Arquivo de Model deve terminar com `_model.dart`.",
          problem: {
            wrong: fileName,
            correct: `${fileName.replace(".dart", "")}_model.dart`,
          },
          action: {
            text: "Renomeie o arquivo:",
            code: `${fileName.replace(".dart", "")}_model.dart`,
          },
          objective: "Manter **consistência** na nomenclatura da camada Data.",
          file,
          line: 1,
        });
        continue;
      }

      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      const classes: { name: string; line: number }[] = [];
      let hasNonFinalField = false;
      let nonFinalFieldLine = 0;
      let nonFinalFieldName = "";
      let inBlockComment = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trimStart();

        // ── Ignorar comentários ──────────────────────────────
        if (inBlockComment) {
          if (trimmed.includes("*/")) {
            inBlockComment = false;
          }
          continue;
        }

        if (trimmed.startsWith("/*")) {
          inBlockComment = true;
          if (trimmed.includes("*/")) {
            inBlockComment = false;
          }
          continue;
        }

        if (trimmed.startsWith("//") || trimmed.startsWith("///")) {
          continue;
        }

        // ── Ignorar strings que contêm "class" ──────────────
        if (
          !trimmed.match(
            /^\s*(?:abstract\s+|final\s+|sealed\s+|base\s+|interface\s+|mixin\s+)*class\s/
          )
        ) {
          // Se a linha não começa com uma declaração de classe real, pula detecção de classe
        } else {
          // ── Detectar declarações de classe reais ───────────
          // Suporta modificadores Dart 3: final, sealed, base, interface, mixin
          const classMatch = trimmed.match(
            /^(?:abstract\s+|final\s+|sealed\s+|base\s+|interface\s+|mixin\s+)*class\s+([A-Za-z_]\w*)/
          );
          if (classMatch && !trimmed.startsWith("abstract")) {
            classes.push({ name: classMatch[1], line: i + 1 });
          }
        }

        // ── Detectar campos não-final ────────────────────────
        if (classes.length > 0 && !hasNonFinalField) {
          const fieldMatch = line.match(
            /^\s+(?!final\s|static\s|const\s|late\s|@override)((?:String|int|double|bool|num|List|Map|Set|DateTime|[A-Z]\w*)[?<\s][\w<>,?\s]*)\s+(\w+)\s*;/
          );
          if (fieldMatch) {
            hasNonFinalField = true;
            nonFinalFieldLine = i + 1;
            nonFinalFieldName = fieldMatch[2];
          }
        }
      }

      if (classes.length > 1) {
        sendFormattedFail({
          title: "MÚLTIPLAS CLASSES EM UM ARQUIVO MODEL",
          description: `Encontradas **${classes.length} classes**: ${classes.map((c) => `\`${c.name}\``).join(", ")}.`,
          problem: {
            wrong: classes.map((c) => `class ${c.name} { }`).join("\n"),
            correct: classes
              .map((c) => `// ${toSnakeCase(c.name)}.dart\nclass ${c.name} { }`)
              .join("\n\n"),
            wrongLabel: `${classes.length} classes no mesmo arquivo`,
            correctLabel: "Uma classe por arquivo",
          },
          action: {
            text: "Separe cada classe em um arquivo individual:",
            code: classes.map((c) => `${toSnakeCase(c.name)}.dart → class ${c.name}`).join("\n"),
          },
          objective: "**Uma classe por arquivo** — facilita navegação e reduz conflitos de merge.",
          file,
          line: classes[1].line,
        });
      }

      for (const cls of classes) {
        if (!cls.name.endsWith("Model")) {
          sendFormattedFail({
            title: "CLASSE DE MODEL SEM SUFIXO",
            description: `A classe \`${cls.name}\` deve terminar com \`Model\`.`,
            problem: {
              wrong: `class ${cls.name} { }`,
              correct: `class ${cls.name}Model { }`,
            },
            action: {
              text: "Renomeie a classe:",
              code: `class ${cls.name}Model { }`,
            },
            objective: "Manter **consistência** na nomenclatura de Models.",
            file,
            line: cls.line,
          });
        }
      }

      if (hasNonFinalField) {
        sendFormattedFail({
          title: "MODEL COM CAMPO MUTÁVEL",
          description: `Campo \`${nonFinalFieldName}\` não é \`final\`. Models devem ser **imutáveis**.`,
          problem: {
            wrong: `String ${nonFinalFieldName};`,
            correct: `final String ${nonFinalFieldName};`,
            wrongLabel: "Campo mutável",
            correctLabel: "Campo imutável (final)",
          },
          action: {
            text: "Adicione `final` ao campo:",
            code: `final String ${nonFinalFieldName};`,
          },
          objective: "Models imutáveis são **thread-safe** e mais previsíveis.",
          file,
          line: nonFinalFieldLine,
        });
      }
    }
  }
);

function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}
