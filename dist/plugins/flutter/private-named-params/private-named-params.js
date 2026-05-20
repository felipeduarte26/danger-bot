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
 * Private Named Params Plugin
 * ============================
 * Detecta construtores que usam o padrão antigo (pré-Dart 3.12) de
 * initializer list para atribuir parâmetros a campos privados.
 *
 * Padrão antigo (detectado):
 *   MyClass({required Type paramName}) : _paramName = paramName;
 *   final Type _paramName;
 *
 * Padrão novo (sugerido — Dart 3.12+):
 *   MyClass({required this._paramName});
 *   final Type _paramName;
 *
 * Escopo: ViewModels, Datasources, Repositories, Widgets e qualquer classe.
 * Referência: https://dart.dev/to/private-named-parameters
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
function isGeneratedOrTestFile(file) {
  return (
    file.endsWith("_test.dart") ||
    file.endsWith(".g.dart") ||
    file.endsWith(".freezed.dart") ||
    file.endsWith(".mocks.dart") ||
    file.endsWith(".gr.dart") ||
    file.endsWith(".config.dart")
  );
}
function stripComments(line) {
  const singleLineIdx = line.indexOf("//");
  if (singleLineIdx >= 0) {
    return line.substring(0, singleLineIdx);
  }
  return line;
}
/**
 * Extrai o bloco completo do construtor (da abertura do parêntese até o final
 * do initializer list ou corpo). Retorna as linhas do construtor + initializer.
 */
function extractConstructorBlock(lines, startIdx) {
  let block = "";
  let parenDepth = 0;
  let braceDepth = 0;
  let foundParen = false;
  let foundInitializer = false;
  for (let i = startIdx; i < lines.length; i++) {
    const line = stripComments(lines[i]);
    block += line + "\n";
    for (const ch of line) {
      if (ch === "(") {
        parenDepth++;
        foundParen = true;
      }
      if (ch === ")") parenDepth--;
      if (ch === "{") braceDepth++;
      if (ch === "}") braceDepth--;
    }
    if (foundParen && parenDepth === 0 && !foundInitializer) {
      if (line.trimEnd().endsWith(";") || line.trimEnd().endsWith("{")) {
        break;
      }
      if (line.includes(":") || lines[i + 1]?.trim().startsWith(":")) {
        foundInitializer = true;
      }
    }
    if (foundInitializer && parenDepth === 0) {
      if (line.includes(";") || braceDepth > 0) {
        break;
      }
    }
  }
  return block;
}
/**
 * Identifica atribuições no initializer list que seguem o padrão
 * _privateField = publicParam (mapeamento direto sem transformação).
 */
function findSimpleAssignments(initializerBlock, paramNames) {
  const assignments = [];
  const assignmentPattern = /(_[a-zA-Z]\w*)\s*=\s*([a-zA-Z]\w*)\s*([^,;]*)/g;
  let match;
  while ((match = assignmentPattern.exec(initializerBlock)) !== null) {
    const field = match[1];
    const param = match[2];
    const trailing = match[3].trim();
    if (!paramNames.has(param)) continue;
    if (trailing && !trailing.startsWith(",") && !trailing.startsWith(";")) continue;
    if (field === `_${param}` || isFieldMatchingParam(field, param)) {
      assignments.push({ field, param, line: 0 });
    }
  }
  return assignments;
}
/**
 * Verifica se o campo privado corresponde ao parâmetro público.
 * Ex: _fetchAllBudgetsUsecase = fetchAllBudgetsUsecase
 */
function isFieldMatchingParam(field, param) {
  if (!field.startsWith("_")) return false;
  const fieldWithoutUnderscore = field.substring(1);
  return fieldWithoutUnderscore === param;
}
/**
 * Extrai nomes dos parâmetros nomeados do construtor (excluindo this. e super.)
 * Funciona com params opcionais, default values, tipos genéricos e Function types.
 */
function extractNamedParams(constructorBlock) {
  const params = new Set();
  const parenStart = constructorBlock.indexOf("(");
  const parenEnd = findMatchingParen(constructorBlock, parenStart);
  if (parenStart < 0 || parenEnd < 0) return params;
  const paramSection = constructorBlock.substring(parenStart + 1, parenEnd);
  if (!paramSection.includes("{")) return params;
  const namedStart = paramSection.indexOf("{");
  const namedEnd = paramSection.lastIndexOf("}");
  if (namedStart < 0 || namedEnd < 0) return params;
  const namedSection = paramSection.substring(namedStart + 1, namedEnd);
  const chunks = splitByTopLevelCommas(namedSection);
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    if (trimmed.includes("this.") || trimmed.includes("super.")) continue;
    const paramName = extractParamNameFromChunk(trimmed);
    if (paramName) {
      params.add(paramName);
    }
  }
  return params;
}
/**
 * Divide uma string por vírgulas de nível superior (respeita <>, (), {}, []).
 */
function splitByTopLevelCommas(text) {
  const chunks = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "<" || ch === "(" || ch === "{" || ch === "[") depth++;
    if (ch === ">" || ch === ")" || ch === "}" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      chunks.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}
/**
 * Extrai o nome do parâmetro de um chunk individual.
 * Lida com: required, tipos genéricos, Function types, default values.
 * Retorna o identificador antes de `=` (ou no fim) que é o nome do param.
 */
function extractParamNameFromChunk(chunk) {
  let text = chunk.trim();
  text = text.replace(/^required\s+/, "");
  const eqIdx = text.indexOf("=");
  if (eqIdx > 0) {
    text = text.substring(0, eqIdx).trim();
  }
  const identifierPattern = /([a-zA-Z]\w*)\s*$/;
  const match = text.match(identifierPattern);
  if (!match) return null;
  const name = match[1];
  const dartKeywords = new Set([
    "int",
    "double",
    "String",
    "bool",
    "void",
    "dynamic",
    "num",
    "var",
    "final",
    "const",
    "late",
    "required",
    "null",
    "true",
    "false",
  ]);
  if (dartKeywords.has(name)) return null;
  return name;
}
function findMatchingParen(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === "(") depth++;
    if (text[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
/**
 * Verifica que o construtor já não usa `this._field` para todos os campos
 * (evita falso positivo em construtores que já migraram parcialmente)
 */
function hasThisPrivateParam(constructorBlock, fieldName) {
  const pattern = new RegExp(`this\\.${fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  return pattern.test(constructorBlock);
}
/**
 * Extrai o initializer list de um bloco de construtor.
 * O initializer list começa após o `)` de parâmetros e o `:`.
 */
function extractInitializerList(constructorBlock) {
  const parenStart = constructorBlock.indexOf("(");
  const parenEnd = findMatchingParen(constructorBlock, parenStart);
  if (parenEnd < 0) return "";
  const afterParams = constructorBlock.substring(parenEnd + 1);
  const colonIdx = afterParams.indexOf(":");
  if (colonIdx < 0) return "";
  const semiIdx = afterParams.indexOf(";");
  const braceIdx = afterParams.indexOf("{");
  let end = afterParams.length;
  if (semiIdx >= 0) end = Math.min(end, semiIdx);
  if (braceIdx >= 0) end = Math.min(end, braceIdx);
  let initList = afterParams.substring(colonIdx + 1, end);
  initList = initList.replace(/super\s*\([^)]*\)/g, "");
  initList = initList.replace(/super\.\w+\s*\([^)]*\)/g, "");
  initList = initList.replace(/assert\s*\([^)]*\)/g, "");
  return initList;
}
function findViolationsInFile(content) {
  const violations = [];
  const lines = content.split("\n");
  const classPattern = /^\s*(?:final\s+|abstract\s+|base\s+|sealed\s+|mixin\s+)*class\s+(\w+)/;
  const constructorPattern = (className) => new RegExp(`^\\s*(?:const\\s+)?${className}\\s*\\(`);
  const namedConstructorPattern = (className) =>
    new RegExp(`^\\s*(?:const\\s+)?${className}\\.\\w+\\s*\\(`);
  let currentClass = null;
  let classBraceDepth = 0;
  let insideClass = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("///")) continue;
    const classMatch = line.match(classPattern);
    if (classMatch && !trimmed.startsWith("//")) {
      currentClass = classMatch[1];
      classBraceDepth = 0;
      insideClass = false;
    }
    if (currentClass) {
      for (const ch of line) {
        if (ch === "{") {
          classBraceDepth++;
          insideClass = true;
        }
        if (ch === "}") classBraceDepth--;
      }
      if (insideClass && classBraceDepth <= 0) {
        currentClass = null;
        insideClass = false;
        continue;
      }
    }
    if (!currentClass) continue;
    const isConstructor =
      constructorPattern(currentClass).test(line) ||
      namedConstructorPattern(currentClass).test(line);
    if (!isConstructor) continue;
    const constructorBlock = extractConstructorBlock(lines, i);
    if (
      !constructorBlock.includes("{") ||
      constructorBlock.indexOf("{") === constructorBlock.lastIndexOf("{")
    ) {
      if (!constructorBlock.includes(":")) continue;
    }
    if (!constructorBlock.includes(":")) continue;
    const paramNames = extractNamedParams(constructorBlock);
    if (paramNames.size === 0) continue;
    const initializerList = extractInitializerList(constructorBlock);
    if (!initializerList.trim()) continue;
    const assignments = findSimpleAssignments(initializerList, paramNames);
    const validAssignments = assignments.filter(
      (a) => !hasThisPrivateParam(constructorBlock, a.field)
    );
    if (validAssignments.length > 0) {
      for (const assignment of validAssignments) {
        assignment.line = i + 1;
      }
      violations.push({
        className: currentClass,
        assignments: validAssignments,
        constructorLine: i + 1,
      });
    }
  }
  return violations;
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "private-named-params",
    description: "Detecta construtores que podem usar private named parameters (Dart 3.12+)",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const files = [...git.created_files, ...git.modified_files].filter(
      (f) => f.endsWith(".dart") && !isGeneratedOrTestFile(f) && fs.existsSync(f)
    );
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      if (!content.includes(":") || !content.includes("_")) continue;
      const violations = findViolationsInFile(content);
      for (const violation of violations) {
        const fieldExamples = violation.assignments.slice(0, 3);
        const oldStyle = fieldExamples.map((a) => `  ${a.field} = ${a.param},`).join("\n");
        const newStyle = fieldExamples.map((a) => `  required this.${a.field},`).join("\n");
        const remainingCount = violation.assignments.length - fieldExamples.length;
        const moreText = remainingCount > 0 ? `\n  // ... +${remainingCount} campo(s)` : "";
        (0, _types_1.sendFormattedFail)({
          title: "USAR PRIVATE NAMED PARAMETERS (DART 3.12+)",
          description:
            `Classe \`${violation.className}\` usa initializer list para atribuir ` +
            `**${violation.assignments.length}** parâmetro(s) a campo(s) privado(s). ` +
            `A partir do Dart 3.12, use \`this._field\` diretamente no construtor.`,
          problem: {
            wrong: `${violation.className}({\n  required Type ${fieldExamples[0].param},\n}) : ${oldStyle}${moreText}`,
            correct: `${violation.className}({\n${newStyle}${moreText}\n})`,
            wrongLabel: "Initializer list redundante (pré-Dart 3.12)",
            correctLabel: "Private named parameters (Dart 3.12+)",
          },
          action: {
            text: "Remova os parâmetros públicos intermediários e use `this._field` diretamente:",
            code:
              `${violation.className}({\n${newStyle}\n}) : super(...);\n\n` +
              `// Os campos privados continuam declarados normalmente:\n` +
              fieldExamples.map((a) => `// final Type ${a.field};`).join("\n"),
          },
          objective:
            "Private named parameters eliminam boilerplate de initializer list. " +
            "O nome público no call site é gerado automaticamente sem o `_`. " +
            "Use `dart fix --code=prefer_initializing_formals` para migrar automaticamente.",
          reference: {
            text: "Dart 3.12 — Private Named Parameters",
            url: "https://dart.dev/to/private-named-parameters",
          },
          file,
          line: violation.constructorLine,
        });
      }
    }
  }
);
