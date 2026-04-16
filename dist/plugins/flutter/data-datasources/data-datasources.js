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
 * Data Datasources Plugin
 * Valida arquivos dentro de /datasources/:
 * - Nome do arquivo deve terminar com _datasource.dart
 * - Deve ter abstract interface class com prefixo I e sufixo Datasource
 * - Deve ter implementação final class com sufixo Datasource e implements
 * - Métodos não devem repetir o contexto da classe — "Don't Add Gratuitous Context" (Clean Code, Cap. 2, p. 29)
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
exports.default = (0, _types_1.createPlugin)(
  {
    name: "data-datasources",
    description: "Valida Data Sources",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const files = [...git.created_files, ...git.modified_files].filter(
      (f) =>
        f.includes("/datasources/") &&
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith("datasources.dart") &&
        fs.existsSync(f)
    );
    for (const file of files) {
      const fileName = file.split("/").pop() || "";
      if (!fileName.endsWith("_datasource.dart")) {
        (0, _types_1.sendFormattedFail)({
          title: "NOMENCLATURA DE DATASOURCE INCORRETA",
          description: "Arquivo de Datasource deve terminar com `_datasource.dart`.",
          problem: {
            wrong: fileName,
            correct: `${fileName.replace(".dart", "")}_datasource.dart`,
          },
          action: {
            text: "Renomeie o arquivo:",
            code: `${fileName.replace(".dart", "")}_datasource.dart`,
          },
          objective: "Manter **consistência** na nomenclatura da camada Data.",
          file,
          line: 1,
        });
        continue;
      }
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const interfaces = [];
      const implementations = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const interfaceMatch = line.match(/abstract\s+interface\s+class\s+([A-Za-z_]\w*)/);
        if (interfaceMatch) {
          interfaces.push({ name: interfaceMatch[1], line: i + 1 });
        }
        const implMatch = line.match(
          /(?:final\s+)?class\s+([A-Za-z_]\w*)\s+implements\s+([A-Za-z_]\w*)/
        );
        if (implMatch && !line.includes("abstract")) {
          implementations.push({ name: implMatch[1], line: i + 1 });
        }
      }
      const hasInterface = interfaces.length > 0;
      const hasImplementation = implementations.length > 0;
      const interfaceName = interfaces[0]?.name || "";
      const interfaceLine = interfaces[0]?.line || 0;
      const implementationName = implementations[0]?.name || "";
      const implementationLine = implementations[0]?.line || 0;
      if (interfaces.length > 1) {
        (0, _types_1.sendFormattedFail)({
          title: "MÚLTIPLAS INTERFACES EM UM ARQUIVO DATASOURCE",
          description: `Encontradas **${interfaces.length} interfaces**: ${interfaces.map((i) => `\`${i.name}\``).join(", ")}.`,
          problem: {
            wrong: interfaces.map((i) => `abstract interface class ${i.name} { }`).join("\n"),
            correct: `// Um arquivo por Datasource\nabstract interface class ${interfaces[0].name} { }`,
          },
          action: {
            text: "Separe cada Datasource (interface + implementação) em seu próprio arquivo:",
            code: interfaces
              .map((i) => `${i.name.replace(/^I/, "").toLowerCase()}_datasource.dart`)
              .join("\n"),
          },
          objective: "**Um Datasource por arquivo** — facilita navegação e manutenção.",
          file,
          line: interfaces[1].line,
        });
      }
      if (implementations.length > 1) {
        (0, _types_1.sendFormattedFail)({
          title: "MÚLTIPLAS IMPLEMENTAÇÕES EM UM ARQUIVO DATASOURCE",
          description: `Encontradas **${implementations.length} classes**: ${implementations.map((i) => `\`${i.name}\``).join(", ")}.`,
          problem: {
            wrong: implementations.map((i) => `class ${i.name} implements ... { }`).join("\n"),
            correct: `// Um arquivo por implementação\nclass ${implementations[0].name} implements ... { }`,
          },
          action: {
            text: "Separe cada implementação em seu próprio arquivo:",
            code: implementations.map((i) => `${i.name.toLowerCase()}_datasource.dart`).join("\n"),
          },
          objective: "**Um Datasource por arquivo** — facilita navegação e manutenção.",
          file,
          line: implementations[1].line,
        });
      }
      if (!hasInterface) {
        (0, _types_1.sendFormattedFail)({
          title: "DATASOURCE SEM INTERFACE",
          description: `Arquivo \`${fileName}\` não possui \`abstract interface class\`.`,
          problem: {
            wrong: `final class UserDatasource { ... }`,
            correct: `abstract interface class IUserDatasource {\n  Future<List<UserModel>> fetchAll();\n}\n\nfinal class UserDatasource implements IUserDatasource {\n  @override\n  Future<List<UserModel>> fetchAll() async { ... }\n}`,
          },
          action: {
            text: "Adicione uma interface que define o contrato:",
            code: `abstract interface class I${fileName
              .replace("_datasource.dart", "")
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join("")}Datasource {\n  // métodos do contrato\n}`,
          },
          objective: "Permitir **injeção de dependência** e facilitar **testes**.",
          reference: {
            text: "Dependency Inversion Principle",
            url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
          },
          file,
          line: 1,
        });
      }
      if (hasInterface) {
        if (!interfaceName.startsWith("I")) {
          (0, _types_1.sendFormattedFail)({
            title: "INTERFACE DE DATASOURCE SEM PREFIXO I",
            description: `A interface \`${interfaceName}\` deve começar com \`I\`.`,
            problem: {
              wrong: `abstract interface class ${interfaceName} { }`,
              correct: `abstract interface class I${interfaceName} { }`,
            },
            action: {
              text: "Adicione o prefixo `I`:",
              code: `abstract interface class I${interfaceName} { }`,
            },
            objective: "Manter **padrão de nomenclatura** para interfaces.",
            file,
            line: interfaceLine,
          });
        }
        if (!interfaceName.endsWith("Datasource")) {
          (0, _types_1.sendFormattedFail)({
            title: "INTERFACE DE DATASOURCE SEM SUFIXO",
            description: `A interface \`${interfaceName}\` deve terminar com \`Datasource\`.`,
            problem: {
              wrong: `abstract interface class ${interfaceName} { }`,
              correct: `abstract interface class ${interfaceName}Datasource { }`,
            },
            action: {
              text: "Adicione o sufixo `Datasource`:",
              code: `abstract interface class ${interfaceName}Datasource { }`,
            },
            objective: "Manter **consistência** na nomenclatura de Datasources.",
            file,
            line: interfaceLine,
          });
        }
        validateRedundantMethodNames(file, lines, interfaceName, interfaceLine - 1, "Datasource");
      }
      if (!hasImplementation && hasInterface) {
        (0, _types_1.sendFormattedFail)({
          title: "DATASOURCE SEM IMPLEMENTAÇÃO",
          description: `Arquivo tem interface \`${interfaceName}\` mas não tem a implementação.`,
          problem: {
            wrong: `abstract interface class ${interfaceName} { }\n// Sem implementação`,
            correct: `abstract interface class ${interfaceName} { }\n\nfinal class ${interfaceName.replace(/^I/, "")} implements ${interfaceName} { }`,
          },
          action: {
            text: "Adicione a classe que implementa a interface:",
            code: `final class ${interfaceName.replace(/^I/, "")} implements ${interfaceName} {\n  // implementação dos métodos\n}`,
          },
          objective: "Completar o **contrato** definido pela interface.",
          file,
          line: interfaceLine,
        });
      }
      if (hasImplementation) {
        if (!implementationName.endsWith("Datasource")) {
          (0, _types_1.sendFormattedFail)({
            title: "IMPLEMENTAÇÃO DE DATASOURCE SEM SUFIXO",
            description: `A classe \`${implementationName}\` deve terminar com \`Datasource\`.`,
            problem: {
              wrong: `class ${implementationName} implements ... { }`,
              correct: `class ${implementationName}Datasource implements ... { }`,
            },
            action: {
              text: "Adicione o sufixo `Datasource`:",
              code: `class ${implementationName}Datasource implements ... { }`,
            },
            objective: "Manter **consistência** na nomenclatura de Datasources.",
            file,
            line: implementationLine,
          });
        }
      }
    }
  }
);
function extractContextFromClassName(className, suffix) {
  let name = className;
  if (name.startsWith("I")) name = name.slice(1);
  if (name.endsWith(suffix)) name = name.slice(0, -suffix.length);
  return name.length >= 2 ? name : null;
}
function extractMethodNames(lines, startLine) {
  const methods = [];
  let braceDepth = 0;
  let foundOpen = false;
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (foundOpen && braceDepth === 1) {
      if (!trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*")) {
        const methodMatch = trimmed.match(/\b([a-z][a-zA-Z0-9_]*)\s*\(/);
        if (methodMatch) {
          methods.push({ name: methodMatch[1], line: i + 1 });
        }
        const getterMatch = trimmed.match(/\bget\s+([a-z][a-zA-Z0-9_]*)/);
        if (getterMatch) {
          methods.push({ name: getterMatch[1], line: i + 1 });
        }
      }
    }
    for (const ch of line) {
      if (ch === "{") {
        braceDepth++;
        foundOpen = true;
      }
      if (ch === "}") braceDepth--;
    }
    if (foundOpen && braceDepth <= 0) break;
  }
  return methods;
}
function toCamelCaseStart(name) {
  if (name === name.toUpperCase()) return name.toLowerCase();
  return name.charAt(0).toLowerCase() + name.slice(1);
}
function isMethodNameRedundant(methodName, context) {
  if (context.length < 2) return false;
  const contextLower = toCamelCaseStart(context);
  const contextPascal = context.charAt(0).toUpperCase() + context.slice(1);
  const startsWithContext = new RegExp(`^${contextLower}(?=[A-Z_]|$)`).test(methodName);
  const containsContext = new RegExp(`[a-z]${contextPascal}(?=[A-Z_]|$)`).test(methodName);
  if (!startsWithContext && !containsContext) return false;
  const suggested = getSuggestedMethodName(methodName, context);
  return suggested.length >= 2 && suggested !== methodName;
}
function getSuggestedMethodName(methodName, context) {
  const contextLower = toCamelCaseStart(context);
  const contextPascal = context.charAt(0).toUpperCase() + context.slice(1);
  if (new RegExp(`^${contextLower}(?=[A-Z_]|$)`).test(methodName)) {
    const remaining = methodName.slice(contextLower.length);
    if (remaining.length >= 2) {
      return remaining.charAt(0).toLowerCase() + remaining.slice(1);
    }
    return methodName;
  }
  const idx = methodName.indexOf(contextPascal);
  if (idx > 0 && /[a-z]/.test(methodName.charAt(idx - 1))) {
    const before = methodName.slice(0, idx);
    const after = methodName.slice(idx + contextPascal.length);
    if ((before + after).length >= 2) return before + after;
  }
  return methodName;
}
function validateRedundantMethodNames(file, lines, interfaceName, interfaceStartLine, suffix) {
  const context = extractContextFromClassName(interfaceName, suffix);
  if (!context) return;
  const methods = extractMethodNames(lines, interfaceStartLine);
  for (const method of methods) {
    if (isMethodNameRedundant(method.name, context)) {
      const suggested = getSuggestedMethodName(method.name, context);
      (0, _types_1.sendFormattedFail)({
        title: "NOME DE MÉTODO REDUNDANTE",
        description: `O método \`${method.name}\` repete o contexto \`${context}\` que já está no nome da classe \`${interfaceName}\`.`,
        problem: {
          wrong: `${method.name}(...)`,
          correct: `${suggested}(...)`,
          wrongLabel: `Redundante — "${context}" já está no nome da classe`,
          correctLabel: "Sem redundância",
        },
        action: {
          text: `Remova "${context}" do nome do método:`,
          code: `// Em ${interfaceName}\n\n// Antes\n${method.name}(...)\n\n// Depois\n${suggested}(...)`,
        },
        objective: "Evitar **redundância** nos nomes — o contexto da classe já comunica o domínio.",
        reference: {
          text: "Clean Code — Cap. 2: Don't Add Gratuitous Context (Robert C. Martin)",
          url: "https://medium.com/@sardorjs/clean-code-chapter-2-meaningful-names-baa554f93f17",
        },
        file,
        line: method.line,
      });
    }
  }
}
