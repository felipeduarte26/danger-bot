"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * MediaQuery Modern Plugin
 * Detecta uso de MediaQuery.of(context) e sugere APIs modernas do Flutter 3.10+.
 *
 * MediaQuery.of(context) faz o widget rebuildar quando QUALQUER propriedade
 * do MediaQuery muda. As APIs novas (sizeOf, paddingOf, etc.) fazem rebuild
 * apenas quando a propriedade específica muda — melhor performance.
 *
 * Também detecta o padrão intermediário:
 *   final mq = MediaQuery.of(context);
 *   mq.size / mq.padding / etc.
 *
 * Só as propriedades com API própria (`PROPERTY_ALTERNATIVES`); `MediaQuery.of(c)`
 * sem propriedade e sem atribuição não é reportado. O contexto tem de ser um
 * identificador (`context`, `dialogContext`). A variável intermediária vale no
 * corpo onde foi declarada (o campo, nos corpos da classe). Um achado por linha;
 * comentários e strings não contam.
 */
const _types_1 = require("../../../types.js");
const PROPERTY_ALTERNATIVES = {
  size: "MediaQuery.sizeOf(context)",
  padding: "MediaQuery.paddingOf(context)",
  viewInsets: "MediaQuery.viewInsetsOf(context)",
  viewPadding: "MediaQuery.viewPaddingOf(context)",
  orientation: "MediaQuery.orientationOf(context)",
  textScaleFactor: "MediaQuery.textScaleFactorOf(context)",
  textScaler: "MediaQuery.textScalerOf(context)",
  platformBrightness: "MediaQuery.platformBrightnessOf(context)",
  devicePixelRatio: "MediaQuery.devicePixelRatioOf(context)",
  alwaysUse24HourFormat: "MediaQuery.alwaysUse24HourFormatOf(context)",
  accessibleNavigation: "MediaQuery.accessibleNavigationOf(context)",
  invertColors: "MediaQuery.invertColorsOf(context)",
  highContrast: "MediaQuery.highContrastOf(context)",
  boldText: "MediaQuery.boldTextOf(context)",
};
exports.default = (0, _types_1.createPlugin)(
  {
    name: "mediaquery-modern",
    description: "Sugere APIs modernas do MediaQuery (Flutter 3.10+)",
    enabled: true,
  },
  async () => {
    var _a, _b;
    for (const file of _types_1.DartFile.changed()) {
      const filePath = file.path.path;
      const byLine = new Map();
      const at = (line) => {
        let findings = byLine.get(line);
        if (!findings) {
          findings = { assignment: null, direct: null, uses: [] };
          byLine.set(line, findings);
        }
        return findings;
      };
      // a chamada de uma atribuição já é o achado da atribuição
      const assigned = new Set();
      for (const { variables, bodies } of scopesOf(file)) {
        for (const variable of variables) {
          const call = mediaQueryAssignment(variable);
          if (!call) continue;
          assigned.add(call.startOffset);
          (_a = at(variable.line)).assignment ?? (_a.assignment = variable);
          for (const use of propertyUses(variable, bodies)) at(use.node.line).uses.push(use);
        }
      }
      for (const call of file.calls()) {
        if (isMediaQueryOf(call) && call.postfixMember !== null && !assigned.has(call.startOffset))
          (_b = at(call.line)).direct ?? (_b.direct = call);
      }
      const lines = [...byLine.entries()].sort(([a], [b]) => a - b);
      for (const [line, { assignment, direct, uses }] of lines) {
        if (assignment) {
          (0, _types_1.sendFormattedFail)({
            title: "MEDIAQUERY.OF() — USE API MODERNA",
            description:
              "Atribuição de `MediaQuery.of()` a variável causa rebuilds desnecessários quando **qualquer** propriedade muda.",
            problem: {
              wrong: codeOf(assignment),
              correct: `final size = MediaQuery.sizeOf(context);\nfinal padding = MediaQuery.paddingOf(context);`,
              wrongLabel: "Rebuild quando QUALQUER propriedade muda",
              correctLabel: "APIs específicas — rebuild seletivo",
            },
            action: {
              text: "Substitua por APIs específicas conforme a propriedade usada:",
              code: `final size = MediaQuery.sizeOf(context);\nfinal padding = MediaQuery.paddingOf(context);\nfinal orientation = MediaQuery.orientationOf(context);`,
            },
            objective: "APIs específicas fazem rebuild **apenas quando a propriedade usada muda**.",
            reference: {
              text: "Flutter MediaQuery",
              url: "https://api.flutter.dev/flutter/widgets/MediaQuery-class.html",
            },
            file: filePath,
            line,
          });
          continue;
        }
        if (direct) {
          const property = direct.postfixMember ?? "";
          const alternative = PROPERTY_ALTERNATIVES[property];
          if (alternative) {
            // a linha do código; se a chamada quebra linha, a chamada em uma linha
            const access = `${direct.text}.${property}`;
            const sameLine = direct.lineText.includes(access);
            const wrong = sameLine ? direct.lineText : `${direct.compact}.${property}`;
            const fixed = sameLine ? wrong.replace(access, alternative) : alternative;
            (0, _types_1.sendFormattedFail)({
              title: "MEDIAQUERY.OF() — USE API MODERNA",
              description: `\`MediaQuery.of(...).${property}\` causa rebuilds desnecessários.`,
              problem: {
                wrong,
                correct: fixed,
                wrongLabel: "Rebuild quando QUALQUER propriedade muda",
                correctLabel: `Rebuild apenas quando ${property} muda`,
              },
              action: {
                text: `Substitua por \`${alternative}\`:`,
                code: fixed,
              },
              objective: "Melhor **performance** com rebuilds mais eficientes.",
              reference: {
                text: "Flutter MediaQuery",
                url: "https://api.flutter.dev/flutter/widgets/MediaQuery-class.html",
              },
              file: filePath,
              line,
            });
          }
          continue;
        }
        // o primeiro uso de cada variável na linha, na ordem das declarações
        const firstUses = new Map();
        const ordered = [...uses].sort(
          (a, b) =>
            a.variable.startOffset - b.variable.startOffset ||
            a.node.startOffset - b.node.startOffset
        );
        for (const use of ordered) {
          if (!firstUses.has(use.variable.name)) firstUses.set(use.variable.name, use);
        }
        for (const { variable, property } of firstUses.values()) {
          const varName = variable.name;
          const alternative = PROPERTY_ALTERNATIVES[property];
          if (alternative) {
            (0, _types_1.sendFormattedFail)({
              title: "MEDIAQUERY.OF() — USE API MODERNA",
              description: `\`${varName}.${property}\` vem de \`MediaQuery.of()\` — causa rebuilds desnecessários.`,
              problem: {
                wrong: `final ${varName} = MediaQuery.of(context);\n... ${varName}.${property} ...`,
                correct: `final ${property} = ${alternative};`,
                wrongLabel: "Via variável intermediária",
                correctLabel: "API específica diretamente",
              },
              action: {
                text: `Substitua por \`${alternative}\`:`,
                code: `final ${property} = ${alternative};`,
              },
              objective: "Melhor **performance** com rebuilds mais eficientes.",
              reference: {
                text: "Flutter MediaQuery",
                url: "https://api.flutter.dev/flutter/widgets/MediaQuery-class.html",
              },
              file: filePath,
              line,
            });
          }
        }
      }
    }
  }
);
/** `MediaQuery.of(context)`: um argumento posicional, identificador. */
function isMediaQueryOf(call) {
  const args = call.arguments;
  return (
    call.callee === "MediaQuery.of" &&
    args.length === 1 &&
    args[0].label === null &&
    args[0].value.kind === _types_1.DartExpressionKind.Identifier
  );
}
/**
 * A chamada de `final mq = MediaQuery.of(context)...` ou `MediaQueryData mq = ...`
 * (o valor começa nela); `null` se a variável não é uma atribuição assim.
 */
function mediaQueryAssignment(variable) {
  const init = variable.initializer;
  if (!init) return null;
  const declared =
    variable.type === null
      ? variable.isFinal || variable.isVar
      : variable.type.name === "MediaQueryData" && !variable.type.isNullable;
  if (!declared) return null;
  return init.calls.find((c) => isMediaQueryOf(c) && c.startOffset === init.startOffset) ?? null;
}
/** Variáveis e onde elas valem: a local no seu corpo; o campo nos corpos da classe. */
function scopesOf(file) {
  const scopes = [];
  for (const declaration of file.declarations) {
    const bodies = [...declaration.methods, ...declaration.constructors].flatMap((m) =>
      m.body ? [m.body] : []
    );
    scopes.push({ variables: declaration.fields, bodies });
    for (const body of bodies) scopes.push({ variables: body.localVariables, bodies: [body] });
  }
  for (const fn of file.functions) {
    if (fn.body) scopes.push({ variables: fn.body.localVariables, bodies: [fn.body] });
  }
  return scopes;
}
/**
 * `mq.size` nos corpos: argumentos e inicializadores (`mq.size.width`) e receptores
 * (`mq.size.width.toString()`). O modelo não expõe o acesso a membro dentro de outra
 * expressão (`mq.size.width * 0.5`, condição de `if`): esses ficam de fora.
 */
function propertyUses(variable, bodies) {
  const uses = [];
  const add = (access, node) => {
    const [target, property] = access.split(/\??\./);
    if (target === variable.name && property) uses.push({ variable, property, node });
  };
  for (const body of bodies) {
    for (const call of body.calls) {
      if (call.receiver) add(call.receiver, call);
      for (const arg of call.arguments) {
        if (arg.value.kind === _types_1.DartExpressionKind.PropertyAccess)
          add(arg.value.compact, arg.value);
      }
    }
    for (const local of body.localVariables) {
      const init = local.initializer;
      if (init?.kind === _types_1.DartExpressionKind.PropertyAccess) add(init.compact, init);
    }
  }
  return uses;
}
/** A linha do código; se o nó quebra linha, o nó em uma linha. */
function codeOf(node) {
  return node.line === node.endLine ? node.lineText : node.compact;
}
