"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Verifica uso correto de comentários.
 *
 * Analisa só as linhas adicionadas no PR: um comentário `//` sozinho na linha é
 * reportado. Comentários `///`, de bloco e `//` no fim de uma linha de código não contam.
 *
 * Tags permitidas que não disparam erro:
 *   - // TODO: ...
 *   - // FIXME: ...
 *   - // ignore: ...          (ignore do Dart analyzer)
 *   - // coverage:ignore-...  (ignore de coverage)
 *   - // danger:ignore        (tag do Danger Bot — na mesma linha ou na linha anterior)
 */
const _types_1 = require("../../../types.js");
const ALLOWED_PREFIXES = /^(TODO|FIXME|ignore:|coverage:ignore|danger:ignore)/i;
const DANGER_IGNORE = /\/\/\s*danger:ignore/i;
exports.default = (0, _types_1.createPlugin)(
  {
    name: "comments-checker",
    description: "Verifica uso correto de comentários",
    enabled: true,
  },
  async () => {
    // inclui gerados e a pasta test/: só os `_test.dart` ficam de fora
    const changed = _types_1.DartFile.changed({
      includeTests: true,
      includeGenerated: true,
    }).filter((f) => !f.path.fileName.endsWith("_test.dart"));
    for (const { path } of changed) {
      const file = await _types_1.DartFile.readWithDiff(path.path);
      for (const comment of file.comments) {
        if (comment.kind !== _types_1.DartCommentKind.Line || comment.isTrailing) continue;
        if (!file.isAdded(comment.line)) continue;
        if (ALLOWED_PREFIXES.test(comment.content)) continue;
        const ignoredAbove = file.comments.some(
          // regex no texto de um comentário (não em código): aceita `// danger:ignore` em qualquer caixa
          // eslint-disable-next-line no-restricted-syntax
          (c) => c.line === comment.line - 1 && DANGER_IGNORE.test(c.text)
        );
        if (ignoredAbove) continue;
        const line = comment.lineText;
        (0, _types_1.sendFormattedFail)({
          title: "COMENTÁRIO // PROIBIDO",
          description:
            "Comentários `//` não geram documentação. Use `///` para documentar código público.",
          problem: {
            wrong: line,
            correct: `/// ${comment.content}`,
            wrongLabel: "Comentário // não gera documentação",
            correctLabel: "Comentário /// gera documentação (DartDoc)",
          },
          action: {
            text: "Se o comentário for realmente necessário como `//`, adicione a tag `danger:ignore` na linha anterior:",
            code: `// danger:ignore\n${line}`,
          },
          objective:
            "Gerar **documentação automática** com DartDoc. Tags permitidas: `TODO:`, `FIXME:`, `ignore:`, `coverage:ignore`, `danger:ignore`.",
          file: path.path,
          line: comment.line,
        });
      }
    }
  }
);
