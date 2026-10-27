/**
 * Data Datasources Plugin
 * Valida arquivos dentro de /datasources/:
 * - Nome do arquivo deve terminar com _datasource.dart (o resto do arquivo é validado mesmo assim)
 * - Deve ter abstract interface class com prefixo I e sufixo Datasource
 * - Deve ter implementação final class com sufixo Datasource e implements
 * - Métodos não devem repetir o contexto da classe — "Don't Add Gratuitous Context" (Clean Code, Cap. 2, p. 29)
 * - Doc `///` acima do `@override` não repete a de um método documentado na interface
 *
 * Ignora barrel files e `datasources.dart`. Implementação é a classe concreta (sem `abstract`)
 * com `implements`; "sem implementação" só é apontado quando o arquivo tem a interface.
 */
import {
  DartClass,
  DartDoc,
  DartFile,
  DartLayerFolder,
  DartMemberKind,
  DartMethod,
  createPlugin,
  sendFormattedFail,
} from "@types";

const DATASOURCE_VARIANTS = [
  "datasource",
  "data_source",
  "datascource",
  "datasouce",
  "datasourc",
  "datasurce",
  "datsource",
  "datasorce",
  "dataource",
  "datasrouce",
  "datassource",
];

function suggestDatasourceFileName(fileName: string): string {
  const baseName = fileName.replace(".dart", "");
  const lowerBase = baseName.toLowerCase();

  const sorted = [...DATASOURCE_VARIANTS].sort((a, b) => b.length - a.length);

  for (const variant of sorted) {
    const idx = lowerBase.indexOf(variant);
    if (idx !== -1) {
      const prefix = baseName.slice(0, idx).replace(/_+$/, "");
      if (prefix.length === 0) return "datasource.dart";
      return `${prefix}_datasource.dart`;
    }
  }

  return `${baseName}_datasource.dart`;
}

export default createPlugin(
  {
    name: "data-datasources",
    description: "Valida Data Sources",
    enabled: true,
  },
  async () => {
    const files = DartFile.changed({ createdFirst: true }).filter(
      (file) =>
        file.path.inFolder(DartLayerFolder.DataSources) &&
        !file.path.fileName.endsWith("datasources.dart") &&
        !file.path.isBarrel
    );

    for (const file of files) {
      const filePath = file.path.path;
      const fileName = file.path.fileName;

      if (!fileName.endsWith("_datasource.dart")) {
        const suggested = suggestDatasourceFileName(fileName);
        sendFormattedFail({
          title: "NOMENCLATURA DE DATASOURCE INCORRETA",
          description: "Arquivo de Datasource deve terminar com `_datasource.dart`.",
          problem: {
            wrong: fileName,
            correct: suggested,
          },
          action: {
            text: "Renomeie o arquivo:",
            code: suggested,
          },
          objective: "Manter **consistência** na nomenclatura da camada Data.",
          file: filePath,
          line: 1,
        });
      }

      const interfaces = file.classes.filter((c) => c.isAbstract && c.isInterface);
      const implementations = file.classes.filter((c) => !c.isAbstract && c.interfaces.length > 0);

      const iface = interfaces.length > 0 ? interfaces[0] : null;
      const implementation = implementations.length > 0 ? implementations[0] : null;

      if (interfaces.length > 1) {
        sendFormattedFail({
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
          file: filePath,
          line: interfaces[1].line,
        });
      }

      if (implementations.length > 1) {
        sendFormattedFail({
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
          file: filePath,
          line: implementations[1].line,
        });
      }

      if (!iface) {
        sendFormattedFail({
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
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join("")}Datasource {\n  // métodos do contrato\n}`,
          },
          objective: "Permitir **injeção de dependência** e facilitar **testes**.",
          reference: {
            text: "Dependency Inversion Principle",
            url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
          },
          file: filePath,
          line: 1,
        });
      }

      if (iface) {
        if (!iface.name.startsWith("I")) {
          sendFormattedFail({
            title: "INTERFACE DE DATASOURCE SEM PREFIXO I",
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

        if (!iface.name.endsWith("Datasource")) {
          sendFormattedFail({
            title: "INTERFACE DE DATASOURCE SEM SUFIXO",
            description: `A interface \`${iface.name}\` deve terminar com \`Datasource\`.`,
            problem: {
              wrong: `abstract interface class ${iface.name} { }`,
              correct: `abstract interface class ${iface.name}Datasource { }`,
            },
            action: {
              text: "Adicione o sufixo `Datasource`:",
              code: `abstract interface class ${iface.name}Datasource { }`,
            },
            objective: "Manter **consistência** na nomenclatura de Datasources.",
            file: filePath,
            line: iface.line,
          });
        }

        validateRedundantMethodNames(filePath, iface, "Datasource");
      }

      if (!implementation && iface) {
        sendFormattedFail({
          title: "DATASOURCE SEM IMPLEMENTAÇÃO",
          description: `Arquivo tem interface \`${iface.name}\` mas não tem a implementação.`,
          problem: {
            wrong: `abstract interface class ${iface.name} { }\n// Sem implementação`,
            correct: `abstract interface class ${iface.name} { }\n\nfinal class ${iface.name.replace(/^I/, "")} implements ${iface.name} { }`,
          },
          action: {
            text: "Adicione a classe que implementa a interface:",
            code: `final class ${iface.name.replace(/^I/, "")} implements ${iface.name} {\n  // implementação dos métodos\n}`,
          },
          objective: "Completar o **contrato** definido pela interface.",
          file: filePath,
          line: iface.line,
        });
      }

      if (implementation) {
        if (!implementation.name.endsWith("Datasource")) {
          sendFormattedFail({
            title: "IMPLEMENTAÇÃO DE DATASOURCE SEM SUFIXO",
            description: `A classe \`${implementation.name}\` deve terminar com \`Datasource\`.`,
            problem: {
              wrong: `class ${implementation.name} implements ... { }`,
              correct: `class ${implementation.name}Datasource implements ... { }`,
            },
            action: {
              text: "Adicione o sufixo `Datasource`:",
              code: `class ${implementation.name}Datasource implements ... { }`,
            },
            objective: "Manter **consistência** na nomenclatura de Datasources.",
            file: filePath,
            line: implementation.line,
          });
        }

        if (iface) {
          validateRedundantOverrideDocs(filePath, implementation, documentedMethodNames(iface));
        }
      }
    }
  }
);

function extractContextFromClassName(className: string, suffix: string): string | null {
  let name = className;
  if (name.startsWith("I")) name = name.slice(1);
  if (name.endsWith(suffix)) name = name.slice(0, -suffix.length);
  return name.length >= 2 ? name : null;
}

/** Métodos, getters e setters da classe com nome em lowerCamelCase (sem privados e operadores). */
function namedMethods(cls: DartClass): DartMethod[] {
  return cls.methods.filter(
    (m) => m.memberKind !== DartMemberKind.Operator && /^[a-z]/.test(m.name)
  );
}

function toCamelCaseStart(name: string): string {
  if (name === name.toUpperCase()) return name.toLowerCase();
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function isMethodNameRedundant(methodName: string, context: string): boolean {
  if (context.length < 2) return false;

  const contextLower = toCamelCaseStart(context);
  const contextPascal = context.charAt(0).toUpperCase() + context.slice(1);

  const startsWithContext = new RegExp(`^${contextLower}(?=[A-Z_]|$)`).test(methodName);
  const containsContext = new RegExp(`[a-z]${contextPascal}(?=[A-Z_]|$)`).test(methodName);

  if (!startsWithContext && !containsContext) return false;

  const suggested = getSuggestedMethodName(methodName, context);
  return suggested.length >= 2 && suggested !== methodName;
}

function getSuggestedMethodName(methodName: string, context: string): string {
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

function validateRedundantMethodNames(filePath: string, iface: DartClass, suffix: string): void {
  const context = extractContextFromClassName(iface.name, suffix);
  if (!context) return;

  for (const method of namedMethods(iface)) {
    if (isMethodNameRedundant(method.name, context)) {
      const suggested = getSuggestedMethodName(method.name, context);

      sendFormattedFail({
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

/** Nomes dos métodos da interface que têm documentação `///`. */
function documentedMethodNames(iface: DartClass): Set<string> {
  return new Set(
    namedMethods(iface)
      .filter((m) => m.doc !== null)
      .map((m) => m.name)
  );
}

/** Documentação escrita acima do `@override` (doc entre a anotação e a assinatura não conta). */
function docAboveOverride(method: DartMethod): DartDoc | null {
  const override = method.annotations.find((a) => a.name === "override");
  const doc = method.doc;
  return override && doc && doc.startOffset < override.startOffset ? doc : null;
}

/** Documentação em método `@override` cuja doc já está na interface. */
function validateRedundantOverrideDocs(
  filePath: string,
  cls: DartClass,
  interfaceDocumentedMethods: Set<string>
): void {
  for (const method of namedMethods(cls)) {
    const doc = docAboveOverride(method);
    if (doc === null || !interfaceDocumentedMethods.has(method.name)) continue;

    const methodName = method.name;
    const docText = doc.comments.map((c) => c.text.trim()).join("\n");

    sendFormattedFail({
      title: "DOCUMENTAÇÃO REDUNDANTE EM @override",
      description: `O método \`${methodName}\` em \`${cls.name}\` possui documentação que já está definida na interface.`,
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
