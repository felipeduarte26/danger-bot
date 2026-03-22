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
 * Domain Failures Plugin
 * Valida arquivos dentro de /failures/:
 * - Nome do arquivo deve terminar com _failure.dart
 * - Deve ter uma sealed class com sufixo Failure
 * - Deve ter pelo menos uma final class que extends a sealed class
 * - Todas as classes devem ter sufixo Failure
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
exports.default = (0, _types_1.createPlugin)(
  {
    name: "domain-failures",
    description: "Valida Domain Failures",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const files = [...git.created_files, ...git.modified_files].filter(
      (f) =>
        f.includes("/failures/") &&
        f.endsWith(".dart") &&
        !f.endsWith("failures.dart") &&
        fs.existsSync(f)
    );
    for (const file of files) {
      const fileName = file.split("/").pop() || "";
      if (!fileName.endsWith("_failure.dart")) {
        (0, _types_1.sendFail)(
          `NOMENCLATURA DE FAILURE INCORRETA

Arquivo deve terminar com \`_failure.dart\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ ${fileName}
// ✅ ${fileName.replace(".dart", "")}_failure.dart
\`\`\``,
          file,
          1
        );
        continue;
      }
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      let sealedClass = null;
      const finalClasses = [];
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
        (0, _types_1.sendFail)(
          `FAILURE SEM SEALED CLASS

Arquivo de Failure deve ter uma \`sealed class\` como classe base.

### Problema Identificado

\`sealed class\` permite pattern matching exaustivo e garante hierarquia fechada.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
sealed class AuthFailure {
  AuthFailure([this.message = '']);
  final String message;
}

final class AuthUnexpectedFailure extends AuthFailure {
  AuthUnexpectedFailure([super.message]);
}
\`\`\`

### 🚀 Objetivo

Garantir **type safety** e **exhaustiveness** no tratamento de erros.`,
          file,
          1
        );
        continue;
      }
      if (!sealedClass.name.endsWith("Failure")) {
        (0, _types_1.sendFail)(
          `SEALED CLASS SEM SUFIXO FAILURE

A classe \`${sealedClass.name}\` deve terminar com \`Failure\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ sealed class ${sealedClass.name} { }
// ✅ sealed class ${sealedClass.name}Failure { }
\`\`\``,
          file,
          sealedClass.line
        );
      }
      if (finalClasses.length === 0) {
        (0, _types_1.sendFail)(
          `FAILURE SEM IMPLEMENTAÇÕES

A sealed class \`${sealedClass.name}\` não tem nenhuma \`final class\` que a estende.

### Problema Identificado

Uma sealed class sozinha não tem utilidade. Precisa de pelo menos uma subclasse.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
sealed class ${sealedClass.name} {
  ${sealedClass.name}([this.message = '']);
  final String message;
}

// ✅ Adicione pelo menos uma subclasse
final class ${sealedClass.name.replace("Failure", "")}UnexpectedFailure extends ${sealedClass.name} {
  ${sealedClass.name.replace("Failure", "")}UnexpectedFailure([super.message]);
}
\`\`\`

### 🚀 Objetivo

Definir **tipos específicos de erro** para tratamento adequado.`,
          file,
          sealedClass.line
        );
      }
      for (const cls of finalClasses) {
        if (!cls.name.endsWith("Failure")) {
          (0, _types_1.sendFail)(
            `SUBCLASSE DE FAILURE SEM SUFIXO

A classe \`${cls.name}\` deve terminar com \`Failure\`.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ final class ${cls.name} extends ${cls.extendsName} { }
// ✅ final class ${cls.name}Failure extends ${cls.extendsName} { }
\`\`\``,
            file,
            cls.line
          );
        }
      }
    }
  }
);
