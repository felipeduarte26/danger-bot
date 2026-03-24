/**
 * Presentation Try Catch Checker Plugin
 * Detecta uso de try-catch/try-finally na camada Presentation.
 * Erros devem ser tratados em Repositories (Either/Result) ou UseCases,
 * nunca em ViewModels/Controllers/Pages.
 */
import { createPlugin, getDanger, sendFail } from "@types";
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

function extractSnippet(lines: string[], start: number, max = 8): string {
  const result: string[] = [];
  let braces = 0;
  let opened = false;

  for (let i = start; i < lines.length && result.length < max; i++) {
    result.push(lines[i]);
    for (const ch of lines[i]) {
      if (ch === "{") {
        braces++;
        opened = true;
      }
      if (ch === "}") braces--;
    }
    if (opened && braces <= 0) break;
  }

  return result.map((l) => l.trimEnd()).join("\n");
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

        const snippet = extractSnippet(lines, i);

        sendFail(
          `TRY-CATCH NA CAMADA PRESENTATION

Uso de \`${kind}\` detectado na **camada Presentation**.

### Problema Identificado

\`\`\`dart
${snippet}
\`\`\`

A Presentation Layer **não deve tratar exceções** diretamente. Erros de servidor/rede devem ser tratados nos **Repositories** (retornando \`Either<Failure, Success>\`), e regras de negócio nos **UseCases**.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ Presentation com try-catch
class MyViewModel {
  Future<void> loadData() async {
    try {
      final data = await repository.getData();
      state = SuccessState(data);
    } catch (e) {
      state = ErrorState(e.toString());
    }
  }
}

// ✅ Repository trata o erro e retorna Either
class MyRepositoryImpl implements IMyRepository {
  @override
  Future<Either<Failure, Data>> getData() async {
    try {
      final response = await datasource.fetch();
      return Right(response.toEntity());
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}

// ✅ ViewModel consome o resultado já tratado
class MyViewModel {
  Future<void> loadData() async {
    final result = await getDataUseCase.execute();
    result.fold(
      (failure) => state = ErrorState(failure.message),
      (data) => state = SuccessState(data),
    );
  }
}
\`\`\`

### 🚀 Objetivo

Manter **separação de responsabilidades**: erros são tratados onde ocorrem (Data/Domain), não onde são exibidos (Presentation).

📖 [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)`,
          file,
          i + 1
        );
      }
    }
  }
);
