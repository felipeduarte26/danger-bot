/**
 * Verifica uso correto de comentários.
 *
 * Tags permitidas que não disparam erro:
 *   - // TODO: ...
 *   - // FIXME: ...
 *   - // ignore: ...          (ignore do Dart analyzer)
 *   - // coverage:ignore-...  (ignore de coverage)
 *   - // danger:ignore        (tag do Danger Bot — na mesma linha ou na linha anterior)
 */
import { createPlugin, getDanger, sendFormattedFail, getDartFiles } from "@types";

const ALLOWED_PREFIXES = /^\/\/\s*(TODO|FIXME|ignore:|coverage:ignore|danger:ignore)/i;

export default createPlugin(
  {
    name: "comments-checker",
    description: "Verifica uso correto de comentários",
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const dartFiles = await getDartFiles();

    for (const file of dartFiles) {
      try {
        const diff = await danger.git.structuredDiffForFile(file);
        if (!diff) continue;

        for (const chunk of diff.chunks) {
          const changes: any[] = (chunk as any).changes ?? [];

          for (let i = 0; i < changes.length; i++) {
            const change = changes[i];
            if (change.type !== "add") continue;

            const line = (change.content as string).replace(/^\+/, "").trim();
            if (!line.match(/^\/\/(?!\/)/)) continue;

            if (ALLOWED_PREFIXES.test(line)) continue;

            const prevChange = i > 0 ? changes[i - 1] : null;
            if (prevChange) {
              const prevLine = (prevChange.content as string).replace(/^\+/, "").trim();
              if (/\/\/\s*danger:ignore/i.test(prevLine)) continue;
            }

            const lineNum = change.ln ?? change.ln2 ?? 0;
            const commentText = line.replace(/^\/\/\s*/, "");

            sendFormattedFail({
              title: "COMENTÁRIO // PROIBIDO",
              description:
                "Comentários `//` não geram documentação. Use `///` para documentar código público.",
              problem: {
                wrong: line,
                correct: `/// ${commentText}`,
                wrongLabel: "Comentário // não gera documentação",
                correctLabel: "Comentário /// gera documentação (DartDoc)",
              },
              action: {
                text: "Se o comentário for realmente necessário como `//`, adicione a tag `danger:ignore` na linha anterior:",
                code: `// danger:ignore\n${line}`,
              },
              objective:
                "Gerar **documentação automática** com DartDoc. Tags permitidas: `TODO:`, `FIXME:`, `ignore:`, `coverage:ignore`, `danger:ignore`.",
              file,
              line: lineNum,
            });
          }
        }
      } catch {
        // Ignore
      }
    }
  }
);
