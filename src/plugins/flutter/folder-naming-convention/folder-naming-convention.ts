/**
 * Folder Naming Convention Plugin
 * Valida que pastas da Clean Architecture usem o nome correto (plural).
 *
 * Exemplo: domain/usecase/ deve ser domain/usecases/
 *
 * Analisa os caminhos dos arquivos alterados/criados no PR e verifica
 * se alguma pasta usa a forma singular quando o padrão é plural.
 * Reporta cada pasta incorreta apenas uma vez, independente de quantos
 * arquivos dentro dela foram alterados.
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";

interface FolderRule {
  /** Padrão regex para detectar a pasta singular no caminho */
  pattern: RegExp;
  /** Nome singular (para mensagem de erro) */
  singular: string;
  /** Nome plural correto */
  plural: string;
  /** Camada onde a regra se aplica */
  layer: string;
}

const FOLDER_RULES: FolderRule[] = [
  {
    pattern: /\/domain\/usecase\//,
    singular: "usecase",
    plural: "usecases",
    layer: "domain",
  },
  {
    pattern: /\/domain\/entity\//,
    singular: "entity",
    plural: "entities",
    layer: "domain",
  },
  {
    pattern: /\/domain\/failure\//,
    singular: "failure",
    plural: "failures",
    layer: "domain",
  },
  {
    pattern: /\/domain\/repository\//,
    singular: "repository",
    plural: "repositories",
    layer: "domain",
  },
  {
    pattern: /\/data\/datasource\//,
    singular: "datasource",
    plural: "datasources",
    layer: "data",
  },
  {
    pattern: /\/data\/model\//,
    singular: "model",
    plural: "models",
    layer: "data",
  },
  {
    pattern: /\/data\/repository\//,
    singular: "repository",
    plural: "repositories",
    layer: "data",
  },
  {
    pattern: /\/presentation\/viewmodel\//,
    singular: "viewmodel",
    plural: "viewmodels",
    layer: "presentation",
  },
  {
    pattern: /\/presentation\/view\//,
    singular: "view",
    plural: "views",
    layer: "presentation",
  },
  {
    pattern: /\/presentation\/widget\//,
    singular: "widget",
    plural: "widgets",
    layer: "presentation",
  },
];

export default createPlugin(
  {
    name: "folder-naming-convention",
    description: "Valida nomenclatura de pastas da Clean Architecture (plural)",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const dartFiles = [...git.created_files, ...git.modified_files].filter(
      (f: string) => f.endsWith(".dart") && !f.endsWith("_test.dart")
    );

    if (dartFiles.length === 0) return;

    const reported = new Set<string>();

    for (const file of dartFiles) {
      for (const rule of FOLDER_RULES) {
        if (!rule.pattern.test(file)) continue;

        const key = `${rule.layer}/${rule.singular}`;
        if (reported.has(key)) continue;
        reported.add(key);

        const featureMatch = file.match(/\/features\/([^/]+)\//);
        const featureName = featureMatch ? featureMatch[1] : "feature";

        const wrongTree =
          `features/${featureName}/\n` +
          `└── ${rule.layer}/\n` +
          `    └── ${rule.singular}/   ← singular`;

        const correctTree =
          `features/${featureName}/\n` +
          `└── ${rule.layer}/\n` +
          `    └── ${rule.plural}/   ✓ plural`;

        sendFormattedFail({
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
          file,
          line: 1,
        });
      }
    }
  }
);
