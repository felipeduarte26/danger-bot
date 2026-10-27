"use strict";
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
 * - Doc `///` acima do `@override` é redundante, a da interface é herdada (exceto `{@macro}`)
 *
 * Ignora barrel files, `repositories.dart` e arquivos fora de /domain/ e /data/.
 * Nome de arquivo incorreto encerra a análise do arquivo.
 */
const _types_1 = require("../../../types.js");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "repositories",
    description: "Valida Repositories (Domain interface + Data implementação)",
    enabled: true,
  },
  async () => {
    const files = _types_1.DartFile.changed({ createdFirst: true }).filter(
      (file) =>
        file.path.inFolder(_types_1.DartLayerFolder.Repositories) &&
        !file.path.fileName.endsWith("repositories.dart") &&
        !file.path.isBarrel
    );
    for (const file of files) {
      if (file.path.inLayer(_types_1.DartLayer.Domain)) {
        validateDomainRepository(file);
      } else if (file.path.inLayer(_types_1.DartLayer.Data)) {
        validateDataRepository(file);
      }
    }
  }
);
function validateDomainRepository(file) {
  const filePath = file.path.path;
  const fileName = file.path.fileName;
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
      file: filePath,
      line: 1,
    });
    return;
  }
  const interfaces = file.classes.filter((c) => c.isAbstract && c.isInterface);
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
      file: filePath,
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
      file: filePath,
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
        file: filePath,
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
        file: filePath,
        line: iface.line,
      });
    }
    validateRedundantMethodNames(filePath, iface, "Repository");
  }
}
function validateDataRepository(file) {
  const filePath = file.path.path;
  const fileName = file.path.fileName;
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
      file: filePath,
      line: 1,
    });
    return;
  }
  // Implementações: as classes concretas do arquivo (sem nenhuma, não há o que validar)
  const classes = file.classes.filter((c) => !c.isAbstract);
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
      file: filePath,
      line: classes[1].line,
    });
  }
  for (const cls of classes) {
    const implementsInterface = cls.interfaces.length > 0;
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
        file: filePath,
        line: cls.line,
      });
    }
    if (!implementsInterface) {
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
        file: filePath,
        line: cls.line,
      });
    }
    if (!cls.extendsAny("BaseRepository")) {
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
        file: filePath,
        line: cls.line,
      });
    }
    if (implementsInterface) {
      validateRedundantOverrideDocs(filePath, cls);
    }
  }
}
function extractContextFromClassName(className, suffix) {
  let name = className;
  if (name.startsWith("I")) name = name.slice(1);
  if (name.endsWith(suffix)) name = name.slice(0, -suffix.length);
  return name.length >= 2 ? name : null;
}
/** Métodos, getters e setters da classe com nome em lowerCamelCase (sem privados e operadores). */
function namedMethods(cls) {
  return cls.methods.filter(
    (m) => m.memberKind !== _types_1.DartMemberKind.Operator && /^[a-z]/.test(m.name)
  );
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
function validateRedundantMethodNames(filePath, iface, suffix) {
  const context = extractContextFromClassName(iface.name, suffix);
  if (!context) return;
  for (const method of namedMethods(iface)) {
    if (isMethodNameRedundant(method.name, context)) {
      const suggested = getSuggestedMethodName(method.name, context);
      (0, _types_1.sendFormattedFail)({
        title: "NOME DE MÉTODO REDUNDANTE",
        description: `O método \`${method.name}\` repete o contexto \`${context}\` que já está no nome da classe \`${iface.name}\`.`,
        problem: {
          wrong: `${method.name}(...)`,
          correct: `${suggested}(...)`,
          wrongLabel: `Redundante — "${context}" já está no nome da classe`,
          correctLabel: "Sem redundância",
        },
        action: {
          text: `Remova "${context}" do nome do método:`,
          code: `// Em ${iface.name}\n\n// Antes\n${method.name}(...)\n\n// Depois\n${suggested}(...)`,
        },
        objective: "Evitar **redundância** nos nomes — o contexto da classe já comunica o domínio.",
        reference: {
          text: "Clean Code — Cap. 2: Don't Add Gratuitous Context (Robert C. Martin)",
          url: "https://medium.com/@sardorjs/clean-code-chapter-2-meaningful-names-baa554f93f17",
        },
        file: filePath,
        line: method.nameLine,
      });
    }
  }
}
/** Documentação escrita acima do `@override` (doc entre a anotação e a assinatura não conta). */
function docAboveOverride(method) {
  const override = method.annotations.find((a) => a.name === "override");
  const doc = method.doc;
  return override && doc && doc.startOffset < override.startOffset ? doc : null;
}
/** Documentação `///` em método `@override`: a doc da interface já é herdada (`{@macro}` é aceito). */
function validateRedundantOverrideDocs(filePath, cls) {
  for (const method of namedMethods(cls)) {
    const doc = docAboveOverride(method);
    if (doc === null || doc.isMacroOnly) continue;
    const methodName = method.name;
    const docText = doc.comments.map((c) => c.text.trim()).join("\n");
    (0, _types_1.sendFormattedFail)({
      title: "DOCUMENTAÇÃO REDUNDANTE EM @override",
      description: `O método \`${methodName}\` em \`${cls.name}\` possui documentação redundante — \`@override\` herda a doc da interface automaticamente.`,
      problem: {
        wrong: `${docText}\n@override\n... ${methodName}(...)`,
        correct: `@override\n... ${methodName}(...)`,
        wrongLabel: "Documentação duplicada",
        correctLabel: "Herda doc da interface automaticamente",
      },
      action: {
        text: "Remova a documentação — em Dart, `@override` herda a doc da interface:",
        code: `@override\n... ${methodName}(...)`,
      },
      objective:
        "Evitar **documentação duplicada** — Dart herda doc da interface automaticamente via `@override`.",
      file: filePath,
      line: doc.line,
    });
  }
}
