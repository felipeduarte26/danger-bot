/**
 * Clean Architecture Plugin
 * Detecta violações de dependência entre camadas:
 * - Domain não pode importar Data nem Presentation
 * - Data não pode importar Presentation nem UseCases
 * - Presentation não pode importar Data diretamente
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

const IMPORT_RE = /^\s*import\s+['"]([^'"]+)['"]/;

interface Violation {
  file: string;
  line: number;
  importPath: string;
  rule: string;
  title: string;
  description: string;
  wrongExample: string;
  correctExample: string;
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

        if (isDomain && importPath.includes("/data/")) {
          violations.push({
            file,
            line: i + 1,
            importPath,
            rule: "DOMAIN → DATA",
            title: "VIOLAÇÃO CLEAN ARCHITECTURE — DOMAIN → DATA",
            description:
              "Domain Layer **não pode** importar Data Layer. Domain deve depender apenas de si mesma.",
            wrongExample: `import 'package:app/.../data/models/user_model.dart';`,
            correctExample: `import 'package:app/.../domain/entities/user_entity.dart';`,
          });
        }

        if (isDomain && importPath.includes("/presentation/")) {
          violations.push({
            file,
            line: i + 1,
            importPath,
            rule: "DOMAIN → PRESENTATION",
            title: "VIOLAÇÃO CLEAN ARCHITECTURE — DOMAIN → PRESENTATION",
            description:
              "Domain Layer **não pode** importar Presentation Layer. Domain não deve conhecer nada sobre UI.",
            wrongExample: `import 'package:app/.../presentation/pages/home_page.dart';`,
            correctExample: `// Domain não importa Presentation`,
          });
        }

        if (isData && importPath.includes("/presentation/")) {
          violations.push({
            file,
            line: i + 1,
            importPath,
            rule: "DATA → PRESENTATION",
            title: "VIOLAÇÃO CLEAN ARCHITECTURE — DATA → PRESENTATION",
            description:
              "Data Layer **não pode** importar Presentation Layer. Se precisa de dados da UI, receba como parâmetro.",
            wrongExample: `import 'package:app/.../presentation/viewmodels/user_viewmodel.dart';`,
            correctExample: `// Data não importa Presentation — passe dados via parâmetro`,
          });
        }

        if (isData && (importPath.includes("/usecases/") || importPath.includes("_usecase.dart"))) {
          violations.push({
            file,
            line: i + 1,
            importPath,
            rule: "DATA → USECASE",
            title: "VIOLAÇÃO CLEAN ARCHITECTURE — DATA → USECASE",
            description:
              "Data Layer **não pode** importar UseCases. UseCases orquestram Data, não o contrário.",
            wrongExample: `import 'package:app/.../domain/usecases/get_user_usecase.dart';`,
            correctExample: `import 'package:app/.../domain/repositories/user_repository_interface.dart';`,
          });
        }

        if (
          isUseCase &&
          (importPath.includes("/usecases/") || importPath.includes("_usecase.dart"))
        ) {
          violations.push({
            file,
            line: i + 1,
            importPath,
            rule: "USECASE → USECASE",
            title: "VIOLAÇÃO CLEAN ARCHITECTURE — USECASE → USECASE",
            description:
              "Um UseCase **não pode** importar outro UseCase. A orquestração de múltiplos UseCases fica no ViewModel.",
            wrongExample: `class CreateOrderUseCase {\n  final IValidateStockUseCase validateStock;\n}`,
            correctExample: `class OrderViewModel {\n  final ICreateOrderUseCase createOrder;\n  final IValidateStockUseCase validateStock;\n}`,
          });
        }

        if (isPresentation && importPath.includes("/data/")) {
          violations.push({
            file,
            line: i + 1,
            importPath,
            rule: "PRESENTATION → DATA",
            title: "VIOLAÇÃO CLEAN ARCHITECTURE — PRESENTATION → DATA",
            description:
              "Presentation Layer **não pode** importar Data Layer diretamente. Use UseCases e Entities de Domain.",
            wrongExample: `import 'package:app/.../data/models/user_model.dart';`,
            correctExample: `import 'package:app/.../domain/entities/user_entity.dart';\nimport 'package:app/.../domain/usecases/get_user_usecase.dart';`,
          });
        }
      }
    }

    for (const v of violations) {
      sendFormattedFail({
        title: v.title,
        description: v.description,
        problem: {
          wrong: v.wrongExample,
          correct: v.correctExample,
          wrongLabel: `Import proibido (${v.rule})`,
          correctLabel: "Import correto",
        },
        action: {
          text: "Remova o import e use a camada correta:",
          code: v.correctExample,
        },
        objective: "Respeitar a **Dependency Rule** do Clean Architecture.",
        reference: {
          text: "Clean Architecture",
          url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
        },
        file: v.file,
        line: v.line,
      });
    }
  }
);
