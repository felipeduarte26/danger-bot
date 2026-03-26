"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "file-naming",
    description: "Verifica nomenclatura de arquivos Dart (snake_case)",
    enabled: true,
  },
  async () => {
    const danger = (0, _types_1.getDanger)();
    const { git } = danger;
    const dartFilesAdded = git.created_files.filter(
      (file) => file.startsWith("lib/") && file.endsWith(".dart")
    );
    for (const file of dartFilesAdded) {
      const fileName = file.split("/").pop() || "";
      const validPattern = /^[a-z0-9_]+\.dart$/;
      if (!validPattern.test(fileName)) {
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
          file,
          line: 1,
        });
      }
    }
  }
);
