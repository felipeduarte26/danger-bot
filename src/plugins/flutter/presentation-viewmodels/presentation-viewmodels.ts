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
import { createPlugin, getDanger, sendFail } from "@types";
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

      // ── 1. Verificar imports proibidos (Data Layer) ──
      for (let i = 0; i < lines.length; i++) {
        const importMatch = lines[i].match(IMPORT_RE);
        if (!importMatch) continue;

        const importPath = importMatch[1];

        for (const { pattern, label } of FORBIDDEN_IMPORTS) {
          if (pattern.test(importPath)) {
            sendFail(
              `VIEWMODEL IMPORTA ${label.toUpperCase()}

Import \`${importPath}\` traz dependência direta da **camada Data**.

ViewModel deve importar apenas da **camada Domain** (UseCases, Entities, Failures).

\`\`\`dart
// ❌ Import direto da Data Layer
import 'package:app/features/user/data/models/user_model.dart';

// ✅ Import apenas da Domain Layer
import 'package:app/features/user/domain/usecases/get_user_usecase.dart';
import 'package:app/features/user/domain/entities/user_entity.dart';
\`\`\`

ViewModel → **UseCase** → Repository → Datasource/Model. Nunca pular camadas.`,
              file,
              i + 1
            );
            break;
          }
        }
      }

      // ── 2. Verificar campos (fields) proibidos ──
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
            sendFail(
              `VIEWMODEL DEPENDE DE ${label.toUpperCase()} DIRETAMENTE

Campo \`${fieldName}\` é do tipo \`${fieldType}\` — ViewModel deve depender apenas de **UseCases**.

ViewModel acessando ${label} diretamente viola Clean Architecture. A camada Presentation só deve conhecer Domain (UseCases e Entities).

\`\`\`dart
// ❌ Dependência direta de ${label}
final class MyViewModel extends ViewModelBase<MyState> {
  final ${fieldType} ${fieldName};
}

// ✅ Dependência via UseCase
final class MyViewModel extends ViewModelBase<MyState> {
  final IGetDataUsecase _getDataUsecase;
}
\`\`\`

ViewModel → **UseCase** → Repository → Datasource. Nunca pular camadas.`,
              file,
              i + 1
            );
            break;
          }
        }
      }
    }
  }
);
