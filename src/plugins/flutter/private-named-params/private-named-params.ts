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
import {
  DartConstructor,
  DartExpressionKind,
  DartFile,
  DartParameterKind,
  DartParameterSource,
  createPlugin,
  sendFormattedFail,
} from "@types";

interface InitializerAssignment {
  field: string;
  param: string;
}

/** Atribuições `_param = param` do initializer list que podem virar `this._param`. */
function findSimpleAssignments(ctor: DartConstructor): InitializerAssignment[] {
  const namedParams = new Set(
    ctor.parameters
      .filter((p) => p.kind === DartParameterKind.Named && p.source === DartParameterSource.Plain)
      .map((p) => p.name)
  );
  // campos que o construtor já recebe como `this._field` (migração parcial)
  const thisParams = new Set(
    ctor.parameters.filter((p) => p.source === DartParameterSource.This).map((p) => p.name)
  );

  const assignments: InitializerAssignment[] = [];
  for (const init of ctor.initializers) {
    if (init.fieldName === null || init.value.kind !== DartExpressionKind.Identifier) continue;
    const param = init.value.text;
    if (!namedParams.has(param) || init.fieldName !== `_${param}`) continue;
    if (thisParams.has(init.fieldName)) continue;
    assignments.push({ field: init.fieldName, param });
  }
  return assignments;
}

export default createPlugin(
  {
    name: "private-named-params",
    description: "Detecta construtores que podem usar private named parameters (Dart 3.12+)",
    enabled: true,
  },
  async () => {
    for (const file of DartFile.changed({ createdFirst: true })) {
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

          sendFormattedFail({
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
