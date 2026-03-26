/**
 * Presentation Try Catch Checker Plugin
 * Detecta uso de try-catch/try-finally na camada Presentation.
 * Erros devem ser tratados em Repositories (Either/Result) ou UseCases,
 * nunca em ViewModels/Controllers/Pages.
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

const TRY_RE = /^\s*try\s*\{/;
const CATCH_RE = /^\}\s*(?:catch\s*[\s(]|on\s+)/;
const FINALLY_RE = /^\}\s*finally\s*\{/;

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("///");
}

function classifyTry(lines: string[], start: number): string | null {
  let braces = 0;
  let opened = false;
  let hasCatch = false;
  let hasFinally = false;

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];

    for (const ch of line) {
      if (ch === "{") {
        braces++;
        opened = true;
      }
      if (ch === "}") braces--;
    }

    if (i > start && opened) {
      const trimmed = line.trim();
      if (CATCH_RE.test(trimmed)) hasCatch = true;
      if (FINALLY_RE.test(trimmed)) hasFinally = true;
    }

    if (opened && braces <= 0) break;
  }

  if (hasCatch && hasFinally) return "try-catch-finally";
  if (hasCatch) return "try-catch";
  if (hasFinally) return "try-finally";
  return null;
}

export default createPlugin(
  {
    name: "presentation-try-catch-checker",
    description: "Detecta uso de try-catch na camada Presentation",
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
        f.includes("/presentation/") &&
        fs.existsSync(f)
    );

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (isCommentLine(lines[i])) continue;
        if (!TRY_RE.test(lines[i])) continue;

        const kind = classifyTry(lines, i);
        if (!kind) continue;

        sendFormattedFail({
          title: "TRY-CATCH NA CAMADA PRESENTATION",
          description: `Uso de \`${kind}\` detectado na **camada Presentation**. Erros devem ser tratados nos **Repositories** ou **UseCases**, não na Presentation.`,
          problem: {
            wrong: `class MyViewModel {\n  Future<void> loadData() async {\n    try {\n      final data = await repository.getData();\n    } catch (e) {\n      state = ErrorState(e.toString());\n    }\n  }\n}`,
            correct: `class MyViewModel {\n  Future<void> loadData() async {\n    final result = await getDataUseCase.execute();\n    result.fold(\n      (failure) => state = ErrorState(failure.message),\n      (data) => state = SuccessState(data),\n    );\n  }\n}`,
            wrongLabel: "Presentation com try-catch",
            correctLabel: "ViewModel consome resultado já tratado",
          },
          action: {
            text: "Mova o tratamento de erro para o **Repository** (retornando `Either<Failure, Success>`):",
            code: `class MyRepositoryImpl implements IMyRepository {\n  @override\n  Future<Either<Failure, Data>> getData() async {\n    try {\n      final response = await datasource.fetch();\n      return Right(response.toEntity());\n    } catch (e) {\n      return Left(ServerFailure(e.toString()));\n    }\n  }\n}`,
          },
          objective:
            "Manter **separação de responsabilidades**: erros são tratados onde ocorrem (Data/Domain), não onde são exibidos (Presentation).",
          reference: {
            text: "Clean Architecture",
            url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
          },
          file,
          line: i + 1,
        });
      }
    }
  }
);
