/**
 * Column/Row Spacing Plugin
 * Sugere uso da propriedade `spacing` (Flutter 3.27+) em Column e Row
 * quando SizedBox de tamanho uniforme são usados entre os filhos.
 *
 * Só reporta quando:
 * - Todos os SizedBox entre filhos têm o mesmo valor numérico literal
 * - O padrão é consistente: filho, SizedBox, filho, SizedBox, ..., filho
 * - Não há SizedBox com valores variáveis ou expressões
 * - O valor é um número literal (não uma variável ou constante)
 *
 * Abordagem conservadora: na dúvida, não reporta.
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

interface ChildrenBlock {
  widgetType: "Column" | "Row";
  widgetLine: number;
  children: ChildEntry[];
}

interface ChildEntry {
  text: string;
  line: number;
}

const SIZED_BOX_HEIGHT_RE = /^\s*(?:const\s+)?SizedBox\(\s*height:\s*(\d+(?:\.\d+)?)\s*,?\s*\)/s;
const SIZED_BOX_WIDTH_RE = /^\s*(?:const\s+)?SizedBox\(\s*width:\s*(\d+(?:\.\d+)?)\s*,?\s*\)/s;

function findChildrenBlocks(content: string, lines: string[]): ChildrenBlock[] {
  const blocks: ChildrenBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    const widgetMatch = trimmed.match(/^(?:const\s+)?(Column|Row)\s*\(/);
    if (!widgetMatch) continue;

    const widgetType = widgetMatch[1] as "Column" | "Row";
    const widgetLine = i + 1;

    const childrenIdx = findChildrenStart(lines, i);
    if (childrenIdx === -1) continue;

    const children = extractChildren(lines, childrenIdx);
    if (children === null) continue;

    blocks.push({ widgetType, widgetLine, children });
  }

  return blocks;
}

function findChildrenStart(lines: string[], fromLine: number): number {
  let depth = 0;
  for (let i = fromLine; i < Math.min(fromLine + 20, lines.length); i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
    }

    if (lines[i].includes("children:") && lines[i].includes("[")) {
      return i;
    }
    if (i > fromLine && lines[i].trim().startsWith("children:")) {
      return i;
    }

    if (depth <= 0) break;
  }
  return -1;
}

/**
 * Extrai os filhos de um `children: [...]` respeitando profundidade de
 * parênteses, colchetes e chaves. Cada "filho" é um widget de nível 0.
 * Retorna null se a estrutura for ambígua ou muito complexa.
 */
function extractChildren(lines: string[], startLine: number): ChildEntry[] | null {
  let bracketStart = -1;
  for (let c = 0; c < lines[startLine].length; c++) {
    if (lines[startLine][c] === "[") {
      bracketStart = c;
      break;
    }
  }
  if (bracketStart === -1) return null;

  const children: ChildEntry[] = [];
  let current = "";
  let currentStartLine = startLine;
  let depth = 0;
  let started = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const startCol = i === startLine ? bracketStart : 0;

    for (let c = startCol; c < line.length; c++) {
      const ch = line[c];

      if (ch === "[" || ch === "(" || ch === "{") {
        if (!started && ch === "[") {
          started = true;
          continue;
        }
        depth++;
      }
      if (ch === "]" || ch === ")" || ch === "}") {
        if (ch === "]" && depth === 0 && started) {
          const trimmed = current.trim();
          if (trimmed) {
            children.push({ text: trimmed, line: currentStartLine + 1 });
          }
          return children;
        }
        depth--;
      }

      if (!started) continue;

      if (ch === "," && depth === 0) {
        const trimmed = current.trim();
        if (trimmed) {
          children.push({ text: trimmed, line: currentStartLine + 1 });
        }
        current = "";
        currentStartLine = i;
        continue;
      }

      current += ch;
    }

    current += "\n";
  }

  return null;
}

function analyzeBlock(block: ChildrenBlock): { spacingValue: number; count: number } | null {
  const { children, widgetType } = block;

  if (children.length < 3) return null;

  const sizedBoxRe = widgetType === "Column" ? SIZED_BOX_HEIGHT_RE : SIZED_BOX_WIDTH_RE;
  const sizedBoxValues: number[] = [];
  const sizedBoxIndices: number[] = [];

  for (let i = 0; i < children.length; i++) {
    const match = children[i].text.match(sizedBoxRe);
    if (match) {
      sizedBoxValues.push(parseFloat(match[1]));
      sizedBoxIndices.push(i);
    }
  }

  if (sizedBoxValues.length < 2) return null;

  const allSameValue = sizedBoxValues.every((v) => v === sizedBoxValues[0]);
  if (!allSameValue) return null;

  for (const idx of sizedBoxIndices) {
    if (idx === 0 || idx === children.length - 1) return null;
  }

  for (let i = 0; i < sizedBoxIndices.length - 1; i++) {
    if (sizedBoxIndices[i + 1] - sizedBoxIndices[i] < 2) return null;
  }

  const nonSizedBoxChildren = children.filter((_, i) => !sizedBoxIndices.includes(i));
  const expectedSizedBoxCount = nonSizedBoxChildren.length - 1;

  if (sizedBoxValues.length !== expectedSizedBoxCount) return null;

  for (let i = 0; i < children.length; i++) {
    const isSizedBox = sizedBoxIndices.includes(i);
    const shouldBeSizedBox = i % 2 === 1;
    if (isSizedBox !== shouldBeSizedBox) return null;
  }

  return { spacingValue: sizedBoxValues[0], count: sizedBoxValues.length };
}

export default createPlugin(
  {
    name: "column-row-spacing",
    description:
      "Sugere uso de spacing em Column/Row ao invés de SizedBox intercalados (Flutter 3.27+)",
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

      if (!content.includes("SizedBox")) continue;
      if (!content.includes("Column") && !content.includes("Row")) continue;

      const lines = content.split("\n");
      const blocks = findChildrenBlocks(content, lines);

      for (const block of blocks) {
        const result = analyzeBlock(block);
        if (!result) continue;

        const prop = block.widgetType === "Column" ? "height" : "width";

        sendFormattedFail({
          title: `${block.widgetType.toUpperCase()} COM SIZEDBOX REPETITIVO`,
          description: `**${result.count} SizedBox(${prop}: ${result.spacingValue})** intercalados podem ser substituídos por \`spacing: ${result.spacingValue}\`.`,
          problem: {
            wrong: `${block.widgetType}(\n  children: [\n    WidgetA(),\n    SizedBox(${prop}: ${result.spacingValue}),\n    WidgetB(),\n    SizedBox(${prop}: ${result.spacingValue}),\n    WidgetC(),\n  ],\n)`,
            correct: `${block.widgetType}(\n  spacing: ${result.spacingValue},\n  children: [\n    WidgetA(),\n    WidgetB(),\n    WidgetC(),\n  ],\n)`,
            wrongLabel: `${result.count} SizedBox intercalados`,
            correctLabel: "Com spacing (Flutter 3.27+)",
          },
          action: {
            code: `${block.widgetType}(\n  spacing: ${result.spacingValue},\n  children: [\n    // remova os SizedBox\n  ],\n)`,
          },
          objective:
            "Usar a propriedade **spacing** do Flutter 3.27+ para código mais limpo e menos widgets na árvore.",
          reference: {
            text: "Row/Column spacing — Flutter 3.27",
            url: "https://codewithandrea.com/tips/spacing-row-column/",
          },
          file,
          line: block.widgetLine,
        });
      }
    }
  }
);
