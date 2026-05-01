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

        const violators = findViolators(methods);
        if (violators.length === 0) continue;

        const sorted = [...methods].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);

        for (const violator of violators) {
          sendFormattedFail({
            title: "ORDEM DE MÉTODOS INCORRETA",
            description: `Classe \`${cls.name}\`: método \`${violator.name}\` (${kindLabel(violator.kind)}) está fora da ordem Vertical Ordering.`,
            problem: {
              wrong: formatMethodList(cls.name, methods),
              correct: formatMethodList(cls.name, sorted),
              wrongLabel: "Ordem atual",
              correctLabel: "Ordem correta (Vertical Ordering)",
            },
            action: {
              text: "Reorganize os membros seguindo Vertical Ordering:",
              code: buildActionCode(sorted),
            },
            objective:
              "O conceito de **Vertical Ordering** (Clean Code, Cap. 5 — Robert C. Martin) diz que o código deve parecer um jornal: o leitor entende o contexto geral antes de se aprofundar nos detalhes técnicos.",
            reference: {
              text: "Clean Code (Robert C. Martin) — Capítulo 5: Formatação › Vertical Ordering",
              url: "https://drive.google.com/file/d/0B9eZlIWAs3-sN3NRbktQNVFUN3l2cTBBcXN4Y3FaUQ/view?resourcekey=0-ZafqCRtyIP8Zw0CKviW5Gw",
            },
            file,
            line: violator.line,
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

const DART_FUNCTION_TYPE_ALIASES = new Set([
  "VoidCallback",
  "AsyncCallback",
  "ValueChanged",
  "ValueSetter",
  "ValueGetter",
  "StateSetter",
  "WidgetBuilder",
  "TransitionBuilder",
  "IndexedWidgetBuilder",
  "NullableIndexedWidgetBuilder",
  "FormFieldValidator",
  "FormFieldSetter",
  "FormFieldBuilder",
  "ValueWidgetBuilder",
  "GestureTapCallback",
  "GestureTapDownCallback",
  "GestureTapUpCallback",
  "GestureTapCancelCallback",
  "GestureLongPressCallback",
  "GestureDragStartCallback",
  "GestureDragUpdateCallback",
  "GestureDragEndCallback",
  "GestureScaleStartCallback",
  "GestureScaleUpdateCallback",
  "GestureScaleEndCallback",
  "DismissDirectionCallback",
  "ControllerCallback",
  "ErrorCallback",
  "NotifierCallback",
  "Function",
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

    if (WIDGET_METHOD_KEYWORDS.has(name)) {
      trackOpenParens(line);
      if (line.includes("=>") && !trimmed.endsWith(";")) inArrowBody = true;
      continue;
    }
    if (DART_FUNCTION_TYPE_ALIASES.has(name)) {
      trackOpenParens(line);
      if (line.includes("=>") && !trimmed.endsWith(";")) inArrowBody = true;
      continue;
    }
    if (line.includes("static ")) {
      trackOpenParens(line);
      if (line.includes("=>") && !trimmed.endsWith(";")) inArrowBody = true;
      continue;
    }

    // Skip field declarations: " = " before first "("
    const firstParen = line.indexOf("(");
    const eqSign = line.indexOf(" = ");
    if (eqSign !== -1 && (firstParen === -1 || eqSign < firstParen)) continue;

    // No `(` on the line → can't be a method/constructor declaration
    if (firstParen === -1) continue;

    // Skip function-type fields: `Function(int) callback;` / `void Function(int)? onChanged;`
    if (trimmed.endsWith(";") && /\)\??\s+\w+\s*;$/.test(trimmed)) continue;

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

/**
 * Retorna todos os métodos que estão fora de ordem.
 * Um método é "violador" se existe algum método posterior com KIND_ORDER menor.
 */
function findViolators(methods: MethodInfo[]): MethodInfo[] {
  const violators: MethodInfo[] = [];
  for (let i = 0; i < methods.length; i++) {
    for (let j = i + 1; j < methods.length; j++) {
      if (KIND_ORDER[methods[j].kind] < KIND_ORDER[methods[i].kind]) {
        violators.push(methods[i]);
        break;
      }
    }
  }
  return violators;
}

/**
 * Formata a lista de métodos para o bloco de código wrong/correct.
 */
function formatMethodList(className: string, methods: MethodInfo[]): string {
  const maxLen = Math.max(...methods.map((m) => m.name.length + 2));
  const lines = methods.map((m) => {
    const call = `${m.name}()`;
    const pad = " ".repeat(Math.max(1, maxLen - call.length + 2));
    return `  ${call}${pad}// ${kindLabel(m.kind)}`;
  });
  return `class ${className} {\n${lines.join("\n")}\n}`;
}

/**
 * Gera o bloco de ação com os métodos reais agrupados por kind.
 */
function buildActionCode(sorted: MethodInfo[]): string {
  const groups: string[] = [];
  let currentKind: MethodKind | null = null;

  for (const m of sorted) {
    if (m.kind !== currentKind) {
      if (groups.length > 0) groups.push("");
      groups.push(`// ${kindLabel(m.kind)}`);
      currentKind = m.kind;
    }
    groups.push(`${m.name}()`);
  }

  return groups.join("\n");
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
