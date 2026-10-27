/**
 * Positional Bool Params Plugin
 *
 * Detecta parâmetros booleanos posicionais em funções, métodos e construtores.
 *
 * O Effective Dart recomenda evitar parâmetros bool posicionais porque
 * `Task(true)` ou `Button(false)` são ilegíveis no call site.
 * Deve-se usar named parameters: `Task(repeating: true)`, `Button(isEnabled: false)`.
 *
 * Verifica funções de nível superior, métodos, construtores (inclusive o primary
 * constructor) e funções locais. `[bool x]` (posicional opcional) também conta.
 *
 * Exceções:
 * - Setters (o nome já deixa claro)
 * - Overrides (@override)
 * - Parâmetros já nomeados ({bool x})
 * - Operadores (operator ==)
 * - Tipos que só contêm bool: `bool Function(int)`, `void Function(bool)`, `List<bool>`
 * - Closures passadas como argumento (`onChanged: (bool value) {...}`)
 * - Funções genéricas (`foo<T>(bool x)`), por compatibilidade com o código antigo
 *
 * @see https://dart.dev/effective-dart/design#avoid-positional-boolean-parameters
 */
import {
  DartBody,
  DartFile,
  DartMemberKind,
  DartParameter,
  DartParameterKind,
  createPlugin,
  sendFormattedFail,
} from "@types";

/** Função, método, construtor ou função local com a lista de parâmetros. */
interface Callable {
  name: string;
  line: number;
  parameters: readonly DartParameter[];
}

/**
 * Callables do arquivo, na ordem das linhas (a ordem das mensagens).
 * Compatibilidade: funções e métodos genéricos (`void _sort<T>(...)`) ficam de fora,
 * porque o código antigo não os via; incluí-los passa a reportar 1 caso no esfera.
 */
function callablesOf(file: DartFile): Callable[] {
  const callables: Callable[] = [];
  const add = (name: string, line: number, parameters: readonly DartParameter[]): void => {
    callables.push({ name, line, parameters });
  };
  // funções locais (`void onTap(bool v) { }`), também dentro de overrides
  const addLocalFunctions = (body: DartBody | null): void => {
    for (const closure of body?.closures ?? []) {
      if (closure.name !== null) add(closure.name, closure.line, closure.parameters);
    }
  };

  for (const fn of file.functions) {
    if (fn.memberKind !== DartMemberKind.Setter && fn.typeParameters.length === 0)
      add(fn.name, fn.nameLine, fn.parameters);
    addLocalFunctions(fn.body);
  }
  for (const declaration of file.declarations) {
    for (const ctor of declaration.constructors) {
      add(ctor.constructorName ?? declaration.name, ctor.nameLine, ctor.parameters);
      addLocalFunctions(ctor.body);
    }
    for (const method of declaration.methods) {
      const skipped =
        method.isOverride ||
        method.memberKind === DartMemberKind.Setter ||
        method.memberKind === DartMemberKind.Operator ||
        method.typeParameters.length > 0;
      if (!skipped) add(method.name, method.nameLine, method.parameters);
      addLocalFunctions(method.body);
    }
  }
  return callables.sort((a, b) => a.line - b.line);
}

export default createPlugin(
  {
    name: "positional-bool-params",
    description: "Detecta parâmetros bool posicionais (Effective Dart: use named params)",
    enabled: true,
  },
  async () => {
    for (const file of DartFile.changed({ createdFirst: true })) {
      for (const callable of callablesOf(file)) {
        // `..., ` no exemplo quando a assinatura escrita até o último parâmetro tem vírgula
        // (outro parâmetro, vírgula final do dart format ou vírgula no tipo de retorno), como antes.
        const lastParam = callable.parameters[callable.parameters.length - 1];
        const lastParamLine = lastParam?.endLine ?? callable.line;
        const hasOthers = file.snippet(callable.line, lastParamLine).includes(",");

        for (const param of callable.parameters) {
          if (param.kind === DartParameterKind.Named || !param.type?.isBool) continue;

          const functionName = callable.name;
          const paramName = param.name;
          const suggestedNamed = paramName.startsWith("is")
            ? `{required bool ${paramName}}`
            : `{bool ${paramName} = false}`;

          sendFormattedFail({
            title: "PARÂMETRO BOOL POSICIONAL",
            description: `O parâmetro \`bool ${paramName}\` em \`${functionName}()\` é **posicional**. No call site, \`true\`/\`false\` aparecem sem contexto, dificultando a leitura — ex: \`${functionName}(..., true, ...)\`. Com **named parameter**, fica auto-documentado: \`${paramName}: true\`.`,
            problem: {
              wrong: `${functionName}(${hasOthers ? "..., " : ""}bool ${paramName})`,
              correct: `${functionName}(${hasOthers ? "..., " : ""}${suggestedNamed})`,
              wrongLabel: `Posicional — quem lê ${functionName}(..., true) não sabe o que "true" significa`,
              correctLabel: `Named — ${functionName}(..., ${paramName}: true) é auto-explicativo`,
            },
            action: {
              text: "Envolva o parâmetro bool com `{}` para torná-lo named:",
              code: `${functionName}(${suggestedNamed})`,
            },
            objective:
              "Seguir **Effective Dart** — parâmetros bool devem ser **named** para que o valor (`true`/`false`) tenha significado claro no call site.",
            reference: {
              text: "Effective Dart: AVOID positional boolean parameters",
              url: "https://dart.dev/effective-dart/design#avoid-positional-boolean-parameters",
            },
            file: file.path.path,
            line: callable.line,
          });
        }
      }
    }
  }
);
