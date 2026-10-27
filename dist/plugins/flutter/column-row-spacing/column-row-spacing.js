"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Column/Row Spacing Plugin
 * Sugere uso da propriedade `spacing` (Flutter 3.27+) em Column e Row
 * quando SizedBox de tamanho uniforme são usados entre os filhos.
 *
 * Só reporta quando:
 * - `children:` é uma lista literal com pelo menos 3 filhos
 * - Todos os SizedBox entre filhos têm o mesmo valor numérico literal
 * - O padrão é consistente: filho, SizedBox, filho, SizedBox, ..., filho
 *   (sem SizedBox nas pontas nem dois seguidos)
 * - O SizedBox só tem `height` (Column) ou `width` (Row): sem key, child ou outro argumento
 * - O valor é um número literal (não uma variável, constante ou expressão)
 *
 * `TableRow`, `DataRow` etc. não contam (só `Column(` e `Row(`).
 * Abordagem conservadora: na dúvida, não reporta.
 */
const _types_1 = require("../../../types.js");
/** Número literal sem sinal: `8`, `8.0` (não `-8`, `1e3`, `0x10`). */
const PLAIN_NUMBER_RE = /^\d+(?:\.\d+)?$/;
/**
 * Valor de `SizedBox(height: 8)` (Column) / `SizedBox(width: 8)` (Row), com ou sem
 * `const`; `null` se o filho não é exatamente isso.
 */
function sizedBoxValue(child, widgetType) {
  const call = child.call;
  if (call?.name !== "SizedBox" || call.receiver !== null) return null;
  // o filho é a própria chamada (não `if (x) SizedBox(...)`)
  if (child.compact !== call.compact && child.compact !== `const ${call.compact}`) return null;
  const [arg, ...others] = call.arguments;
  const prop = widgetType === "Column" ? "height" : "width";
  if (!arg || others.length > 0 || arg.label !== prop) return null;
  if (!PLAIN_NUMBER_RE.test(arg.value.compact)) return null;
  return arg.value.numberValue;
}
function analyzeBlock(widget, widgetType) {
  const list = widget.argument("children")?.value;
  if (list?.kind !== _types_1.DartExpressionKind.ListLiteral) return null;
  const children = list.elements;
  if (children.length < 3) return null;
  const sizedBoxValues = [];
  const sizedBoxIndices = [];
  for (let i = 0; i < children.length; i++) {
    const value = sizedBoxValue(children[i], widgetType);
    if (value !== null) {
      sizedBoxValues.push(value);
      sizedBoxIndices.push(i);
    }
  }
  const allSameValue = sizedBoxValues.every((v) => v === sizedBoxValues[0]);
  if (!allSameValue) return null;
  // filho, SizedBox, filho, ..., filho: SizedBox só nos índices ímpares, nunca no último
  if (children.length % 2 === 0) return null;
  for (let i = 0; i < children.length; i++) {
    const isSizedBox = sizedBoxIndices.includes(i);
    const shouldBeSizedBox = i % 2 === 1;
    if (isSizedBox !== shouldBeSizedBox) return null;
  }
  // Compatibilidade: a linha mostrada de cada SizedBox é a da vírgula que o antecede
  // (onde termina o filho anterior), como no código antigo.
  const sizedBoxLines = sizedBoxIndices.map((idx) => children[idx - 1].endLine);
  return { spacingValue: sizedBoxValues[0], count: sizedBoxValues.length, sizedBoxLines };
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "column-row-spacing",
    description:
      "Sugere uso de spacing em Column/Row ao invés de SizedBox intercalados (Flutter 3.27+)",
    enabled: true,
  },
  async () => {
    for (const dartFile of _types_1.DartFile.changed()) {
      const file = dartFile.path.path;
      const widgets = dartFile.calls().filter((c) => c.name === "Column" || c.name === "Row");
      for (const widget of widgets) {
        const widgetType = widget.name;
        const result = analyzeBlock(widget, widgetType);
        if (!result) continue;
        const prop = widgetType === "Column" ? "height" : "width";
        const isSingle = result.count === 1;
        (0, _types_1.sendFormattedFail)({
          title: isSingle
            ? `${widgetType.toUpperCase()} — SUBSTITUA SIZEDBOX POR SPACING`
            : `${widgetType.toUpperCase()} COM SIZEDBOX REPETITIVO`,
          description: isSingle
            ? `**SizedBox(${prop}: ${result.spacingValue})** na linha **${result.sizedBoxLines[0]}** pode ser substituído por \`spacing: ${result.spacingValue}\`.`
            : `**${result.count} SizedBox(${prop}: ${result.spacingValue})** nas linhas **${result.sizedBoxLines.join(", ")}** podem ser substituídos por \`spacing: ${result.spacingValue}\`.`,
          problem: {
            wrong: isSingle
              ? `${widgetType}(\n  children: [\n    WidgetA(),\n    SizedBox(${prop}: ${result.spacingValue}),\n    WidgetB(),\n  ],\n)`
              : `${widgetType}(\n  children: [\n    WidgetA(),\n    SizedBox(${prop}: ${result.spacingValue}),\n    WidgetB(),\n    SizedBox(${prop}: ${result.spacingValue}),\n    WidgetC(),\n  ],\n)`,
            correct: `${widgetType}(\n  spacing: ${result.spacingValue},\n  children: [\n    WidgetA(),\n    WidgetB(),${isSingle ? "" : "\n    WidgetC(),"}\n  ],\n)`,
            wrongLabel: isSingle
              ? "SizedBox para espaçamento"
              : `${result.count} SizedBox intercalados`,
            correctLabel: "Com spacing (Flutter 3.27+)",
          },
          action: {
            code: `${widgetType}(\n  spacing: ${result.spacingValue},\n  children: [\n    // remova ${isSingle ? "o SizedBox" : "os SizedBox"}\n  ],\n)`,
          },
          objective:
            "Usar a propriedade **spacing** do Flutter 3.27+ para código mais limpo e menos widgets na árvore.",
          reference: {
            text: "Row/Column spacing — Flutter 3.27",
            url: "https://codewithandrea.com/tips/spacing-row-column/",
          },
          file,
          line: widget.nameLine,
        });
      }
    }
  }
);
