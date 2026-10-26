/**
 * Domain Failures Plugin
 * Valida arquivos dentro de /failures/:
 * - Nome do arquivo deve terminar com _failure.dart
 * - Deve ter uma sealed class com sufixo Failure
 * - Deve ter pelo menos uma final class que extends a sealed class
 * - Todas as classes devem ter sufixo Failure
 */
import { DartFile, DartLayerFolder, createPlugin, sendFormattedFail } from "@types";

export default createPlugin(
  {
    name: "domain-failures",
    description: "Valida Domain Failures",
    enabled: true,
  },
  async () => {
    const files = DartFile.changed({ createdFirst: true }).filter(
      (file) =>
        file.path.inFolder(DartLayerFolder.Failures) &&
        !file.path.fileName.endsWith("failures.dart") &&
        !file.path.isBarrel
    );

    for (const file of files) {
      const filePath = file.path.path;
      const fileName = file.path.fileName;

      if (!fileName.endsWith("_failure.dart")) {
        sendFormattedFail({
          title: "NOMENCLATURA DE FAILURE INCORRETA",
          description: "Arquivo de Failure deve terminar com `_failure.dart`.",
          problem: {
            wrong: fileName,
            correct: `${fileName.replace(".dart", "")}_failure.dart`,
          },
          action: {
            text: "Renomeie o arquivo:",
            code: `${fileName.replace(".dart", "")}_failure.dart`,
          },
          objective: "Manter **consistência** na nomenclatura da camada Domain.",
          file: filePath,
          line: 1,
        });
        continue;
      }

      // Vale a última sealed class do arquivo; as subclasses são as `final class` com `extends`.
      const sealedClasses = file.classes.filter((c) => c.isSealed);
      const sealedClass = sealedClasses.length > 0 ? sealedClasses[sealedClasses.length - 1] : null;
      const finalClasses = file.classes.filter((c) => c.isFinal && c.superclass !== null);

      if (!sealedClass) {
        sendFormattedFail({
          title: "FAILURE SEM SEALED CLASS",
          description:
            "Arquivo de Failure deve ter uma `sealed class` como classe base para pattern matching exaustivo.",
          problem: {
            wrong: `class AuthFailure { }`,
            correct: `sealed class AuthFailure {\n  AuthFailure([this.message = '']);\n  final String message;\n}`,
          },
          action: {
            text: "Crie uma `sealed class` com subclasses:",
            code: `sealed class AuthFailure {\n  AuthFailure([this.message = '']);\n  final String message;\n}\n\nfinal class AuthUnexpectedFailure extends AuthFailure {\n  AuthUnexpectedFailure([super.message]);\n}`,
          },
          objective: "Garantir **type safety** e **exhaustiveness** no tratamento de erros.",
          file: filePath,
          line: 1,
        });
        continue;
      }

      if (!sealedClass.name.endsWith("Failure")) {
        sendFormattedFail({
          title: "SEALED CLASS SEM SUFIXO FAILURE",
          description: `A classe \`${sealedClass.name}\` deve terminar com \`Failure\`.`,
          problem: {
            wrong: `sealed class ${sealedClass.name} { }`,
            correct: `sealed class ${sealedClass.name}Failure { }`,
          },
          action: {
            text: "Renomeie a classe:",
            code: `sealed class ${sealedClass.name}Failure { }`,
          },
          objective: "Manter **consistência** na nomenclatura de Failures.",
          file: filePath,
          line: sealedClass.line,
        });
      }

      if (finalClasses.length === 0) {
        sendFormattedFail({
          title: "FAILURE SEM IMPLEMENTAÇÕES",
          description: `A sealed class \`${sealedClass.name}\` não tem nenhuma \`final class\` que a estende.`,
          problem: {
            wrong: `sealed class ${sealedClass.name} { }`,
            correct: `sealed class ${sealedClass.name} { }\n\nfinal class ${sealedClass.name.replace("Failure", "")}UnexpectedFailure extends ${sealedClass.name} { }`,
          },
          action: {
            text: "Adicione pelo menos uma subclasse:",
            code: `final class ${sealedClass.name.replace("Failure", "")}UnexpectedFailure extends ${sealedClass.name} {\n  ${sealedClass.name.replace("Failure", "")}UnexpectedFailure([super.message]);\n}`,
          },
          objective: "Definir **tipos específicos de erro** para tratamento adequado.",
          file: filePath,
          line: sealedClass.line,
        });
      }

      for (const cls of finalClasses) {
        if (!cls.name.endsWith("Failure")) {
          const extendsName = cls.superclass?.name ?? "";
          sendFormattedFail({
            title: "SUBCLASSE DE FAILURE SEM SUFIXO",
            description: `A classe \`${cls.name}\` deve terminar com \`Failure\`.`,
            problem: {
              wrong: `final class ${cls.name} extends ${extendsName} { }`,
              correct: `final class ${cls.name}Failure extends ${extendsName} { }`,
            },
            action: {
              text: "Renomeie a classe:",
              code: `final class ${cls.name}Failure extends ${extendsName} { }`,
            },
            objective: "Manter **consistência** na nomenclatura de Failures.",
            file: filePath,
            line: cls.line,
          });
        }
      }
    }
  }
);
