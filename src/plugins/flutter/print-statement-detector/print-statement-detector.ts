/**
 * Print Statement Detector Plugin
 *
 * Detecta chamadas de print/debugPrint em código Dart de produção.
 * Prints de debug esquecidos em produção expõem informações sensíveis,
 * poluem o console e dificultam a depuração de problemas reais.
 *
 * Detecta: print(), debugPrint(), debugPrintStack(), printError()
 *
 * @see {@link https://dart.dev/tools/linter-rules/avoid_print} Dart Linter: avoid_print
 */
import { createPlugin, getDanger, sendFormattedWarn } from "@types";
import * as fs from "fs";

const PRINT_RE = /\b(print|debugPrint|debugPrintStack|printError)\s*\(/;

/**
 * Constrói máscara de linhas a ignorar (comentários de bloco, linha e multi-line strings).
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
 * Remove strings literais (single e double quote) de uma linha
 * para evitar matches dentro de conteúdo de string.
 */
function stripStrings(line: string): string {
  return line.replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

export default createPlugin(
  {
    name: "print-statement-detector",
    description: "Detecta print/debugPrint em código de produção",
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

        const cleaned = stripStrings(lines[i]);
        const match = cleaned.match(PRINT_RE);
        if (!match) continue;

        const fn = match[1];
        const trimmed = lines[i].trim();

        sendFormattedWarn({
          title: "PRINT EM CÓDIGO DE PRODUÇÃO",
          description: `Chamada \`${fn}()\` detectada. Prints de debug devem ser removidos antes do merge — poluem o console, podem expor dados sensíveis e dificultam a depuração.`,
          problem: {
            wrong: trimmed,
            correct: `// Use um Logger dedicado se precisar de logs em produção\nlogger.info('mensagem relevante');`,
            wrongLabel: `${fn}() em produção`,
            correctLabel: "Logger estruturado ou remover",
          },
          action: {
            text: "Remova o `print` ou substitua por um **Logger** configurável que possa ser desativado em produção:",
            code: `// Opção 1: Remover (mais comum)\n// ${trimmed}\n\n// Opção 2: Logger dedicado\nimport 'package:logging/logging.dart';\nfinal _log = Logger('${file.split("/").pop()?.replace(".dart", "")}');\n_log.info('mensagem');`,
          },
          objective:
            "Manter o console limpo em produção e evitar vazamento de informações sensíveis.",
          reference: {
            text: "Dart Linter: avoid_print",
            url: "https://dart.dev/tools/linter-rules/avoid_print",
          },
          file,
          line: i + 1,
        });
      }
    }
  }
);
