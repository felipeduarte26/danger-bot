/**
 * Late Final Checker Plugin
 * Detecta uso desnecessário de late final com valor atribuído na declaração.
 *
 * late final só faz sentido quando o valor é atribuído DEPOIS (ex: initState).
 * Se já tem valor na declaração, deve ser apenas final ou const.
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

const LATE_FINAL_WITH_VALUE = /late\s+final\s+(?:[\w<>,?\s]+\s+)?(\w+)\s*=\s*.+;/;

export default createPlugin(
  {
    name: "late-final-checker",
    description: "Detecta late final desnecessário com valor atribuído",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        fs.existsSync(f)
    );

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(LATE_FINAL_WITH_VALUE);
        if (!match) continue;

        const trimmed = line.trim();

        sendFormattedFail({
          title: "LATE FINAL DESNECESSÁRIO",
          description:
            "`late final` com valor atribuído na declaração não faz sentido. O `late` só é necessário quando a atribuição acontece **depois** (ex: `initState`, `didChangeDependencies`).",
          problem: {
            wrong: trimmed,
            correct: trimmed.replace(/late\s+/, ""),
            wrongLabel: "late final com valor imediato",
            correctLabel: "Apenas final (sem late)",
          },
          action: {
            text: "Remova o `late` — o valor já é atribuído na declaração:",
            code: trimmed.replace(/late\s+/, ""),
          },
          objective: "Usar `late` apenas quando necessário — código mais claro e previsível.",
          reference: {
            text: "Effective Dart: Usage",
            url: "https://dart.dev/effective-dart/usage#dont-use-late-when-a-constructor-initializer-will-do",
          },
          file,
          line: i + 1,
        });
      }
    }
  }
);
