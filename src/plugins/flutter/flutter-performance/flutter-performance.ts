/**
 * Flutter Performance Plugin
 * Detecta operações custosas ANTES do return no método build().
 *
 * O build() roda a cada rebuild. Operações pesadas antes do return
 * (loops, sorts, criação de controllers, variáveis computadas)
 * devem ser movidas para initState, didChangeDependencies, ou campos da classe.
 *
 * NÃO verifica código dentro de callbacks de widgets (onTap, builder, etc.)
 * porque esses rodam sob demanda, não a cada rebuild.
 */
import { createPlugin, getDanger, sendFail } from "@types";
import * as fs from "fs";

const HEAVY_PATTERNS: { regex: RegExp; description: string }[] = [
  { regex: /\bfor\s*\(/, description: "Loop `for` no build()" },
  { regex: /\bwhile\s*\(/, description: "Loop `while` no build()" },
  { regex: /\.sort\s*\(/, description: "`.sort()` no build()" },
  { regex: /\.reversed\b/, description: "`.reversed` no build()" },
  {
    regex: /TextEditingController\s*\(/,
    description: "Criação de `TextEditingController` no build()",
  },
  { regex: /AnimationController\s*\(/, description: "Criação de `AnimationController` no build()" },
  { regex: /ScrollController\s*\(/, description: "Criação de `ScrollController` no build()" },
  { regex: /PageController\s*\(/, description: "Criação de `PageController` no build()" },
  { regex: /TabController\s*\(/, description: "Criação de `TabController` no build()" },
  { regex: /FocusNode\s*\(/, description: "Criação de `FocusNode` no build()" },
  { regex: /GlobalKey\s*\(/, description: "Criação de `GlobalKey` no build()" },
  { regex: /StreamController\s*[.<(]/, description: "Criação de `StreamController` no build()" },
  { regex: /Timer\s*\./, description: "Criação de `Timer` no build()" },
  { regex: /http\.\w+\s*\(|dio\.\w+\s*\(|fetch\s*\(/, description: "Chamada HTTP no build()" },
  { regex: /jsonDecode\s*\(|jsonEncode\s*\(|json\.decode/, description: "Parse JSON no build()" },
  { regex: /RegExp\s*\(/, description: "Criação de `RegExp` no build()" },
  {
    regex: /DateTime\.now\s*\(/,
    description: "`DateTime.now()` no build() — valor muda a cada rebuild",
  },
];

export default createPlugin(
  {
    name: "flutter-performance",
    description: "Detecta operações custosas no build()",
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

      const buildStart = findBuildMethodStart(lines);
      if (buildStart === -1) continue;

      const preReturnLines = extractPreReturnLines(lines, buildStart);
      if (preReturnLines.length === 0) continue;

      for (const { lineIndex, text } of preReturnLines) {
        for (const pattern of HEAVY_PATTERNS) {
          if (pattern.regex.test(text)) {
            sendFail(
              `OPERAÇÃO CUSTOSA NO BUILD()

${pattern.description}

### Problema Identificado

\`build()\` é chamado a cada rebuild do widget. Operações pesadas aqui causam **jank** (queda de FPS).

\`\`\`dart
${text.trim()}
\`\`\`

### 🎯 AÇÃO NECESSÁRIA

Mova para \`initState()\`, campo da classe, ou compute fora do build:

\`\`\`dart
// ❌ Dentro do build()
Widget build(BuildContext context) {
  final sorted = items.sort(); // roda a cada rebuild
  return ListView(...);
}

// ✅ Fora do build()
late final sorted = items..sort(); // computa uma vez

Widget build(BuildContext context) {
  return ListView(children: sorted.map(...));
}
\`\`\`

### 🚀 Objetivo

Manter **60fps** com builds rápidos.

📖 [Flutter Performance Best Practices](https://docs.flutter.dev/perf/best-practices)`,
              file,
              lineIndex + 1
            );
            break;
          }
        }
      }
    }
  }
);

/**
 * Encontra a linha onde o método build() começa.
 */
function findBuildMethodStart(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/Widget\s+build\s*\(\s*BuildContext/)) {
      return i;
    }
  }
  return -1;
}

/**
 * Extrai as linhas entre o início do build() e o primeiro `return`.
 * Essas são as linhas onde operações pesadas não deveriam estar.
 *
 * Se o build usa arrow syntax (=>), não há código antes do return — retorna vazio.
 */
function extractPreReturnLines(
  lines: string[],
  buildStart: number
): { lineIndex: number; text: string }[] {
  const buildLine = lines[buildStart];

  if (buildLine.includes("=>")) return [];

  let braceCount = 0;
  let foundOpenBrace = false;
  const result: { lineIndex: number; text: string }[] = [];

  for (let i = buildStart; i < lines.length; i++) {
    const line = lines[i];

    for (const ch of line) {
      if (ch === "{") {
        braceCount++;
        foundOpenBrace = true;
      }
      if (ch === "}") braceCount--;
    }

    if (!foundOpenBrace) continue;

    if (i > buildStart) {
      const trimmed = line.trim();

      if (trimmed.startsWith("return ") || trimmed === "return") {
        break;
      }

      if (trimmed.length > 0 && !trimmed.startsWith("//") && !trimmed.startsWith("///")) {
        result.push({ lineIndex: i, text: line });
      }
    }

    if (foundOpenBrace && braceCount <= 0) break;
  }

  return result;
}
