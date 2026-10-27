/**
 * Domain UseCases Plugin
 * Valida arquivos dentro de /usecases/ (ou /usecase/):
 * - Nome do arquivo deve terminar com _usecase.dart
 * - Deve ter abstract interface class com prefixo I e sufixo UseCase
 * - Deve ter final class com sufixo UseCase e implements
 * - Deve usar implements, não extends para a interface
 * - Somente um usecase (interface + implementação) por arquivo
 * - Interface do UseCase deve ter somente um método (responsabilidade única)
 * - O método da interface deve se chamar "call" (callable class)
 * - O método call não pode ter mais de 3 parâmetros (usar classe de params)
 * - Doc `///` acima do `@override` não repete a de um método documentado na interface
 *
 * Ignora barrel files, `usecases.dart` e o `usecase.dart` base. Nome de arquivo incorreto
 * encerra a análise do arquivo. Métodos da interface: os de instância com tipo de retorno
 * e nome em lowerCamelCase (getters, setters e operadores não contam).
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

const MAX_CALL_PARAMS = 3;

/** Métodos que o UseCase expõe na interface. */
function interfaceMethods(iface: DartClass): DartMethod[] {
  return iface.methods.filter(
    (m) =>
      m.memberKind === DartMemberKind.Method &&
      !m.isStatic &&
      m.returnType !== null &&
      /^[a-z]/.test(m.name)
  );
}

export default createPlugin(
  {
    name: "domain-usecases",
    description: "Valida Domain Use Cases",
    enabled: true,
  },
  async () => {
    const files = DartFile.changed({ createdFirst: true }).filter(
      (file) =>
        (file.path.inFolder(DartLayerFolder.UseCases) || file.path.inFolder("usecase")) &&
        !file.path.fileName.endsWith("usecases.dart") &&
        file.path.fileName !== "usecase.dart" &&
        !file.path.isBarrel
    );

    for (const file of files) {
      const filePath = file.path.path;
      const fileName = file.path.fileName;

      if (!fileName.endsWith("_usecase.dart")) {
        sendFormattedFail({
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
          file: filePath,
          line: 1,
        });
        continue;
      }

      const interfaces = file.classes.filter((c) => c.isAbstract && c.isInterface);
      const implementations = file.classes.filter((c) => !c.isAbstract);

      if (interfaces.length > 1) {
        sendFormattedFail({
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
          file: filePath,
          line: interfaces[1].line,
        });
      }

      if (interfaces.length === 0) {
        sendFormattedFail({
          title: "USECASE SEM INTERFACE",
          description: "Arquivo de UseCase deve ter `abstract interface class`.",
          problem: {
            wrong:
              implementations.length > 0
                ? `class ${implementations[0].name} { }`
                : `// Sem interface`,
            correct: `abstract interface class IGetUserUseCase {\n  Future<Result<Failure, UserEntity>> call(String id);\n}`,
          },
          action: {
            code: `abstract interface class IGetUserUseCase {\n  Future<Result<Failure, UserEntity>> call(String id);\n}\n\nfinal class GetUserUseCase implements IGetUserUseCase {\n  // implementação\n}`,
          },
          objective: "Permitir **injeção de dependência** e facilitar **testes**.",
          file: filePath,
          line: 1,
        });
      }

      for (const iface of interfaces) {
        const methods = interfaceMethods(iface);

        if (!iface.name.startsWith("I")) {
          sendFormattedFail({
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
            file: filePath,
            line: iface.line,
          });
        }

        if (!iface.name.endsWith("UseCase")) {
          const wrongCasing = /usecase$/i.test(iface.name);

          if (wrongCasing) {
            const corrected = iface.name.replace(/usecase$/i, "UseCase");
            sendFormattedFail({
              title: "SUFIXO DO USECASE COM CASING INCORRETO",
              description: `A interface \`${iface.name}\` deve usar \`UseCase\` em **PascalCase** (com C maiúsculo).`,
              problem: {
                wrong: `abstract interface class ${iface.name} { }`,
                correct: `abstract interface class ${corrected} { }`,
                wrongLabel: "Casing incorreto",
                correctLabel: "PascalCase correto",
              },
              action: {
                text: "Corrija o casing do sufixo:",
                code: `// ${iface.name} → ${corrected}`,
              },
              objective: "Manter **consistência** — o sufixo correto é `UseCase` (PascalCase).",
              reference: {
                text: "Effective Dart: Style — Classes",
                url: "https://dart.dev/effective-dart/style#do-name-types-using-uppercamelcase",
              },
              file: filePath,
              line: iface.line,
            });
          } else {
            sendFormattedFail({
              title: "INTERFACE DE USECASE SEM SUFIXO",
              description: `A interface \`${iface.name}\` deve terminar com \`UseCase\`.`,
              problem: {
                wrong: `abstract interface class ${iface.name} { }`,
                correct: `abstract interface class ${iface.name}UseCase { }`,
              },
              action: {
                code: `abstract interface class ${iface.name}UseCase { }`,
              },
              objective: "Manter **consistência** na nomenclatura de UseCases.",
              file: filePath,
              line: iface.line,
            });
          }
        }

        if (methods.length === 1 && methods[0].name !== "call") {
          const method = methods[0];
          sendFormattedFail({
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
            file: filePath,
            line: method.nameLine,
          });
        }

        if (methods.length > 1) {
          sendFormattedFail({
            title: "USECASE COM MÚLTIPLOS MÉTODOS",
            description: `A interface \`${iface.name}\` tem **${methods.length} métodos** (${methods.map((m) => `\`${m.name}\``).join(", ")}). Um UseCase deve ter **apenas um método**.`,
            problem: {
              wrong: methods.map((m) => `  Future<...> ${m.name}(...);`).join("\n"),
              correct: `  Future<Result<Failure, Entity>> call(Params params);`,
              wrongLabel: `${methods.length} métodos no UseCase`,
              correctLabel: "Método único (call)",
            },
            action: {
              text: "Separe cada responsabilidade em seu próprio UseCase:",
              code:
                methods
                  .filter((m) => m.name !== "call")
                  .map((m) => {
                    const pascalName = m.name.charAt(0).toUpperCase() + m.name.slice(1);
                    return `// ${m.name}() → crie um ${pascalName}UseCase dedicado`;
                  })
                  .join("\n") + "\n// Cada UseCase deve ter apenas o método call()",
            },
            objective:
              "Seguir o **Princípio de Responsabilidade Única** — cada UseCase deve executar **uma única operação**.",
            reference: {
              text: "Clean Architecture: Use Cases",
              url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
            },
            file: filePath,
            line: iface.line,
          });
        }

        const callMethod = methods.find((m) => m.name === "call");
        const paramCount = callMethod?.parameters.length ?? 0;
        if (callMethod && paramCount > MAX_CALL_PARAMS) {
          const baseName = iface.name.replace(/^I/, "").replace(/[Uu]se[Cc]ase$/, "");
          const paramsClassName = `${baseName}Params`;

          sendFormattedFail({
            title: "USECASE COM MUITOS PARÂMETROS",
            description: `O método \`call\` da interface \`${iface.name}\` tem **${paramCount} parâmetros**. Máximo recomendado: **${MAX_CALL_PARAMS}**. Crie uma classe de parâmetros para agrupar os dados.`,
            problem: {
              wrong: `Future<...> call(param1, param2, ..., param${paramCount});`,
              correct: `Future<...> call(${paramsClassName} params);`,
              wrongLabel: `${paramCount} parâmetros soltos`,
              correctLabel: "Classe de parâmetros",
            },
            action: {
              text: `Crie a classe \`${paramsClassName}\` para encapsular os parâmetros:`,
              code: `final class ${paramsClassName} {\n  const ${paramsClassName}({\n    // mova os parâmetros para cá\n  });\n}`,
            },
            objective:
              "Seguir o **Clean Code** — métodos com muitos parâmetros são difíceis de ler e manter. Agrupe em um objeto de parâmetros.",
            reference: {
              text: "Clean Code: 7 dicas para escrever funções limpas",
              url: "https://craftbettersoftware.com/p/clean-code-7-tips-to-write-clean",
            },
            file: filePath,
            line: callMethod.nameLine,
          });
        }
      }

      if (implementations.length === 0 && interfaces.length > 0) {
        const ifaceName = interfaces[0].name;
        const implName = ifaceName.replace(/^I/, "");

        sendFormattedFail({
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
          file: filePath,
          line: interfaces[0].line,
        });
      }

      if (interfaces.length > 0 && implementations.length > 0) {
        validateRedundantOverrideDocs(
          filePath,
          implementations[0],
          documentedMethodNames(interfaces[0])
        );
      }

      for (const impl of implementations) {
        if (!impl.name.endsWith("UseCase")) {
          const wrongCasing = /usecase$/i.test(impl.name);

          if (wrongCasing) {
            const corrected = impl.name.replace(/usecase$/i, "UseCase");
            sendFormattedFail({
              title: "SUFIXO DO USECASE COM CASING INCORRETO",
              description: `A classe \`${impl.name}\` deve usar \`UseCase\` em **PascalCase** (com C maiúsculo).`,
              problem: {
                wrong: `class ${impl.name} { }`,
                correct: `class ${corrected} { }`,
                wrongLabel: "Casing incorreto",
                correctLabel: "PascalCase correto",
              },
              action: {
                text: "Corrija o casing do sufixo:",
                code: `// ${impl.name} → ${corrected}`,
              },
              objective: "Manter **consistência** — o sufixo correto é `UseCase` (PascalCase).",
              reference: {
                text: "Effective Dart: Style — Classes",
                url: "https://dart.dev/effective-dart/style#do-name-types-using-uppercamelcase",
              },
              file: filePath,
              line: impl.line,
            });
          } else {
            sendFormattedFail({
              title: "IMPLEMENTAÇÃO DE USECASE SEM SUFIXO",
              description: `A classe \`${impl.name}\` deve terminar com \`UseCase\`.`,
              problem: {
                wrong: `class ${impl.name} { }`,
                correct: `class ${impl.name}UseCase { }`,
              },
              action: {
                code: `final class ${impl.name}UseCase implements I${impl.name}UseCase { }`,
              },
              objective: "Manter **consistência** na nomenclatura de UseCases.",
              file: filePath,
              line: impl.line,
            });
          }
        }

        // `extends IXxx`: herda da interface em vez de implementá-la
        if (/^I\w/.test(impl.superclass?.name ?? "")) {
          const ifaceName = interfaces[0]?.name || "IXxxUseCase";
          sendFormattedFail({
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
            file: filePath,
            line: impl.line,
          });
        }
      }
    }
  }
);

/** Nomes dos métodos, getters e setters públicos da interface que têm documentação `///`. */
function documentedMethodNames(iface: DartClass): Set<string> {
  return new Set(
    iface.methods.filter((m) => /^[a-z]/.test(m.name) && m.doc !== null).map((m) => m.name)
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
  for (const method of cls.methods) {
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
