/**
 * Print Statement Detector Plugin
 *
 * Detecta chamadas de print/debugPrint em código Dart de produção.
 * Prints de debug esquecidos em produção expõem informações sensíveis,
 * poluem o console e dificultam a depuração de problemas reais.
 *
 * Detecta: print(), debugPrint(), debugPrintStack(), printError()
 *
 * Só chamadas sem receptor: `logger.print()` e `..print()` não contam; comentários,
 * strings e declarações (`void printError(...)`) também não. Ignora arquivos de teste
 * (inclusive qualquer pasta `test/` ou `testing/`) e gerados.
 *
 * @see {@link https://dart.dev/tools/linter-rules/avoid_print} Dart Linter: avoid_print
 */
import { DartFile, createPlugin, sendFormattedWarn } from "@types";

const PRINT_FUNCTIONS = new Set(["print", "debugPrint", "debugPrintStack", "printError"]);

export default createPlugin(
  {
    name: "print-statement-detector",
    description: "Detecta print/debugPrint em código de produção",
    enabled: true,
  },
  async () => {
    const files = DartFile.changed().filter(
      (f) => !f.path.inFolder("test") && !f.path.inFolder("testing")
    );

    for (const file of files) {
      const prints = file
        .calls()
        .filter((c) => PRINT_FUNCTIONS.has(c.name) && c.receiver === null && !c.isCascade);

      for (const call of prints) {
        const fn = call.name;
        const trimmed = call.lineText;

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
            code: `// Opção 1: Remover (mais comum)\n// ${trimmed}\n\n// Opção 2: Logger dedicado\nimport 'package:logging/logging.dart';\nfinal _log = Logger('${file.path.fileName.replace(".dart", "")}');\n_log.info('mensagem');`,
          },
          objective:
            "Manter o console limpo em produção e evitar vazamento de informações sensíveis.",
          reference: {
            text: "Dart Linter: avoid_print",
            url: "https://dart.dev/tools/linter-rules/avoid_print",
          },
          file: file.path.path,
          line: call.line,
        });
      }
    }
  }
);
