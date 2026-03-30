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
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
function parseClasses(lines) {
  const interfaces = [];
  const implementations = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ifaceMatch = line.match(/abstract\s+interface\s+class\s+([A-Za-z_]\w*)/);
    if (ifaceMatch) {
      interfaces.push({ name: ifaceMatch[1], line: i + 1 });
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
