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
 * Positional Bool Params Plugin
 *
 * Detecta parâmetros booleanos posicionais em funções, métodos e construtores.
 *
 * O Effective Dart recomenda evitar parâmetros bool posicionais porque
 * `Task(true)` ou `Button(false)` são ilegíveis no call site.
 * Deve-se usar named parameters: `Task(repeating: true)`, `Button(isEnabled: false)`.
 *
 * Exceções:
 * - Setters (o nome já deixa claro)
 * - Overrides (@override)
 * - Parâmetros já nomeados ({bool x})
 * - Operadores (operator ==)
 *
 * @see https://dart.dev/effective-dart/design#avoid-positional-boolean-parameters
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
/**
 * Checks if a bool param is inside named parameters (after `{`).
 * Counts unmatched `{` before the bool param position.
 */
function isInsideNamedParams(signature, boolIndex) {
  let depth = 0;
  for (let i = 0; i < boolIndex; i++) {
    if (signature[i] === "{") depth++;
    if (signature[i] === "}") depth--;
  }
  return depth > 0;
}
function isInsideOptionalPositional(signature, boolIndex) {
  let depth = 0;
  for (let i = 0; i < boolIndex; i++) {
    if (signature[i] === "[") depth++;
    if (signature[i] === "]") depth--;
  }
  return depth > 0;
}
const SKIP_PATTERNS = [/^\s*set\s+/, /operator\s*[=!<>+\-*/~%&|^]+/, /^\s*@override/];
exports.default = (0, _types_1.createPlugin)(
  {
    name: "positional-bool-params",
    description: "Detecta parâmetros bool posicionais (Effective Dart: use named params)",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const allFiles = [...git.created_files, ...git.modified_files];
    const dartFiles = allFiles.filter(
      (f) =>
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        !f.includes("/generated/") &&
        fs.existsSync(f)
    );
    if (dartFiles.length === 0) return;
    const violations = [];
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      let isOverride = false;
      let signatureBuffer = "";
      let signatureStartLine = -1;
      let parenDepth = 0;
      let inSignature = false;
      let inBlockComment = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (inBlockComment) {
          if (trimmed.includes("*/")) inBlockComment = false;
          continue;
        }
        if (trimmed.startsWith("/*")) {
          if (!trimmed.includes("*/")) inBlockComment = true;
          continue;
        }
        if (trimmed === "@override" || trimmed.startsWith("@override")) {
          isOverride = true;
          continue;
        }
        if (!inSignature) {
          if (
            trimmed.startsWith("//") ||
            trimmed.startsWith("///") ||
            trimmed.startsWith("*") ||
            trimmed.startsWith("@") ||
            trimmed.startsWith("'") ||
            trimmed.startsWith('"') ||
            trimmed.startsWith("r'") ||
            trimmed.startsWith('r"')
          )
            continue;
          const funcStart = trimmed.match(
            /(?:(?:static|abstract|external|factory)\s+)*(?:(?:Future|FutureOr|Stream|void|bool|int|double|String|num|dynamic|[\w<>,?]+)\s+)?(\w+)\s*\(/
          );
          if (!funcStart) {
            if (!trimmed.startsWith("@") && trimmed.length > 0 && !trimmed.startsWith("//")) {
              isOverride = false;
            }
            continue;
          }
          if (isOverride) {
            isOverride = false;
            continue;
          }
          if (SKIP_PATTERNS.some((p) => p.test(trimmed))) {
            isOverride = false;
            continue;
          }
          signatureBuffer = trimmed;
          signatureStartLine = i;
          parenDepth = 0;
          inSignature = true;
          for (const ch of trimmed) {
            if (ch === "(") parenDepth++;
            if (ch === ")") parenDepth--;
          }
          if (parenDepth <= 0) {
            inSignature = false;
            analyzeSignature(signatureBuffer, file, signatureStartLine, funcStart[1], violations);
            signatureBuffer = "";
          }
        } else {
          signatureBuffer += " " + trimmed;
          for (const ch of trimmed) {
            if (ch === "(") parenDepth++;
            if (ch === ")") parenDepth--;
          }
          if (parenDepth <= 0) {
            inSignature = false;
            const funcMatch = signatureBuffer.match(
              /(?:(?:static|abstract|external|factory)\s+)*(?:(?:Future|FutureOr|Stream|void|bool|int|double|String|num|dynamic|[\w<>,?]+)\s+)?(\w+)\s*\(/
            );
            const funcName = funcMatch?.[1] ?? "unknown";
            analyzeSignature(signatureBuffer, file, signatureStartLine, funcName, violations);
            signatureBuffer = "";
          }
        }
        if (!inSignature && !trimmed.startsWith("@")) {
          isOverride = false;
        }
      }
    }
    if (violations.length === 0) return;
    for (const v of violations) {
      const suggestedNamed = v.paramName.startsWith("is")
        ? `{required bool ${v.paramName}}`
        : `{bool ${v.paramName} = false}`;
      (0, _types_1.sendFormattedFail)({
        title: "PARÂMETRO BOOL POSICIONAL",
        description: `O parâmetro \`bool ${v.paramName}\` em \`${v.functionName}\` é posicional. Chamadas como \`${v.functionName}(true)\` são ilegíveis. Use **named parameters** para clareza.`,
        problem: {
          wrong: `${v.functionName}(bool ${v.paramName})`,
          correct: `${v.functionName}(${suggestedNamed})`,
          wrongLabel: "Bool posicional (ilegível no call site)",
          correctLabel: "Named parameter (auto-documentado)",
        },
        action: {
          text: "Converta para named parameter com `{}` ou use named constructor/enum:",
          code: `${v.functionName}(${suggestedNamed})`,
        },
        objective:
          "Seguir **Effective Dart** — `Task(true)` é confuso, `Task(repeating: true)` é claro.",
        reference: {
          text: "Effective Dart: AVOID positional boolean parameters",
          url: "https://dart.dev/effective-dart/design#avoid-positional-boolean-parameters",
        },
        file: v.file,
        line: v.line + 1,
      });
    }
  }
);
function analyzeSignature(signature, file, startLine, functionName, violations) {
  const openParen = signature.indexOf("(");
  if (openParen === -1) return;
  const closeParen = signature.lastIndexOf(")");
  if (closeParen === -1) return;
  const paramsStr = signature.substring(openParen + 1, closeParen);
  if (!paramsStr.includes("bool")) return;
  const boolParamRegex = /(?:(?:required\s+)?(?:this\.|super\.)?)(bool(?:\?)?)\s+(\w+)/g;
  let match;
  while ((match = boolParamRegex.exec(paramsStr)) !== null) {
    const paramIndex = match.index;
    const paramName = match[2];
    if (isInsideNamedParams(paramsStr, paramIndex)) continue;
    if (isInsideOptionalPositional(paramsStr, paramIndex)) {
      violations.push({
        file,
        line: startLine,
        paramName,
        functionName,
        signatureTrimmed: signature.trim(),
      });
      continue;
    }
    violations.push({
      file,
      line: startLine,
      paramName,
      functionName,
      signatureTrimmed: signature.trim(),
    });
  }
}
