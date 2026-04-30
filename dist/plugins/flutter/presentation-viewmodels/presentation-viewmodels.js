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
 * Presentation ViewModels Plugin
 * Verifica que ViewModels dependam apenas de UseCases e trabalhem com state.
 *
 * Analisa:
 * 1. Imports — detecta imports diretos da camada Data (models, datasources, repositories, barrel)
 * 2. Campos (fields) — detecta Repository, Datasource ou Model como dependência direta
 * 3. Métodos públicos — devem retornar void ou Future<void> (forçar trabalhar com state)
 *
 * Detecta ViewModels por:
 * - Arquivo: *_viewmodel.dart ou *_view_model.dart
 * - Classe: extends ViewModelBase
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const FORBIDDEN_FIELD_TYPES = [
  { pattern: /Repository/, label: "Repository" },
  { pattern: /Datasource|DataSource/, label: "Datasource" },
  { pattern: /Model(?!Base|State)/, label: "Model" },
];
const FORBIDDEN_IMPORTS = [
  { pattern: /\/data\/repositories\//, label: "Repository (Data Layer)" },
  { pattern: /\/data\/datasources\//, label: "Datasource (Data Layer)" },
  { pattern: /\/data\/models\//, label: "Model (Data Layer)" },
  { pattern: /\/data\/data\.dart/, label: "Data Layer (barrel file)" },
];
const FIELD_RE = /^\s+(?:late\s+)?final\s+([\w<>,?\s]+?)\s+(_?\w+)\s*[=;]/;
const IMPORT_RE = /^\s*import\s+['"]([^'"]+)['"]/;
const ALLOWED_RETURN_TYPES = new Set(["void", "Future<void>", "FutureOr<void>"]);
const METHOD_SIGNATURE_RE = /^\s+([\w<>,?\s]+?)\s+([a-z][a-zA-Z0-9]*)\s*[(<]/;
const SKIP_KEYWORDS = new Set([
  "final",
  "late",
  "var",
  "const",
  "return",
  "if",
  "for",
  "while",
  "switch",
  "throw",
  "try",
  "catch",
  "assert",
  "await",
  "yield",
  "class",
  "enum",
  "mixin",
  "extension",
  "import",
  "export",
  "part",
  "typedef",
  "super",
  "this",
  "operator",
  "factory",
]);
function isCommentOrAnnotation(trimmed) {
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("///") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("@")
  );
}
function hasOverrideAnnotation(lines, idx) {
  for (let k = idx - 1; k >= Math.max(0, idx - 5); k--) {
    const t = lines[k].trim();
    if (t === "@override") return true;
    if (t === "" || t.startsWith("//") || t.startsWith("///") || t.startsWith("*")) continue;
    if (t.startsWith("@")) continue;
    break;
  }
  return false;
}
function hasAssignmentBeforeParen(line) {
  const parenIdx = line.indexOf("(");
  if (parenIdx < 0) return false;
  const beforeParen = line.substring(0, parenIdx);
  return beforeParen.includes("=");
}
function isGetterDeclaration(line) {
  return /\bget\s+\w+/.test(line);
}
function findPublicMethodViolations(lines, classStartLine, classEndLine) {
  const violations = [];
  let braceDepth = 0;
  let classBodyStarted = false;
  for (let i = classStartLine; i <= classEndLine; i++) {
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
    if (trimmed.length === 0 || isCommentOrAnnotation(trimmed)) continue;
    if (trimmed.startsWith("static ")) continue;
    if (/^\s*(get|set)\s+/.test(line)) continue;
    if (isGetterDeclaration(line)) continue;
    if (hasAssignmentBeforeParen(line)) continue;
    const methodMatch = line.match(METHOD_SIGNATURE_RE);
    if (!methodMatch) continue;
    const returnType = methodMatch[1].trim();
    const methodName = methodMatch[2];
    if (SKIP_KEYWORDS.has(returnType)) continue;
    if (SKIP_KEYWORDS.has(methodName)) continue;
    if (methodName.startsWith("_")) continue;
    if (hasOverrideAnnotation(lines, i)) continue;
    if (ALLOWED_RETURN_TYPES.has(returnType)) continue;
    violations.push({
      name: methodName,
      returnType,
      line: i + 1,
    });
  }
  return violations;
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "presentation-viewmodels",
    description: "Valida que ViewModels dependam apenas de UseCases e trabalhem com state",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const files = [...git.created_files, ...git.modified_files].filter(
      (f) => (f.endsWith("_viewmodel.dart") || f.endsWith("_view_model.dart")) && fs.existsSync(f)
    );
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      if (!content.includes("extends ViewModelBase")) continue;
      const lines = content.split("\n");
      // ── 1. Verificar imports proibidos ──
      for (let i = 0; i < lines.length; i++) {
        const importMatch = lines[i].match(IMPORT_RE);
        if (!importMatch) continue;
        const importPath = importMatch[1];
        for (const { pattern, label } of FORBIDDEN_IMPORTS) {
          if (pattern.test(importPath)) {
            (0, _types_1.sendFormattedFail)({
              title: `VIEWMODEL IMPORTA ${label.toUpperCase()}`,
              description: `Import \`${importPath}\` traz dependência direta da **camada Data**. ViewModel deve importar apenas da **camada Domain**.`,
              problem: {
                wrong: `import 'package:app/.../data/models/user_model.dart';`,
                correct: `import 'package:app/.../domain/usecases/get_user_usecase.dart';\nimport 'package:app/.../domain/entities/user_entity.dart';`,
                wrongLabel: "Import direto da Data Layer",
                correctLabel: "Import apenas da Domain Layer",
              },
              action: {
                text: "Substitua imports de Data por imports de Domain:",
                code: `import 'package:app/.../domain/usecases/get_user_usecase.dart';\nimport 'package:app/.../domain/entities/user_entity.dart';`,
              },
              objective: "ViewModel → **UseCase** → Repository → Datasource. Nunca pular camadas.",
              file,
              line: i + 1,
            });
            break;
          }
        }
      }
      // ── 2. Verificar campos e 3. Verificar retorno de métodos públicos ──
      let insideClass = false;
      let braceDepth = 0;
      let classStartLine = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/class\s+\w+[\s<].*extends\s+ViewModelBase/.test(line)) {
          insideClass = true;
          braceDepth = 0;
          classStartLine = i;
        }
        if (!insideClass) continue;
        for (const ch of line) {
          if (ch === "{") braceDepth++;
          if (ch === "}") braceDepth--;
        }
        if (insideClass && braceDepth <= 0 && line.includes("}")) {
          const classEndLine = i;
          // ── 3. Verificar métodos públicos com retorno não-void ──
          const violations = findPublicMethodViolations(lines, classStartLine, classEndLine);
          for (const v of violations) {
            (0, _types_1.sendFormattedFail)({
              title: "VIEWMODEL: MÉTODO PÚBLICO RETORNA VALOR",
              description: `Método \`${v.name}()\` retorna \`${v.returnType}\` — métodos públicos de ViewModel devem retornar **void** ou **Future<void>** para forçar o uso de **state**.`,
              problem: {
                wrong: `${v.returnType} ${v.name}() {\n  // retorna valor diretamente\n  return resultado;\n}`,
                correct: `Future<void> ${v.name}() async {\n  final resultado = await _useCase();\n  state = state.copyWith(data: resultado);\n}`,
                wrongLabel: `Retorna ${v.returnType}`,
                correctLabel: "Retorna void — atualiza state",
              },
              action: {
                text: "Altere o método para retornar void/Future<void> e atualize o state:",
                code: `Future<void> ${v.name}() async {\n  final result = await _useCase();\n  state = state.copyWith(/* ... */);\n}\n\n// Quem precisa do valor acessa via state:\n// viewModel.state.data`,
              },
              objective:
                "Métodos públicos de ViewModel/Cubit devem apenas **disparar mudanças de estado**. Quem precisa do resultado acessa via `state`.",
              reference: {
                text: "Bloc: prefer_void_public_cubit_methods",
                url: "https://bloclibrary.dev/lint-rules/prefer_void_public_cubit_methods/",
              },
              file,
              line: v.line,
            });
          }
          insideClass = false;
          continue;
        }
        if (braceDepth !== 1) continue;
        // ── 2. Verificar campos proibidos ──
        const fieldMatch = line.match(FIELD_RE);
        if (!fieldMatch) continue;
        const fieldType = fieldMatch[1].trim();
        const fieldName = fieldMatch[2];
        for (const { pattern, label } of FORBIDDEN_FIELD_TYPES) {
          if (pattern.test(fieldType)) {
            (0, _types_1.sendFormattedFail)({
              title: `VIEWMODEL DEPENDE DE ${label.toUpperCase()} DIRETAMENTE`,
              description: `Campo \`${fieldName}\` é do tipo \`${fieldType}\` — ViewModel deve depender apenas de **UseCases**.`,
              problem: {
                wrong: `final ${fieldType} ${fieldName};`,
                correct: `final IGetDataUseCase _getDataUseCase;`,
                wrongLabel: `Dependência direta de ${label}`,
                correctLabel: "Dependência via UseCase",
              },
              action: {
                text: "Substitua a dependência direta por um UseCase:",
                code: `final class MyViewModel extends ViewModelBase<MyState> {\n  final IGetDataUseCase _getDataUseCase;\n}`,
              },
              objective: "ViewModel → **UseCase** → Repository → Datasource. Nunca pular camadas.",
              file,
              line: i + 1,
            });
            break;
          }
        }
      }
    }
  }
);
