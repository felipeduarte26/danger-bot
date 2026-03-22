/**
 * Domain Failures Plugin
 * Valida arquivos dentro de /failures/:
 * - Nome do arquivo deve terminar com _failure.dart
 * - Deve ter uma sealed class com sufixo Failure
 * - Deve ter pelo menos uma final class que extends a sealed class
 * - Todas as classes devem ter sufixo Failure
 */
import { createPlugin, getDanger, sendFail } from "@types";
import * as fs from "fs";

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
        !f.endsWith("failures.dart") &&
        fs.existsSync(f)
    );

    for (const file of files) {
      const fileName = file.split("/").pop() || "";

      if (!fileName.endsWith("_failure.dart")) {
        sendFail(
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
        sendFail(
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
        sendFail(
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
        sendFail(
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
          sendFail(
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
