/**
 * Flutter Widgets Plugin
 * Verifica ordem dos membros em classes de widgets/states seguindo
 * Vertical Ordering (Clean Code, Cap. 5):
 *
 * 1. Construtores
 * 2. Factory / named constructors
 * 3. @override methods (lifecycle: initState, didChangeDependencies, build, dispose, etc.)
 * 4. Métodos públicos
 * 5. Métodos privados (_prefixo)
 *
 * Analisa o arquivo completo e trata cada classe separadamente.
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

type MethodKind = "constructor" | "factory" | "override" | "public" | "private";

interface MethodInfo {
  name: string;
  kind: MethodKind;
  line: number;
}

const KIND_ORDER: Record<MethodKind, number> = {
  constructor: 0,
  factory: 1,
  override: 2,
  public: 3,
  private: 4,
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
        !f.endsWith("_test.dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        fs.existsSync(f)
    );

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");

      if (!content.includes("extends State<") && !content.includes("extends StatelessWidget")) {
        continue;
      }

      const lines = content.replace(/\r/g, "").split("\n");
      const classes = extractClasses(lines);

      for (const cls of classes) {
        const methods = extractMethods(lines, cls.startLine, cls.endLine, cls.name);
        if (methods.length < 2) continue;

        const violation = findOrderViolation(methods);
        if (violation) {
          sendFormattedFail({
            title: "ORDEM DE MÉTODOS INCORRETA",
            description: `Classe \`${cls.name}\`: método \`${violation.offender.name}\` (${kindLabel(violation.offender.kind)}) aparece **antes** de \`${violation.shouldBeAfter.name}\` (${kindLabel(violation.shouldBeAfter.kind)}).`,
            problem: {
              wrong: `class ${cls.name} {\n  void _helper() { ... }           // privado\n  @override\n  Widget build(...) { ... }        // @override\n  ${cls.name}({super.key});          // construtor\n}`,
              correct: `class ${cls.name} {\n  ${cls.name}({super.key});                    // 1️⃣ construtor\n  factory ${cls.name}.create() => ...;       // 2️⃣ factory\n  @override\n  Widget build(...) { ... }        // 3️⃣ @override\n  void handleTap() { ... }         // 4️⃣ público\n  void _helper() { ... }           // 5️⃣ privado\n}`,
              wrongLabel: "Ordem incorreta",
              correctLabel:
                "Vertical Ordering: construtor → factory → @override → público → privado",
            },
            action: {
              text: "Reorganize os membros seguindo Vertical Ordering:",
              code: `// 1️⃣ Construtores\n${cls.name}({super.key});\n\n// 2️⃣ Factory / named constructors\nfactory ${cls.name}.create() => ${cls.name}._();\n\n// 3️⃣ @override methods (lifecycle)\n@override void initState() { ... }\n@override Widget build(...) { ... }\n@override void dispose() { ... }\n\n// 4️⃣ Métodos públicos\nvoid handleTap() { ... }\n\n// 5️⃣ Métodos privados\nvoid _loadData() { ... }`,
            },
            objective:
              "O conceito de **Vertical Ordering** (Clean Code, Cap. 5 — Robert C. Martin) diz que o código deve parecer um jornal: o leitor entende o contexto geral antes de se aprofundar nos detalhes técnicos. Essa ordem combina esse princípio com a convenção prática de organização de membros em projetos Dart/Flutter.",
            reference: {
              text: "Clean Code (Robert C. Martin) — Capítulo 5: Formatação › Vertical Ordering",
              url: "https://drive.google.com/file/d/0B9eZlIWAs3-sN3NRbktQNVFUN3l2cTBBcXN4Y3FaUQ/view?resourcekey=0-ZafqCRtyIP8Zw0CKviW5Gw",
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

const WIDGET_METHOD_KEYWORDS = new Set([
  "const",
  "super",
  "operator",
  "static",
  "abstract",
  "external",
  "new",
  "return",
  "if",
  "for",
  "while",
  "switch",
  "var",
  "final",
  "late",
  "void",
  "class",
  "enum",
  "mixin",
  "extension",
  "throw",
  "try",
  "catch",
  "assert",
  "await",
  "async",
  "get",
  "set",
  "required",
  "covariant",
  "yield",
]);

const WIDGET_METHOD_WITH_TYPE_RE =
  /^\s+(?:static\s+)?(?:Future<[^>]*(?:<[^>]*>)*>|Stream<[^>]*(?:<[^>]*>)*>|void|bool|int|double|String|Widget|List<[^>]*>|Map<[^>]*>|Set<[^>]*>|[A-Za-z_][\w<>,? ]*)\s+([a-zA-Z_]\w*)\s*[(<]/;

const WIDGET_METHOD_NAME_ONLY_RE = /^\s+([a-zA-Z_]\w*)\s*[(<]/;

function hasOverrideAbove(lines: string[], idx: number): boolean {
  for (let k = idx - 1; k >= Math.max(0, idx - 5); k--) {
    const t = lines[k].trim();
    if (t === "@override") return true;
    if (
      t === "" ||
      t.startsWith("//") ||
      t.startsWith("///") ||
      t.startsWith("*") ||
      t.startsWith("@")
    )
      continue;
    if (!t.includes("=") && !t.endsWith(";") && !t.endsWith("{") && !t.endsWith("}")) continue;
    break;
  }
  return false;
}

function extractMethods(
  lines: string[],
  startLine: number,
  endLine: number,
  className: string
): MethodInfo[] {
  const methods: MethodInfo[] = [];
  let depth = 0;
  let classBodyStarted = false;
  let inArrowBody = false;
  let openParens = 0;

  const esc = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const factoryRe = new RegExp(`^\\s+factory\\s+${esc}(?:\\.(\\w+))?\\s*\\(`);
  const constCtorRe = new RegExp(`^\\s+const\\s+${esc}(?:\\.(\\w+))?\\s*\\(`);
  const ctorRe = new RegExp(`^\\s+${esc}(?:\\.(\\w+))?\\s*\\(`);

  for (let i = startLine; i <= endLine; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const depthBefore = depth;

    for (const ch of line) {
      if (ch === "{") {
        depth++;
        classBodyStarted = true;
      }
      if (ch === "}") depth--;
    }

    if (inArrowBody) {
      if (depth <= 1 && trimmed.endsWith(";")) {
        inArrowBody = false;
      }
      if (inArrowBody) continue;
    }

    // Skip lines inside unbalanced parentheses (multi-line signatures)
    if (openParens > 0) {
      const lineOpen = (line.match(/\(/g) || []).length;
      const lineClose = (line.match(/\)/g) || []).length;
      openParens += lineOpen - lineClose;
      if (openParens <= 0) openParens = 0;
      continue;
    }

    if (!classBodyStarted || depthBefore !== 1) continue;

    // Skip comments, annotations, empty lines
    if (
      trimmed.startsWith("///") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("@") ||
      trimmed.length === 0
    )
      continue;

    // --- Constructor / Factory detection (before general skip logic) ---

    const factoryMatch = line.match(factoryRe);
    if (factoryMatch) {
      const name = factoryMatch[1] ? `${className}.${factoryMatch[1]}` : className;
      methods.push({ name, kind: "factory", line: i + 1 });
      trackOpenParens(line);
      if (line.includes("=>") && !trimmed.endsWith(";")) inArrowBody = true;
      continue;
    }

    const constCtorMatch = line.match(constCtorRe);
    if (constCtorMatch) {
      const name = constCtorMatch[1] ? `${className}.${constCtorMatch[1]}` : className;
      methods.push({ name, kind: "constructor", line: i + 1 });
      trackOpenParens(line);
      if (line.includes("=>") && !trimmed.endsWith(";")) inArrowBody = true;
      continue;
    }

    const ctorMatch = line.match(ctorRe);
    if (ctorMatch) {
      const name = ctorMatch[1] ? `${className}.${ctorMatch[1]}` : className;
      methods.push({ name, kind: "constructor", line: i + 1 });
      trackOpenParens(line);
      if (line.includes("=>") && !trimmed.endsWith(";")) inArrowBody = true;
      continue;
    }

    // --- General skip logic for non-method lines ---
    if (
      trimmed.startsWith("with ") ||
      trimmed.startsWith("extends ") ||
      trimmed.startsWith("implements ") ||
      trimmed.startsWith("final ") ||
      trimmed.startsWith("late ") ||
      trimmed.startsWith("var ") ||
      trimmed.startsWith("const ") ||
      trimmed.startsWith("set ")
    ) {
      if (depthBefore === 1 && line.includes("=>") && !trimmed.endsWith(";")) {
        inArrowBody = true;
      }
      continue;
    }

    // --- Regular method detection ---
    let methodMatch = line.match(WIDGET_METHOD_WITH_TYPE_RE);

    if (!methodMatch) {
      const simpleMatch = line.match(WIDGET_METHOD_NAME_ONLY_RE);
      if (simpleMatch) methodMatch = simpleMatch;
    }

    if (!methodMatch) {
      if (line.includes("=>") && !trimmed.endsWith(";")) {
        inArrowBody = true;
      }
      continue;
    }

    const name = methodMatch[1];
    if (WIDGET_METHOD_KEYWORDS.has(name)) continue;
    if (line.includes("static ")) continue;

    // Skip field declarations: " = " before first "("
    const firstParen = line.indexOf("(");
    const eqSign = line.indexOf(" = ");
    if (eqSign !== -1 && (firstParen === -1 || eqSign < firstParen)) continue;

    // No `(` on the line → can't be a method/constructor declaration
    if (firstParen === -1) continue;

    const isOverride = hasOverrideAbove(lines, i);
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
    trackOpenParens(line);

    if (line.includes("=>") && !trimmed.endsWith(";")) {
      inArrowBody = true;
    }
  }

  return methods;

  function trackOpenParens(line: string): void {
    const lineOpen = (line.match(/\(/g) || []).length;
    const lineClose = (line.match(/\)/g) || []).length;
    const delta = lineOpen - lineClose;
    if (delta > 0) openParens = delta;
  }
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
    case "constructor":
      return "construtor";
    case "factory":
      return "factory/named constructor";
    case "override":
      return "@override";
    case "public":
      return "público";
    case "private":
      return "privado";
  }
}
