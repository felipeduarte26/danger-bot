"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * File Naming Plugin
 * Verifica se o nome dos arquivos Dart criados no PR segue snake_case
 * (letras minúsculas, números e `_`).
 *
 * Escopo: só arquivos novos, só a pasta `lib/` da raiz do projeto, só o nome
 * do arquivo (as pastas ficam com o folder-naming-convention).
 */
const _types_1 = require("../../../types.js");
const SNAKE_CASE_FILE = /^[a-z0-9_]+\.dart$/;
exports.default = (0, _types_1.createPlugin)(
  {
    name: "file-naming",
    description: "Verifica nomenclatura de arquivos Dart (snake_case)",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const createdDartFiles = git.created_files
      .map((f) => _types_1.DartPath.of(f))
      .filter((file) => file.isDart && file.segments[0] === "lib");
    for (const file of createdDartFiles) {
      const fileName = file.fileName;
      if (SNAKE_CASE_FILE.test(fileName)) continue;
      const suggestion = fileName
        .replace(/([A-Z])/g, "_$1")
        .replace(/[-\s]+/g, "_")
        .toLowerCase()
        .replace(/^_/, "")
        .replace(/_+/g, "_");
      (0, _types_1.sendFormattedFail)({
        title: "NOMENCLATURA DE ARQUIVO INCORRETA",
        description: `O arquivo \`${fileName}\` **não segue** a convenção snake_case do Dart.`,
        problem: {
          wrong: fileName,
          correct: suggestion,
          wrongLabel: "Nome atual",
          correctLabel: "Nome correto (snake_case)",
        },
        action: {
          text: "Renomeie o arquivo seguindo as regras snake_case: letras minúsculas (a-z), números (0-9) e underscores (_).",
          code: `# Renomear\nmv ${fileName} ${suggestion}`,
        },
        objective:
          "Manter **consistência** com padrões oficiais do Dart/Flutter e facilitar colaboração.",
        reference: {
          text: "Effective Dart: Style Guide",
          url: "https://dart.dev/guides/language/effective-dart/style",
        },
        file: file.path,
        line: 1,
      });
    }
  }
);
