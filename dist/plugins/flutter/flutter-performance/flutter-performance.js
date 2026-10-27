"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Flutter Performance Plugin
 * Detecta operações custosas ANTES do return no método build().
 *
 * O build() roda a cada rebuild. Operações pesadas antes do return
 * (loops, sorts, criação de controllers, variáveis computadas)
 * devem ser movidas para initState, didChangeDependencies, ou campos da classe.
 *
 * Analisa cada statement do corpo de `Widget build(BuildContext ...)` até o
 * primeiro `return` de nível 1 (um `return` dentro de `if` ou de closure não
 * interrompe). Um report por statement, na linha onde ele começa.
 *
 * Exceções:
 * - build com corpo `=>` (só devolve a árvore de widgets)
 * - a árvore de widgets: o conteúdo de qualquer `return` (também dentro de `if`)
 * - callbacks e funções locais (onTap, builder...): rodam sob demanda, não a cada rebuild
 */
const _types_1 = require("../../../types.js");
const loop = (kind) => (facts) => facts.loops.has(kind);
const member = (name) => (facts) => facts.members.has(name);
const call = (predicate) => (facts) => facts.calls.some(predicate);
/** `foo()`, `Foo()`, `Foo<T>()`. */
const called = (name) => call((c) => c.name === name);
/** `Receptor.metodo()`; com `namePrefix`, qualquer método que começa com ele (`loadString`). */
const calledOn = (receiver, namePrefix = "") =>
  call((c) => c.receiver === receiver && c.name.startsWith(namePrefix));
/** `Foo()`, `Foo<T>()` ou construtor nomeado `Foo.bar()`. */
const createdOrNamed = (name) => call((c) => c.name === name || c.receiver === name);
/** Método chamado no cliente `client` (`http.get()`, `_dio.post()`, `widget.dio.get()`). */
const clientCall = (client) =>
  call((c) => c.receiver !== null && lastSegment(c.receiver).replace(/^_/, "") === client);
// A ordem importa: vale a primeira operação encontrada no statement.
const HEAVY_OPERATIONS = [
  // ── Loops ──
  { matches: loop(_types_1.DartStatementKind.For), description: "Loop `for` no build()" },
  { matches: loop(_types_1.DartStatementKind.While), description: "Loop `while` no build()" },
  { matches: loop(_types_1.DartStatementKind.Do), description: "Loop `do-while` no build()" },
  // ── Ordenação / reversão de coleções ──
  {
    matches: call((c) => c.name === "sort" && (c.receiver !== null || c.isCascade)),
    description: "`.sort()` no build()",
  },
  { matches: member("reversed"), description: "`.reversed` no build()" },
  // ── Criação de Controllers / Nodes / Notifiers ──
  {
    matches: called("TextEditingController"),
    description: "Criação de `TextEditingController` no build()",
  },
  {
    matches: called("AnimationController"),
    description: "Criação de `AnimationController` no build()",
  },
  { matches: called("ScrollController"), description: "Criação de `ScrollController` no build()" },
  { matches: called("PageController"), description: "Criação de `PageController` no build()" },
  { matches: called("TabController"), description: "Criação de `TabController` no build()" },
  { matches: called("FocusNode"), description: "Criação de `FocusNode` no build()" },
  { matches: called("GlobalKey"), description: "Criação de `GlobalKey` no build()" },
  {
    matches: createdOrNamed("StreamController"),
    description: "Criação de `StreamController` no build()",
  },
  { matches: called("ValueNotifier"), description: "Criação de `ValueNotifier` no build()" },
  { matches: called("OverlayEntry"), description: "Criação de `OverlayEntry` no build()" },
  // ── Timer ──
  { matches: createdOrNamed("Timer"), description: "Criação de `Timer` no build()" },
  // ── HTTP / Network ──
  { matches: clientCall("http"), description: "Chamada HTTP no build()" },
  { matches: clientCall("dio"), description: "Chamada HTTP (Dio) no build()" },
  { matches: called("fetch"), description: "Chamada `fetch()` no build()" },
  // ── JSON parsing ──
  { matches: called("jsonDecode"), description: "`jsonDecode()` no build()" },
  { matches: called("jsonEncode"), description: "`jsonEncode()` no build()" },
  { matches: calledOn("json", "decode"), description: "`json.decode()` no build()" },
  { matches: calledOn("json", "encode"), description: "`json.encode()` no build()" },
  // ── RegExp ──
  { matches: called("RegExp"), description: "Criação de `RegExp` no build()" },
  // ── DateTime.now ──
  {
    matches: calledOn("DateTime", "now"),
    description: "`DateTime.now()` no build() — valor muda a cada rebuild",
  },
  // ── Objetos pesados ──
  {
    matches: called("ThemeData"),
    description: "Criação de `ThemeData` no build() — objeto pesado recriado a cada rebuild",
  },
  // ── Futures iniciados no build ──
  { matches: calledOn("Future", "wait"), description: "`Future.wait()` no build()" },
  { matches: calledOn("Future", "delayed"), description: "`Future.delayed()` no build()" },
  { matches: calledOn("Future", "microtask"), description: "`Future.microtask()` no build()" },
  // ── File I/O ──
  { matches: called("File"), description: "Operação de `File` no build()" },
  {
    matches: calledOn("rootBundle", "load"),
    description: "Carregamento de asset (`rootBundle`) no build()",
  },
  // ── Compute / Isolate ──
  { matches: called("compute"), description: "`compute()` no build()" },
  { matches: calledOn("Isolate", "spawn"), description: "`Isolate.spawn()` no build()" },
  // ── Platform Channels ──
  { matches: called("MethodChannel"), description: "Criação de `MethodChannel` no build()" },
  { matches: called("EventChannel"), description: "Criação de `EventChannel` no build()" },
];
exports.default = (0, _types_1.createPlugin)(
  {
    name: "flutter-performance",
    description: "Detecta operações custosas no build()",
    enabled: true,
  },
  async () => {
    for (const file of _types_1.DartFile.changed()) {
      for (const build of buildMethods(file)) {
        const body = build.body;
        if (body === null || build.bodyKind !== _types_1.DartBodyKind.Block) continue;
        for (const stmt of statementsBeforeReturn(body)) {
          const facts = factsOf(body, stmt);
          const operation = HEAVY_OPERATIONS.find((op) => op.matches(facts));
          if (!operation) continue;
          const text = statementText(file, stmt);
          const displayCode = text.length > 120 ? text.substring(0, 117) + "..." : text;
          (0, _types_1.sendFormattedFail)({
            title: "OPERAÇÃO CUSTOSA NO BUILD()",
            description: `${operation.description}. \`build()\` é chamado a cada rebuild — operações pesadas aqui causam **jank** (queda de FPS).`,
            problem: {
              wrong: `Widget build(BuildContext context) {\n  ${displayCode}\n  return ...;\n}`,
              correct: `late final result = heavyOperation();\n\nWidget build(BuildContext context) {\n  return Widget(data: result);\n}`,
              wrongLabel: "Dentro do build() — roda a cada rebuild",
              correctLabel: "Fora do build() — computa uma vez",
            },
            action: {
              text: "Mova para `initState()`, `didChangeDependencies()`, campo da classe, ou compute fora do build:",
              code: displayCode,
            },
            objective: "Manter **60fps** com builds rápidos.",
            reference: {
              text: "Flutter Performance Best Practices",
              url: "https://docs.flutter.dev/perf/best-practices",
            },
            file: file.path.path,
            line: stmt.line,
          });
        }
      }
    }
  }
);
/**
 * Métodos `Widget build(BuildContext context)` do arquivo (classes, mixins,
 * extensions e funções de nível superior), na ordem das linhas. O retorno pode ser
 * qualquer `...Widget` (`PreferredSizeWidget`), sem `?`.
 */
function buildMethods(file) {
  const candidates = [...file.declarations.flatMap((d) => d.methods), ...file.functions];
  return candidates
    .filter(
      (fn) =>
        fn.name === "build" &&
        fn.returnType?.name?.endsWith("Widget") === true &&
        !fn.returnType.isNullable &&
        fn.parameters.some((p) => p.type?.name === "BuildContext")
    )
    .sort((a, b) => a.line - b.line);
}
/** Statements de nível 1 até o primeiro `return` de nível 1. */
function statementsBeforeReturn(body) {
  const result = [];
  for (const stmt of body.statements) {
    if (stmt.kind === _types_1.DartStatementKind.Return) break;
    result.push(stmt);
  }
  return result;
}
/**
 * O que o statement executa no build(): chamadas, laços e acessos, sem o que
 * está em closures (callbacks) e em `return` (a árvore de widgets).
 */
function factsOf(body, stmt) {
  const widgetTrees = body.returns.filter((r) => r.insideClosure === null && inside(r, stmt));
  const runs = (node) => inside(node, stmt) && !widgetTrees.some((tree) => inside(node, tree));
  const calls = body.calls.filter((c) => c.insideClosure === null && runs(c));
  const locals = body.localVariables.filter((v) => v.insideClosure === null && runs(v));
  // Expressões alcançáveis: inicializadores das variáveis, argumentos das chamadas e
  // os itens das listas (para achar o `for` de coleção e os acessos `.reversed`).
  const expressions = withElements([
    ...locals.flatMap((v) => (v.initializer ? [v.initializer] : [])),
    ...calls.flatMap((c) => c.arguments.map((a) => a.value)),
  ]);
  const loops = new Set(
    nestedStatements([stmt])
      .map((s) => s.kind)
      .filter(
        (k) =>
          k === _types_1.DartStatementKind.For ||
          k === _types_1.DartStatementKind.While ||
          k === _types_1.DartStatementKind.Do
      )
  );
  if (expressions.some(isCollectionFor)) loops.add(_types_1.DartStatementKind.For);
  const members = new Set();
  for (const c of calls) {
    if (c.postfixMember) members.add(c.postfixMember);
    for (const name of segments(c.receiver ?? "")) members.add(name);
  }
  for (const e of expressions) {
    if (e.kind === _types_1.DartExpressionKind.PropertyAccess) {
      for (const name of segments(e.compact)) members.add(name);
    }
  }
  return { calls, loops, members };
}
/** O statement e os statements dos blocos internos (`if`, `for`, `try`...), sem closures. */
function nestedStatements(statements) {
  return statements.flatMap((s) => [
    s,
    ...nestedStatements(s.children.flatMap((child) => child.statements)),
  ]);
}
/** As expressões e, nas listas, os itens (recursivo). */
function withElements(expressions) {
  return expressions.flatMap((e) => [e, ...withElements(e.elements)]);
}
/** Item de coleção `for (...)` (`[for (final x in xs) x]`). */
function isCollectionFor(expression) {
  return /^(await\s+)?for\s*\(/.test(expression.compact);
}
function inside(node, container) {
  return node.startOffset >= container.startOffset && node.endOffset <= container.endOffset;
}
/** `widget.items?.reversed` → `["widget", "items", "reversed"]`. */
function segments(access) {
  return access.split(/\??\./);
}
function lastSegment(access) {
  const parts = segments(access);
  return parts[parts.length - 1];
}
/** O statement como aparece no arquivo: as linhas sem espaços nas pontas, unidas por espaço. */
function statementText(file, stmt) {
  return file
    .snippet(stmt.line, stmt.endLine)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join(" ");
}
