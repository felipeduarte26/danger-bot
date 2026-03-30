/**
 * Flutter Widgets Plugin
 * Verifica ordem dos métodos em classes de widgets/states:
 *
 * Ordem correta (Clean Code):
 * 1. @override methods (lifecycle: initState, didChangeDependencies, build, dispose, etc.)
 * 2. Public methods
 * 3. Private methods (_prefixo)
 *
 * Analisa o arquivo completo e trata cada classe separadamente.
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

type MethodKind = "override" | "public" | "private";

interface MethodInfo {
  name: string;
  kind: MethodKind;
  line: number;
}

const KIND_ORDER: Record<MethodKind, number> = {
  override: 0,
  public: 1,
  private: 2,
};

export default createPlugin(
  {
    name: "flutter-widgets",
    description: "Verifica ordem dos métodos em widgets Flutter",
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

      if (!content.includes("extends State<") && !content.includes("extends StatelessWidget")) {
        continue;
      }

      const lines = content.split("\n");
      const classes = extractClasses(lines);

      for (const cls of classes) {
        const methods = extractMethods(lines, cls.startLine, cls.endLine);
        if (methods.length < 2) continue;

        const violation = findOrderViolation(methods);
        if (violation) {
          sendFormattedFail({
            title: "ORDEM DE MÉTODOS INCORRETA",
            description: `Classe \`${cls.name}\`: método \`${violation.offender.name}\` (${kindLabel(violation.offender.kind)}) aparece **antes** de \`${violation.shouldBeAfter.name}\` (${kindLabel(violation.shouldBeAfter.kind)}).`,
            problem: {
              wrong: `class ${cls.name} {\n  void _privateMethod() { ... }  // privado\n  @override\n  Widget build(...) { ... }       // @override\n}`,
              correct: `class ${cls.name} {\n  @override\n  Widget build(...) { ... }       // 1️⃣ @override\n  void handleTap() { ... }        // 2️⃣ público\n  void _privateMethod() { ... }   // 3️⃣ privado\n}`,
              wrongLabel: "Ordem incorreta",
              correctLabel: "Ordem correta: @override → público → privado",
            },
            action: {
              text: "Reorganize os métodos seguindo a ordem:",
              code: `// 1️⃣ @override methods (lifecycle)\n@override void initState() { ... }\n@override Widget build(...) { ... }\n@override void dispose() { ... }\n\n// 2️⃣ Public methods\nvoid handleTap() { ... }\n\n// 3️⃣ Private methods\nvoid _loadData() { ... }`,
            },
            objective: "Manter **consistência** e facilitar **leitura** do código.",
            reference: {
              text: "Effective Dart: Style",
              url: "https://dart.dev/effective-dart/style",
            },
            file,
            line: violation.offender.line,
          });
        }
      }
    }
  }
);

interface ClassBlock {
  name: string;
  startLine: number;
  endLine: number;
}

function extractClasses(lines: string[]): ClassBlock[] {
  const classes: ClassBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/class\s+(\w+)\s+extends\s+(?:State<\w+>|StatelessWidget)/);
    if (!match) continue;

    let braceCount = 0;
    let started = false;
    let endLine = i;

    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === "{") {
          braceCount++;
          started = true;
        }
        if (ch === "}") braceCount--;
      }
      if (started && braceCount <= 0) {
        endLine = j;
        break;
      }
    }

    classes.push({ name: match[1], startLine: i, endLine });
  }

  return classes;
}

function extractMethods(lines: string[], startLine: number, endLine: number): MethodInfo[] {
  const methods: MethodInfo[] = [];
  let depth = 0;
  let classBodyStarted = false;

  for (let i = startLine; i <= endLine; i++) {
    const line = lines[i];

    for (const ch of line) {
      if (ch === "{") {
        depth++;
        classBodyStarted = true;
      }
      if (ch === "}") depth--;
    }

    if (!classBodyStarted || depth !== 1) continue;

    const trimmed = line.trim();
    if (
      trimmed.startsWith("with ") ||
      trimmed.startsWith("extends ") ||
      trimmed.startsWith("implements ") ||
      trimmed.startsWith("final ") ||
      trimmed.startsWith("late ") ||
      trimmed.startsWith("var ") ||
      trimmed.startsWith("const ") ||
      trimmed.startsWith("///") ||
      trimmed.startsWith("//")
    )
      continue;

    const methodMatch = line.match(/^\s+(?:[\w<>,?\s]+)\s+([a-zA-Z_]\w*)\s*[(<]/);
    if (!methodMatch) continue;

    const name = methodMatch[1];
    if (name === "const" || name === "super" || name === "factory" || name === "operator") continue;
    if (line.includes("static ")) continue;
    if (line.includes(" = ") || line.trimEnd().endsWith(";")) continue;

    const isOverride = i > 0 && lines[i - 1].trim() === "@override";
    const isPrivate = name.startsWith("_");

    let kind: MethodKind;
    if (isOverride) {
      kind = "override";
    } else if (isPrivate) {
      kind = "private";
    } else {
      kind = "public";
    }

    methods.push({ name, kind, line: i + 1 });
  }

  return methods;
}

function findOrderViolation(
  methods: MethodInfo[]
): { offender: MethodInfo; shouldBeAfter: MethodInfo } | null {
  for (let i = 1; i < methods.length; i++) {
    const current = methods[i];
    const previous = methods[i - 1];

    if (KIND_ORDER[current.kind] < KIND_ORDER[previous.kind]) {
      return { offender: previous, shouldBeAfter: current };
    }
  }
  return null;
}

function kindLabel(kind: MethodKind): string {
  switch (kind) {
    case "override":
      return "@override";
    case "public":
      return "público";
    case "private":
      return "privado";
  }
}
