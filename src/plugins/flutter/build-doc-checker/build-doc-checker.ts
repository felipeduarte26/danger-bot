/**
 * Build Doc Checker Plugin
 * Detecta comentários de documentação (///) dentro do corpo de métodos `build`.
 *
 * Documentação dentro de build é desnecessária e polui o código.
 * Doc comments devem ser usados em: classes, construtores, métodos, campos.
 * Widgets instanciados dentro de build são auto-explicativos pelo código.
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

export default createPlugin(
  {
    name: "build-doc-checker",
    description: "Detecta /// desnecessários dentro de Widget build",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        fs.existsSync(f)
    );

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (!content.includes("Widget build(")) continue;

      const lines = content.replace(/\r/g, "").split("\n");
      const buildBodies = findBuildBodies(lines);

      for (const body of buildBodies) {
        for (let i = body.start; i <= body.end; i++) {
          const trimmed = lines[i].trim();

          if (!trimmed.startsWith("///")) continue;

          // Skip if inside a multi-line string (heuristic: odd number of ''' before this line)
          if (isInsideMultiLineString(lines, i)) continue;

          const { wrongSnippet, correctSnippet } = buildRealSnippets(lines, i);

          sendFormattedFail({
            title: "DOCUMENTAÇÃO DESNECESSÁRIA DENTRO DE BUILD",
            description: `Comentário \`///\` dentro do método \`build\` é desnecessário. Widgets dentro de build são auto-explicativos pelo código.\n\n\`${trimmed}\``,
            problem: {
              wrong: wrongSnippet,
              correct: correctSnippet,
              wrongLabel: "/// dentro de build",
              correctLabel: "Sem /// desnecessário",
            },
            action: {
              text: "Remova este comentário `///`. Use `///` apenas fora de `build` para documentar classes, construtores, campos e métodos.",
              code: `// ✅ Usar /// em:\n/// Classe ou método (fora de build)\nclass MyWidget extends StatelessWidget {\n  /// Campo documentado\n  final String title;\n}\n\n// ❌ NÃO usar /// dentro de build:\n@override\nWidget build(BuildContext context) {\n  return Column(\n    // use // se precisar de comentário inline\n    children: [...],\n  );\n}`,
            },
            objective:
              "Comentários `///` dentro de `build` poluem o código e não geram documentação útil. Widgets são auto-descritivos por seus nomes e parâmetros.",
            file,
            line: i + 1,
          });
        }
      }
    }
  }
);

interface BuildBody {
  start: number;
  end: number;
}

/**
 * Encontra os corpos (start/end) de todos os métodos `Widget build(` no arquivo.
 * Suporta tanto `{ ... }` quanto `=> ...;`
 */
function findBuildBodies(lines: string[]): BuildBody[] {
  const bodies: BuildBody[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!/Widget\s+build\s*\(/.test(trimmed)) continue;
    if (!hasOverrideAbove(lines, i)) continue;

    // Find end of signature (closing `)` of parameters)
    let signatureEnd = -1;
    let parenDepth = 0;
    let sigStarted = false;
    for (let j = i; j < Math.min(i + 10, lines.length); j++) {
      for (const ch of lines[j]) {
        if (ch === "(") {
          parenDepth++;
          sigStarted = true;
        }
        if (ch === ")") {
          parenDepth--;
          if (sigStarted && parenDepth === 0) {
            signatureEnd = j;
            break;
          }
        }
      }
      if (signatureEnd !== -1) break;
    }
    if (signatureEnd === -1) continue;

    // Determine body type: `{` (brace) or `=>` (arrow) — whichever comes first
    let bodyType: "brace" | "arrow" | null = null;
    let bodyStartLine = -1;

    for (let j = signatureEnd; j < Math.min(signatureEnd + 5, lines.length); j++) {
      const arrowIdx = lines[j].indexOf("=>");
      const braceIdx = lines[j].indexOf("{");

      if (arrowIdx !== -1 && (braceIdx === -1 || arrowIdx < braceIdx)) {
        bodyType = "arrow";
        bodyStartLine = j;
        break;
      }
      if (braceIdx !== -1 && (arrowIdx === -1 || braceIdx < arrowIdx)) {
        bodyType = "brace";
        bodyStartLine = j;
        break;
      }
    }

    if (!bodyType || bodyStartLine === -1) continue;

    if (bodyType === "brace") {
      // Track { } to find the closing brace
      let depth = 0;
      let bodyStart = -1;
      for (let j = bodyStartLine; j < lines.length; j++) {
        for (const ch of lines[j]) {
          if (ch === "{") {
            depth++;
            if (bodyStart === -1) bodyStart = j + 1;
          }
          if (ch === "}") {
            depth--;
            if (depth === 0) {
              bodies.push({ start: bodyStart, end: j - 1 });
              i = j;
              break;
            }
          }
        }
        if (depth === 0 && bodyStart !== -1) break;
      }
    } else {
      // Arrow: track () and [] depth, end at `;` when depth === 0
      let depth = 0;
      let arrowEnd = -1;

      for (let j = bodyStartLine; j < lines.length; j++) {
        for (const ch of lines[j]) {
          if (ch === "(" || ch === "[") depth++;
          if (ch === ")" || ch === "]") depth--;
        }
        if (depth <= 0 && lines[j].trimEnd().endsWith(";")) {
          arrowEnd = j;
          break;
        }
      }

      if (arrowEnd !== -1 && arrowEnd > bodyStartLine) {
        bodies.push({ start: bodyStartLine + 1, end: arrowEnd });
        i = arrowEnd;
      }
    }
  }

  return bodies;
}

/**
 * Extrai um snippet real do código mostrando o /// e contexto ao redor,
 * e gera a versão corrigida sem o ///.
 */
function buildRealSnippets(
  lines: string[],
  docLineIdx: number
): { wrongSnippet: string; correctSnippet: string } {
  const contextBefore = 1;
  const contextAfter = 2;

  const start = Math.max(0, docLineIdx - contextBefore);
  let end = Math.min(lines.length - 1, docLineIdx + contextAfter);

  // Collect consecutive /// lines starting from docLineIdx
  let docEnd = docLineIdx;
  while (docEnd + 1 < lines.length && lines[docEnd + 1].trim().startsWith("///")) {
    docEnd++;
  }
  end = Math.min(lines.length - 1, docEnd + contextAfter);

  const wrongLines: string[] = [];
  const correctLines: string[] = [];

  for (let k = start; k <= end; k++) {
    wrongLines.push(lines[k]);
    if (k < docLineIdx || k > docEnd) {
      correctLines.push(lines[k]);
    }
  }

  return {
    wrongSnippet: wrongLines.map((l) => l.trimEnd()).join("\n"),
    correctSnippet: correctLines.map((l) => l.trimEnd()).join("\n"),
  };
}

function hasOverrideAbove(lines: string[], idx: number): boolean {
  for (let k = idx - 1; k >= Math.max(0, idx - 3); k--) {
    const t = lines[k].trim();
    if (t === "@override") return true;
    if (t === "" || t.startsWith("///") || t.startsWith("//")) continue;
    break;
  }
  return false;
}

/**
 * Heurística simples para detectar se estamos dentro de uma string multi-line ('''/""").
 * Conta quantas aberturas de ''' ou """ existem antes da linha atual.
 * Se ímpar, estamos dentro de uma string.
 */
function isInsideMultiLineString(lines: string[], lineIdx: number): boolean {
  let tripleQuoteCount = 0;
  for (let i = 0; i < lineIdx; i++) {
    const matches = lines[i].match(/'''|"""/g);
    if (matches) tripleQuoteCount += matches.length;
  }
  return tripleQuoteCount % 2 !== 0;
}
