/**
 * Repositories Plugin
 * Valida repositories em ambas as camadas:
 *
 * Domain (interface):
 * - Arquivo: *_repository_interface.dart
 * - abstract interface class com prefixo I e sufixo Repository
 * - Somente uma interface por arquivo
 *
 * Data (implementação):
 * - Arquivo: *_repository.dart
 * - final class com sufixo Repository
 * - Deve implementar interface (implements IXxxRepository)
 * - Deve estender BaseRepository
 * - Somente uma classe por arquivo
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

export default createPlugin(
  {
    name: "repositories",
    description: "Valida Repositories (Domain interface + Data implementação)",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const files = [...git.created_files, ...git.modified_files].filter(
      (f: string) =>
        f.includes("/repositories/") &&
        f.endsWith(".dart") &&
        !f.endsWith("repositories.dart") &&
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

function validateDomainRepository(file: string): void {
  const fileName = file.split("/").pop() || "";

  if (!fileName.endsWith("_repository_interface.dart")) {
    sendFormattedFail({
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

  const interfaces: { name: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/abstract\s+interface\s+class\s+([A-Za-z_]\w*)/);
    if (match) {
      interfaces.push({ name: match[1], line: i + 1 });
    }
  }

  if (interfaces.length === 0) {
    sendFormattedFail({
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
    sendFormattedFail({
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
      sendFormattedFail({
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
      sendFormattedFail({
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
  }
}

function validateDataRepository(file: string): void {
  const fileName = file.split("/").pop() || "";

  if (!fileName.endsWith("_repository.dart")) {
    sendFormattedFail({
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

  const classes: { name: string; line: number; declaration: string }[] = [];

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
    sendFormattedFail({
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
      sendFormattedFail({
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
      sendFormattedFail({
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
      sendFormattedFail({
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
