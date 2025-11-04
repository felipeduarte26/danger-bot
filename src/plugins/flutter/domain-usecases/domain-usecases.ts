import { createPlugin,  getDanger, sendFail  } from '@types';

/**
 * ⚡ Domain UseCases Plugin
 * 
 * Verifica regras para usecases na camada Domain:
 * - Nomenclatura: *_usecase.dart
 * - Interface: abstract interface class INomeUseCase
 * - Implementação: final class NomeUseCase implements INomeUseCase
 * - Sufixo: UseCase (não Usecase)
 * - Usa implements, não extends
 */
export default createPlugin(
  {
    name: 'domain-usecases',
    description: 'Valida Domain Use Cases',
    enabled: true,
  },
  async () => {
    const danger = getDanger();
    const { git } = danger;

    const usecaseFiles = git.created_files
      .concat(git.modified_files)
      .filter((file: string) => file.match(/\/domain\/usecases\/.*\.dart$/) && !file.endsWith('usecases.dart'));

    for (const file of usecaseFiles) {
      // Verificar nomenclatura
      if (!file.match(/_usecase\.dart$/)) {
        sendFail(
          `## ⚡ NOMENCLATURA DE USECASE INCORRETA

O arquivo deve terminar com \`_usecase.dart\`.

---

### ⚠️ Problema Identificado

**📍 Arquivo atual:** \`${file}\`

---

### 🎯 AÇÃO NECESSÁRIA

Renomeie para: \`*_usecase.dart\`

\`\`\`
❌ get_user.dart
✅ get_user_usecase.dart
\`\`\`

---

### 🚀 Objetivo

Identificar **usecases** facilmente no projeto.`,
          file,
          1
        );
      }

      try {
        const content = await danger.git.structuredDiffForFile(file);
        if (!content) continue;
        
        const fileText = content.chunks.map((c: any) => c.content).join('\n');

        // Verificar sufixo UseCase (não Usecase)
        if (fileText.match(/class\s+\w+Usecase(?!ase)\b/)) {
          sendFail(
            `## ⚡ SUFIXO USECASE INCORRETO

UseCase deve ter sufixo \`UseCase\` (com 'C' maiúsculo), não \`Usecase\`.

---

### ⚠️ Problema Identificado

PascalCase correto: \`UseCase\` (não \`Usecase\`)

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
class GetUserUsecase implements IGetUserUsecase { }

// ✅ CORRETO
class GetUserUseCase implements IGetUserUseCase { }
\`\`\`

---

### 🚀 Objetivo

Manter **PascalCase** correto para nomes compostos.`,
            file,
            1
          );
        }

        // Verificar uso de extends ao invés de implements
        if (fileText.match(/final\s+class\s+\w*UseCase\s+extends\s+I\w+/)) {
          sendFail(
            `## ⚡ USECASE COM EXTENDS INCORRETO

UseCase deve usar \`implements\`, não \`extends\`.

---

### ⚠️ Problema Identificado

Interfaces devem ser **implementadas**, não estendidas.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ INCORRETO
final class GetUserUseCase extends IGetUserUseCase {
  // extends é para herança de classes
}

// ✅ CORRETO
final class GetUserUseCase implements IGetUserUseCase {
  // implements é para interfaces
  const GetUserUseCase({required this.repository});
  
  final IUserRepository repository;
  
  @override
  Future<Result<Failure, UserEntity>> call(String id) async {
    return await repository.getUser(id);
  }
}
\`\`\`

**Regra:**
- \`extends\` → herança de **classes**
- \`implements\` → implementação de **interfaces**

---

### 🚀 Objetivo

Usar corretamente **herança** vs **implementação** de interfaces.`,
            file,
            1
          );
        }

        // Verificar se tem interface e implementação
        const hasInterface = fileText.match(/abstract\s+interface\s+class\s+I\w+UseCase/);
        const hasImplementation = fileText.match(/final\s+class\s+\w+UseCase\s+implements/);

        if (!hasInterface) {
          sendFail(
            `## ⚡ USECASE SEM INTERFACE

Arquivo deve ter uma interface \`abstract interface class INomeUseCase\`.

---

### ⚠️ Problema Identificado

UseCase precisa de interface para:
- ✅ Inversão de dependência
- ✅ Facilitar testes (mocks)
- ✅ Desacoplar implementação

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// Interface (contrato)
abstract interface class IGetUserUseCase {
  Future<Result<Failure, UserEntity>> call(String id);
}

// Implementação
final class GetUserUseCase implements IGetUserUseCase {
  const GetUserUseCase({required this.repository});
  
  final IUserRepository repository;
  
  @override
  Future<Result<Failure, UserEntity>> call(String id) {
    return repository.getUser(id);
  }
}
\`\`\`

---

### 🚀 Objetivo

Permitir **injeção de dependência** e **testes** eficientes.`,
            file,
            1
          );
        }

        if (!hasImplementation) {
          sendFail(
            `## ⚡ USECASE SEM IMPLEMENTAÇÃO

Arquivo deve ter implementação \`final class NomeUseCase implements INomeUseCase\`.

---

### ⚠️ Problema Identificado

UseCase precisa de implementação concreta.

---

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
abstract interface class IGetUserUseCase {
  Future<Result<Failure, UserEntity>> call(String id);
}

final class GetUserUseCase implements IGetUserUseCase {
  const GetUserUseCase({required this.repository});
  
  final IUserRepository repository;
  
  @override
  Future<Result<Failure, UserEntity>> call(String id) async {
    return await repository.getUser(id);
  }
}
\`\`\`

---

### 🚀 Objetivo

Ter **implementação concreta** do caso de uso.`,
            file,
            1
          );
        }
      } catch (e) {
        // Arquivo pode não ter diff disponível
      }
    }
    }
);