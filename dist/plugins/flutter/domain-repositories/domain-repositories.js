"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _types_1 = require("../../../types");
/**
 * 📚 Domain Repositories Plugin
 *
 * Verifica regras para repository interfaces na camada Domain:
 * - Nomenclatura: *_repository_interface.dart
 * - Classe: abstract interface class INomeRepository
 * - Retorno: Result<Failure, T> (nunca void)
 * - Prefixo I obrigatório
 */
exports.default = (0, _types_1.createPlugin)({
    name: 'domain-repositories',
    description: 'Valida Domain Repository interfaces',
    enabled: true,
}, async () => {
    const danger = (0, _types_1.getDanger)();
    const { git } = danger;
    const repoFiles = git.created_files
        .concat(git.modified_files)
        .filter((file) => file.match(/\/domain\/repositories\/[^/]+\.dart$/) && !file.endsWith('repositories.dart'));
    for (const file of repoFiles) {
        // Verificar nomenclatura
        if (!file.match(/_repository_interface\.dart$/)) {
            (0, _types_1.sendFail)(`## 📚 NOMENCLATURA DE REPOSITORY INTERFACE INCORRETA

O arquivo deve terminar com \`_repository_interface.dart\`.

---

### ⚠️ Problema Identificado

**📍 Arquivo atual:** \`${file}\`

Nomenclatura incorreta dificulta diferenciação entre:
- **Interface** (Domain) 
- **Implementação** (Data)

---

### 🎯 AÇÃO NECESSÁRIA

Renomeie para: \`*_repository_interface.dart\`

\`\`\`dart
// ❌ INCORRETO
domain/repositories/user_repository.dart  // Confunde com implementação

// ✅ CORRETO
domain/repositories/user_repository_interface.dart  // Deixa claro que é interface
\`\`\`

---

### 🚀 Objetivo

Diferenciar claramente **interfaces** (Domain) de **implementações** (Data).`, file, 1);
        }
        try {
            const content = await danger.git.structuredDiffForFile(file);
            if (!content)
                continue;
            const fileText = content.chunks.map((c) => c.content).join('\n');
            // Verificar abstract interface class
            const classMatch = fileText.match(/(?:abstract\s+interface\s+class|class)\s+(I?\w+)/);
            if (classMatch) {
                const className = classMatch[1];
                // Verificar prefixo I
                if (!className.startsWith('I')) {
                    (0, _types_1.sendFail)(`## 📚 REPOSITORY INTERFACE SEM PREFIXO I

A classe \`${className}\` deve começar com \`I\`.

---

### ⚠️ Problema Identificado

Prefixo \`I\` identifica **interfaces** claramente.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
abstract interface class UserRepository {
  Future<Result<Failure, UserEntity>> getUser(String id);
}

// ✅ CORRETO
abstract interface class IUserRepository {
  Future<Result<Failure, UserEntity>> getUser(String id);
}
\`\`\`

---

### 🚀 Objetivo

Identificar **interfaces** facilmente no código.`, file, 1);
                }
                // Verificar abstract interface class
                if (!fileText.match(/abstract\s+interface\s+class/)) {
                    (0, _types_1.sendFail)(`## 📚 REPOSITORY DEVE SER ABSTRACT INTERFACE CLASS

Repository deve ser \`abstract interface class\`.

---

### ⚠️ Problema Identificado

\`abstract interface class\` garante que:
- ✅ Não pode ser instanciada
- ✅ Só pode ser implementada (não estendida)
- ✅ Define contrato puro

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
abstract class IUserRepository { }  // Pode ser estendida
class IUserRepository { }  // Pode ser instanciada

// ✅ CORRETO
abstract interface class IUserRepository {
  Future<Result<Failure, UserEntity>> getUser(String id);
  Future<Result<Failure, List<UserEntity>>> getAll();
}
\`\`\`

---

### 🚀 Objetivo

Definir **contratos puros** que só podem ser implementados.`, file, 1);
                }
                // Verificar retorno void
                if (fileText.match(/\s+(?:void|Future<void>)\s+\w+\s*\(/)) {
                    (0, _types_1.sendFail)(`## 📚 REPOSITORY NÃO PODE RETORNAR VOID

Repository deve retornar \`Result<Failure, T>\`, nunca \`void\`.

---

### ⚠️ Problema Identificado

\`void\` não permite tratamento de erros adequado.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
abstract interface class IUserRepository {
  Future<void> deleteUser(String id);  // Não trata erros
}

// ✅ CORRETO  
abstract interface class IUserRepository {
  Future<Result<Failure, NoParams>> deleteUser(String id);
}

// Para operações sem retorno, use NoParams:
import 'package:dartz/dartz.dart';

class NoParams extends Equatable {
  const NoParams();
  
  @override
  List<Object> get props => [];
}
\`\`\`

---

### 🚀 Objetivo

Garantir **tratamento adequado de erros** em todas operações.`, file, 1);
                }
            }
        }
        catch (e) {
            // Arquivo pode não ter diff disponível
        }
    }
});
