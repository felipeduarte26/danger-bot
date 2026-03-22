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
 * Data Datasources Plugin
 * Valida arquivos dentro de /datasources/:
 * - Nome do arquivo deve terminar com _datasource.dart
 * - Deve ter abstract interface class com prefixo I e sufixo Datasource
 * - Deve ter implementação final class com sufixo Datasource e implements
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
exports.default = (0, _types_1.createPlugin)(
  {
    name: "data-datasources",
    description: "Valida Data Sources",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const files = [...git.created_files, ...git.modified_files].filter(
      (f) =>
        f.includes("/datasources/") &&
        f.endsWith(".dart") &&
        !f.endsWith("datasources.dart") &&
        fs.existsSync(f)
    );
    for (const file of files) {
      const fileName = file.split("/").pop() || "";
      if (!fileName.endsWith("_datasource.dart")) {
        (0, _types_1.sendFail)(
          `NOMENCLATURA DE DATASOURCE INCORRETA

Arquivo deve terminar com \`_datasource.dart\`.

### Problema Identificado

Arquivo atual: \`${fileName}\`

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ ${fileName}
// ✅ ${fileName.replace(".dart", "")}_datasource.dart
\`\`\`

### 🚀 Objetivo

Manter **consistência** na nomenclatura da camada Data.`,
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
        const interfaceMatch = line.match(/abstract\s+interface\s+class\s+([A-Za-z_]\w*)/);
        if (interfaceMatch) {
          interfaces.push({ name: interfaceMatch[1], line: i + 1 });
        }
        const implMatch = line.match(
          /(?:final\s+)?class\s+([A-Za-z_]\w*)\s+implements\s+([A-Za-z_]\w*)/
        );
        if (implMatch && !line.includes("abstract")) {
          implementations.push({ name: implMatch[1], line: i + 1 });
        }
      }
      const hasInterface = interfaces.length > 0;
      const hasImplementation = implementations.length > 0;
      const interfaceName = interfaces[0]?.name || "";
      const interfaceLine = interfaces[0]?.line || 0;
      const implementationName = implementations[0]?.name || "";
      const implementationLine = implementations[0]?.line || 0;
      if (interfaces.length > 1) {
        (0, _types_1.sendFail)(
          `MÚLTIPLAS INTERFACES EM UM ARQUIVO DATASOURCE

Encontradas **${interfaces.length} interfaces**: ${interfaces.map((i) => `\`${i.name}\``).join(", ")}.

### 🎯 AÇÃO NECESSÁRIA

Cada Datasource (interface + implementação) deve estar em seu próprio arquivo.

### 🚀 Objetivo

**Um Datasource por arquivo** — facilita navegação e manutenção.`,
          file,
          interfaces[1].line
        );
      }
      if (implementations.length > 1) {
        (0, _types_1.sendFail)(
          `MÚLTIPLAS IMPLEMENTAÇÕES EM UM ARQUIVO DATASOURCE

Encontradas **${implementations.length} classes**: ${implementations.map((i) => `\`${i.name}\``).join(", ")}.

### 🎯 AÇÃO NECESSÁRIA

Cada implementação de Datasource deve estar em seu próprio arquivo.

### 🚀 Objetivo

**Um Datasource por arquivo** — facilita navegação e manutenção.`,
          file,
          implementations[1].line
        );
      }
      if (!hasInterface) {
        (0, _types_1.sendFail)(
          `DATASOURCE SEM INTERFACE

Arquivo \`${fileName}\` não possui \`abstract interface class\`.

### Problema Identificado

Todo datasource deve ter uma interface que define o contrato:

\`\`\`dart
// ❌ Sem interface
final class UserDatasource { ... }

// ✅ Com interface
abstract interface class IUserDatasource {
  Future<List<UserModel>> fetchAll();
}

final class UserDatasource implements IUserDatasource {
  @override
  Future<List<UserModel>> fetchAll() async { ... }
}
\`\`\`

### 🚀 Objetivo

Permitir **injeção de dependência** e facilitar **testes**.

📖 [Dependency Inversion Principle](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)`,
          file,
          1
        );
      }
      if (hasInterface) {
        if (!interfaceName.startsWith("I")) {
          (0, _types_1.sendFail)(
            `INTERFACE DE DATASOURCE SEM PREFIXO I

A interface \`${interfaceName}\` deve começar com \`I\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ ${interfaceName}
// ✅ I${interfaceName}
\`\`\``,
            file,
            interfaceLine
          );
        }
        if (!interfaceName.endsWith("Datasource")) {
          (0, _types_1.sendFail)(
            `INTERFACE DE DATASOURCE SEM SUFIXO

A interface \`${interfaceName}\` deve terminar com \`Datasource\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ ${interfaceName}
// ✅ ${interfaceName}Datasource
\`\`\``,
            file,
            interfaceLine
          );
        }
      }
      if (!hasImplementation && hasInterface) {
        (0, _types_1.sendFail)(
          `DATASOURCE SEM IMPLEMENTAÇÃO

Arquivo tem interface \`${interfaceName}\` mas não tem a implementação.

### 🎯 AÇÃO NECESSÁRIA

Adicione a classe que implementa a interface:

\`\`\`dart
final class ${interfaceName.replace(/^I/, "")} implements ${interfaceName} {
  // implementação dos métodos
}
\`\`\``,
          file,
          interfaceLine
        );
      }
      if (hasImplementation) {
        if (!implementationName.endsWith("Datasource")) {
          (0, _types_1.sendFail)(
            `IMPLEMENTAÇÃO DE DATASOURCE SEM SUFIXO

A classe \`${implementationName}\` deve terminar com \`Datasource\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ ${implementationName}
// ✅ ${implementationName}Datasource
\`\`\``,
            file,
            implementationLine
          );
        }
      }
    }
  }
);
