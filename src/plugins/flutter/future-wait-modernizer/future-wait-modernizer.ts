/**
 * Future Wait Modernizer Plugin
 *
 * Detecta uso de Future.wait([...]) com lista literal e sugere a sintaxe
 * moderna de tupla com .wait introduzida no Dart 3.
 *
 * A sintaxe de tupla é preferível porque:
 *   - Type-safe: cada resultado já vem com o tipo correto
 *   - Sem casts: não precisa de result[0] as Type
 *   - Mais legível: destructuring com nomes descritivos
 *
 * Não flageia Future.wait com variáveis ou expressões dinâmicas
 * (ex: Future.wait(listaDeFutures), Future.wait(items.map(...))),
 * pois nesses casos a tupla não é aplicável.
 *
 * @see {@link https://dart.dev/language/records#multiple-returns} Dart Records
 * @see {@link https://api.dart.dev/stable/dart-async/FutureRecord2/wait.html} FutureRecord.wait
 */
import { createPlugin, getDanger, sendFormattedWarn } from "@types";
import * as fs from "fs";

const FUTURE_WAIT_RE = /Future\s*\.\s*wait\s*\(/;

/**
 * Constrói máscara de linhas a ignorar (comentários e multi-line strings).
 */
function buildSkipMask(lines: string[]): boolean[] {
  const skip = new Array<boolean>(lines.length).fill(false);
  let inBlock = false;
  let inMultiStr = false;
  let strDelim = "";

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (inBlock) {
      skip[i] = true;
      if (trimmed.includes("*/")) inBlock = false;
      continue;
    }

    if (inMultiStr) {
      skip[i] = true;
      if (lines[i].includes(strDelim)) inMultiStr = false;
      continue;
    }

    if (trimmed.startsWith("//") || trimmed.startsWith("///") || trimmed.startsWith("*")) {
      skip[i] = true;
      continue;
    }

    if (trimmed.startsWith("/*")) {
      skip[i] = true;
      inBlock = true;
      if (trimmed.includes("*/") && trimmed.indexOf("*/") > trimmed.indexOf("/*") + 1) {
        inBlock = false;
      }
      continue;
    }

    if (trimmed.includes("'''") || trimmed.includes('"""')) {
      const delim = trimmed.includes("'''") ? "'''" : '"""';
      const firstIdx = trimmed.indexOf(delim);
      const secondIdx = trimmed.indexOf(delim, firstIdx + 3);
      if (secondIdx === -1) {
        inMultiStr = true;
        strDelim = delim;
      }
    }
  }

  return skip;
}

/**
 * Verifica se, após "Future.wait(", o argumento é uma lista literal [...]
 * ao invés de uma variável ou expressão dinâmica.
 */
function isLiteralListArg(lines: string[], startLine: number): boolean {
  const line = lines[startLine];
  const match = line.match(FUTURE_WAIT_RE);
  if (!match) return false;

  const afterParen = line.substring(match.index! + match[0].length).trim();

  if (afterParen.startsWith("[")) return true;

  if (afterParen === "" || afterParen === "\r") {
    for (let j = startLine + 1; j < Math.min(startLine + 4, lines.length); j++) {
      const nextTrimmed = lines[j].trim();
      if (nextTrimmed === "") continue;
      return nextTrimmed.startsWith("[");
    }
  }

  return false;
}

/**
 * Extrai o snippet do Future.wait completo (até o fechamento do parêntese).
 */
function extractFutureWaitSnippet(lines: string[], start: number, maxLines = 10): string {
  const snippet: string[] = [];
  let parens = 0;
  let foundOpen = false;

  for (let i = start; i < lines.length && snippet.length < maxLines; i++) {
    snippet.push(lines[i]);

    for (const ch of lines[i]) {
      if (ch === "(") {
        parens++;
        foundOpen = true;
      }
      if (ch === ")") parens--;
    }

    if (foundOpen && parens <= 0) break;
  }

  if (snippet.length >= maxLines) {
    snippet.push("    // ...");
  }

  const minIndent = snippet.reduce((min, l) => {
    if (l.trim() === "") return min;
    const indent = l.match(/^\s*/)?.[0].length ?? 0;
    return Math.min(min, indent);
  }, Infinity);

  return snippet.map((l) => (minIndent < Infinity ? l.substring(minIndent) : l)).join("\n");
}

export default createPlugin(
  {
    name: "future-wait-modernizer",
    description: "Detecta Future.wait e sugere uso de tupla com .wait do Dart 3",
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
        !f.endsWith(".mocks.dart") &&
        !f.includes("/test/") &&
        !f.includes("/testing/") &&
        !f.includes("/generated/") &&
        fs.existsSync(f)
    );

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const skip = buildSkipMask(lines);

      for (let i = 0; i < lines.length; i++) {
        if (skip[i]) continue;
        if (!FUTURE_WAIT_RE.test(lines[i])) continue;
        if (!isLiteralListArg(lines, i)) continue;

        const snippet = extractFutureWaitSnippet(lines, i);

        sendFormattedWarn({
          title: "FUTURE.WAIT COM LISTA LITERAL",
          description: `\`Future.wait([...])\` detectado (linha ${i + 1}). Prefira a sintaxe de **tupla com \`.wait\`** do Dart 3 — type-safe, sem necessidade de cast por índice e mais legível.`,
          problem: {
            wrong: snippet,
            correct: `final (\n  resultA,\n  resultB,\n  resultC,\n) = await (\n  useCaseA(),\n  useCaseB(),\n  useCaseC(),\n).wait;`,
            wrongLabel: "Future.wait — acesso por índice, requer cast",
            correctLabel: "Tupla .wait — type-safe, destructuring direto",
          },
          action: {
            text: "Substitua `Future.wait([...])` pela sintaxe de **tupla com `.wait`**:",
            code: `// Antes (Future.wait)\nfinal results = await Future.wait([\n  fetchUsers(),\n  fetchRoles(),\n]);\nfinal users = results[0] as List<UserEntity>; // cast manual\nfinal roles = results[1] as List<RoleEntity>; // cast manual\n\n// Depois (tupla .wait)\nfinal (\n  usersResult,\n  rolesResult,\n) = await (\n  fetchUsers(),\n  fetchRoles(),\n).wait;\n// Cada variável já tem o tipo correto, sem cast`,
          },
          objective:
            "Usar a sintaxe moderna de tupla com `.wait` para **type-safety**, eliminando casts manuais e acesso por índice.",
          reference: {
            text: "Dart Records — Multiple Returns",
            url: "https://dart.dev/language/records#multiple-returns",
          },
          file,
          line: i + 1,
        });
      }
    }
  }
);
