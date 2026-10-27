"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Presentation Try Catch Checker Plugin
 * Detecta uso de try-catch/try-finally na camada Presentation.
 * Erros devem ser tratados em Repositories (Either/Result) ou UseCases,
 * nunca em ViewModels/Controllers/Pages.
 *
 * Analisa todo `try` de métodos, construtores, funções e closures (inclusive as de
 * inicializadores). Comentários e strings nunca contam; `try` sem `catch`/`on` nem
 * `finally` não é reportado. Exclui `_test.dart` e arquivos gerados.
 */
const _types_1 = require("../../../types.js");
/** Linhas do trecho mostrado na mensagem (a partir da linha do `try`). */
const SNIPPET_MAX_LINES = 6;
/** Todos os `try` do arquivo, uma vez cada, na ordem do arquivo. */
function tryStatementsOf(file) {
  const bodies = [
    ...file.declarations.flatMap((cls) => [
      ...cls.methods.map((m) => m.body),
      ...cls.constructors.map((c) => c.body),
    ]),
    ...file.functions.map((f) => f.body),
    // closures de inicializadores (`final onTap = () { try ... }`); as dos corpos repetem e são descartadas
    ...file.closures().map((c) => c.body),
  ];
  const byOffset = new Map();
  for (const body of bodies) {
    for (const t of body?.tryStatements ?? []) byOffset.set(t.startOffset, t);
  }
  return [...byOffset.values()].sort((a, b) => a.startOffset - b.startOffset);
}
function tryKind(t) {
  const hasCatch = t.catches.length > 0;
  const hasFinally = t.finallyBody !== null;
  if (hasCatch && hasFinally) return "try-catch-finally";
  if (hasCatch) return "try-catch";
  if (hasFinally) return "try-finally";
  return null;
}
/** Até 6 linhas do `try` (com `// ...` quando passa disso), sem 2 espaços de indentação. */
function trySnippet(file, t) {
  const lastLine = Math.min(t.endLine, t.line + SNIPPET_MAX_LINES - 1);
  const snippet = [];
  for (let line = t.line; line <= lastLine; line++) snippet.push(file.lineAt(line));
  if (snippet.length >= SNIPPET_MAX_LINES) snippet.push("    // ...");
  return snippet.map((l) => l.replace(/^\s{2}/, "")).join("\n");
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "presentation-try-catch-checker",
    description: "Detecta uso de try-catch na camada Presentation",
    enabled: true,
  },
  async () => {
    const dartFiles = _types_1.DartFile.changed({ includeTests: true }).filter(
      (f) =>
        f.path.inLayer(_types_1.DartLayer.Presentation) && !f.path.fileName.endsWith("_test.dart")
    );
    for (const file of dartFiles) {
      for (const t of tryStatementsOf(file)) {
        const kind = tryKind(t);
        if (!kind) continue;
        (0, _types_1.sendFormattedFail)({
          title: "TRY-CATCH NA CAMADA PRESENTATION",
          description: `Uso de \`${kind}\` detectado na **camada Presentation**. Erros devem ser tratados nos **Repositories** ou **UseCases**, não na Presentation.`,
          problem: {
            wrong: trySnippet(file, t),
            correct: `final result = await useCase.execute();\nresult.fold(\n  (failure) => state = ErrorState(failure.message),\n  (data) => state = SuccessState(data),\n);`,
            wrongLabel: `${kind} na Presentation`,
            correctLabel: "ViewModel consome resultado já tratado",
          },
          action: {
            text: "Mova o tratamento de erro para o **Repository** (retornando `Result<Failure, Success>`):",
            code: `class MyRepositoryImpl implements IMyRepository {\n  @override\n  Future<Result<Failure, Data>> getData() async {\n    try {\n      final response = await datasource.fetch();\n      return Right(response.toEntity());\n    } catch (e) {\n      return Left(ServerFailure(e.toString()));\n    }\n  }\n}`,
          },
          objective:
            "Manter **separação de responsabilidades**: erros são tratados onde ocorrem (Data/Domain), não onde são exibidos (Presentation).",
          reference: {
            text: "Clean Architecture",
            url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
          },
          file: file.path.path,
          line: t.line,
        });
      }
    }
  }
);
