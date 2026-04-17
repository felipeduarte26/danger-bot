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
 * Repositories Plugin
 * Valida repositories em ambas as camadas:
 *
 * Domain (interface):
 * - Arquivo: *_repository_interface.dart
 * - abstract interface class com prefixo I e sufixo Repository
 * - Somente uma interface por arquivo
 * - Métodos não devem repetir o contexto da classe — "Don't Add Gratuitous Context" (Clean Code, Cap. 2, p. 29)
 *
 * Data (implementação):
 * - Arquivo: *_repository.dart
 * - final class com sufixo Repository
 * - Deve implementar interface (implements IXxxRepository)
 * - Deve estender BaseRepository
 * - Somente uma classe por arquivo
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function isBarrelFile(filePath) {
  const fileName = path.basename(filePath, ".dart");
  const parentDir = path.basename(path.dirname(filePath));
  return fileName === parentDir;
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "repositories",
    description: "Valida Repositories (Domain interface + Data implementação)",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const files = [...git.created_files, ...git.modified_files].filter(
      (f) =>
        f.includes("/repositories/") &&
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith("repositories.dart") &&
        !isBarrelFile(f) &&
        fs.existsSync(f)
    );
    for (const file of files) {
      if (file.includes("/domain/")) {
        validateDomainRepository(file);
      } else if (file.includes("/data/")) {
        validateDataRepository(file);
      }
    }
  }
);
function validateDomainRepository(file) {
  const fileName = file.split("/").pop() || "";
  if (!fileName.endsWith("_repository_interface.dart")) {
    (0, _types_1.sendFormattedFail)({
      title: "NOMENCLATURA DE REPOSITORY INTERFACE INCORRETA",
      description: "Arquivo de interface deve terminar com `_repository_interface.dart`.",
      problem: {
        wrong: fileName,
        correct: `${fileName.replace(".dart", "")}_repository_interface.dart`,
      },
      action: {
        text: "Renomeie o arquivo:",
        code: `${fileName.replace(".dart", "")}_repository_interface.dart`,
      },
      objective: "Manter **consistência** na nomenclatura de interfaces.",
      file,
      line: 1,
    });
    return;
  }
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  const interfaces = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/abstract\s+interface\s+class\s+([A-Za-z_]\w*)/);
    if (match) {
      interfaces.push({ name: match[1], line: i + 1 });
    }
  }
  if (interfaces.length === 0) {
    (0, _types_1.sendFormattedFail)({
      title: "REPOSITORY SEM ABSTRACT INTERFACE CLASS",
      description: "Arquivo de interface deve conter `abstract interface class`.",
      problem: {
        wrong: `// Arquivo sem interface`,
        correct: `abstract interface class IUserRepository {\n  Future<Result<Failure, UserEntity>> getUser(String id);\n}`,
      },
      action: {
        text: "Adicione a interface:",
        code: `abstract interface class IUserRepository {\n  Future<Result<Failure, UserEntity>> getUser(String id);\n}`,
      },
      objective: "Definir o **contrato** do Repository na camada Domain.",
      file,
      line: 1,
    });
    return;
  }
  if (interfaces.length > 1) {
    (0, _types_1.sendFormattedFail)({
      title: "MÚLTIPLAS INTERFACES EM UM ARQUIVO",
      description: `Encontradas **${interfaces.length} interfaces**: ${interfaces.map((i) => `\`${i.name}\``).join(", ")}.`,
      problem: {
        wrong: interfaces.map((i) => `abstract interface class ${i.name} { }`).join("\n"),
        correct: `// Uma interface por arquivo\nabstract interface class ${interfaces[0].name} { }`,
      },
      action: {
        text: "Separe cada interface em seu próprio arquivo:",
        code: interfaces.map((i) => `${i.name.toLowerCase()}_repository_interface.dart`).join("\n"),
      },
      objective: "**Uma interface por arquivo** — facilita navegação e manutenção.",
      file,
      line: interfaces[1].line,
    });
  }
  for (const iface of interfaces) {
    if (!iface.name.startsWith("I")) {
      (0, _types_1.sendFormattedFail)({
        title: "REPOSITORY INTERFACE SEM PREFIXO I",
        description: `A interface \`${iface.name}\` deve começar com \`I\`.`,
        problem: {
          wrong: `abstract interface class ${iface.name} { }`,
          correct: `abstract interface class I${iface.name} { }`,
        },
        action: {
          text: "Adicione o prefixo `I`:",
          code: `abstract interface class I${iface.name} { }`,
        },
        objective: "Manter **padrão de nomenclatura** para interfaces.",
        file,
        line: iface.line,
      });
    }
    if (!iface.name.endsWith("Repository")) {
      (0, _types_1.sendFormattedFail)({
        title: "REPOSITORY INTERFACE SEM SUFIXO",
        description: `A interface \`${iface.name}\` deve terminar com \`Repository\`.`,
        problem: {
          wrong: `abstract interface class ${iface.name} { }`,
          correct: `abstract interface class ${iface.name}Repository { }`,
        },
        action: {
          text: "Adicione o sufixo `Repository`:",
          code: `abstract interface class ${iface.name}Repository { }`,
        },
        objective: "Manter **consistência** na nomenclatura de Repositories.",
        file,
        line: iface.line,
      });
    }
    validateRedundantMethodNames(file, lines, iface.name, iface.line - 1, "Repository");
  }
}
function validateDataRepository(file) {
  const fileName = file.split("/").pop() || "";
  if (!fileName.endsWith("_repository.dart")) {
    (0, _types_1.sendFormattedFail)({
      title: "NOMENCLATURA DE REPOSITORY INCORRETA",
      description: "Arquivo de implementação deve terminar com `_repository.dart`.",
      problem: {
        wrong: fileName,
        correct: `${fileName.replace(".dart", "")}_repository.dart`,
      },
      action: {
        text: "Renomeie o arquivo:",
        code: `${fileName.replace(".dart", "")}_repository.dart`,
      },
      objective: "Manter **consistência** na nomenclatura de Repositories.",
      file,
      line: 1,
    });
    return;
  }
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  const classes = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/(?:final\s+)?class\s+([A-Za-z_]\w*)/);
    if (match && !lines[i].includes("abstract")) {
      let declaration = lines[i];
      for (let j = i + 1; j < lines.length && !declaration.includes("{"); j++) {
        declaration += " " + lines[j].trim();
      }
      classes.push({ name: match[1], line: i + 1, declaration });
    }
  }
  if (classes.length === 0) return;
  if (classes.length > 1) {
    (0, _types_1.sendFormattedFail)({
      title: "MÚLTIPLAS CLASSES EM UM ARQUIVO REPOSITORY",
      description: `Encontradas **${classes.length} classes**: ${classes.map((c) => `\`${c.name}\``).join(", ")}.`,
      problem: {
        wrong: classes.map((c) => `class ${c.name} { }`).join("\n"),
        correct: `// Uma classe por arquivo\nclass ${classes[0].name} { }`,
      },
      action: {
        text: "Separe cada Repository em seu próprio arquivo:",
        code: classes.map((c) => `${c.name.toLowerCase()}_repository.dart`).join("\n"),
      },
      objective: "**Uma classe por arquivo** — facilita navegação e reduz conflitos de merge.",
      file,
      line: classes[1].line,
    });
  }
  for (const cls of classes) {
    if (!cls.name.endsWith("Repository")) {
      (0, _types_1.sendFormattedFail)({
        title: "REPOSITORY SEM SUFIXO",
        description: `A classe \`${cls.name}\` deve terminar com \`Repository\`.`,
        problem: {
          wrong: `class ${cls.name} { }`,
          correct: `class ${cls.name}Repository { }`,
        },
        action: {
          text: "Renomeie a classe:",
          code: `class ${cls.name}Repository { }`,
        },
        objective: "Manter **consistência** na nomenclatura de Repositories.",
        file,
        line: cls.line,
      });
    }
    if (!cls.declaration.includes("implements")) {
      (0, _types_1.sendFormattedFail)({
        title: "REPOSITORY SEM INTERFACE",
        description: `A classe \`${cls.name}\` deve implementar uma interface de Repository.`,
        problem: {
          wrong: `class ${cls.name} { }`,
          correct: `class ${cls.name} implements I${cls.name} { }`,
        },
        action: {
          text: "Adicione `implements` com a interface correspondente:",
          code: `class ${cls.name} implements I${cls.name} { }`,
        },
        objective:
          "Garantir **inversão de dependência** — Domain define o contrato, Data implementa.",
        file,
        line: cls.line,
      });
    }
    if (!cls.declaration.includes("extends BaseRepository")) {
      (0, _types_1.sendFormattedFail)({
        title: "REPOSITORY SEM BASEREPOSITORY",
        description: `A classe \`${cls.name}\` deve estender \`BaseRepository\` para tratamento padronizado de erros.`,
        problem: {
          wrong: `class ${cls.name} implements I${cls.name} { }`,
          correct: `class ${cls.name} extends BaseRepository<XxxFailure>\n    implements I${cls.name} { }`,
        },
        action: {
          text: "Adicione `extends BaseRepository`:",
          code: `class ${cls.name} extends BaseRepository<XxxFailure>\n    implements I${cls.name} { }`,
        },
        objective: "Tratamento de **erros padronizado** em todos os Repositories.",
        file,
        line: cls.line,
      });
    }
  }
}
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
