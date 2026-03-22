"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
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
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const KIND_ORDER = {
  override: 0,
  public: 1,
  private: 2,
};
exports.default = (0, _types_1.createPlugin)(
  {
    name: "flutter-widgets",
    description: "Verifica ordem dos métodos em widgets Flutter",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f) =>
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
          (0, _types_1.sendFail)(
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
function extractClasses(lines) {
  const classes = [];
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
function extractMethods(lines, startLine, endLine) {
  const methods = [];
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
    let kind;
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
function findOrderViolation(methods) {
  for (let i = 1; i < methods.length; i++) {
    const current = methods[i];
    const previous = methods[i - 1];
    if (KIND_ORDER[current.kind] < KIND_ORDER[previous.kind]) {
      return { offender: previous, shouldBeAfter: current };
    }
  }
  return null;
}
function kindLabel(kind) {
  switch (kind) {
    case "override":
      return "@override";
    case "public":
      return "público";
    case "private":
      return "privado";
  }
}
