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
 * Domain UseCases Plugin
 * Valida arquivos dentro de /usecases/:
 * - Nome do arquivo deve terminar com _usecase.dart
 * - Deve ter abstract interface class com prefixo I e sufixo Usecase
 * - Deve ter final class com sufixo Usecase e implements
 * - Deve usar implements, não extends para a interface
 * - Somente um usecase (interface + implementação) por arquivo
 * - Interface do UseCase deve ter somente um método (responsabilidade única)
 * - O método da interface deve se chamar "call" (callable class)
 * - O método call não pode ter mais de 3 parâmetros (usar classe de params)
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const MAX_CALL_PARAMS = 3;
function countMethodParams(lines, methodLine) {
  let paramStr = "";
  let parenDepth = 0;
  let foundOpen = false;
  outer: for (let j = methodLine; j < lines.length; j++) {
    for (const ch of lines[j]) {
      if (ch === "(" && !foundOpen) {
        foundOpen = true;
        parenDepth = 1;
        continue;
      }
      if (!foundOpen) continue;
      if (ch === "(") parenDepth++;
      if (ch === ")") {
        parenDepth--;
        if (parenDepth === 0) break outer;
      }
      paramStr += ch;
    }
    if (foundOpen) paramStr += " ";
  }
  const cleaned = paramStr.replace(/[{}[\]]/g, " ").trim();
  if (!cleaned) return 0;
  let depth = 0;
  let count = 0;
  let hasContent = false;
  for (const ch of cleaned) {
    if (ch === "<" || ch === "(") depth++;
    if (ch === ">" || ch === ")") depth--;
    if (ch === "," && depth === 0) {
      if (hasContent) count++;
      hasContent = false;
    } else if (ch.trim()) {
      hasContent = true;
    }
  }
  if (hasContent) count++;
  return count;
}
function parseClasses(lines) {
  const interfaces = [];
  const implementations = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ifaceMatch = line.match(/abstract\s+interface\s+class\s+([A-Za-z_]\w*)/);
    if (ifaceMatch) {
      const methods = [];
      let braceDepth = 0;
      let foundOpen = false;
      let endIndex = i;
      for (let j = i; j < lines.length; j++) {
        const cl = lines[j];
        if (foundOpen && braceDepth === 1) {
          const trimmed = cl.trim();
          if (!trimmed.startsWith("//") && !trimmed.startsWith("///") && !trimmed.startsWith("*")) {
            // Detecta somente declarações de método com tipo de retorno Dart na mesma linha:
            // Ex: "Future<...> call(" | "void download(" | "Stream<...> watch("
            const methodMatch = trimmed.match(
              /^(?:Future<[^>]*(?:<[^>]*>)*>|Stream<[^>]*(?:<[^>]*>)*>|void|bool|int|double|String|List<[^>]*>|Map<[^>]*>|Set<[^>]*>|[A-Z]\w*(?:<[^>]*>)?)\s+([a-z]\w*)\s*[(<]/
            );
            if (methodMatch) {
              methods.push({
                name: methodMatch[1],
                line: j + 1,
                paramCount: countMethodParams(lines, j),
              });
            }
          }
        }
        for (const ch of cl) {
          if (ch === "{") {
            braceDepth++;
            foundOpen = true;
          }
          if (ch === "}") braceDepth--;
        }
        if (foundOpen && braceDepth <= 0) {
          endIndex = j;
          break;
        }
      }
      interfaces.push({ name: ifaceMatch[1], line: i + 1, methods });
      i = endIndex;
      continue;
    }
    const trimmedLine = line.trim();
    if (
      trimmedLine.startsWith("//") ||
      trimmedLine.startsWith("*") ||
      trimmedLine.startsWith("///")
    )
      continue;
    const classMatch = line.match(/(?:final\s+)?class\s+([A-Za-z_]\w*)/);
    if (classMatch && !line.includes("abstract")) {
      let declaration = line;
      for (let j = i + 1; j < lines.length && !declaration.includes("{"); j++) {
        declaration += " " + lines[j].trim();
      }
      implementations.push({ name: classMatch[1], line: i + 1, declaration });
    }
  }
  return { interfaces, implementations };
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "domain-usecases",
    description: "Valida Domain Use Cases",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const files = [...git.created_files, ...git.modified_files].filter(
      (f) =>
        f.includes("/usecases/") &&
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith("usecases.dart") &&
        fs.existsSync(f)
    );
    for (const file of files) {
      const fileName = file.split("/").pop() || "";
      if (!fileName.endsWith("_usecase.dart")) {
        (0, _types_1.sendFormattedFail)({
          title: "NOMENCLATURA DE USECASE INCORRETA",
          description: "Arquivo deve terminar com `_usecase.dart`.",
          problem: {
            wrong: fileName,
            correct: `${fileName.replace(".dart", "")}_usecase.dart`,
            wrongLabel: "Nome atual",
            correctLabel: "Nome correto",
          },
          action: {
            code: `// Renomeie o arquivo:\n// ${fileName} → ${fileName.replace(".dart", "")}_usecase.dart`,
          },
          objective: "Manter **consistência** na nomenclatura da Domain Layer.",
          file,
          line: 1,
        });
        continue;
      }
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const { interfaces, implementations } = parseClasses(lines);
      if (interfaces.length > 1) {
        (0, _types_1.sendFormattedFail)({
          title: "MÚLTIPLAS INTERFACES EM UM ARQUIVO USECASE",
          description: `Encontradas **${interfaces.length} interfaces**: ${interfaces.map((i) => `\`${i.name}\``).join(", ")}.`,
          problem: {
            wrong: interfaces.map((i) => `abstract interface class ${i.name} { }`).join("\n"),
            correct: interfaces
              .map(
                (i) =>
                  `// ${i.name
                    .replace(/^I/, "")
                    .replace(/([A-Z])/g, "_$1")
                    .toLowerCase()
                    .slice(1)}_usecase.dart`
              )
              .join("\n"),
            wrongLabel: `${interfaces.length} interfaces no mesmo arquivo`,
            correctLabel: "Uma interface por arquivo",
          },
          action: {
            code: "Separe cada UseCase (interface + implementação) em seu próprio arquivo.",
            language: "text",
          },
          objective: "**Um UseCase por arquivo** — facilita navegação e manutenção.",
          file,
          line: interfaces[1].line,
        });
      }
      if (interfaces.length === 0) {
        (0, _types_1.sendFormattedFail)({
          title: "USECASE SEM INTERFACE",
          description: "Arquivo de UseCase deve ter `abstract interface class`.",
          problem: {
            wrong:
              implementations.length > 0
                ? `class ${implementations[0].name} { }`
                : `// Sem interface`,
            correct: `abstract interface class IGetUserUsecase {\n  Future<Result<Failure, UserEntity>> call(String id);\n}`,
          },
          action: {
            code: `abstract interface class IGetUserUsecase {\n  Future<Result<Failure, UserEntity>> call(String id);\n}\n\nfinal class GetUserUsecase implements IGetUserUsecase {\n  // implementação\n}`,
          },
          objective: "Permitir **injeção de dependência** e facilitar **testes**.",
          file,
          line: 1,
        });
      }
      for (const iface of interfaces) {
        if (!iface.name.startsWith("I")) {
          (0, _types_1.sendFormattedFail)({
            title: "INTERFACE DE USECASE SEM PREFIXO I",
            description: `A interface \`${iface.name}\` deve começar com \`I\`.`,
            problem: {
              wrong: `abstract interface class ${iface.name} { }`,
              correct: `abstract interface class I${iface.name} { }`,
            },
            action: {
              code: `abstract interface class I${iface.name} { }`,
            },
            objective: "Manter **consistência** na nomenclatura de interfaces.",
            file,
            line: iface.line,
          });
        }
        if (!iface.name.endsWith("Usecase")) {
          (0, _types_1.sendFormattedFail)({
            title: "INTERFACE DE USECASE SEM SUFIXO",
            description: `A interface \`${iface.name}\` deve terminar com \`Usecase\`.`,
            problem: {
              wrong: `abstract interface class ${iface.name} { }`,
              correct: `abstract interface class ${iface.name}Usecase { }`,
            },
            action: {
              code: `abstract interface class ${iface.name}Usecase { }`,
            },
            objective: "Manter **consistência** na nomenclatura de UseCases.",
            file,
            line: iface.line,
          });
        }
        if (iface.methods.length === 1 && iface.methods[0].name !== "call") {
          const method = iface.methods[0];
          (0, _types_1.sendFormattedFail)({
            title: "MÉTODO DO USECASE DEVE SE CHAMAR call",
            description: `A interface \`${iface.name}\` tem o método \`${method.name}\` — o método do UseCase deve se chamar \`call\`.`,
            problem: {
              wrong: `  Future<...> ${method.name}(...);`,
              correct: `  Future<Result<Failure, Entity>> call(Params params);`,
              wrongLabel: `Método "${method.name}"`,
              correctLabel: 'Método "call"',
            },
            action: {
              code: `// Renomeie o método:\n// ${method.name}() → call()`,
            },
            objective:
              "UseCases devem expor **apenas o método `call`** — padrão callable class do Dart.",
            reference: {
              text: "Dart Callable Classes",
              url: "https://dart.dev/language/callable-objects",
            },
            file,
            line: method.line,
          });
        }
        if (iface.methods.length > 1) {
          (0, _types_1.sendFormattedFail)({
            title: "USECASE COM MÚLTIPLOS MÉTODOS",
            description: `A interface \`${iface.name}\` tem **${iface.methods.length} métodos** (${iface.methods.map((m) => `\`${m.name}\``).join(", ")}). Um UseCase deve ter **apenas um método**.`,
            problem: {
              wrong: iface.methods.map((m) => `  Future<...> ${m.name}(...);`).join("\n"),
              correct: `  Future<Result<Failure, Entity>> call(Params params);`,
              wrongLabel: `${iface.methods.length} métodos no UseCase`,
              correctLabel: "Método único (call)",
            },
            action: {
              text: "Separe cada responsabilidade em seu próprio UseCase:",
              code:
                iface.methods
                  .filter((m) => m.name !== "call")
                  .map((m) => {
                    const pascalName = m.name.charAt(0).toUpperCase() + m.name.slice(1);
                    return `// ${m.name}() → crie um ${pascalName}Usecase dedicado`;
                  })
                  .join("\n") + "\n// Cada UseCase deve ter apenas o método call()",
            },
            objective:
              "Seguir o **Princípio de Responsabilidade Única** — cada UseCase deve executar **uma única operação**.",
            reference: {
              text: "Clean Architecture: Use Cases",
              url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
            },
            file,
            line: iface.line,
          });
        }
        const callMethod = iface.methods.find((m) => m.name === "call");
        if (callMethod && callMethod.paramCount > MAX_CALL_PARAMS) {
          const baseName = iface.name.replace(/^I/, "").replace(/Usecase$/, "");
          const paramsClassName = `${baseName}Params`;
          (0, _types_1.sendFormattedFail)({
            title: "USECASE COM MUITOS PARÂMETROS",
            description: `O método \`call\` da interface \`${iface.name}\` tem **${callMethod.paramCount} parâmetros**. Máximo recomendado: **${MAX_CALL_PARAMS}**. Crie uma classe de parâmetros para agrupar os dados.`,
            problem: {
              wrong: `Future<...> call(param1, param2, ..., param${callMethod.paramCount});`,
              correct: `Future<...> call(${paramsClassName} params);`,
              wrongLabel: `${callMethod.paramCount} parâmetros soltos`,
              correctLabel: "Classe de parâmetros",
            },
            action: {
              text: `Crie a classe \`${paramsClassName}\` para encapsular os parâmetros:`,
              code: `final class ${paramsClassName} {\n  const ${paramsClassName}({\n    // mova os parâmetros para cá\n  });\n}`,
            },
            objective:
              "Seguir o **Clean Code** — métodos com muitos parâmetros são difíceis de ler e manter. Agrupe em um objeto de parâmetros.",
            reference: {
              text: "Clean Code: 7 tips to write clean functions",
              url: "https://craftbettersoftware.com/p/clean-code-7-tips-to-write-clean",
            },
            file,
            line: callMethod.line,
          });
        }
      }
      if (implementations.length === 0 && interfaces.length > 0) {
        const ifaceName = interfaces[0].name;
        const implName = ifaceName.replace(/^I/, "");
        (0, _types_1.sendFormattedFail)({
          title: "USECASE SEM IMPLEMENTAÇÃO",
          description: "Arquivo tem interface mas não tem a implementação.",
          problem: {
            wrong: `abstract interface class ${ifaceName} { }\n// Sem implementação`,
            correct: `abstract interface class ${ifaceName} { }\n\nfinal class ${implName} implements ${ifaceName} { }`,
            wrongLabel: "Apenas interface",
            correctLabel: "Interface + implementação",
          },
          action: {
            code: `final class ${implName} implements ${ifaceName} {\n  // implementação\n}`,
          },
          objective: "Cada UseCase deve ter **interface + implementação** no mesmo arquivo.",
          file,
          line: interfaces[0].line,
        });
      }
      for (const impl of implementations) {
        if (!impl.name.endsWith("Usecase")) {
          (0, _types_1.sendFormattedFail)({
            title: "IMPLEMENTAÇÃO DE USECASE SEM SUFIXO",
            description: `A classe \`${impl.name}\` deve terminar com \`Usecase\`.`,
            problem: {
              wrong: `class ${impl.name} { }`,
              correct: `class ${impl.name}Usecase { }`,
            },
            action: {
              code: `final class ${impl.name}Usecase implements I${impl.name}Usecase { }`,
            },
            objective: "Manter **consistência** na nomenclatura de UseCases.",
            file,
            line: impl.line,
          });
        }
        if (impl.declaration.match(/extends\s+I\w+/)) {
          const ifaceName = interfaces[0]?.name || "IXxxUsecase";
          (0, _types_1.sendFormattedFail)({
            title: "USECASE COM EXTENDS INCORRETO",
            description: "UseCase deve usar `implements`, não `extends`.",
            problem: {
              wrong: `class ${impl.name} extends ${ifaceName} { }`,
              correct: `class ${impl.name} implements ${ifaceName} { }`,
              wrongLabel: "extends (herança)",
              correctLabel: "implements (contrato)",
            },
            action: {
              code: `final class ${impl.name} implements ${ifaceName} { }`,
            },
            objective: "Interfaces devem ser **implementadas**, não estendidas.",
            file,
            line: impl.line,
          });
        }
      }
    }
  }
);
