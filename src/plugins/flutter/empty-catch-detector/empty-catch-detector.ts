/**
 * Empty Catch Detector Plugin
 *
 * Detecta blocos catch vazios ou que contêm apenas comentários.
 * Catch vazio engole erros silenciosamente, tornando bugs extremamente
 * difíceis de rastrear e mascarando problemas reais em produção.
 *
 * Não flageia catch com rethrow, return, throw, break, continue
 * ou qualquer statement real. Catch só com comentários (inclusive
 * `// danger:ignore`) é reportado. Ignora arquivos de teste (inclusive
 * qualquer pasta `test/` ou `testing/`) e gerados.
 *
 * @see {@link https://dart.dev/tools/linter-rules/empty_catches} Dart Linter: empty_catches
 * @see Clean Code — Robert C. Martin, Cap. 7: Error Handling
 */
import { DartCatch, DartFile, DartTry, createPlugin, sendFormattedFail } from "@types";

const MAX_SNIPPET_LINES = 6;

export default createPlugin(
  {
    name: "empty-catch-detector",
    description: "Detecta blocos catch vazios ou com apenas comentários",
    enabled: true,
  },
  async () => {
    const files = DartFile.changed().filter(
      (f) => !f.path.inFolder("test") && !f.path.inFolder("testing")
    );

    for (const file of files) {
      const emptyCatches = tryStatementsOf(file)
        .flatMap((t) => t.catches)
        .filter((c) => c.isEmpty)
        .sort((a, b) => a.startOffset - b.startOffset);

      for (const emptyCatch of emptyCatches) {
        sendFormattedFail({
          title: "CATCH VAZIO DETECTADO",
          description: `Bloco \`catch\` vazio ou com apenas comentários detectado. Erros engolidos silenciosamente mascaram bugs e tornam a depuração extremamente difícil.`,
          problem: {
            wrong: snippetOf(file, emptyCatch),
            correct: `} catch (e, stackTrace) {\n  logger.error('Operação falhou', error: e, stackTrace: stackTrace);\n  rethrow; // ou trate o erro adequadamente\n}`,
            wrongLabel: "Catch vazio — erro silenciado",
            correctLabel: "Catch com tratamento adequado",
          },
          action: {
            text: "Trate o erro de forma explícita. Opções válidas:",
            code: `// Opção 1: Log + rethrow\ncatch (e, stackTrace) {\n  logger.error('Falha na operação', error: e, stackTrace: stackTrace);\n  rethrow;\n}\n\n// Opção 2: Retornar um Result/Failure\ncatch (e) {\n  return Left(ServerFailure(e.toString()));\n}\n\n// Opção 3: Se realmente precisa ignorar (raro), documente o motivo\ncatch (_) {\n  // Intencionalmente ignorado: [justificativa] // danger:ignore\n}`,
          },
          objective:
            "Garantir que erros sejam sempre tratados explicitamente — nunca engolidos silenciosamente.",
          reference: {
            text: "Dart Linter: empty_catches",
            url: "https://dart.dev/tools/linter-rules/empty_catches",
          },
          file: file.path.path,
          line: emptyCatch.line,
        });
      }
    }
  }
);

/** Todos os try do arquivo: funções, métodos, construtores e closures (também em inicializadores). */
function tryStatementsOf(file: DartFile): DartTry[] {
  const bodies = [
    ...file.functions.map((fn) => fn.body),
    ...file.declarations.flatMap((declaration) => [
      ...declaration.methods.map((method) => method.body),
      ...declaration.constructors.map((ctor) => ctor.body),
    ]),
    ...file.closures().map((closure) => closure.body),
  ];
  // o try de uma closure aparece também no corpo que a contém
  const tries = new Map<number, DartTry>();
  for (const body of bodies) {
    for (const t of body?.tryStatements ?? []) tries.set(t.startOffset, t);
  }
  return [...tries.values()];
}

/** Linhas do catch (até 6, sem 2 espaços de indentação), como no comentário inline. */
function snippetOf(file: DartFile, emptyCatch: DartCatch): string {
  const lastLine = Math.min(emptyCatch.endLine, emptyCatch.line + MAX_SNIPPET_LINES - 1);
  const lines = file.snippet(emptyCatch.line, lastLine).split("\n");
  if (emptyCatch.endLine - emptyCatch.line + 1 > MAX_SNIPPET_LINES) lines.push("    // ...");
  return lines.map((l) => l.replace(/^\s{2}/, "")).join("\n");
}
