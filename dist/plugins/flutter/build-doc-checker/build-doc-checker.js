"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Build Doc Checker Plugin
 * Detecta comentários de documentação (///) dentro do corpo de métodos `build`.
 *
 * Documentação dentro de build é desnecessária e polui o código.
 * Doc comments devem ser usados em: classes, construtores, métodos, campos.
 * Widgets instanciados dentro de build são auto-explicativos pelo código.
 *
 * Só conta o `Widget build(...)` com `@override` e o `///` que começa a linha.
 * Não contam: a doc acima do build, `///` dentro de string ou de comentário de bloco,
 * e o build `=>` de uma linha só.
 */
const _types_1 = require("../../../types.js");
exports.default = (0, _types_1.createPlugin)(
  {
    name: "build-doc-checker",
    description: "Detecta /// desnecessários dentro de Widget build",
    enabled: true,
  },
  async () => {
    for (const file of _types_1.DartFile.changed()) {
      const builds = file.declarations.flatMap((d) => d.methods).filter(isWidgetBuild);
      if (builds.length === 0) continue;
      // `///` no início da linha (comentário de doc que não vem depois de código)
      const docLines = new Set(
        file.comments
          .filter((c) => c.kind === _types_1.DartCommentKind.Doc && !c.isTrailing)
          .map((c) => c.line)
      );
      for (const build of builds) {
        for (const comment of build.body?.comments ?? []) {
          if (!docLines.has(comment.line)) continue;
          const line = comment.line;
          const { wrongSnippet, correctSnippet } = buildRealSnippets(file, line, docLines);
          (0, _types_1.sendFormattedFail)({
            title: "DOCUMENTAÇÃO DESNECESSÁRIA DENTRO DE BUILD",
            description: `Comentário \`///\` dentro do método \`build\` é desnecessário. Widgets dentro de build são auto-explicativos pelo código.\n\n\`${comment.lineText}\``,
            problem: {
              wrong: wrongSnippet,
              correct: correctSnippet,
              wrongLabel: "/// dentro de build",
              correctLabel: "Sem /// desnecessário",
            },
            action: {
              text: "Remova este comentário `///`. Use `///` apenas fora de `build` para documentar classes, construtores, campos e métodos.",
              code: `// ✅ Usar /// em:\n/// Classe ou método (fora de build)\nclass MyWidget extends StatelessWidget {\n  /// Campo documentado\n  final String title;\n}\n\n// ❌ NÃO usar /// dentro de build:\n@override\nWidget build(BuildContext context) {\n  return Column(\n    // use // se precisar de comentário inline\n    children: [...],\n  );\n}`,
            },
            objective:
              "Comentários `///` dentro de `build` poluem o código e não geram documentação útil. Widgets são auto-descritivos por seus nomes e parâmetros.",
            file: file.path.path,
            line,
          });
        }
      }
    }
  }
);
/** `@override Widget build(...)` (o `build` de StatelessWidget/State). */
function isWidgetBuild(method) {
  return method.name === "build" && method.isOverride && method.returnType?.name === "Widget";
}
/**
 * Trecho real do código: a linha antes do `///`, o bloco de `///` seguidos e
 * duas linhas depois; a versão corrigida é o mesmo trecho sem o bloco de `///`.
 */
function buildRealSnippets(file, docLine, docLines) {
  let docEnd = docLine;
  while (docLines.has(docEnd + 1)) docEnd++;
  const start = Math.max(1, docLine - 1);
  const end = Math.min(file.lineCount, docEnd + 2);
  const context = Array.from({ length: end - start + 1 }, (_, k) => start + k);
  const text = (lines) => lines.map((l) => file.lineAt(l).trimEnd()).join("\n");
  return {
    wrongSnippet: text(context),
    correctSnippet: text(context.filter((l) => l < docLine || l > docEnd)),
  };
}
