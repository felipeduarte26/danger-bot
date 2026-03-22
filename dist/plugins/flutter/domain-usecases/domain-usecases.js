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
        !f.endsWith("usecases.dart") &&
        fs.existsSync(f)
    );
    for (const file of files) {
      const fileName = file.split("/").pop() || "";
      if (!fileName.endsWith("_usecase.dart")) {
        (0, _types_1.sendFail)(
          `NOMENCLATURA DE USECASE INCORRETA

Arquivo deve terminar com \`_usecase.dart\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ ${fileName}
// ✅ ${fileName.replace(".dart", "")}_usecase.dart
\`\`\``,
          file,
          1
        );
        continue;
      }
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const interfaces = [];
      const implementations = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const ifaceMatch = line.match(/abstract\s+interface\s+class\s+([A-Za-z_]\w*)/);
        if (ifaceMatch) {
          interfaces.push({ name: ifaceMatch[1], line: i + 1 });
        }
        const implMatch = line.match(
          /(?:final\s+)?class\s+([A-Za-z_]\w*)\s+(?:implements|extends)\s+([A-Za-z_]\w*)/
        );
        if (implMatch && !line.includes("abstract")) {
          implementations.push({ name: implMatch[1], line: i + 1, raw: line });
        }
      }
      if (interfaces.length > 1) {
        (0, _types_1.sendFail)(
          `MÚLTIPLAS INTERFACES EM UM ARQUIVO USECASE

Encontradas **${interfaces.length} interfaces**: ${interfaces.map((i) => `\`${i.name}\``).join(", ")}.

### 🎯 AÇÃO NECESSÁRIA

Cada UseCase (interface + implementação) deve estar em seu próprio arquivo.

### 🚀 Objetivo

**Um UseCase por arquivo** — facilita navegação e manutenção.`,
          file,
          interfaces[1].line
        );
      }
      if (interfaces.length === 0) {
        (0, _types_1.sendFail)(
          `USECASE SEM INTERFACE

Arquivo de UseCase deve ter \`abstract interface class\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
abstract interface class IGetUserUsecase {
  Future<Result<Failure, UserEntity>> call(String id);
}

final class GetUserUsecase implements IGetUserUsecase {
  const GetUserUsecase(this._repository);
  final IUserRepository _repository;

  @override
  Future<Result<Failure, UserEntity>> call(String id) async {
    return _repository.getUser(id);
  }
}
\`\`\`

### 🚀 Objetivo

Permitir **injeção de dependência** e facilitar **testes**.`,
          file,
          1
        );
      }
      for (const iface of interfaces) {
        if (!iface.name.startsWith("I")) {
          (0, _types_1.sendFail)(
            `INTERFACE DE USECASE SEM PREFIXO I

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
        if (!iface.name.endsWith("Usecase")) {
          (0, _types_1.sendFail)(
            `INTERFACE DE USECASE SEM SUFIXO

A interface \`${iface.name}\` deve terminar com \`Usecase\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ abstract interface class ${iface.name} { }
// ✅ abstract interface class ${iface.name}Usecase { }
\`\`\``,
            file,
            iface.line
          );
        }
      }
      if (implementations.length === 0 && interfaces.length > 0) {
        (0, _types_1.sendFail)(
          `USECASE SEM IMPLEMENTAÇÃO

Arquivo tem interface mas não tem a implementação.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
final class ${interfaces[0].name.replace(/^I/, "")} implements ${interfaces[0].name} {
  // implementação
}
\`\`\``,
          file,
          interfaces[0].line
        );
      }
      for (const impl of implementations) {
        if (!impl.name.endsWith("Usecase")) {
          (0, _types_1.sendFail)(
            `IMPLEMENTAÇÃO DE USECASE SEM SUFIXO

A classe \`${impl.name}\` deve terminar com \`Usecase\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ class ${impl.name} { }
// ✅ class ${impl.name}Usecase { }
\`\`\``,
            file,
            impl.line
          );
        }
        if (impl.raw.match(/extends\s+I\w+/)) {
          (0, _types_1.sendFail)(
            `USECASE COM EXTENDS INCORRETO

UseCase deve usar \`implements\`, não \`extends\`.

### Problema Identificado

\`extends\` é para herança de classes. Interfaces devem ser implementadas.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ class ${impl.name} extends ${interfaces[0]?.name || "IXxxUsecase"} { }
// ✅ class ${impl.name} implements ${interfaces[0]?.name || "IXxxUsecase"} { }
\`\`\``,
            file,
            impl.line
          );
        }
      }
    }
  }
);
