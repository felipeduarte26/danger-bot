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
 * Clean Architecture Plugin
 * Detecta violações de dependência entre camadas:
 * - Domain só pode importar: própria camada, dart SDK, Flutter e pacotes puros (whitelist)
 * - Data não pode importar Presentation nem UseCases
 * - Presentation não pode importar Data diretamente
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const IMPORT_RE = /^\s*import\s+['"]([^'"]+)['"]/;
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
const DOMAIN_FORBIDDEN_LAYERS = [
  { pattern: "/data/", label: "Data" },
  { pattern: "/presentation/", label: "Presentation" },
  { pattern: "/infrastructure/", label: "Infrastructure" },
  { pattern: "/infra/", label: "Infrastructure" },
];
function detectAppPackage(lines) {
  for (const line of lines) {
    const m = line.match(IMPORT_RE);
    if (!m?.[1].startsWith("package:")) continue;
    const importPath = m[1];
    if (
      importPath.includes("/domain/") ||
      importPath.includes("/data/") ||
      importPath.includes("/presentation/") ||
      importPath.includes("/core/") ||
      importPath.includes("/features/") ||
      importPath.includes("/utils/") ||
      importPath.includes("/shared/") ||
      importPath.includes("/common/") ||
      importPath.includes("/modules/") ||
      importPath.includes("/app/")
    ) {
      return importPath.replace("package:", "").split("/")[0];
    }
  }
  return null;
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "clean-architecture",
    description: "Detecta violações de Clean Architecture",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.modified_files, ...git.created_files].filter(
      (f) => f.endsWith(".dart") && !f.endsWith("_test.dart") && fs.existsSync(f)
    );
    const violations = [];
    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      const isDomain = file.includes("/domain/");
      const isData = file.includes("/data/");
      const isPresentation = file.includes("/presentation/");
      const isUseCase = file.includes("/usecases/") || file.endsWith("_usecase.dart");
      if (!isDomain && !isData && !isPresentation) continue;
      const appPackage = isDomain ? detectAppPackage(lines) : null;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(IMPORT_RE);
        if (!match) continue;
        const importPath = match[1];
        if (isDomain) {
          if (importPath.startsWith("package:")) {
            const packageName = importPath.replace("package:", "").split("/")[0];
            const isOwnPackage = packageName === appPackage;
            const isAllowedPackage = DOMAIN_ALLOWED_PACKAGES.has(packageName);
            if (!isOwnPackage && !isAllowedPackage) {
              violations.push({
                file,
                line: i + 1,
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
                line: i + 1,
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
      (0, _types_1.sendFormattedFail)({
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
