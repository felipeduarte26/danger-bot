/**
 * Future Wait Modernizer Plugin
 *
 * Detecta uso de Future.wait([...]) com lista literal e sugere a sintaxe
 * moderna de tupla com .wait introduzida no Dart 3.
 *
 * A sintaxe de tupla é preferível porque:
 *   - Type-safe: cada resultado já vem com o tipo correto
 *   - Sem casts: não precisa de result[0] as Type
 *   - Mais legível: destructuring com nomes descritivos
 *
 * Só reporta quando o resultado é o valor de uma declaração local
 * (`final x = await Future.wait([...]);`, também `final [a as A, _] = ...`).
 * A atribuição a variável existente (`x = await Future.wait([...]);`) fica de
 * fora: o modelo ainda não distingue atribuição de `await Future.wait([...]);`.
 * Não flageia Future.wait com variáveis ou expressões dinâmicas
 * (ex: Future.wait(listaDeFutures), Future.wait(items.map(...))),
 * pois nesses casos a tupla não é aplicável; nem `Future.wait<T>(...)`,
 * lista `const`/tipada, `await Future.wait([...]);` sem atribuição ou
 * Future.wait dentro de uma closure da declaração.
 *
 * @see {@link https://dart.dev/language/records#multiple-returns} Dart Records
 * @see {@link https://api.dart.dev/stable/dart-async/FutureRecord2/wait.html} FutureRecord.wait
 */
import {
  DartCall,
  DartExpression,
  DartExpressionKind,
  DartFile,
  DartStatement,
  DartStatementKind,
  createPlugin,
  sendFormattedFail,
} from "@types";

/**
 * Extrai um nome de variável a partir de um future da lista.
 *   _listPickingsUsecase(...)  → listPickingsResult
 *   _repository.fetchPayments(...) → fetchPaymentsResult
 *   promise1                   → promise1Result
 */
function futureToVarName(future: DartExpression): string {
  const name = future.call?.name ?? future.compact.replace(/[^a-zA-Z0-9]/g, "");
  return cleanVarName(name) + "Result";
}

function cleanVarName(name: string): string {
  let clean = name.replace(/^_+/, "");
  clean = clean.replace(/(usecase|Usecase|UseCase)$/i, "");
  clean = clean.replace(/(repository|Repository)$/i, "");
  clean = clean.replace(/(datasource|Datasource|DataSource)$/i, "");

  if (!clean) return "result";

  return clean.charAt(0).toLowerCase() + clean.slice(1);
}

/**
 * Compacta um future multi-line em uma única linha legível.
 */
function compactCall(future: DartExpression): string {
  return future.text.replace(/\s+/g, " ").replace(/,\s*$/, "");
}

/**
 * Deduplicar nomes de variáveis adicionando sufixo numérico quando necessário.
 */
function deduplicateNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  const result: string[] = [];

  for (const name of names) {
    const count = counts.get(name) ?? 0;
    counts.set(name, count + 1);

    if (count > 0) {
      result.push(`${name}${count + 1}`);
    } else {
      const totalOccurrences = names.filter((n) => n === name).length;
      result.push(totalOccurrences > 1 ? `${name}1` : name);
    }
  }

  return result;
}

/**
 * Gera a sugestão de correção baseada nas futures reais detectadas.
 */
function generateCorrection(futures: readonly DartExpression[], indent: string): string {
  if (futures.length === 0) return "";

  const varNames = deduplicateNames(futures.map(futureToVarName));
  const calls = futures.map((f) => `${indent}  ${compactCall(f)},`).join("\n");
  const destructuring = varNames.map((v) => `${indent}  ${v},`).join("\n");

  return `final (\n${destructuring}\n${indent}) = await (\n${calls}\n${indent}).wait;`;
}

/**
 * Lista literal `[...]` passada ao `Future.wait` (sem tipo explícito na chamada,
 * nem lista `const`/tipada), ou `null`.
 */
function literalListOf(call: DartCall): DartExpression | null {
  if (call.callee !== "Future.wait" || call.typeArguments.length > 0) return null;
  const list = call.positionalArguments[0]?.value;
  if (list?.kind !== DartExpressionKind.ListLiteral || !list.text.startsWith("[")) return null;
  return list;
}

/** Statements dos corpos do arquivo (funções, métodos, construtores e closures), com os aninhados. */
function statementsOf(file: DartFile): DartStatement[] {
  const functions = [
    ...file.functions,
    ...file.declarations.flatMap((d) => [...d.methods, ...d.constructors]),
  ];
  const statements: DartStatement[] = [];
  const visit = (list: readonly DartStatement[]): void => {
    for (const statement of list) {
      statements.push(statement);
      for (const child of statement.children) visit(child.statements);
    }
  };
  for (const fn of functions) {
    if (!fn.body) continue;
    visit(fn.body.statements);
    for (const closure of fn.body.closures) visit(closure.body.statements);
  }
  return statements;
}

/**
 * Declaração cujo valor é a chamada: o statement mais interno que a contém
 * declara variável(is), termina nela (só `;` depois) e ela não está numa closure
 * dentro da declaração. `null` se não for.
 */
function declarationOf(call: DartCall, statements: readonly DartStatement[]): DartStatement | null {
  let statement: DartStatement | null = null;
  for (const s of statements) {
    if (s.startOffset > call.startOffset || s.endOffset < call.endOffset) continue;
    if (statement === null || s.text.length < statement.text.length) statement = s;
  }
  if (statement?.kind !== DartStatementKind.VariableDeclaration) return null;

  const after = statement.text.slice(call.endOffset - statement.startOffset).trim();
  const closure = call.insideClosure;
  const inClosure = closure !== null && closure.startOffset > statement.startOffset;
  return after === ";" && !inClosure ? statement : null;
}

/** Linhas `from`..`to` sem a indentação comum. */
function dedent(file: DartFile, from: number, to: number): string {
  const lines = Array.from({ length: to - from + 1 }, (_, k) => file.lineAt(from + k));
  const minIndent = lines.reduce((min, l) => {
    if (l.trim() === "") return min;
    const indent = l.match(/^\s*/)?.[0].length ?? 0;
    return Math.min(min, indent);
  }, Infinity);

  return lines.map((l) => (minIndent < Infinity ? l.substring(minIndent) : l)).join("\n");
}

export default createPlugin(
  {
    name: "future-wait-modernizer",
    description: "Detecta Future.wait e sugere uso de tupla com .wait do Dart 3",
    enabled: true,
  },
  async () => {
    const files = DartFile.changed().filter(
      (file) => !file.path.inFolder("test") && !file.path.inFolder("testing")
    );

    for (const file of files) {
      const candidates = file.calls().filter((call) => literalListOf(call) !== null);
      if (candidates.length === 0) continue;
      const statements = statementsOf(file);

      for (const call of candidates) {
        const declaration = declarationOf(call, statements);
        if (!declaration) continue;

        // trecho real: da linha do Future.wait ao fim da declaração
        const wrongSnippet = dedent(file, call.line, declaration.endLine);
        const futures = literalListOf(call)?.elements ?? [];

        const lineIndent = file.lineAt(call.line).match(/^\s*/)?.[0] ?? "";
        const correction = generateCorrection(futures, lineIndent);

        sendFormattedFail({
          title: "FUTURE.WAIT COM LISTA LITERAL",
          description:
            "`Future.wait([...])` detectado. Prefira a sintaxe de **tupla com `.wait`** do Dart 3 — type-safe, sem necessidade de cast por índice e mais legível.",
          problem: {
            wrong: wrongSnippet,
            correct:
              correction ||
              `final (\n  resultA,\n  resultB,\n) = await (\n  futureA(),\n  futureB(),\n).wait;`,
            wrongLabel: "Future.wait — acesso por índice, requer cast",
            correctLabel: "Tupla .wait — type-safe, destructuring direto",
          },
          action: {
            text: "Substitua `Future.wait([...])` pela sintaxe de **tupla com `.wait`**:",
            code:
              correction ||
              `final (\n  resultA,\n  resultB,\n) = await (\n  futureA(),\n  futureB(),\n).wait;`,
          },
          objective:
            "Usar a sintaxe moderna de tupla com `.wait` para **type-safety**, eliminando casts manuais e acesso por índice.",
          reference: {
            text: "Dart Records — Multiple Returns",
            url: "https://dart.dev/language/records#multiple-returns",
          },
          file: file.path.path,
          line: call.line,
        });
      }
    }
  }
);
