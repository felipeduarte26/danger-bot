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
function validateDomainRepository(file) {
  const fileName = file.split("/").pop() || "";
  if (!fileName.endsWith("_repository_interface.dart")) {
    (0, _types_1.sendFail)(
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
  const interfaces = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/abstract\s+interface\s+class\s+([A-Za-z_]\w*)/);
    if (match) {
      interfaces.push({ name: match[1], line: i + 1 });
    }
  }
  if (interfaces.length === 0) {
    (0, _types_1.sendFail)(
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
    (0, _types_1.sendFail)(
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
      (0, _types_1.sendFail)(
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
      (0, _types_1.sendFail)(
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
function validateDataRepository(file) {
  const fileName = file.split("/").pop() || "";
  if (!fileName.endsWith("_repository.dart")) {
    (0, _types_1.sendFail)(
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
  const classes = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/(?:final\s+)?class\s+([A-Za-z_]\w*)/);
    if (match && !lines[i].includes("abstract")) {
      classes.push({ name: match[1], line: i + 1, raw: lines[i] });
    }
  }
  if (classes.length === 0) return;
  if (classes.length > 1) {
    (0, _types_1.sendFail)(
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
      (0, _types_1.sendFail)(
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
    if (!cls.raw.includes("implements")) {
      (0, _types_1.sendFail)(
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
    if (!cls.raw.includes("extends BaseRepository")) {
      (0, _types_1.sendFail)(
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
