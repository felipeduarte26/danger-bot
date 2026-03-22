/**
 * Clean Architecture Plugin
 * Detecta violações de dependência entre camadas:
 * - Domain não pode importar Data nem Presentation
 * - Data não pode importar Presentation nem UseCases
 * - Presentation não pode importar Data diretamente
 */
import { createPlugin, getDanger, sendFail } from "@types";
import * as fs from "fs";

const IMPORT_RE = /^\s*import\s+['"]([^'"]+)['"]/;

interface Violation {
  file: string;
  line: number;
  importPath: string;
  rule: string;
  message: string;
}

export default createPlugin(
  {
    name: "clean-architecture",
    description: "Detecta violações de Clean Architecture",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f: string) => f.endsWith(".dart") && fs.existsSync(f)
    );

    const violations: Violation[] = [];

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      const isDomain = file.includes("/domain/");
      const isData = file.includes("/data/");
      const isPresentation = file.includes("/presentation/");
      const isUseCase = file.includes("/usecases/") || file.endsWith("_usecase.dart");

      if (!isDomain && !isData && !isPresentation) continue;

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(IMPORT_RE);
        if (!match) continue;

        const importPath = match[1];

        if (isDomain) {
          if (importPath.includes("/data/")) {
            violations.push({
              file,
              line: i + 1,
              importPath,
              rule: "DOMAIN → DATA",
              message: `VIOLAÇÃO CLEAN ARCHITECTURE — DOMAIN → DATA

Domain Layer **não pode** importar Data Layer.

### Problema Identificado

Import detectado:
\`\`\`dart
${lines[i].trim()}
\`\`\`

Domain deve depender apenas de si mesma. Data implementa as interfaces definidas em Domain, não o contrário.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ Domain importando Data
import 'package:app/features/user/data/models/user_model.dart';

// ✅ Domain usa apenas suas próprias definições
import 'package:app/features/user/domain/entities/user_entity.dart';
\`\`\`

### 🚀 Objetivo

Manter **independência** da Domain Layer.

📖 [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)`,
            });
          }

          if (importPath.includes("/presentation/")) {
            violations.push({
              file,
              line: i + 1,
              importPath,
              rule: "DOMAIN → PRESENTATION",
              message: `VIOLAÇÃO CLEAN ARCHITECTURE — DOMAIN → PRESENTATION

Domain Layer **não pode** importar Presentation Layer.

### Problema Identificado

Import detectado:
\`\`\`dart
${lines[i].trim()}
\`\`\`

### 🎯 AÇÃO NECESSÁRIA

Remova este import. Domain não deve conhecer nada sobre UI.

### 🚀 Objetivo

Manter **independência** da Domain Layer.

📖 [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)`,
            });
          }
        }

        if (isData) {
          if (importPath.includes("/presentation/")) {
            violations.push({
              file,
              line: i + 1,
              importPath,
              rule: "DATA → PRESENTATION",
              message: `VIOLAÇÃO CLEAN ARCHITECTURE — DATA → PRESENTATION

Data Layer **não pode** importar Presentation Layer.

### Problema Identificado

Import detectado:
\`\`\`dart
${lines[i].trim()}
\`\`\`

Data deve ser independente de UI. Se precisa de dados da UI, receba como parâmetro.

### 🎯 AÇÃO NECESSÁRIA

Remova este import e passe os dados necessários via parâmetro nos métodos.

### 🚀 Objetivo

Manter **separação** entre Data e UI.

📖 [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)`,
            });
          }

          if (importPath.includes("/usecases/") || importPath.includes("_usecase.dart")) {
            violations.push({
              file,
              line: i + 1,
              importPath,
              rule: "DATA → USECASE",
              message: `VIOLAÇÃO CLEAN ARCHITECTURE — DATA → USECASE

Data Layer **não pode** importar UseCases.

### Problema Identificado

Import detectado:
\`\`\`dart
${lines[i].trim()}
\`\`\`

Data implementa interfaces de Domain (repositories), mas não deve usar UseCases. UseCases orquestram Data, não o contrário.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ Data importando UseCase
import 'package:app/features/user/domain/usecases/get_user_usecase.dart';

// ✅ Data importa apenas interfaces de Domain
import 'package:app/features/user/domain/repositories/user_repository_interface.dart';
import 'package:app/features/user/domain/entities/user_entity.dart';
\`\`\`

### 🚀 Objetivo

Respeitar a **direção de dependência**: UseCases → Repositories, nunca o inverso.

📖 [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)`,
            });
          }
        }

        if (isUseCase) {
          const importsUseCase =
            importPath.includes("/usecases/") || importPath.includes("_usecase.dart");
          if (importsUseCase) {
            violations.push({
              file,
              line: i + 1,
              importPath,
              rule: "USECASE → USECASE",
              message: `VIOLAÇÃO CLEAN ARCHITECTURE — USECASE → USECASE

Um UseCase **não pode** importar outro UseCase.

### Problema Identificado

Import detectado:
\`\`\`dart
${lines[i].trim()}
\`\`\`

Cada UseCase deve encapsular **uma única responsabilidade**. Se um UseCase precisa de outro, é sinal de que a lógica deve estar em um Repository ou em um novo UseCase que orquestra ambos no ViewModel.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ UseCase importando outro UseCase
class CreateOrderUseCase {
  final IValidateStockUseCase validateStock; // errado
}

// ✅ ViewModel orquestra múltiplos UseCases
class OrderViewModel {
  final ICreateOrderUseCase createOrder;
  final IValidateStockUseCase validateStock;

  Future<void> submit() async {
    await validateStock.execute();
    await createOrder.execute();
  }
}
\`\`\`

### 🚀 Objetivo

Cada UseCase com **responsabilidade única**. A orquestração fica no ViewModel.

📖 [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)`,
            });
          }
        }

        if (isPresentation) {
          if (importPath.includes("/data/")) {
            violations.push({
              file,
              line: i + 1,
              importPath,
              rule: "PRESENTATION → DATA",
              message: `VIOLAÇÃO CLEAN ARCHITECTURE — PRESENTATION → DATA

Presentation Layer **não pode** importar Data Layer diretamente.

### Problema Identificado

Import detectado:
\`\`\`dart
${lines[i].trim()}
\`\`\`

Presentation deve acessar dados apenas via UseCases e Entities de Domain. Nunca Models ou Datasources de Data.

### 🎯 AÇÃO NECESSÁRIA

\`\`\`dart
// ❌ Presentation importando Data
import 'package:app/features/user/data/models/user_model.dart';

// ✅ Presentation usa Domain
import 'package:app/features/user/domain/entities/user_entity.dart';
import 'package:app/features/user/domain/usecases/get_user_usecase.dart';
\`\`\`

### 🚀 Objetivo

Presentation só conhece **Domain**. Data é um detalhe de implementação.

📖 [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)`,
            });
          }
        }
      }
    }

    for (const v of violations) {
      sendFail(v.message, v.file, v.line);
    }
  }
);
