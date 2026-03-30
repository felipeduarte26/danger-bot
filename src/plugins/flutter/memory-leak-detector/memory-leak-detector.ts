/**
 * Memory Leak Detector Plugin
 * Detecta disposables (Controllers, FocusNodes, Timers, Streams) em classes
 * State<> que não têm dispose/cancel correspondente.
 *
 * Para cada disposable encontrado como campo da classe, verifica se existe
 * uma chamada .dispose() ou .cancel() com o mesmo nome no método dispose().
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

interface Disposable {
  name: string;
  type: string;
  line: number;
  needsDispose: boolean;
  needsCancel: boolean;
}

const DISPOSE_TYPES = [
  "TextEditingController",
  "AnimationController",
  "ScrollController",
  "PageController",
  "TabController",
  "DraggableScrollableController",
  "SearchController",
  "ExpansionTileController",
  "FocusNode",
  "FocusScopeNode",
  "ChangeNotifier",
  "ValueNotifier",
  "TransformationController",
  "UndoHistoryController",
  "OverlayPortalController",
];

const CANCEL_TYPES = ["Timer", "StreamSubscription", "StreamController"];

const FIELD_RE = /^\s+(?:late\s+)?(?:final\s+)?(?:([\w<>,?\s]+?)\s+)?(_?\w+)\s*[=;]/;

export default createPlugin(
  {
    name: "memory-leak-detector",
    description: "Detecta possíveis memory leaks em States",
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
        fs.existsSync(f)
    );

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");

      if (!content.includes("extends State<") && !content.includes("extends ViewState<")) continue;

      const lines = content.split("\n");

      const disposables = findDisposables(lines);
      if (disposables.length === 0) continue;

      const disposeBody = extractDisposeBody(lines);

      for (const d of disposables) {
        const cleanupCall = d.needsCancel ? `${d.name}?.cancel()` : `${d.name}.dispose()`;

        const hasCleanup =
          disposeBody.includes(`${d.name}.dispose()`) ||
          disposeBody.includes(`${d.name}?.dispose()`) ||
          disposeBody.includes(`${d.name}.cancel()`) ||
          disposeBody.includes(`${d.name}?.cancel()`);

        if (hasCleanup) continue;

        const action = d.needsCancel ? "cancel" : "dispose";

        sendFormattedFail({
          title: `VAZAMENTO DE MEMÓRIA — ${d.type} SEM ${action.toUpperCase()}()`,
          description: `\`${d.name}\` (${d.type}) não tem \`${action}()\` no método \`dispose()\`.`,
          problem: {
            wrong: `${d.type} ${d.name} = ...;\n// Sem ${action}() no dispose()`,
            correct: `@override\nvoid dispose() {\n  ${cleanupCall};\n  super.dispose();\n}`,
            wrongLabel: `Sem ${action}() — vazamento de memória`,
            correctLabel: `Com ${action}() no dispose()`,
          },
          action: {
            code: `@override\nvoid dispose() {\n  ${cleanupCall};\n  super.dispose();\n}`,
          },
          objective: `Todo **${d.type}** deve ter \`${action}()\` no método \`dispose()\`.`,
          reference: {
            text: "Flutter: State.dispose()",
            url: "https://api.flutter.dev/flutter/widgets/State/dispose.html",
          },
          file,
          line: d.line,
        });
      }
    }
  }
);

function findDisposables(lines: string[]): Disposable[] {
  const result: Disposable[] = [];
  let insideStateClass = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/class\s+\w+\s+extends\s+(?:State|ViewState)</)) {
      insideStateClass = true;
      braceDepth = 0;
    }

    if (insideStateClass) {
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }

      if (braceDepth <= 0 && insideStateClass && line.includes("}")) {
        insideStateClass = false;
        continue;
      }

      if (braceDepth !== 1) continue;

      const fieldMatch = line.match(FIELD_RE);
      if (!fieldMatch) continue;

      const explicitType = fieldMatch[1]?.trim() || "";
      const varName = fieldMatch[2];

      if (!varName || varName === "super" || varName === "const") continue;

      const rightSide = line.split("=")[1] || "";

      for (const type of DISPOSE_TYPES) {
        if (explicitType.includes(type) || rightSide.includes(`${type}(`)) {
          result.push({ name: varName, type, line: i + 1, needsDispose: true, needsCancel: false });
          break;
        }
      }

      for (const type of CANCEL_TYPES) {
        if (
          explicitType.includes(type) ||
          rightSide.includes(`${type}(`) ||
          rightSide.includes(`${type}.`)
        ) {
          result.push({ name: varName, type, line: i + 1, needsDispose: false, needsCancel: true });
          break;
        }
      }
    }
  }

  return result;
}

function extractDisposeBody(lines: string[]): string {
  let inDispose = false;
  let braceDepth = 0;
  let body = "";

  for (const line of lines) {
    if (line.match(/void\s+dispose\s*\(\s*\)/)) {
      inDispose = true;
      braceDepth = 0;
    }

    if (!inDispose) continue;

    for (const ch of line) {
      if (ch === "{") braceDepth++;
      if (ch === "}") braceDepth--;
    }

    body += line + "\n";

    if (inDispose && braceDepth <= 0 && line.includes("}")) {
      break;
    }
  }

  return body;
}
