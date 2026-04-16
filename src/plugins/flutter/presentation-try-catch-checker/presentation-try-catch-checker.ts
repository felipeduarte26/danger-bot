/**
 * Presentation Try Catch Checker Plugin
 * Detecta uso de try-catch/try-finally na camada Presentation.
 * Erros devem ser tratados em Repositories (Either/Result) ou UseCases,
 * nunca em ViewModels/Controllers/Pages.
 *
 * Ignora ocorrências dentro de block comments e multi-line strings.
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

const TRY_RE = /^\s*try\s*\{/;
const CATCH_RE = /^\}\s*(?:catch\s*[\s(]|on\s+)/;
const FINALLY_RE = /^\}\s*finally\s*\{/;

function buildSkipMask(lines: string[]): boolean[] {
  const skip = new Array<boolean>(lines.length).fill(false);
  let inBlockComment = false;
  let inMultiLineString = false;
  let stringDelimiter = "";

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (inBlockComment) {
      skip[i] = true;
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }

    if (inMultiLineString) {
      skip[i] = true;
      if (lines[i].includes(stringDelimiter)) inMultiLineString = false;
      continue;
    }

    if (trimmed.startsWith("//") || trimmed.startsWith("///") || trimmed.startsWith("*")) {
      skip[i] = true;
      continue;
    }

    if (trimmed.startsWith("/*")) {
      skip[i] = true;
      inBlockComment = true;
      if (trimmed.includes("*/") && trimmed.indexOf("*/") > trimmed.indexOf("/*") + 1) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed.includes("'''") || trimmed.includes('"""')) {
      const delim = trimmed.includes("'''") ? "'''" : '"""';
      const firstIdx = trimmed.indexOf(delim);
      const secondIdx = trimmed.indexOf(delim, firstIdx + 3);
      if (secondIdx === -1) {
        inMultiLineString = true;
        stringDelimiter = delim;
      }
    }
  }

  return skip;
}

function extractTrySnippet(lines: string[], start: number, maxLines = 6): string {
  const snippet: string[] = [];
  let braces = 0;
  let opened = false;

  for (let i = start; i < lines.length && snippet.length < maxLines; i++) {
    snippet.push(lines[i]);

    for (const ch of lines[i]) {
      if (ch === "{") {
        braces++;
        opened = true;
      }
      if (ch === "}") braces--;
    }

    if (opened && braces <= 0) break;
  }

  if (snippet.length >= maxLines) {
    snippet.push("    // ...");
  }

  return snippet.map((l) => l.replace(/^\s{2}/, "")).join("\n");
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
      const skip = buildSkipMask(lines);

      for (let i = 0; i < lines.length; i++) {
        if (skip[i]) continue;
        if (!TRY_RE.test(lines[i])) continue;

        const kind = classifyTry(lines, i);
        if (!kind) continue;

        const detectedSnippet = extractTrySnippet(lines, i);

        sendFormattedFail({
          title: "TRY-CATCH NA CAMADA PRESENTATION",
          description: `Uso de \`${kind}\` detectado na **camada Presentation**. Erros devem ser tratados nos **Repositories** ou **UseCases**, não na Presentation.`,
          problem: {
            wrong: detectedSnippet,
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
          file,
          line: i + 1,
        });
      }
    }
  }
);
