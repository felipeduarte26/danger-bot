"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Data Models Plugin
 * Valida arquivos dentro de /models/ (sem barrel e sem `*models.dart`):
 * - Nome do arquivo deve terminar com _model.dart (senão o arquivo para aqui)
 * - Classe deve ter sufixo Model
 * - Somente uma classe Model por arquivo
 * - Campos devem ser final (imutabilidade): reporta só o primeiro campo mutável
 * Classes abstratas são ignoradas; campos são lidos a partir da 1ª classe concreta.
 */
const _types_1 = require("../../../types.js");
/**
 * Campo mutável: sem `final`, `static`, `const`, `late` e `@override`, sem inicializador e com
 * tipo `int`/`double`/`bool`/`num` ou com nome em maiúscula (`String`, `String?`, `List<...>`,
 * `UserModel`). No primary constructor, o parâmetro `var Tipo nome`.
 */
function isMutableField(field) {
  const { type } = field;
  if (field.isFinal || field.isStatic || field.isConst || field.isLate || field.isOverride) {
    return false;
  }
  if (field.initializer !== null || type === null) return false;
  // `p.Tipo` (com prefixo de import) nunca contou
  const typed =
    type.prefix === null &&
    (type.isInt || type.isDouble || type.isBool || type.isNum || /^[A-Z]/.test(type.name ?? ""));
  return typed;
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "data-models",
    description: "Valida Data Models",
    enabled: true,
  },
  async () => {
    const files = _types_1.DartFile.changed({ createdFirst: true }).filter(
      (file) =>
        file.path.inFolder(_types_1.DartLayerFolder.Models) &&
        !file.path.fileName.endsWith("models.dart") &&
        !file.path.isBarrel
    );
    for (const file of files) {
      const filePath = file.path.path;
      const fileName = file.path.fileName;
      if (!fileName.endsWith("_model.dart")) {
        (0, _types_1.sendFormattedFail)({
          title: "NOMENCLATURA DE MODEL INCORRETA",
          description: "Arquivo de Model deve terminar com `_model.dart`.",
          problem: {
            wrong: fileName,
            correct: `${fileName.replace(".dart", "")}_model.dart`,
          },
          action: {
            text: "Renomeie o arquivo:",
            code: `${fileName.replace(".dart", "")}_model.dart`,
          },
          objective: "Manter **consistência** na nomenclatura da camada Data.",
          file: filePath,
          line: 1,
        });
        continue;
      }
      const classes = file.classes.filter((c) => !c.isAbstract);
      // Primeiro campo mutável, da 1ª classe concreta em diante.
      const fromIndex = classes.length > 0 ? file.declarations.indexOf(classes[0]) : -1;
      const nonFinalField =
        fromIndex < 0
          ? undefined
          : file.declarations
              .slice(fromIndex)
              .flatMap((d) => d.fields)
              .find(isMutableField);
      if (classes.length > 1) {
        (0, _types_1.sendFormattedFail)({
          title: "MÚLTIPLAS CLASSES EM UM ARQUIVO MODEL",
          description: `Encontradas **${classes.length} classes**: ${classes.map((c) => `\`${c.name}\``).join(", ")}.`,
          problem: {
            wrong: classes.map((c) => `class ${c.name} { }`).join("\n"),
            correct: classes
              .map((c) => `// ${_types_1.DartText.toSnakeCase(c.name)}.dart\nclass ${c.name} { }`)
              .join("\n\n"),
            wrongLabel: `${classes.length} classes no mesmo arquivo`,
            correctLabel: "Uma classe por arquivo",
          },
          action: {
            text: "Separe cada classe em um arquivo individual:",
            code: classes
              .map((c) => `${_types_1.DartText.toSnakeCase(c.name)}.dart → class ${c.name}`)
              .join("\n"),
          },
          objective: "**Uma classe por arquivo** — facilita navegação e reduz conflitos de merge.",
          file: filePath,
          line: classes[1].line,
        });
      }
      for (const cls of classes) {
        if (!cls.name.endsWith("Model")) {
          (0, _types_1.sendFormattedFail)({
            title: "CLASSE DE MODEL SEM SUFIXO",
            description: `A classe \`${cls.name}\` deve terminar com \`Model\`.`,
            problem: {
              wrong: `class ${cls.name} { }`,
              correct: `class ${cls.name}Model { }`,
            },
            action: {
              text: "Renomeie a classe:",
              code: `class ${cls.name}Model { }`,
            },
            objective: "Manter **consistência** na nomenclatura de Models.",
            file: filePath,
            line: cls.line,
          });
        }
      }
      if (nonFinalField) {
        const name = nonFinalField.name;
        (0, _types_1.sendFormattedFail)({
          title: "MODEL COM CAMPO MUTÁVEL",
          description: `Campo \`${name}\` não é \`final\`. Models devem ser **imutáveis**.`,
          problem: {
            wrong: `String ${name};`,
            correct: `final String ${name};`,
            wrongLabel: "Campo mutável",
            correctLabel: "Campo imutável (final)",
          },
          action: {
            text: "Adicione `final` ao campo:",
            code: `final String ${name};`,
          },
          objective: "Models imutáveis são **thread-safe** e mais previsíveis.",
          file: filePath,
          line: nonFinalField.nameLine,
        });
      }
    }
  }
);
