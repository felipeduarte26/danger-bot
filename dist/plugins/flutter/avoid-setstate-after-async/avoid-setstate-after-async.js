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
 * Avoid setState After Async Plugin
 * Detecta chamadas de setState() após await sem verificar `mounted`.
 *
 * Após um await, o widget pode ter sido desmontado (usuário navegou para
 * outra tela). Chamar setState() nesse caso causa:
 *   "setState() called after dispose()"
 *
 * Solução: verificar `if (!mounted) return;` antes do setState().
 *
 * Este plugin emite WARNING (não fail) pois pode haver casos onde o
 * mounted check está em um nível acima ou em um helper.
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
function findSetStateAfterAwait(lines) {
  const issues = [];
  let inStateClass = false;
  let inAsyncMethod = false;
  let braceDepthClass = 0;
  let braceDepthMethod = 0;
  let lastAwaitLine = -1;
  let hasMountedCheck = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("///")) continue;
    if (line.match(/class\s+\w+\s+extends\s+(?:State|ViewState)</)) {
      inStateClass = true;
      braceDepthClass = 0;
    }
    if (!inStateClass) continue;
    for (const ch of line) {
      if (ch === "{") braceDepthClass++;
      if (ch === "}") braceDepthClass--;
    }
    if (braceDepthClass <= 0 && inStateClass && line.includes("}")) {
      inStateClass = false;
      inAsyncMethod = false;
      continue;
    }
    if (trimmed.match(/\basync\b/) && (trimmed.includes("(") || trimmed.includes("=>"))) {
      inAsyncMethod = true;
      braceDepthMethod = 0;
      lastAwaitLine = -1;
      hasMountedCheck = false;
    }
    if (inAsyncMethod) {
      for (const ch of line) {
        if (ch === "{") braceDepthMethod++;
        if (ch === "}") braceDepthMethod--;
      }
      if (trimmed.match(/\bawait\b/)) {
        lastAwaitLine = i + 1;
        hasMountedCheck = false;
      }
      if (trimmed.match(/\bmounted\b/)) {
        hasMountedCheck = true;
      }
      if (lastAwaitLine > 0 && !hasMountedCheck && trimmed.match(/\bsetState\s*\(/)) {
        issues.push({ file: "", line: i + 1, awaitLine: lastAwaitLine });
      }
      if (braceDepthMethod <= 0 && inAsyncMethod && line.includes("}")) {
        inAsyncMethod = false;
        lastAwaitLine = -1;
        hasMountedCheck = false;
      }
    }
  }
  return issues;
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "avoid-setstate-after-async",
    description: "Detecta chamadas de setState após await sem verificar mounted",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f) =>
        f.endsWith(".dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        !f.endsWith("_test.dart") &&
        fs.existsSync(f)
    );
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (!content.includes("extends State<") && !content.includes("extends ViewState<")) continue;
      if (!content.includes("setState")) continue;
      const lines = content.split("\n");
      const issues = findSetStateAfterAwait(lines);
      for (const issue of issues) {
        (0, _types_1.sendFormattedWarn)({
          title: "SETSTATE APÓS AWAIT SEM MOUNTED CHECK",
          description: `\`setState()\` na linha ${issue.line} é chamado após \`await\` (linha ${issue.awaitLine}) sem verificar \`mounted\`.`,
          problem: {
            wrong: `await fetchData();\nsetState(() {\n  _data = result;\n});`,
            correct: `await fetchData();\nif (!mounted) return;\nsetState(() {\n  _data = result;\n});`,
            wrongLabel: "Sem verificar mounted",
            correctLabel: "Com mounted check",
          },
          action: {
            code: `if (!mounted) return;\nsetState(() {\n  // ...\n});`,
          },
          objective:
            "Evitar **setState() called after dispose()** — crash quando o widget já foi desmontado.",
          reference: {
            text: "Flutter: State.mounted",
            url: "https://api.flutter.dev/flutter/widgets/State/mounted.html",
          },
          file,
          line: issue.line,
        });
      }
    }
  }
);
