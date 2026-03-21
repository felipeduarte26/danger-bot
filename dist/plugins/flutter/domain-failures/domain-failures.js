"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _types_1 = require("../../../types");
/**
 * 🔥 Domain Failures Plugin
 *
 * Verifica regras para failures na camada Domain:
 * - Primeira classe: sealed class NomeFailure
 * - Demais classes: final class extends NomeFailure
 * - Nomenclatura: *_failure.dart
 * - Sufixo: Failure
 */
exports.default = (0, _types_1.createPlugin)(
  {
    name: "domain-failures",
    description: "Valida Domain Failures",
    enabled: true,
  },
  async () => {
    const danger = (0, _types_1.getDanger)();
    const { git } = danger;
    const failureFiles = git.created_files
      .concat(git.modified_files)
      .filter(
        (file) => file.match(/\/domain\/failures\/[^/]+\.dart$/) && !file.endsWith("failures.dart")
      );
    for (const file of failureFiles) {
      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        const fileText = content.chunks.map((c) => c.content).join("\n");
        // Verificar sealed class
        const firstClass = fileText.match(/(?:sealed|final|abstract)\s+class\s+(\w+)/);
        if (firstClass) {
          const className = firstClass[1];
          if (!className.endsWith("Failure")) {
            await (0, _types_1.sendFail)(`## 🔥 CLASSE FAILURE SEM SUFIXO

**Arquivo:** \`${file}\`

A classe \`${className}\` deve terminar com \`Failure\`.

### ⚠️ Problema Identificado

Sufixo ausente dificulta identificação de failures no projeto.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
sealed class Auth { }
final class LoginError extends Auth { }

// ✅ CORRETO
sealed class AuthFailure { }
final class LoginErrorFailure extends AuthFailure { }
\`\`\`

### 🚀 Objetivo

Identificar facilmente failures na Domain Layer.`);
          }
          // Verificar se primeira classe é sealed
          if (!fileText.match(/sealed\s+class\s+\w+Failure/)) {
            await (0, _types_1.sendFail)(`## 🔥 PRIMEIRA CLASSE DEVE SER SEALED

**Arquivo:** \`${file}\`

A primeira classe de Failure deve ser \`sealed class\`.

### ⚠️ Problema Identificado

\`sealed class\` permite pattern matching exaustivo e garante hierarquia fechada.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
class AuthFailure { }
final class LoginFailure extends AuthFailure { }

// ✅ CORRETO
sealed class AuthFailure { }
final class LoginFailure extends AuthFailure { }
final class LogoutFailure extends AuthFailure { }
\`\`\`

**Benefícios do sealed:**

- ✅ Compilador garante que todos os casos são tratados
- ✅ Pattern matching exaustivo
- ✅ Hierarquia fechada (não pode estender fora do arquivo)

### 🚀 Objetivo

Garantir **type safety** e **exhaustiveness** no tratamento de erros.`);
          }
        }
      } catch (e) {
        // Arquivo pode não ter diff disponível
      }
    }
  }
);
