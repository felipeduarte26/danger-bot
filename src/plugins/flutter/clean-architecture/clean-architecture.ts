/**
 * Clean Architecture Plugin
 * Detecta violações de dependência entre camadas nos `import` (os `export` não contam):
 * - Domain só pode importar: própria camada, dart SDK, Flutter e pacotes puros (whitelist)
 * - Domain não importa Data, Presentation nem Infrastructure (exceto caminhos com `/domain/`)
 * - Data não pode importar Presentation nem UseCases
 * - UseCase não pode importar outro UseCase
 * - Presentation não pode importar Data diretamente
 *
 * Analisa só arquivos das camadas domain/data/presentation (exceto `_test.dart`).
 * Imports `dart:` e relativos nunca são pacote externo.
 */
import {
  DartFile,
  DartLayer,
  DartLayerFolder,
  DartUriKind,
  createPlugin,
  sendFormattedFail,
} from "@types";

const DOMAIN_ALLOWED_PACKAGES = new Set([
  "meta",
  "equatable",
  "freezed_annotation",
  "json_annotation",
  "collection",
  "dartz",
  "fpdart",
  "result_dart",
  "uuid",
  "flutter",
]);

const DOMAIN_FORBIDDEN_LAYERS: { pattern: string; label: string }[] = [
  { pattern: "/data/", label: "Data" },
  { pattern: "/presentation/", label: "Presentation" },
  { pattern: "/infrastructure/", label: "Infrastructure" },
  { pattern: "/infra/", label: "Infrastructure" },
];

/** Pastas que identificam um import do próprio app (e não de um pacote de terceiros). */
const APP_PACKAGE_FOLDERS = [
  "/domain/",
  "/data/",
  "/presentation/",
  "/core/",
  "/features/",
  "/utils/",
  "/shared/",
  "/common/",
  "/modules/",
  "/app/",
];

/** Pacote do app: o do 1º import `package:` que aponta para uma pasta típica do projeto. */
function detectAppPackage(file: DartFile): string | null {
  const appImport = file.imports.find(
    (imp) =>
      imp.uriKind === DartUriKind.Package &&
      APP_PACKAGE_FOLDERS.some((folder) => imp.uri.includes(folder))
  );
  return appImport?.packageName ?? null;
}

/** O import aponta para um usecase (pasta `/usecases/` ou arquivo `_usecase.dart`). */
function importsUseCase(uri: string): boolean {
  return uri.includes("/usecases/") || uri.includes("_usecase.dart");
}

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
    const dartFiles = DartFile.changed({ includeTests: true, includeGenerated: true }).filter(
      (file) => !file.path.fileName.endsWith("_test.dart")
    );

    const violations: Violation[] = [];

    for (const dartFile of dartFiles) {
      const file = dartFile.path.path;
      const isDomain = dartFile.path.inLayer(DartLayer.Domain);
      const isData = dartFile.path.inLayer(DartLayer.Data);
      const isPresentation = dartFile.path.inLayer(DartLayer.Presentation);
      const isUseCase =
        dartFile.path.inFolder(DartLayerFolder.UseCases) ||
        dartFile.path.fileName.endsWith("_usecase.dart");

      if (!isDomain && !isData && !isPresentation) continue;

      const appPackage = isDomain ? detectAppPackage(dartFile) : null;

      for (const imp of dartFile.imports) {
        const importPath = imp.uri;
        const line = imp.line;

        if (isDomain) {
          if (imp.uriKind === DartUriKind.Package && imp.packageName !== null) {
            const packageName = imp.packageName;
            const isOwnPackage = packageName === appPackage;
            const isAllowedPackage = DOMAIN_ALLOWED_PACKAGES.has(packageName);

            if (!isOwnPackage && !isAllowedPackage) {
              violations.push({
                file,
                line,
                importPath,
                rule: "DOMAIN → PACOTE EXTERNO",
                title: "VIOLAÇÃO CLEAN ARCHITECTURE — DOMAIN IMPORTA PACOTE EXTERNO",
                description: `Domain Layer **não pode** depender do pacote externo \`${packageName}\`. Implementações com pacotes de terceiros pertencem à camada **Infrastructure**.`,
                wrongExample: `import '${importPath}';`,
                correctExample: `// Mova a implementação concreta para core/infrastructure/\n// Domain deve conter apenas interfaces abstratas`,
              });
            }
          }

          for (const layer of DOMAIN_FORBIDDEN_LAYERS) {
            if (importPath.includes(layer.pattern) && !importPath.includes("/domain/")) {
              violations.push({
                file,
                line,
                importPath,
                rule: `DOMAIN → ${layer.label.toUpperCase()}`,
                title: `VIOLAÇÃO CLEAN ARCHITECTURE — DOMAIN → ${layer.label.toUpperCase()}`,
                description: `Domain Layer **não pode** importar ${layer.label} Layer. Domain deve depender **apenas de si mesma** (entidades, failures, interfaces de repositório e usecases).`,
                wrongExample: `import '${importPath}';`,
                correctExample: `// Domain só pode importar da própria camada domain/\n// Use inversão de dependência para acessar outras camadas`,
              });
              break;
            }
          }
        }

        if (isData && importPath.includes("/presentation/")) {
          violations.push({
            file,
            line,
            importPath,
            rule: "DATA → PRESENTATION",
            title: "VIOLAÇÃO CLEAN ARCHITECTURE — DATA → PRESENTATION",
            description:
              "Data Layer **não pode** importar Presentation Layer. Se precisa de dados da UI, receba como parâmetro.",
            wrongExample: `import 'package:app/.../presentation/viewmodels/user_viewmodel.dart';`,
            correctExample: `// Data não importa Presentation — passe dados via parâmetro`,
          });
        }

        if (isData && importsUseCase(importPath)) {
          violations.push({
            file,
            line,
            importPath,
            rule: "DATA → USECASE",
            title: "VIOLAÇÃO CLEAN ARCHITECTURE — DATA → USECASE",
            description:
              "Data Layer **não pode** importar UseCases. UseCases orquestram Data, não o contrário.",
            wrongExample: `import 'package:app/.../domain/usecases/get_user_usecase.dart';`,
            correctExample: `import 'package:app/.../domain/repositories/user_repository_interface.dart';`,
          });
        }

        if (isUseCase && importsUseCase(importPath)) {
          violations.push({
            file,
            line,
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
            line,
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
