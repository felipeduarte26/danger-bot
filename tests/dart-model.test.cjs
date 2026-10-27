/**
 * Testes do modelo Dart (src/dart). Rodam sobre o build: `npm test`
 * (ou `DANGER_BOT_DIST=<pasta> node --test tests/`).
 */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dist = process.env.DANGER_BOT_DIST
  ? path.resolve(process.env.DANGER_BOT_DIST)
  : path.join(__dirname, "..", "dist");
const {
  DartFile,
  DartPath,
  DartText,
  DartLayer,
  DartLayerFolder,
  FileCategory,
  DartMemberKind,
  DartDeclarationKind,
  DartParameterKind,
  DartParameterSource,
  DartFieldOrigin,
  DartTypeKind,
  DartStringRole,
  DartCommentDirective,
  DartStatementKind,
  DartExpressionKind,
  Nullability,
  Presence,
} = require(path.join(dist, "dart", "index.js"));

const parse = (source, file = "lib/x.dart") => DartFile.fromSource(source, file);
const one = (source) => parse(source).declarations[0];

// ─── Declarações e modificadores ────────────────────────────────────────────

test("todas as combinações de modificadores de classe", () => {
  const combos = [
    "class",
    "base class",
    "interface class",
    "final class",
    "sealed class",
    "abstract class",
    "abstract base class",
    "abstract interface class",
    "abstract final class",
    "mixin class",
    "base mixin class",
    "abstract mixin class",
    "abstract base mixin class",
  ];
  for (const mods of combos) {
    const expected = mods.split(" ").filter((m) => m !== "class");
    for (const layout of [mods, mods.split(" ").join("\n  "), mods.split(" ").join(" /* c */ ")]) {
      const c = one(`@immutable\n${layout} Foo<T> extends Base<T> {}`);
      assert.equal(c.kind, DartDeclarationKind.Class, layout);
      assert.deepEqual([...c.modifiers], expected, layout);
      assert.equal(c.isAbstract, expected.includes("abstract"));
      assert.equal(c.isSealed, expected.includes("sealed"));
      assert.equal(c.isMixinClass, expected.includes("mixin"));
      assert.equal(c.superclass.name, "Base");
    }
  }
  const m = one("base mixin Logger<T> on Base<T> implements I {}");
  assert.equal(m.kind, DartDeclarationKind.Mixin);
  assert.ok(m.isBase);
  assert.deepEqual(
    m.onTypes.map((t) => t.name),
    ["Base"]
  );
});

test("enum, extension, extension type, mixin application e typedef", () => {
  const f = parse(`
enum Status with M implements I { active('A'), @Deprecated('x') legacy('L'); const Status(this.code); final String code; }
extension StringX on String { bool get isBlank => trim().isEmpty; }
extension<T> on List<T> { T? get firstOrNull => isEmpty ? null : first; }
extension type const UserId(int value) implements Object {}
class Pair = Base with Mixin;
typedef Callback = void Function(int index);
typedef void OldStyle(String x);
`);
  assert.deepEqual(
    f.declarations.map((d) => d.kind),
    ["enum", "extension", "extension", "extensionType", "mixinApplication"]
  );
  const status = f.enums[0];
  assert.deepEqual(
    status.enumValues.map((v) => v.name),
    ["active", "legacy"]
  );
  assert.equal(status.enumValues[1].hasAnnotation("Deprecated"), true);
  assert.equal(status.enumValues[0].arguments[0].value.kind, DartExpressionKind.StringLiteral);
  assert.deepEqual(
    status.fields.map((x) => x.name),
    ["code"]
  );
  assert.equal(f.extensions[0].extendedType.name, "String");
  assert.equal(f.extensions[1].name, "");
  assert.equal(f.extensions[1].extendedType.canonical, "List<T>");
  assert.equal(f.extensionTypes[0].extendedType.name, "int");
  assert.equal(f.classes[0].superclass.name, "Base");
  assert.deepEqual(
    f.classes[0].mixins.map((t) => t.name),
    ["Mixin"]
  );
  assert.deepEqual(
    f.typedefs.map((t) => t.name),
    ["Callback", "OldStyle"]
  );
  assert.equal(f.typedefs[0].aliasedType.kind, DartTypeKind.Function);
});

test("class em string, comentário e doc não é declaração", () => {
  const f = parse(`
// class Comentada {}
/* class Bloco { } /* aninhado */ */
/// class NaDoc {}
const texto = 'class NaString {}';
const multi = '''
class NaMultilinha {}
''';
class Real {}
`);
  assert.deepEqual(
    f.declarations.map((d) => d.name),
    ["Real"]
  );
});

test("trecho estranho não derruba o resto (recuperação por membro)", () => {
  const f = parse(`
class A {
  final int x;
  ???;
  void depois() {}
}
class B {}
`);
  const a = f.findClass("A");
  assert.equal(a.isComplete, false);
  assert.equal(a.unknownMembers.length, 1);
  assert.deepEqual(
    a.methods.map((m) => m.name),
    ["depois"]
  );
  assert.equal(a.hasMember("dispose"), Presence.Unknown);
  assert.ok(f.findClass("B"));
  const b = f.findClass("B");
  assert.equal(b.hasMember("dispose"), Presence.Absent);
});

test("arquivo truncado ou vazio não lança exceção", () => {
  for (const src of [
    "",
    "class A {",
    "class A { void f() { if (x) {",
    "'''",
    "/* sem fim",
    "﻿class A {}\r\n",
  ]) {
    const f = parse(src);
    assert.doesNotThrow(() => [
      f.declarations,
      f.calls(),
      f.strings,
      f.comments,
      f.identifiers,
      f.isComplete,
    ]);
  }
  assert.equal(parse("﻿class A {}\r\n").declarations[0].name, "A");
});

// ─── Campos, primary constructor e variáveis locais ─────────────────────────

test("campos: tipos, modificadores, várias variáveis e primary constructor", () => {
  const c = one(`
class const Point(final int x, {required final String? label}) {
  static const double zero = 0;
  late final TextEditingController _c = TextEditingController(text: '{');
  final Map<String, List<int>> data, other;
  var dynamicOne;
  String get name => label ?? '';
  void calcular() {
    String local = '';
    final date = DateTime.now();
  }
}`);
  const byName = Object.fromEntries(c.fields.map((f) => [f.name, f]));
  assert.deepEqual(Object.keys(byName), [
    "x",
    "label",
    "zero",
    "_c",
    "data",
    "other",
    "dynamicOne",
  ]);
  assert.equal(byName.x.origin, DartFieldOrigin.PrimaryConstructor);
  assert.equal(byName.label.nullability, Nullability.Nullable);
  assert.equal(byName.zero.isStatic && byName.zero.isConst && byName.zero.type.isDouble, true);
  assert.equal(byName._c.isLate && byName._c.isFinal, true);
  assert.equal(byName._c.initializer.kind, DartExpressionKind.Call);
  assert.equal(byName.other.type.canonical, "Map<String, List<int>>");
  assert.equal(byName.dynamicOne.type, null);
  assert.equal(byName.dynamicOne.nullability, Nullability.Unknown);
  // variável local nunca é campo
  assert.equal(c.findField("local"), null);
  const locals = c.findMethod("calcular").body.localVariables.map((v) => v.name);
  assert.deepEqual(locals, ["local", "date"]);
  // o bloco `this` do corpo pertence ao primary constructor
  assert.equal(c.primaryConstructor.isConst, true);
});

test("bloco `this` do primary constructor não vira campo", () => {
  const c = one(`class const Branch({required final int id}) {
  /// Doc do construtor.
  this : assert(id > 0);
  int get double => id * 2;
}`);
  assert.deepEqual(
    c.fields.map((f) => f.name),
    ["id"]
  );
  assert.equal(c.primaryConstructor.initializers[0].isAssert, true);
  assert.equal(c.isComplete, true);
});

// ─── Tipos ──────────────────────────────────────────────────────────────────

test("tipos: genéricos aninhados, função, record, nullable e prefixo", () => {
  const c = one(`class T {
  final Future<Either<Failure, List<UserEntity>>> a;
  final bool Function(int) b;
  final void Function(bool enabled)? c;
  final (int, {String name}) d;
  final p.User e;
  final FutureOr<void> f;
}`);
  const t = Object.fromEntries(c.fields.map((f) => [f.name, f.type]));
  assert.equal(t.a.isFuture, true);
  assert.equal(t.a.unwrapFuture().name, "Either");
  assert.equal(t.a.unwrapFuture().typeArguments[1].typeArguments[0].name, "UserEntity");
  assert.equal(t.b.kind, DartTypeKind.Function);
  assert.equal(t.b.isBool, false);
  assert.equal(t.b.returnType.isBool, true);
  assert.equal(t.c.isNullable, true);
  assert.equal(t.c.parameters[0].name, "enabled");
  assert.equal(t.d.kind, DartTypeKind.Record);
  assert.deepEqual(
    t.d.recordFields.map((r) => r.name),
    [null, "name"]
  );
  assert.equal(t.e.prefix, "p");
  assert.equal(t.e.builtin, null);
  assert.equal(t.f.unwrapFuture().isVoid, true);
  assert.ok(t.a.some((x) => x.name === "UserEntity"));
  assert.ok(t.a.equals("Future<Either<Failure,List<UserEntity>>>"));
});

// ─── Métodos, parâmetros e construtores ─────────────────────────────────────

test("métodos: getter, setter, operador, genérico, async e assinatura em várias linhas", () => {
  const c = one(`abstract class Repo<T> {
  @override
  Future<List<T>>
      load(
    String id, [
    int page = 1,
  ]) async {
    return [];
  }
  Stream<int> watch() async* {}
  Iterable<int> gen() sync* {}
  R map<R>(R Function(T) f) => f(value);
  int get count => 0;
  set count(int v) {}
  bool operator ==(Object other) => true;
  void abstrato();
  static void estatico() {}
  external void externo();
}`);
  const m = Object.fromEntries(c.methods.map((x) => [`${x.memberKind}:${x.name}`, x]));
  const load = m["method:load"];
  assert.equal(load.isOverride, true);
  assert.equal(load.isAsync, true);
  assert.equal(load.returnType.canonical, "Future<List<T>>");
  assert.deepEqual(
    load.parameters.map((p) => [p.name, p.kind, p.isRequired]),
    [
      ["id", DartParameterKind.RequiredPositional, true],
      ["page", DartParameterKind.OptionalPositional, false],
    ]
  );
  assert.equal(load.parameters[1].defaultValue.numberValue, 1);
  assert.equal(m["method:watch"].asyncKind, "asyncStar");
  assert.equal(m["method:gen"].isGenerator, true);
  assert.equal(m["method:map"].typeParameters[0].name, "R");
  assert.ok(m["getter:count"] && m["setter:count"] && m["operator:=="]);
  assert.equal(m["method:abstrato"].isAbstract, true);
  assert.equal(m["method:estatico"].isStatic, true);
  assert.equal(m["method:externo"].isExternal && !m["method:externo"].isAbstract, true);
  assert.equal(load.line, 3);
  assert.equal(load.nameLine, 4);
});

test("construtores: nomeado, factory, redirecionante, initializer list e private named params", () => {
  const c = one(`class User {
  const User({required this.id, required String name, this._repo}) : _name = name, super();
  User.guest() : this(id: 0, name: 'x');
  factory User.fromJson(Map<String, dynamic> json) => User(id: json['id'], name: '');
  factory User.other() = OtherUser;
  final int id;
}`);
  const k = Object.fromEntries(c.constructors.map((x) => [x.name, x]));
  assert.deepEqual(Object.keys(k), ["User", "User.guest", "User.fromJson", "User.other"]);
  assert.equal(k.User.isConst, true);
  assert.deepEqual(
    k.User.parameters.map((p) => [p.name, p.source, p.publicName]),
    [
      ["id", DartParameterSource.This, "id"],
      ["name", DartParameterSource.Plain, "name"],
      ["_repo", DartParameterSource.This, "repo"],
    ]
  );
  assert.deepEqual(
    k.User.initializers.map((i) => i.fieldName ?? (i.isSuperCall ? "super" : "?")),
    ["_name", "super"]
  );
  assert.equal(k["User.guest"].isRedirecting, true);
  assert.equal(k["User.fromJson"].isFactory && k["User.fromJson"].body.kind === "arrow", true);
  assert.equal(k["User.other"].redirectTarget, "OtherUser");
});

// ─── Corpos: chamadas, closures, try/catch, awaits ──────────────────────────

test("chamadas: comentário e string não contam; declaração não é chamada", () => {
  const f = parse(`
void f(BuildContext context) {
  foo(); // print('debug')
  final s = 'print(x)';
  /* print(y) */
  if (ok) print('sim');
  debugPrint('a');
  logger.print('b');
  final size = MediaQuery.of(context).size;
  final w = MediaQuery.sizeOf(context).width;
  _controller
    ..addListener(_onChange)
    ..dispose();
  widget.controller?.dispose();
  void helper() {}
  Future<void> other() async {}
  int? maybe() => null;
  final r = ok ? build() : null;
}`);
  const calls = f.calls();
  const names = calls.map((c) => c.callee);
  assert.deepEqual(
    names.filter((n) => n === "print"),
    ["print"]
  );
  assert.ok(names.includes("logger.print"));
  assert.ok(!names.includes("helper") && !names.includes("other") && !names.includes("maybe"));
  assert.ok(names.includes("build"));
  const mq = calls.find((c) => c.callee === "MediaQuery.of");
  assert.equal(mq.postfixMember, "size");
  const dispose = calls.filter((c) => c.name === "dispose");
  assert.equal(dispose[0].isCascade, true);
  assert.equal(dispose[0].cascadeTarget, "_controller");
  assert.equal(dispose[1].receiver, "widget.controller");
  assert.equal(dispose[1].isNullAware, true);
});

test("closures, awaits, returns e insideClosure", () => {
  const c = one(`class S extends State<W> {
  Future<void> load() async {
    final data = await repo.get();
    items.forEach((i) async {
      await save(i);
      return;
    });
    if (!mounted) return;
    setState(() => _data = data);
  }
  @override
  Widget build(BuildContext context) {
    final onTap = () { return 1; };
    return Container();
  }
}`);
  const body = c.findMethod("load").body;
  assert.equal(body.awaits.length, 2);
  assert.equal(body.awaits.filter((a) => a.insideClosure === null).length, 1);
  assert.equal(body.closures.length, 2);
  assert.ok(body.closures[0].isAsync);
  const setState = body.calls.find((x) => x.name === "setState");
  assert.ok(setState && setState.insideClosure === null);
  const build = c.findMethod("build").body;
  assert.equal(build.firstTopLevelReturnLine, 14);
  assert.deepEqual(
    build.statements.map((s) => s.kind),
    [DartStatementKind.VariableDeclaration, DartStatementKind.Return]
  );
  assert.ok(c.extendsAny("State"));
});

test("try/catch: vazio, só comentário, on/catch, finally; extension on não é catch", () => {
  const f = parse(`
extension StrX on String {}
void f() {
  try { a(); } catch (e) {}
  try {
    b();
  } on FormatException catch (e, s) {
    // danger:ignore
  } finally {
    c();
  }
  run(() { try { d(); } on Exception { log(); } });
}`);
  assert.equal(f.extensions.length, 1);
  const tries = f.functions[0].body.tryStatements;
  assert.equal(tries.length, 3);
  assert.equal(tries[0].catches[0].isEmpty, true);
  assert.equal(tries[1].catches[0].onType.name, "FormatException");
  assert.deepEqual(
    [tries[1].catches[0].exceptionName, tries[1].catches[0].stackTraceName],
    ["e", "s"]
  );
  assert.equal(tries[1].catches[0].isEmpty, true);
  assert.equal(tries[1].catches[0].body.comments[0].directive, DartCommentDirective.DangerIgnore);
  assert.ok(tries[1].finallyBody);
  assert.ok(tries[2].insideClosure !== null);
  assert.equal(tries[2].catches[0].isEmpty, false);
});

test("listas de widgets: elementos e argumentos", () => {
  const f = parse(
    `Widget b() => Column(children: [Text('a'), const SizedBox(height: 8), Text('b'), SizedBox(height: 8), Text('c')]);`
  );
  const column = f.calls().find((c) => c.name === "Column");
  const children = column.argument("children").value;
  assert.equal(children.kind, DartExpressionKind.ListLiteral);
  assert.deepEqual(
    children.elements.map((e) => e.call?.name),
    ["Text", "SizedBox", "Text", "SizedBox", "Text"]
  );
  assert.equal(children.elements[1].call.isConst, true);
  assert.equal(children.elements[1].call.argument("height").value.numberValue, 8);
});

// ─── Strings, comentários, diretivas ────────────────────────────────────────

test("strings: papel sintático", () => {
  const f = parse(`
import 'package:app/app.dart';
@JsonKey(name: 'json_name')
final m = {'chave': 'valor'};
final x = ok ? 'sim' : 'não';
final y = json['campo'];
final z = const ['lista'];
void g() {
  switch (v) { case 'caso': break; }
  Text('olá', semanticsLabel: 'rótulo');
  print('debug');
  final url = 'https://site.com/a'; // comentário
}`);
  const role = (v) => f.strings.find((s) => s.value === v);
  assert.equal(role("package:app/app.dart").role, DartStringRole.DirectiveUri);
  assert.equal(role("json_name").role, DartStringRole.AnnotationArgument);
  assert.equal(role("chave").role, DartStringRole.MapKey);
  assert.equal(role("valor").role, DartStringRole.Value);
  assert.equal(role("sim").role, DartStringRole.Value);
  assert.equal(role("campo").role, DartStringRole.IndexKey);
  assert.equal(role("lista").role, DartStringRole.Value);
  assert.equal(role("caso").role, DartStringRole.CaseLabel);
  assert.equal(role("olá").enclosingCallee, "Text");
  assert.equal(role("rótulo").argumentLabel, "semanticsLabel");
  assert.equal(role("debug").enclosingCallee, "print");
  assert.equal(role("https://site.com/a").role, DartStringRole.Value);
  assert.equal(f.comments.map((c) => c.content).includes("comentário"), true);
});

test("comentários: diretivas, trailing, doc e {@macro}", () => {
  const f = parse(`// ignore_for_file: lint_a, lint_b
// @dart=3.13
// TODO: fazer
class A {
  /// {@macro a.load}
  @override
  void load() {} // ignore: presentation-encapsulation
}`);
  const d = f.comments.map((c) => c.directive);
  assert.deepEqual(d.slice(0, 3), [
    DartCommentDirective.IgnoreForFile,
    DartCommentDirective.LanguageVersion,
    DartCommentDirective.Todo,
  ]);
  assert.deepEqual(f.comments[0].directiveArgs, ["lint_a", "lint_b"]);
  const load = f.findClass("A").findMethod("load");
  assert.equal(load.doc.isMacroOnly, true);
  assert.equal(load.isIgnoredBy("presentation-encapsulation"), true);
  assert.equal(load.isIgnoredBy("outro-plugin"), false);
  assert.equal(f.comments[f.comments.length - 1].isTrailing, true);
  assert.equal(f.languageVersionOverride, "3.13");
});

test("diretivas: as, show, hide, deferred, condicional, part", () => {
  const f = parse(`
library;
import 'package:a/a.dart' as a show X, Y hide Z;
import 'b.dart' deferred as b;
export 'src/c.dart' if (dart.library.io) 'src/c_io.dart';
part 'x.g.dart';
`);
  const [imp, def] = f.imports;
  assert.equal(imp.packageName, "a");
  assert.equal(imp.prefix, "a");
  assert.deepEqual(imp.show, ["X", "Y"]);
  assert.deepEqual(imp.hide, ["Z"]);
  assert.equal(def.isDeferred && def.uriKind === "relative", true);
  assert.equal(f.exports[0].hasConfigurations, true);
  assert.equal(f.generatedReason, "generatedPart");
});

// ─── Caminho ────────────────────────────────────────────────────────────────

test("DartPath: camada, pasta, teste, gerado, barrel e caminho do teste", () => {
  const p = DartPath.of("packages/app/lib/features/order/domain/usecases/get_order_usecase.dart");
  assert.equal(p.layer, DartLayer.Domain);
  assert.equal(p.layerFolder, DartLayerFolder.UseCases);
  assert.equal(p.inFolder(DartLayerFolder.UseCases), true);
  assert.equal(p.feature, "order");
  assert.equal(
    p.expectedTestPath,
    "packages/app/test/features/order/domain/usecases/get_order_usecase_test.dart"
  );
  // sem sinônimos: `usecase` (singular) não é UseCases
  const singular = DartPath.of("lib/x/domain/usecase/a.dart");
  assert.equal(singular.inFolder(DartLayerFolder.UseCases), false);
  assert.equal(singular.inFolder("usecase"), true);
  // `includes("/domain/")`: a primeira pasta não conta
  assert.equal(DartPath.of("domain/a.dart").layer, null);
  assert.equal(DartPath.of("test/a.dart").isTest, true);
  assert.equal(DartPath.of("packages/app/test/helpers/fake.dart").isTest, true);
  assert.equal(DartPath.of("lib/features/test/domain/entities/demo_entity.dart").isTest, false);
  assert.equal(
    DartPath.of("lib/features/test/domain/entities/demo_entity.dart").inFolder("test"),
    true
  );
  assert.equal(DartPath.of("lib/a_test.dart").isTest, true);
  assert.equal(DartPath.of("lib/a.freezed.dart").isGenerated, true);
  assert.equal(DartPath.of("lib/generated/l10n.dart").isGenerated, true);
  assert.equal(DartPath.of("lib/a.g.dart").baseName, "a");
  assert.equal(DartPath.of("lib/models/models.dart").isBarrel, true);
  assert.equal(DartPath.of("pubspec.lock").category, FileCategory.Config);
  assert.equal(DartPath.of("lib/a.mocks.dart").category, FileCategory.Generated);
});

test("DartText", () => {
  assert.deepEqual(DartText.splitWords("getUserHTTPData"), ["get", "user", "http", "data"]);
  assert.equal(DartText.toSnakeCase("HTTPClientFactory"), "http_client_factory");
  assert.equal(DartText.toPascalCase("user_entity"), "UserEntity");
  assert.equal(DartText.levenshtein("usuario", "usuarios"), 1);
  assert.equal(DartText.stripAccents("ação"), "acao");
});

test("quebras de linha não mudam os fatos", () => {
  const compact = `class A extends B<C> { final Map<String, int> m; Future<void> f(int a, {bool b = false}) async { await g(a, b); } }`;
  const tall = `class A
    extends B<
      C
    > {
  final Map<
    String,
    int
  > m;
  Future<void> f(
    int a, {
    bool b = false,
  }) async {
    await g(
      a,
      b,
    );
  }
}`;
  const facts = (src) => {
    const c = one(src);
    return JSON.stringify({
      sup: c.superclass.canonical,
      fields: c.fields.map((f) => f.type.canonical),
      params: c.methods[0].parameters.map((p) => `${p.kind}:${p.type.canonical}:${p.name}`),
      calls: parse(src)
        .calls()
        .map((x) => `${x.callee}(${x.arguments.length})`),
      awaits: c.methods[0].body.awaits.length,
    });
  };
  assert.equal(facts(compact), facts(tall));
});

test("identificadores declarados", () => {
  const f = parse(
    `class Usuario { final String nome; void salvar(int quantidade) { final total = 1; } }`
  );
  assert.deepEqual(
    f.identifiers.map((i) => `${i.kind}:${i.name}`),
    ["class:Usuario", "field:nome", "method:salvar", "parameter:quantidade", "localVariable:total"]
  );
});

test("DartMemberKind cobre todos os membros", () => {
  const c = one(
    `class A { A(); int x = 0; int get y => 0; set y(int v) {} void f() {} int operator +(A o) => 0; }`
  );
  assert.deepEqual(
    c.members.map((m) => m.memberKind),
    [
      DartMemberKind.Constructor,
      DartMemberKind.Field,
      DartMemberKind.Getter,
      DartMemberKind.Setter,
      DartMemberKind.Method,
      DartMemberKind.Operator,
    ]
  );
});

test("closures em inicializadores, typedef antigo e linhas de partes de tipo", () => {
  const f = parse(`class B {
  final onTap = (bool reload) {};
  final void Function(
    bool force,
  ) callback;
  final (bool reset, int n) pair;
}
typedef void Cb<T>(bool show, T value);`);
  const b = f.classes[0];
  const init = b.findField("onTap").initializer;
  assert.deepEqual(
    init.closures.map((c) => c.parameters.map((p) => `${p.type.canonical} ${p.name}`)),
    [["bool reload"]]
  );
  assert.deepEqual(
    f.closures().map((c) => c.line),
    [2]
  );
  const cb = b.findField("callback").type;
  assert.equal(cb.parameters[0].name, "force");
  assert.equal(cb.parameters[0].nameLine, 4);
  assert.equal(cb.line, 3);
  assert.equal(b.findField("pair").type.recordFields[0].nameLine, 6);
  const td = f.typedefs[0];
  assert.equal(td.aliasedType.kind, DartTypeKind.Function);
  assert.equal(td.aliasedType.returnType.isVoid, true);
  assert.deepEqual(
    td.aliasedType.parameters.map((p) => `${p.type.canonical} ${p.name}`),
    ["bool show", "T value"]
  );
  assert.deepEqual(
    td.typeParameters.map((t) => t.name),
    ["T"]
  );
});

test("compact: texto do nó em uma linha", () => {
  const c = one(`final class const E({
  @JsonKey(name: 'x')
  required final String createdAt =
      'a'
      'b',
  // comentário
  final int? id,
});`);
  const p = c.primaryConstructor.parameters[0];
  assert.equal(p.compact, "required final String createdAt = 'a' 'b'");
  assert.equal(c.fields[1].compact, "final int? id");
  assert.equal(
    parse("void f() {\n  foo(\n    a,\n    b,\n  );\n}").calls()[0].compact,
    "foo(a, b)"
  );
});

test("references: uso do nome, com e sem acesso a membro", () => {
  const body = parse(`class _S extends State<W> {
  Future<void> f() async {
    await load();
    if (!context.mounted) return;
    if (!mounted) return; // mounted
    final s = 'mounted';
  }
}`).classes[0].findMethod("f").body;
  assert.deepEqual(body.references("mounted"), [5]);
  assert.deepEqual(body.references("mounted", { includeMemberAccess: true }), [4, 5]);
});

test("variáveis de pattern, rótulos case e for de coleção", () => {
  const f = parse(`class S {
  void run(Object o, List<(String, int)> pares, Map<String, int> m) {
    final (nome, idade) = ('a', 1);
    var [primeiro, ...resto] = [1, 2, 3];
    final Point(:x, y: py) = Point(1, 2);
    final (int, String) registro = (1, 'x');
    for (final (rotulo, total) in pares) {}
    if (o case final String casado) {}
    if (o case [kConstante, var lista]) {}
    switch (o) {
      case Point(:final px) when px > 0:
        final noCase = px;
      case Status.ativo:
        break;
      default:
        final noDefault = 1;
    }
    final r = switch (o) {
      Sucesso(:final dado) => dado,
      int n => n,
      _ => null,
    };
    final itens = [for (final item in pares) item];
  }
}`);
  const locals = f.classes[0].findMethod("run").body.localVariables;
  const byName = (n) => locals.find((v) => v.name === n);
  assert.deepEqual(
    locals.filter((v) => v.isPatternVariable).map((v) => v.name),
    [
      "nome",
      "idade",
      "primeiro",
      "resto",
      "x",
      "py",
      "rotulo",
      "total",
      "casado",
      "lista",
      "px",
      "dado",
      "n",
    ]
  );
  // nome solto em `case` é constante, não declara
  assert.equal(byName("kConstante"), undefined);
  assert.equal(byName("ativo"), undefined);
  assert.equal(byName("registro").isPatternVariable, false);
  assert.equal(byName("registro").type.canonical, "(int, String)");
  assert.equal(byName("nome").isFinal, true);
  assert.equal(byName("primeiro").isFinal, false);
  assert.equal(byName("casado").type.canonical, "String");
  assert.equal(byName("casado").isFinal, true);
  assert.equal(byName("n").type.canonical, "int");
  assert.equal(byName("rotulo").isLoopVariable, true);
  assert.equal(byName("noCase").nameLine, 12);
  assert.equal(byName("noDefault").nameLine, 16);
  assert.equal(byName("item").isLoopVariable, true);
  assert.equal(byName("item").isPatternVariable, false);
  assert.ok(f.identifiers.some((i) => i.name === "dado"));
  assert.deepEqual(
    f.localVariables().map((v) => v.name),
    locals.map((v) => v.name).sort((a, b) => byName(a).startOffset - byName(b).startOffset)
  );
});

test("closures e funções locais genéricas", () => {
  const body = parse(`void f() {
  final cb = <T>(T valor) => valor;
  T primeiro<T>(List<T> xs) => xs.first;
  Future<int> buscar() async => 1;
  final v = lista.map<int>((e) => e.id);
}`).functions[0].body;
  const desc = body.closures.map(
    (c) =>
      `${c.line} ${c.name} <${c.typeParameters.map((t) => t.name)}> ${c.returnType?.canonical ?? "-"} (${c.parameters.map((p) => `${p.type?.canonical} ${p.name}`)})`
  );
  assert.deepEqual(desc, [
    "2 null <T> - (T valor)",
    "3 primeiro <T> T (List<T> xs)",
    "4 buscar <> Future<int> ()",
    "5 null <> - (undefined e)",
  ]);
  assert.deepEqual(
    body.statements.map((s) => s.kind),
    [
      DartStatementKind.VariableDeclaration,
      DartStatementKind.LocalFunction,
      DartStatementKind.LocalFunction,
      DartStatementKind.VariableDeclaration,
    ]
  );
});

test("strings: índice null-aware, chave após if/for de coleção e assert", () => {
  const f = parse(`void g(Map? json) {
  final a = json?['nulo'];
  final b = ok ? ['ternario'] : [];
  final m = {if (ok) 'seIf': 1, for (final k in ks) 'seFor': k, if (x) 'a': 1 else 'seElse': 2};
  assert(json != null, 'mensagem');
}`);
  const role = (v) => f.strings.find((s) => s.value === v);
  assert.equal(role("nulo").role, DartStringRole.IndexKey);
  assert.equal(role("ternario").role, DartStringRole.Value);
  assert.equal(role("seIf").role, DartStringRole.MapKey);
  assert.equal(role("seFor").role, DartStringRole.MapKey);
  assert.equal(role("seElse").role, DartStringRole.MapKey);
  assert.equal(role("mensagem").role, DartStringRole.CallArgument);
  assert.equal(role("mensagem").enclosingCallee, "assert");
  const cast = parse("final id = (json['id'] as num?)?.toInt();").calls()[0];
  assert.equal(cast.receiver, "(json['id'] as num?)");
});

test("conveniências: tryStatements, contains, calls da classe, memberAccesses", () => {
  const f = parse(`class A {
  final onTap = () { try { a(); } catch (_) {} };
  Future<void> f() async {
    try { await b(); } finally {}
    if (!context.mounted) return;
    this.context.read<X>();
    other.context.pop();
  }
}
class B { void g() => c(); }
void h() { try {} catch (e) {} }`);
  const [a, b] = f.classes;
  assert.deepEqual(
    f.tryStatements().map((t) => t.line),
    [2, 4, 11]
  );
  assert.deepEqual(
    a.calls().map((c) => c.name),
    ["a", "b", "read", "pop"]
  );
  assert.deepEqual(
    b.calls().map((c) => c.name),
    ["c"]
  );
  assert.equal(a.contains(a.findMethod("f")), true);
  assert.equal(b.contains(a.findMethod("f")), false);
  assert.deepEqual(a.findMethod("f").body.memberAccesses("context"), [
    { member: "mounted", line: 5 },
    { member: "read", line: 6 },
  ]);
});

test("trecho de topo inválido vira parseError; DartPath.findTest", () => {
  const f = parse(`Foo.bar() {}
void ok() {}`);
  assert.deepEqual(
    f.functions.map((fn) => fn.name),
    ["ok"]
  );
  assert.equal(f.parseErrors.length, 1);
  assert.equal(
    DartPath.of("lib/features/a/domain/x.dart").findTest(["test/features/a/domain/x_test.dart"]),
    "test/features/a/domain/x_test.dart"
  );
  assert.equal(DartPath.of("lib/features/a/domain/x.dart").findTest([]), null);
});

test("lista de parâmetros de método/construtor com corpo => não é closure", () => {
  const f = parse(`class M {
  M(this.a);
  factory M.fromEntity(E entity) => M(entity.a);
  int sum(int a) => add(a, 1);
  final onTap = (bool x) => go(x);
}
int top(int a) => add(a, 2);`);
  assert.deepEqual(
    f.closures().map((c) => c.line),
    [5]
  );
  assert.deepEqual(
    f.calls().map((c) => `${c.name} ${c.insideClosure === null ? "-" : c.insideClosure.line}`),
    ["M -", "add -", "go 5", "add -"]
  );
});
