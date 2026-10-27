"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Folder Naming Convention Plugin
 * Valida que pastas da Clean Architecture usem o nome correto (plural).
 *
 * Exemplo: domain/usecase/ deve ser domain/usecases/
 *
 * Analisa os caminhos dos arquivos `.dart` alterados/criados no PR (exceto
 * `_test.dart`) e verifica se alguma pasta usa a forma singular logo abaixo da
 * camada (segmento exato: `usecases/` não casa `usecase/`). Reporta cada pasta
 * incorreta apenas uma vez no PR, independente de quantos arquivos dentro dela
 * foram alterados.
 */
const _types_1 = require("../../../types.js");
const FOLDER_RULES = [
  { layer: _types_1.DartLayer.Domain, singular: "usecase", plural: "usecases" },
  { layer: _types_1.DartLayer.Domain, singular: "entity", plural: "entities" },
  { layer: _types_1.DartLayer.Domain, singular: "failure", plural: "failures" },
  { layer: _types_1.DartLayer.Domain, singular: "repository", plural: "repositories" },
  { layer: _types_1.DartLayer.Data, singular: "datasource", plural: "datasources" },
  { layer: _types_1.DartLayer.Data, singular: "model", plural: "models" },
  { layer: _types_1.DartLayer.Data, singular: "repository", plural: "repositories" },
  { layer: _types_1.DartLayer.Presentation, singular: "viewmodel", plural: "viewmodels" },
  { layer: _types_1.DartLayer.Presentation, singular: "view", plural: "views" },
  { layer: _types_1.DartLayer.Presentation, singular: "widget", plural: "widgets" },
];
exports.default = (0, _types_1.createPlugin)(
  {
    name: "folder-naming-convention",
    description: "Valida nomenclatura de pastas da Clean Architecture (plural)",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const dartFiles = [...git.created_files, ...git.modified_files]
      .map((f) => _types_1.DartPath.of(f))
      .filter((file) => file.isDart && !file.fileName.endsWith("_test.dart"));
    if (dartFiles.length === 0) return;
    const reported = new Set();
    for (const file of dartFiles) {
      for (const rule of FOLDER_RULES) {
        // `/domain/usecase/` no caminho: a pasta singular logo abaixo da camada
        const singularFolder = `${rule.layer}/${rule.singular}`;
        if (!file.inFolder(singularFolder)) continue;
        if (reported.has(singularFolder)) continue;
        reported.add(singularFolder);
        const featureName = file.feature ?? "feature";
        const wrongTree =
          `features/${featureName}/\n` +
          `└── ${rule.layer}/\n` +
          `    └── ${rule.singular}/   ← singular`;
        const correctTree =
          `features/${featureName}/\n` +
          `└── ${rule.layer}/\n` +
          `    └── ${rule.plural}/   ✓ plural`;
        (0, _types_1.sendFormattedFail)({
          title: "NOME DE PASTA FORA DO PADRÃO (SINGULAR)",
          description: `A pasta \`${rule.singular}/\` na camada **${rule.layer}** deve usar o nome no **plural**: \`${rule.plural}/\`.`,
          problem: {
            wrong: wrongTree,
            correct: correctTree,
            wrongLabel: `Pasta "${rule.singular}" (singular)`,
            correctLabel: `Pasta "${rule.plural}" (plural)`,
          },
          action: {
            text: `Renomeie a pasta \`${rule.singular}/\` para \`${rule.plural}/\`:`,
            code: `// ${rule.layer}/${rule.singular}/ → ${rule.layer}/${rule.plural}/`,
          },
          objective:
            "Manter **consistência** na estrutura de pastas da Clean Architecture — pastas de agrupamento devem usar o **plural**.",
          reference: {
            text: "Flutter Clean Architecture — Folder Structure",
            url: "https://resocoder.com/flutter-clean-architecture-tdd/",
          },
          file: file.path,
          line: 1,
        });
      }
    }
  }
);
