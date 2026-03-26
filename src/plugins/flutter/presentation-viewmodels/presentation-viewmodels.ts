/**
 * Presentation ViewModels Plugin
 * Verifica que ViewModels dependam apenas de UseCases.
 *
 * Analisa:
 * 1. Imports — detecta imports diretos da camada Data (models, datasources, repositories, barrel)
 * 2. Campos (fields) — detecta Repository, Datasource ou Model como dependência direta
 *
 * Detecta ViewModels por:
 * - Arquivo: *_viewmodel.dart ou *_view_model.dart
 * - Classe: extends ViewModelBase
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

const FORBIDDEN_FIELD_TYPES = [
  { pattern: /Repository/, label: "Repository" },
  { pattern: /Datasource|DataSource/, label: "Datasource" },
  { pattern: /Model(?!Base|State)/, label: "Model" },
];

const FORBIDDEN_IMPORTS = [
  { pattern: /\/data\/repositories\//, label: "Repository (Data Layer)" },
  { pattern: /\/data\/datasources\//, label: "Datasource (Data Layer)" },
  { pattern: /\/data\/models\//, label: "Model (Data Layer)" },
  { pattern: /\/data\/data\.dart/, label: "Data Layer (barrel file)" },
];

const FIELD_RE = /^\s+(?:late\s+)?final\s+([\w<>,?\s]+?)\s+(_?\w+)\s*[=;]/;
const IMPORT_RE = /^\s*import\s+['"]([^'"]+)['"]/;

export default createPlugin(
  {
    name: "presentation-viewmodels",
    description: "Valida que ViewModels dependam apenas de UseCases",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const files = [...git.created_files, ...git.modified_files].filter(
      (f: string) =>
        (f.endsWith("_viewmodel.dart") || f.endsWith("_view_model.dart")) && fs.existsSync(f)
    );

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");

      if (!content.includes("extends ViewModelBase")) continue;

      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const importMatch = lines[i].match(IMPORT_RE);
        if (!importMatch) continue;

        const importPath = importMatch[1];

        for (const { pattern, label } of FORBIDDEN_IMPORTS) {
          if (pattern.test(importPath)) {
            sendFormattedFail({
              title: `VIEWMODEL IMPORTA ${label.toUpperCase()}`,
              description: `Import \`${importPath}\` traz dependência direta da **camada Data**. ViewModel deve importar apenas da **camada Domain**.`,
              problem: {
                wrong: `import 'package:app/.../data/models/user_model.dart';`,
                correct: `import 'package:app/.../domain/usecases/get_user_usecase.dart';\nimport 'package:app/.../domain/entities/user_entity.dart';`,
                wrongLabel: "Import direto da Data Layer",
                correctLabel: "Import apenas da Domain Layer",
              },
              action: {
                text: "Substitua imports de Data por imports de Domain:",
                code: `import 'package:app/.../domain/usecases/get_user_usecase.dart';\nimport 'package:app/.../domain/entities/user_entity.dart';`,
              },
              objective: "ViewModel → **UseCase** → Repository → Datasource. Nunca pular camadas.",
              file,
              line: i + 1,
            });
            break;
          }
        }
      }

      let insideClass = false;
      let braceDepth = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.match(/class\s+\w+\s+extends\s+ViewModelBase/)) {
          insideClass = true;
          braceDepth = 0;
        }

        if (!insideClass) continue;

        for (const ch of line) {
          if (ch === "{") braceDepth++;
          if (ch === "}") braceDepth--;
        }

        if (insideClass && braceDepth <= 0 && line.includes("}")) {
          insideClass = false;
          continue;
        }

        if (braceDepth !== 1) continue;

        const fieldMatch = line.match(FIELD_RE);
        if (!fieldMatch) continue;

        const fieldType = fieldMatch[1].trim();
        const fieldName = fieldMatch[2];

        for (const { pattern, label } of FORBIDDEN_FIELD_TYPES) {
          if (pattern.test(fieldType)) {
            sendFormattedFail({
              title: `VIEWMODEL DEPENDE DE ${label.toUpperCase()} DIRETAMENTE`,
              description: `Campo \`${fieldName}\` é do tipo \`${fieldType}\` — ViewModel deve depender apenas de **UseCases**.`,
              problem: {
                wrong: `final ${fieldType} ${fieldName};`,
                correct: `final IGetDataUsecase _getDataUsecase;`,
                wrongLabel: `Dependência direta de ${label}`,
                correctLabel: "Dependência via UseCase",
              },
              action: {
                text: "Substitua a dependência direta por um UseCase:",
                code: `final class MyViewModel extends ViewModelBase<MyState> {\n  final IGetDataUsecase _getDataUsecase;\n}`,
              },
              objective: "ViewModel → **UseCase** → Repository → Datasource. Nunca pular camadas.",
              file,
              line: i + 1,
            });
            break;
          }
        }
      }
    }
  }
);
