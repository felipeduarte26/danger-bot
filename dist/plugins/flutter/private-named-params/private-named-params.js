"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Private Named Params Plugin
 * ============================
 * Detecta construtores que usam o padrão antigo (pré-Dart 3.12) de
 * initializer list para atribuir parâmetros a campos privados.
 *
 * Padrão antigo (detectado):
 *   MyClass({required Type paramName}) : _paramName = paramName;
 *   final Type _paramName;
 *
 * Padrão novo (sugerido — Dart 3.12+):
 *   MyClass({required this._paramName});
 *   final Type _paramName;
 *
 * Só conta o parâmetro nomeado comum (sem `this.`/`super.`) atribuído direto
 * (`_x = x`, sem transformação) ao campo `_` + nome. Pula o campo que o construtor
 * já recebe como `this._x`, o construtor sem initializer list, factories e o
 * primary constructor.
 *
 * Escopo: ViewModels, Datasources, Repositories, Widgets e qualquer classe.
 * Referência: https://dart.dev/to/private-named-parameters
 */
const _types_1 = require("../../../types.js");
/** Atribuições `_param = param` do initializer list que podem virar `this._param`. */
function findSimpleAssignments(ctor) {
  const namedParams = new Set(
    ctor.parameters
      .filter(
        (p) =>
          p.kind === _types_1.DartParameterKind.Named &&
          p.source === _types_1.DartParameterSource.Plain
      )
      .map((p) => p.name)
  );
  // campos que o construtor já recebe como `this._field` (migração parcial)
  const thisParams = new Set(
    ctor.parameters.filter((p) => p.source === _types_1.DartParameterSource.This).map((p) => p.name)
  );
  const assignments = [];
  for (const init of ctor.initializers) {
    if (init.fieldName === null || init.value.kind !== _types_1.DartExpressionKind.Identifier)
      continue;
    const param = init.value.text;
    if (!namedParams.has(param) || init.fieldName !== `_${param}`) continue;
    if (thisParams.has(init.fieldName)) continue;
    assignments.push({ field: init.fieldName, param });
  }
  return assignments;
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "private-named-params",
    description: "Detecta construtores que podem usar private named parameters (Dart 3.12+)",
    enabled: true,
  },
  async () => {
    for (const file of _types_1.DartFile.changed({ createdFirst: true })) {
      for (const cls of file.classes) {
        for (const ctor of cls.constructors) {
          if (ctor.isPrimary || ctor.isFactory) continue;
          const assignments = findSimpleAssignments(ctor);
          if (assignments.length === 0) continue;
          const className = cls.name;
          const fieldExamples = assignments.slice(0, 3);
          const oldStyle = fieldExamples.map((a) => `  ${a.field} = ${a.param},`).join("\n");
          const newStyle = fieldExamples.map((a) => `  required this.${a.field},`).join("\n");
          const remainingCount = assignments.length - fieldExamples.length;
          const moreText = remainingCount > 0 ? `\n  // ... +${remainingCount} campo(s)` : "";
          (0, _types_1.sendFormattedFail)({
            title: "USAR PRIVATE NAMED PARAMETERS (DART 3.12+)",
            description:
              `Classe \`${className}\` usa initializer list para atribuir ` +
              `**${assignments.length}** parâmetro(s) a campo(s) privado(s). ` +
              `A partir do Dart 3.12, use \`this._field\` diretamente no construtor.`,
            problem: {
              wrong: `${className}({\n  required Type ${fieldExamples[0].param},\n}) : ${oldStyle}${moreText}`,
              correct: `${className}({\n${newStyle}${moreText}\n})`,
              wrongLabel: "Initializer list redundante (pré-Dart 3.12)",
              correctLabel: "Private named parameters (Dart 3.12+)",
            },
            action: {
              text: "Remova os parâmetros públicos intermediários e use `this._field` diretamente:",
              code:
                `${className}({\n${newStyle}\n}) : super(...);\n\n` +
                `// Os campos privados continuam declarados normalmente:\n` +
                fieldExamples.map((a) => `// final Type ${a.field};`).join("\n"),
            },
            objective:
              "Private named parameters eliminam boilerplate de initializer list. " +
              "O nome público no call site é gerado automaticamente sem o `_`. " +
              "Use `dart fix --code=prefer_initializing_formals` para migrar automaticamente.",
            reference: {
              text: "Dart 3.12 — Private Named Parameters",
              url: "https://dart.dev/to/private-named-parameters",
            },
            file: file.path.path,
            line: ctor.line,
          });
        }
      }
    }
  }
);
