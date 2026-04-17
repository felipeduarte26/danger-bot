/**
 * Domain Failures Plugin
 * Valida arquivos dentro de /failures/:
 * - Nome do arquivo deve terminar com _failure.dart
 * - Deve ter uma sealed class com sufixo Failure
 * - Deve ter pelo menos uma final class que extends a sealed class
 * - Todas as classes devem ter sufixo Failure
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";
import * as path from "path";

function isBarrelFile(filePath: string): boolean {
  const fileName = path.basename(filePath, ".dart");
  const parentDir = path.basename(path.dirname(filePath));
  return fileName === parentDir;
}

export default createPlugin(
  {
    name: "domain-failures",
    description: "Valida Domain Failures",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const files = [...git.created_files, ...git.modified_files].filter(
      (f: string) =>
        f.includes("/failures/") &&
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith("failures.dart") &&
        !isBarrelFile(f) &&
        fs.existsSync(f)
    );

    for (const file of files) {
      const fileName = file.split("/").pop() || "";

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
          file,
          line: 1,
        });
        continue;
      }

      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      let sealedClass: { name: string; line: number } | null = null;
      const finalClasses: { name: string; line: number; extendsName: string }[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const sealedMatch = line.match(/sealed\s+class\s+([A-Za-z_]\w*)/);
        if (sealedMatch) {
          sealedClass = { name: sealedMatch[1], line: i + 1 };
        }

        const finalMatch = line.match(/final\s+class\s+([A-Za-z_]\w*)\s+extends\s+([A-Za-z_]\w*)/);
        if (finalMatch) {
          finalClasses.push({ name: finalMatch[1], line: i + 1, extendsName: finalMatch[2] });
        }
      }

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
          file,
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
          file,
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
          file,
          line: sealedClass.line,
        });
      }

      for (const cls of finalClasses) {
        if (!cls.name.endsWith("Failure")) {
          sendFormattedFail({
            title: "SUBCLASSE DE FAILURE SEM SUFIXO",
            description: `A classe \`${cls.name}\` deve terminar com \`Failure\`.`,
            problem: {
              wrong: `final class ${cls.name} extends ${cls.extendsName} { }`,
              correct: `final class ${cls.name}Failure extends ${cls.extendsName} { }`,
            },
            action: {
              text: "Renomeie a classe:",
              code: `final class ${cls.name}Failure extends ${cls.extendsName} { }`,
            },
            objective: "Manter **consistência** na nomenclatura de Failures.",
            file,
            line: cls.line,
          });
        }
      }
    }
  }
);
