"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Avoid setState After Async Plugin
 * Detecta chamadas de setState() após await sem verificar `mounted`.
 *
 * Após um await, o widget pode ter sido desmontado (usuário navegou para
 * outra tela). Chamar setState() nesse caso causa:
 *   "setState() called after dispose()"
 *
 * Solução: verificar `if (!mounted) return;` antes do setState().
 *
 * Analisa as funções async das classes que estendem State/ViewState: métodos e
 * closures (`onPressed: () async { ... }`). Cada função async é um escopo: só os
 * awaits dela contam, e um `mounted` entre o último await e o setState libera
 * (um novo await exige nova verificação).
 *
 * Compatibilidade com o código antigo: State genérico (`class _FooState<T> extends
 * State<Foo<T>>`) fica de fora, porque o código antigo não o via; incluí-lo passa a
 * reportar 1 caso no esfera.
 *
 * Este plugin emite WARNING (não fail) pois pode haver casos onde o
 * mounted check está em um nível acima ou em um helper.
 */
const _types_1 = require("../../../types.js");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "avoid-setstate-after-async",
    description: "Detecta chamadas de setState após await sem verificar mounted",
    enabled: true,
  },
  async () => {
    for (const file of _types_1.DartFile.changed()) {
      const issues = file.classes
        .filter((c) => c.extendsAny("State", "ViewState") && c.typeParameters.length === 0)
        .flatMap((state) => asyncBodiesOf(file, state))
        .flatMap(findSetStateAfterAwait)
        .sort((a, b) => a.line - b.line);
      for (const issue of issues) {
        (0, _types_1.sendFormattedWarn)({
          title: "SETSTATE APÓS AWAIT SEM MOUNTED CHECK",
          description: `\`setState()\` na linha ${issue.line} é chamado após \`await\` (linha ${issue.awaitLine}) sem verificar \`mounted\`.`,
          problem: {
            wrong: `await fetchData();\nsetState(() {\n  _data = result;\n});`,
            correct: `await fetchData();\nif (!mounted) return;\nsetState(() {\n  _data = result;\n});`,
            wrongLabel: "Sem verificar mounted",
            correctLabel: "Com mounted check",
          },
          action: {
            code: `if (!mounted) return;\nsetState(() {\n  // ...\n});`,
          },
          objective:
            "Evitar **setState() called after dispose()** — crash quando o widget já foi desmontado.",
          reference: {
            text: "Flutter: State.mounted",
            url: "https://api.flutter.dev/flutter/widgets/State/mounted.html",
          },
          file: file.path.path,
          line: issue.line,
        });
      }
    }
  }
);
/** Corpos das funções async da classe: métodos e closures (também em inicializadores de campos). */
function asyncBodiesOf(file, state) {
  const methods = state.methods.flatMap((m) => (m.isAsync && m.body ? [m.body] : []));
  const closures = file
    .closures()
    .filter(
      (c) => c.isAsync && c.startOffset >= state.startOffset && c.endOffset <= state.endOffset
    )
    .map((c) => c.body);
  return [...methods, ...closures];
}
/**
 * setState() do próprio escopo (fora das closures async internas, que são escopos à
 * parte) depois de um await do escopo, sem `mounted` entre o último await e ele.
 * Comparação por linha, como antes: `mounted` na linha do await ou do setState conta.
 */
function findSetStateAfterAwait(body) {
  const awaitLines = body.awaits.filter((a) => a.insideClosure === null).map((a) => a.line);
  if (awaitLines.length === 0) return [];
  const innerAsync = body.closures.filter((c) => c.isAsync);
  const mountedLines = body.references("mounted", { includeMemberAccess: true });
  const issues = [];
  for (const call of body.calls) {
    if (call.name !== "setState") continue;
    const ownScope = !innerAsync.some(
      (c) => call.startOffset >= c.startOffset && call.endOffset <= c.endOffset
    );
    if (!ownScope) continue;
    const awaitLine = awaitLines.filter((line) => line <= call.nameLine).pop();
    if (awaitLine === undefined) continue;
    if (mountedLines.some((line) => line >= awaitLine && line <= call.nameLine)) continue;
    issues.push({ line: call.nameLine, awaitLine });
  }
  return issues;
}
