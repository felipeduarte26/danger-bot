/**
 * Late Final Checker Plugin
 * Detecta uso desnecessário de late final com valor atribuído na declaração.
 *
 * late final só faz sentido quando o valor é atribuído DEPOIS (ex: initState).
 * Se já tem valor na declaração, deve ser apenas final ou const.
 *
 * Verifica campos, variáveis de nível superior e variáveis locais com `late final`
 * e inicializador (`late final X x;` sem valor não é reportado).
 *
 * Exceção: campo de instância cujo inicializador usa `this`/`widget` ou chama um
 * método de instância da própria classe — sem o `late` ele não compila.
 */
import { DartField, DartFile, DartVariable, createPlugin, sendFormattedFail } from "@types";

export default createPlugin(
  {
    name: "late-final-checker",
    description: "Detecta late final desnecessário com valor atribuído",
    enabled: true,
  },
  async () => {
    for (const file of DartFile.changed()) {
      for (const variable of variablesOf(file)) {
        if (!variable.isLate || !variable.isFinal || variable.initializer === null) continue;
        if (needsLate(variable)) continue;

        const declaration = variable.compact;

        sendFormattedFail({
          title: "LATE FINAL DESNECESSÁRIO",
          description:
            "`late final` com valor atribuído na declaração não faz sentido. O `late` só é necessário quando a atribuição acontece **depois** (ex: `initState`, `didChangeDependencies`).",
          problem: {
            wrong: declaration,
            correct: declaration.replace(/late\s+/, ""),
            wrongLabel: "late final com valor imediato",
            correctLabel: "Apenas final (sem late)",
          },
          action: {
            text: "Remova o `late` — o valor já é atribuído na declaração:",
            code: declaration.replace(/late\s+/, ""),
          },
          objective: "Usar `late` apenas quando necessário — código mais claro e previsível.",
          reference: {
            text: "Effective Dart: Usage",
            url: "https://dart.dev/effective-dart/usage#dont-use-late-when-a-constructor-initializer-will-do",
          },
          file: file.path.path,
          line: variable.line,
        });
      }
    }
  }
);

/** Campos, variáveis de nível superior e variáveis locais (corpos e closures), na ordem do arquivo. */
function variablesOf(file: DartFile): DartVariable[] {
  const bodies = [
    ...file.functions.map((fn) => fn.body),
    ...file.declarations.flatMap((declaration) => [
      ...declaration.methods.map((method) => method.body),
      ...declaration.constructors.map((ctor) => ctor.body),
    ]),
  ];
  return [
    ...file.variables,
    ...file.declarations.flatMap((declaration) => declaration.fields),
    ...bodies.flatMap((body) => body?.localVariables ?? []),
  ].sort((a, b) => a.startOffset - b.startOffset);
}

/**
 * Inicializador de campo de instância que só compila com `late`: usa `this`/`widget`
 * ou chama um método de instância da própria classe (`_buildLink(...)`).
 */
function needsLate(variable: DartVariable): boolean {
  if (!(variable instanceof DartField) || variable.isStatic || variable.initializer === null) {
    return false;
  }
  const { initializer, owner } = variable;
  return (
    initializer.usesThis ||
    initializer.calls.some(
      (call) =>
        call.receiver === null &&
        !call.isCascade &&
        owner.methods.some((method) => method.name === call.name && !method.isStatic)
    )
  );
}
