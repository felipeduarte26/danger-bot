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
import { createPlugin, getDanger, sendFail } from "@types";
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
          sendFail(
            `ORDEM DE MÉTODOS INCORRETA

Classe \`${cls.name}\`: método \`${violation.offender.name}\` (${kindLabel(violation.offender.kind)}) aparece **antes** de \`${violation.shouldBeAfter.name}\` (${kindLabel(violation.shouldBeAfter.kind)}).

### Problema Identificado

A ordem correta dos métodos é:

1. **@override** — lifecycle (initState, build, dispose, etc.)
2. **Públicos** — métodos acessíveis externamente
3. **Privados** — métodos com prefixo \`_\`

\`\`\`dart
class ${cls.name} extends State<...> {
  // 1️⃣ @override methods
  @override
  void initState() { ... }

  @override
  Widget build(BuildContext context) { ... }

  @override
  void dispose() { ... }

  // 2️⃣ Public methods
  void handleTap() { ... }

  // 3️⃣ Private methods
  void _loadData() { ... }
  void _formatValue() { ... }
}
\`\`\`

### 🚀 Objetivo

Manter **consistência** e facilitar **leitura** do código.

📖 [Effective Dart: Style](https://dart.dev/effective-dart/style)`,
            file,
            violation.offender.line
          );
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

    const methodMatch = line.match(/^\s+(?:[\w<>,?\s]+)\s+([a-zA-Z_]\w*)\s*[(<]/);
    if (!methodMatch) continue;

    const name = methodMatch[1];
    if (name === "const" || name === "super" || name === "factory" || name === "operator") continue;
    if (line.includes("static ")) continue;

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
