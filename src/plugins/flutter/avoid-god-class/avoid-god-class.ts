/**
 * Avoid God Class Plugin
 * Detecta classes muito grandes que violam o princípio de responsabilidade única.
 * Verifica número de métodos públicos e total de linhas da classe.
 *
 * Thresholds:
 * - Mais de 300 linhas → warning (padrão)
 * - Mais de 600 linhas → warning (arquivos em presentation/)
 * - Mais de 15 métodos públicos → warning
 * - Exclui: classes geradas (.g.dart, .freezed.dart), enums, mixins, extensions
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

const MAX_CLASS_LINES = 300;
const MAX_CLASS_LINES_PRESENTATION = 600;
const MAX_PUBLIC_METHODS = 20;

function getMaxClassLines(filePath: string): number {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("/presentation/")) {
    return MAX_CLASS_LINES_PRESENTATION;
  }
  return MAX_CLASS_LINES;
}

interface ClassInfo {
  name: string;
  startLine: number;
  lineCount: number;
  publicMethods: string[];
}

function parseClasses(lines: string[]): ClassInfo[] {
  const classes: ClassInfo[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.match(/^\s*enum\s+/) || line.match(/^\s*mixin\s+/) || line.match(/^\s*extension\s+/)) {
      i++;
      continue;
    }

    const classMatch = line.match(
      /^\s*(?:abstract\s+)?(?:final\s+)?(?:base\s+)?(?:sealed\s+)?(?:interface\s+)?class\s+([A-Za-z_]\w*)/
    );

    if (classMatch) {
      const className = classMatch[1];
      const startLine = i;
      let braceDepth = 0;
      let foundOpen = false;
      const publicMethods: string[] = [];

      for (let j = i; j < lines.length; j++) {
        const cl = lines[j];

        for (const ch of cl) {
          if (ch === "{") {
            braceDepth++;
            foundOpen = true;
          }
          if (ch === "}") braceDepth--;
        }

        if (foundOpen && braceDepth === 1) {
          const methodMatch = cl.match(
            /^\s+(?:static\s+)?(?:Future<[^>]*>|Stream<[^>]*>|void|bool|int|double|String|List<[^>]*>|Map<[^>]*>|Set<[^>]*>|[\w<>,?\s]+?)\s+([a-z]\w*)\s*[(<]/
          );
          if (methodMatch && !methodMatch[1].startsWith("_") && !cl.includes("@override")) {
            publicMethods.push(methodMatch[1]);
          }
        }

        if (foundOpen && braceDepth <= 0) {
          classes.push({
            name: className,
            startLine: startLine + 1,
            lineCount: j - startLine + 1,
            publicMethods,
          });
          i = j;
          break;
        }
      }
    }

    i++;
  }

  return classes;
}

export default createPlugin(
  {
    name: "avoid-god-class",
    description: "Detecta classes muito grandes que violam o princípio de responsabilidade única",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        !f.endsWith("_test.dart") &&
        fs.existsSync(f)
    );

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const classes = parseClasses(lines);

      const maxLines = getMaxClassLines(file);

      for (const cls of classes) {
        if (cls.lineCount > maxLines) {
          sendFormattedFail({
            title: "CLASSE MUITO GRANDE",
            description: `A classe \`${cls.name}\` tem **${cls.lineCount} linhas** (máximo recomendado: ${maxLines}).`,
            problem: {
              wrong: `class ${cls.name} { // ${cls.lineCount} linhas }`,
              correct: `class ${cls.name}A { // responsabilidade A }\nclass ${cls.name}B { // responsabilidade B }`,
              wrongLabel: `${cls.lineCount} linhas — difícil de manter`,
              correctLabel: "Dividida por responsabilidade",
            },
            action: {
              text: "Considere extrair responsabilidades para classes menores:",
              code: `// Identifique grupos de métodos relacionados\n// e extraia para classes dedicadas.\n// Ex: métodos de validação → ${cls.name}Validator\n// Ex: métodos de formatação → ${cls.name}Formatter`,
            },
            objective:
              "Seguir o **Princípio de Responsabilidade Única** (SRP) — cada classe deve ter um único motivo para mudar.",
            reference: {
              text: "SOLID: Single Responsibility Principle",
              url: "https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html",
            },
            file,
            line: cls.startLine,
          });
        }

        if (cls.publicMethods.length > MAX_PUBLIC_METHODS) {
          sendFormattedFail({
            title: "CLASSE COM MUITOS MÉTODOS PÚBLICOS",
            description: `A classe \`${cls.name}\` tem **${cls.publicMethods.length} métodos públicos** (máximo recomendado: ${MAX_PUBLIC_METHODS}).`,
            problem: {
              wrong: `class ${cls.name} {\n${cls.publicMethods
                .slice(0, 5)
                .map((m) => `  void ${m}() { }`)
                .join("\n")}\n  // ... +${cls.publicMethods.length - 5} métodos\n}`,
              correct: `class ${cls.name} {\n  // Apenas métodos da responsabilidade principal\n}`,
              wrongLabel: `${cls.publicMethods.length} métodos públicos`,
              correctLabel: "Responsabilidade focada",
            },
            action: {
              text: "Agrupe métodos por responsabilidade e extraia para classes dedicadas.",
              code: `// Muitos métodos públicos indicam múltiplas responsabilidades.\n// Considere padrões como:\n// - Strategy para comportamentos variáveis\n// - Facade para simplificar interfaces complexas\n// - Delegation para distribuir responsabilidades`,
            },
            objective: "Manter classes **coesas** e com **baixo acoplamento**.",
            reference: {
              text: "SOLID: Single Responsibility Principle",
              url: "https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html",
            },
            file,
            line: cls.startLine,
          });
        }
      }
    }
  }
);
