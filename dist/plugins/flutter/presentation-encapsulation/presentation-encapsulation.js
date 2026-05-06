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
 * Presentation Encapsulation Plugin
 *
 * Detecta variáveis, métodos, getters e setters públicos em classes State<>
 * na camada presentation que deveriam ser privados (prefixados com _).
 *
 * Escopo:
 * - Arquivos .dart na pasta presentation/ (ou subpastas)
 * - Apenas classes que estendem State<>, ConsumerState<> ou variantes
 * - NÃO verifica a classe StatefulWidget em si (seus campos são a API pública do widget)
 *
 * Exceções (NÃO reportados):
 * - Membros com @override, @protected, @visibleForTesting, @visibleForOverriding
 * - Membros static
 * - Construtores
 * - Membros já privados (prefixados com _)
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
// ---------------------------------------------------------------------------
// Generated / test file filters
// ---------------------------------------------------------------------------
const GENERATED_SUFFIXES = [
  "_test.dart",
  ".g.dart",
  ".freezed.dart",
  ".mocks.dart",
  ".gr.dart",
  ".gen.dart",
  ".chopper.dart",
  ".graphql.dart",
  ".mapper.dart",
  ".module.dart",
  ".config.dart",
  ".reflectable.dart",
  ".tailor.dart",
];
const EXCLUDED_DIRS = [
  "/generated/",
  "/.dart_tool/",
  "/build/",
  "/test/",
  "/test_driver/",
  "/integration_test/",
];
// ---------------------------------------------------------------------------
// Dart keywords (must not be mistaken for member names)
// ---------------------------------------------------------------------------
const DART_KEYWORDS = new Set([
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "return",
  "try",
  "catch",
  "finally",
  "throw",
  "rethrow",
  "new",
  "const",
  "var",
  "final",
  "late",
  "void",
  "class",
  "enum",
  "mixin",
  "extension",
  "typedef",
  "import",
  "export",
  "part",
  "library",
  "show",
  "hide",
  "as",
  "deferred",
  "assert",
  "await",
  "async",
  "sync",
  "yield",
  "super",
  "this",
  "is",
  "in",
  "true",
  "false",
  "null",
  "abstract",
  "factory",
  "operator",
  "covariant",
  "required",
  "static",
  "external",
  "get",
  "set",
  "with",
  "implements",
  "extends",
  "on",
  "dynamic",
  "Function",
  "sealed",
  "base",
  "interface",
]);
function findStateClasses(lines) {
  const classes = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const classMatch = line.match(
      /^\s*(?:final\s+)?(?:abstract\s+)?(?:base\s+)?(?:sealed\s+)?class\s+(\w+)/
    );
    if (!classMatch) continue;
    const className = classMatch[1];
    let fullDecl = "";
    for (let k = i; k < Math.min(i + 6, lines.length); k++) {
      fullDecl += " " + lines[k];
      if (lines[k].includes("{")) break;
    }
    const stateMatch = fullDecl.match(/extends\s+\w*State\s*<\s*(\w+)/);
    if (!stateMatch) continue;
    const widgetClassName = stateMatch[1];
    let braceDepth = 0;
    let foundOpen = false;
    let endLine = i;
    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === "{") {
          braceDepth++;
          foundOpen = true;
        }
        if (ch === "}") braceDepth--;
      }
      if (foundOpen && braceDepth <= 0) {
        endLine = j;
        break;
      }
    }
    classes.push({ className, widgetClassName, startLine: i, endLine });
    i = endLine;
  }
  return classes;
}
// ---------------------------------------------------------------------------
// Annotation helpers
// ---------------------------------------------------------------------------
const SKIP_ANNOTATIONS = [
  "@override",
  "@protected",
  "@visibleForTesting",
  "@visibleForOverriding",
  "@mustCallSuper",
];
function hasSkipAnnotation(lines, idx) {
  for (let k = idx - 1; k >= Math.max(0, idx - 10); k--) {
    const t = lines[k].trim();
    if (SKIP_ANNOTATIONS.some((a) => t.startsWith(a))) return true;
    if (t === "" || t.startsWith("//") || t.startsWith("///") || t.startsWith("*")) continue;
    if (t.startsWith("@")) continue;
    break;
  }
  return false;
}
// ---------------------------------------------------------------------------
// Builder pattern & ignore comment detection
// ---------------------------------------------------------------------------
const BUILDER_THIS_PATTERN = /[,(]\s*this\s*[,)]/;
/**
 * Detects if the State class exposes itself via builder pattern.
 * Looks for `this` being passed as a standalone argument anywhere in the class body
 * (e.g., `widget.builder(this)`, `SomeWidget(state: this, child: ...)`).
 * This indicates the public API of the State is intentional.
 */
function isBuilderPattern(lines, stateClass) {
  for (let i = stateClass.startLine; i <= stateClass.endLine; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("///")) continue;
    if (BUILDER_THIS_PATTERN.test(lines[i])) return true;
  }
  return false;
}
const IGNORE_COMMENT = "ignore: presentation-encapsulation";
/**
 * Checks for `// ignore: presentation-encapsulation` above a declaration.
 */
function hasIgnoreComment(lines, idx) {
  for (let k = idx - 1; k >= Math.max(0, idx - 5); k--) {
    const t = lines[k].trim();
    if (t.includes(IGNORE_COMMENT)) return true;
    if (t === "" || t.startsWith("//") || t.startsWith("///") || t.startsWith("*")) continue;
    if (t.startsWith("@")) continue;
    break;
  }
  return false;
}
function findPublicMembers(lines, stateClass) {
  const members = [];
  let braceDepth = 0;
  let classBodyStarted = false;
  for (let i = stateClass.startLine; i <= stateClass.endLine; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const depthBefore = braceDepth;
    for (const ch of line) {
      if (ch === "{") {
        braceDepth++;
        classBodyStarted = true;
      }
      if (ch === "}") braceDepth--;
    }
    if (!classBodyStarted || depthBefore !== 1) continue;
    if (trimmed.length === 0) continue;
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("///") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("@")
    )
      continue;
    if (hasSkipAnnotation(lines, i)) continue;
    if (/\bstatic\b/.test(trimmed)) continue;
    if (
      new RegExp(
        `^(?:const\\s+)?(?:factory\\s+)?${stateClass.className}(?:\\.[a-zA-Z_]\\w*)?\\s*\\(`
      ).test(trimmed)
    )
      continue;
    if (
      trimmed.startsWith("class ") ||
      trimmed.startsWith("enum ") ||
      trimmed.startsWith("mixin ") ||
      trimmed.startsWith("extension ")
    )
      continue;
    const getterMatch = trimmed.match(/^([\w<>,?\s]*?)\s*\bget\s+([a-z]\w*)/);
    if (getterMatch) {
      const name = getterMatch[2];
      if (!name.startsWith("_")) {
        members.push({ name, kind: "getter", line: i + 1 });
      }
      continue;
    }
    const setterMatch = trimmed.match(/^\w*\s*set\s+([a-z]\w*)\s*\(/);
    if (setterMatch) {
      const name = setterMatch[1];
      if (!name.startsWith("_")) {
        members.push({ name, kind: "setter", line: i + 1 });
      }
      continue;
    }
    const parenIdx = findMemberParenIndex(trimmed);
    const eqIdx = trimmed.indexOf("=");
    const semiIdx = trimmed.indexOf(";");
    if (parenIdx >= 0 && (eqIdx < 0 || parenIdx < eqIdx) && (semiIdx < 0 || parenIdx < semiIdx)) {
      const before = trimmed.substring(0, parenIdx).trim();
      const parts = before.split(/\s+/);
      const name = parts[parts.length - 1];
      if (name && /^[a-z]\w*$/.test(name) && !DART_KEYWORDS.has(name)) {
        members.push({ name, kind: "method", line: i + 1 });
      }
      continue;
    }
    const endIdx = eqIdx >= 0 && (semiIdx < 0 || eqIdx < semiIdx) ? eqIdx : semiIdx;
    if (endIdx >= 0) {
      const before = trimmed.substring(0, endIdx).trim();
      const parts = before.split(/\s+/);
      const name = parts[parts.length - 1];
      if (name) {
        const cleanName = name.replace(/[?!]$/, "");
        if (/^[a-z]\w*$/.test(cleanName) && !DART_KEYWORDS.has(cleanName)) {
          members.push({ name: cleanName, kind: "variable", line: i + 1 });
        }
      }
    }
  }
  return members;
}
/**
 * Finds the index of `(` that corresponds to a method parameter list,
 * ignoring `(` inside generic type params like `Function()` or `Map<K,V>`.
 * Returns -1 if no valid method paren found.
 */
function findMemberParenIndex(trimmed) {
  let angleBracketDepth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "<") angleBracketDepth++;
    if (ch === ">") angleBracketDepth--;
    if (ch === "(" && angleBracketDepth === 0) {
      if (i > 0 && /[a-zA-Z0-9_]/.test(trimmed[i - 1])) {
        const before = trimmed.substring(0, i).trim();
        const parts = before.split(/\s+/);
        const lastPart = parts[parts.length - 1];
        if (/^[a-z]\w*$/.test(lastPart)) return i;
        if (/^[A-Z]\w*$/.test(lastPart)) continue;
      }
      if (i > 0 && trimmed[i - 1] === " ") continue;
      return i;
    }
  }
  return -1;
}
// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
const KIND_LABELS = {
  variable: "Variável",
  method: "Método",
  getter: "Getter",
  setter: "Setter",
};
exports.default = (0, _types_1.createPlugin)(
  {
    name: "presentation-encapsulation",
    description:
      "Detecta membros públicos em State classes da presentation que deveriam ser privados",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.created_files, ...git.modified_files].filter(
      (f) =>
        f.endsWith(".dart") &&
        f.replace(/\\/g, "/").includes("/presentation/") &&
        !GENERATED_SUFFIXES.some((s) => f.endsWith(s)) &&
        !EXCLUDED_DIRS.some((d) => f.includes(d)) &&
        fs.existsSync(f)
    );
    if (dartFiles.length === 0) return;
    let totalViolations = 0;
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const stateClasses = findStateClasses(lines);
      if (stateClasses.length === 0) continue;
      for (const stateClass of stateClasses) {
        if (hasIgnoreComment(lines, stateClass.startLine)) continue;
        if (isBuilderPattern(lines, stateClass)) continue;
        const publicMembers = findPublicMembers(lines, stateClass);
        if (publicMembers.length === 0) continue;
        for (const member of publicMembers) {
          if (hasIgnoreComment(lines, member.line - 1)) continue;
          totalViolations++;
          const kindLabel = KIND_LABELS[member.kind];
          const privateName = `_${member.name}`;
          (0, _types_1.sendFormattedFail)({
            title: `${kindLabel.toUpperCase()} PÚBLICO EM STATE — DEVERIA SER PRIVADO`,
            description: `${kindLabel} **\`${member.name}\`** em \`${stateClass.className}\` é público mas deveria ser privado (\`${privateName}\`).`,
            problem: {
              wrong:
                member.kind === "getter"
                  ? `Type get ${member.name} => ...;`
                  : member.kind === "setter"
                    ? `set ${member.name}(Type value) { ... }`
                    : member.kind === "method"
                      ? `void ${member.name}() { ... }`
                      : `late Type ${member.name};`,
              correct:
                member.kind === "getter"
                  ? `Type get ${privateName} => ...;`
                  : member.kind === "setter"
                    ? `set ${privateName}(Type value) { ... }`
                    : member.kind === "method"
                      ? `void ${privateName}() { ... }`
                      : `late Type ${privateName};`,
              wrongLabel: `${kindLabel} público`,
              correctLabel: `${kindLabel} privado`,
            },
            action: {
              text: `Renomeie \`${member.name}\` para \`${privateName}\`:`,
              code: `// ${member.name} → ${privateName}`,
            },
            objective:
              "Membros de **State** devem ser **privados** (`_`). O State é um detalhe de implementação — sua API não deve vazar para fora do widget.",
            file,
            line: member.line,
          });
        }
      }
    }
    if (totalViolations > 0) {
      (0, _types_1.sendMessage)(
        `**Presentation Encapsulation**: ${totalViolations} membro(s) público(s) em State classes que deveria(m) ser privado(s)`
      );
    }
  }
);
