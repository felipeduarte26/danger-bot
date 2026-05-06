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
 * Flutter Performance Plugin
 * Detecta operações custosas ANTES do return no método build().
 *
 * O build() roda a cada rebuild. Operações pesadas antes do return
 * (loops, sorts, criação de controllers, variáveis computadas)
 * devem ser movidas para initState, didChangeDependencies, ou campos da classe.
 *
 * NÃO verifica código dentro de callbacks de widgets (onTap, builder, etc.)
 * porque esses rodam sob demanda, não a cada rebuild.
 *
 * v2 — Melhorias:
 *  - Suporte a statements multi-linha (junta linhas quebradas)
 *  - Múltiplos build() por arquivo (múltiplos widgets)
 *  - Depth tracking correto (return dentro de closures não para o parser)
 *  - String/comment-aware brace counting
 *  - Mais patterns de operações custosas
 */
const _types_1 = require("@types");
const fs = __importStar(require("fs"));
const HEAVY_PATTERNS = [
  // ── Loops ──
  { regex: /\bfor\s*\(/, description: "Loop `for` no build()" },
  { regex: /\bwhile\s*\(/, description: "Loop `while` no build()" },
  { regex: /\bdo\s*\{/, description: "Loop `do-while` no build()" },
  // ── Ordenação / reversão de coleções ──
  { regex: /\.sort\s*\(/, description: "`.sort()` no build()" },
  { regex: /\.reversed\b/, description: "`.reversed` no build()" },
  // ── Criação de Controllers / Nodes / Notifiers ──
  {
    regex: /TextEditingController\s*\(/,
    description: "Criação de `TextEditingController` no build()",
  },
  {
    regex: /AnimationController\s*\(/,
    description: "Criação de `AnimationController` no build()",
  },
  { regex: /ScrollController\s*\(/, description: "Criação de `ScrollController` no build()" },
  { regex: /PageController\s*\(/, description: "Criação de `PageController` no build()" },
  { regex: /TabController\s*\(/, description: "Criação de `TabController` no build()" },
  { regex: /FocusNode\s*\(/, description: "Criação de `FocusNode` no build()" },
  { regex: /GlobalKey\s*[<(]/, description: "Criação de `GlobalKey` no build()" },
  { regex: /StreamController\s*[.<(]/, description: "Criação de `StreamController` no build()" },
  { regex: /ValueNotifier\s*[<(]/, description: "Criação de `ValueNotifier` no build()" },
  { regex: /OverlayEntry\s*\(/, description: "Criação de `OverlayEntry` no build()" },
  // ── Timer ──
  { regex: /Timer\s*\./, description: "Criação de `Timer` no build()" },
  { regex: /Timer\s*\(/, description: "Criação de `Timer` no build()" },
  // ── HTTP / Network ──
  { regex: /http\.\w+\s*\(/, description: "Chamada HTTP no build()" },
  { regex: /dio\.\w+\s*\(/, description: "Chamada HTTP (Dio) no build()" },
  { regex: /\bfetch\s*\(/, description: "Chamada `fetch()` no build()" },
  // ── JSON parsing ──
  { regex: /jsonDecode\s*\(/, description: "`jsonDecode()` no build()" },
  { regex: /jsonEncode\s*\(/, description: "`jsonEncode()` no build()" },
  { regex: /json\.decode\s*\(/, description: "`json.decode()` no build()" },
  { regex: /json\.encode\s*\(/, description: "`json.encode()` no build()" },
  // ── RegExp ──
  { regex: /RegExp\s*\(/, description: "Criação de `RegExp` no build()" },
  // ── DateTime.now ──
  {
    regex: /DateTime\.now\s*\(/,
    description: "`DateTime.now()` no build() — valor muda a cada rebuild",
  },
  // ── Objetos pesados ──
  {
    regex: /ThemeData\s*\(/,
    description: "Criação de `ThemeData` no build() — objeto pesado recriado a cada rebuild",
  },
  // ── Futures iniciados no build ──
  { regex: /Future\.wait\s*\(/, description: "`Future.wait()` no build()" },
  { regex: /Future\.delayed\s*\(/, description: "`Future.delayed()` no build()" },
  { regex: /Future\.microtask\s*\(/, description: "`Future.microtask()` no build()" },
  // ── File I/O ──
  { regex: /\bFile\s*\(/, description: "Operação de `File` no build()" },
  { regex: /rootBundle\.load/, description: "Carregamento de asset (`rootBundle`) no build()" },
  // ── Compute / Isolate ──
  { regex: /\bcompute\s*[<(]/, description: "`compute()` no build()" },
  { regex: /Isolate\.spawn/, description: "`Isolate.spawn()` no build()" },
  // ── Platform Channels ──
  { regex: /MethodChannel\s*\(/, description: "Criação de `MethodChannel` no build()" },
  { regex: /EventChannel\s*\(/, description: "Criação de `EventChannel` no build()" },
];
exports.default = (0, _types_1.createPlugin)(
  {
    name: "flutter-performance",
    description: "Detecta operações custosas no build()",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f) =>
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        !f.endsWith(".mocks.dart") &&
        fs.existsSync(f)
    );
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const buildStarts = findAllBuildMethods(lines);
      if (buildStarts.length === 0) continue;
      for (const buildStart of buildStarts) {
        const statements = extractPreReturnStatements(lines, buildStart);
        for (const stmt of statements) {
          for (const pattern of HEAVY_PATTERNS) {
            if (pattern.regex.test(stmt.text)) {
              const displayCode =
                stmt.text.length > 120 ? stmt.text.substring(0, 117) + "..." : stmt.text;
              (0, _types_1.sendFormattedFail)({
                title: "OPERAÇÃO CUSTOSA NO BUILD()",
                description: `${pattern.description}. \`build()\` é chamado a cada rebuild — operações pesadas aqui causam **jank** (queda de FPS).`,
                problem: {
                  wrong: `Widget build(BuildContext context) {\n  ${displayCode}\n  return ...;\n}`,
                  correct: `late final result = heavyOperation();\n\nWidget build(BuildContext context) {\n  return Widget(data: result);\n}`,
                  wrongLabel: "Dentro do build() — roda a cada rebuild",
                  correctLabel: "Fora do build() — computa uma vez",
                },
                action: {
                  text: "Mova para `initState()`, `didChangeDependencies()`, campo da classe, ou compute fora do build:",
                  code: displayCode,
                },
                objective: "Manter **60fps** com builds rápidos.",
                reference: {
                  text: "Flutter Performance Best Practices",
                  url: "https://docs.flutter.dev/perf/best-practices",
                },
                file,
                line: stmt.startLine + 1,
              });
              break;
            }
          }
        }
      }
    }
  }
);
/**
 * Encontra TODOS os métodos build() no arquivo.
 * Suporta assinatura multi-linha (Widget build(\n  BuildContext context\n)).
 */
function findAllBuildMethods(lines) {
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].match(/Widget\s+build\b\s*\(/)) continue;
    const window = lines.slice(i, Math.min(i + 4, lines.length)).join(" ");
    if (window.match(/Widget\s+build\b\s*\([^)]*BuildContext/)) {
      starts.push(i);
    }
  }
  return starts;
}
/**
 * Computa a variação de depth (braces) em uma linha,
 * ignorando braces dentro de strings e comentários.
 */
function computeDepthDelta(line) {
  let delta = 0;
  let inString = false;
  let stringChar = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = i + 1 < line.length ? line[i + 1] : "";
    if (inString) {
      if (ch === "\\" && i + 1 < line.length) {
        i++;
        continue;
      }
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }
    if (ch === "/" && next === "/") break;
    if (ch === "/" && next === "*") {
      const closeIdx = line.indexOf("*/", i + 2);
      if (closeIdx >= 0) {
        i = closeIdx + 1;
        continue;
      }
      break;
    }
    if (ch === "'" || ch === '"') {
      if (line.substring(i, i + 3) === "'''" || line.substring(i, i + 3) === '"""') {
        break;
      }
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "{") delta++;
    if (ch === "}") delta--;
  }
  return delta;
}
/**
 * Extrai statements do build() ANTES do primeiro return no nível top-level.
 *
 * - Junta linhas quebradas em statements lógicos (delimitados por `;` no depth 1)
 * - Ignora `return` dentro de closures/lambdas (depth > 1)
 * - Ignora comentários e linhas em branco
 */
function extractPreReturnStatements(lines, buildStart) {
  if (isArrowFunction(lines, buildStart)) return [];
  const statements = [];
  let depth = 0;
  let foundBody = false;
  let currentStmtParts = [];
  let stmtStartLine = -1;
  for (let i = buildStart; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const depthBefore = depth;
    depth += computeDepthDelta(line);
    if (!foundBody) {
      if (depth >= 1) foundBody = true;
      continue;
    }
    if (depth <= 0) break;
    if (currentStmtParts.length === 0) {
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("///")) continue;
      if (depthBefore === 1 && isReturnLine(trimmed)) break;
    }
    if (trimmed.length > 0) {
      if (stmtStartLine === -1) stmtStartLine = i;
      currentStmtParts.push(trimmed);
    }
    if (depth === 1 && lineContainsSemicolonOutsideStrings(line)) {
      if (currentStmtParts.length > 0) {
        statements.push({
          startLine: stmtStartLine,
          text: currentStmtParts.join(" "),
        });
      }
      currentStmtParts = [];
      stmtStartLine = -1;
    }
  }
  return statements;
}
function isArrowFunction(lines, buildStart) {
  const window = lines.slice(buildStart, Math.min(buildStart + 3, lines.length)).join(" ");
  return /Widget\s+build\s*\([^)]*\)\s*=>/.test(window);
}
function isReturnLine(trimmed) {
  return (
    trimmed === "return" ||
    trimmed === "return;" ||
    trimmed.startsWith("return ") ||
    trimmed.startsWith("return\t")
  );
}
/**
 * Verifica se a linha contém `;` fora de strings (nível superficial).
 * Usado para detectar fim de statement.
 */
function lineContainsSemicolonOutsideStrings(line) {
  let inString = false;
  let stringChar = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = i + 1 < line.length ? line[i + 1] : "";
    if (inString) {
      if (ch === "\\" && i + 1 < line.length) {
        i++;
        continue;
      }
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }
    if (ch === "/" && next === "/") return false;
    if (ch === "'" || ch === '"') {
      if (line.substring(i, i + 3) === "'''" || line.substring(i, i + 3) === '"""') {
        return false;
      }
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === ";") return true;
  }
  return false;
}
