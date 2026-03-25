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
import { createPlugin, getDanger, sendFail } from "@types";
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
    sendFail(
      `NOMENCLATURA DE REPOSITORY INTERFACE INCORRETA

Arquivo de interface deve terminar com \`_repository_interface.dart\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ ${fileName}
// ✅ ${fileName.replace(".dart", "")}_repository_interface.dart
\`\`\``,
      file,
      1
    );
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
    sendFail(
      `REPOSITORY SEM abstract interface class

Arquivo de interface deve conter \`abstract interface class\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
abstract interface class IUserRepository {
  Future<Result<Failure, UserEntity>> getUser(String id);
}
\`\`\``,
      file,
      1
    );
    return;
  }

  if (interfaces.length > 1) {
    sendFail(
      `MÚLTIPLAS INTERFACES EM UM ARQUIVO

Encontradas **${interfaces.length} interfaces**: ${interfaces.map((i) => `\`${i.name}\``).join(", ")}.

### 🎯 AÇÃO NECESSÁRIA

Cada interface deve estar em seu próprio arquivo.

### 🚀 Objetivo

**Uma interface por arquivo** — facilita navegação e manutenção.`,
      file,
      interfaces[1].line
    );
  }

  for (const iface of interfaces) {
    if (!iface.name.startsWith("I")) {
      sendFail(
        `REPOSITORY INTERFACE SEM PREFIXO I

A interface \`${iface.name}\` deve começar com \`I\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ abstract interface class ${iface.name} { }
// ✅ abstract interface class I${iface.name} { }
\`\`\``,
        file,
        iface.line
      );
    }

    if (!iface.name.endsWith("Repository")) {
      sendFail(
        `REPOSITORY INTERFACE SEM SUFIXO

A interface \`${iface.name}\` deve terminar com \`Repository\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ abstract interface class ${iface.name} { }
// ✅ abstract interface class ${iface.name}Repository { }
\`\`\``,
        file,
        iface.line
      );
    }
  }
}

function validateDataRepository(file: string): void {
  const fileName = file.split("/").pop() || "";

  if (!fileName.endsWith("_repository.dart")) {
    sendFail(
      `NOMENCLATURA DE REPOSITORY INCORRETA

Arquivo de implementação deve terminar com \`_repository.dart\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ ${fileName}
// ✅ ${fileName.replace(".dart", "")}_repository.dart
\`\`\``,
      file,
      1
    );
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
    sendFail(
      `MÚLTIPLAS CLASSES EM UM ARQUIVO REPOSITORY

Encontradas **${classes.length} classes**: ${classes.map((c) => `\`${c.name}\``).join(", ")}.

### 🎯 AÇÃO NECESSÁRIA

Cada Repository deve estar em seu próprio arquivo.

### 🚀 Objetivo

**Uma classe por arquivo** — facilita navegação e reduz conflitos de merge.`,
      file,
      classes[1].line
    );
  }

  for (const cls of classes) {
    if (!cls.name.endsWith("Repository")) {
      sendFail(
        `REPOSITORY SEM SUFIXO

A classe \`${cls.name}\` deve terminar com \`Repository\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ class ${cls.name} { }
// ✅ class ${cls.name}Repository { }
\`\`\``,
        file,
        cls.line
      );
    }

    if (!cls.declaration.includes("implements")) {
      sendFail(
        `REPOSITORY SEM INTERFACE

A classe \`${cls.name}\` deve implementar uma interface de Repository.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ class ${cls.name} { }
// ✅ class ${cls.name} implements I${cls.name} { }
\`\`\`

### 🚀 Objetivo

Garantir **inversão de dependência** — Domain define o contrato, Data implementa.`,
        file,
        cls.line
      );
    }

    if (!cls.declaration.includes("extends BaseRepository")) {
      sendFail(
        `REPOSITORY SEM BaseRepository

A classe \`${cls.name}\` deve estender \`BaseRepository\`.

### Problema Identificado

\`BaseRepository\` fornece tratamento padronizado de erros via \`execute()\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ class ${cls.name} implements I${cls.name} { }

// ✅ class ${cls.name} extends BaseRepository<XxxFailure>
//     implements I${cls.name} { }
\`\`\`

### 🚀 Objetivo

Tratamento de **erros padronizado** em todos os Repositories.`,
        file,
        cls.line
      );
    }
  }
}
