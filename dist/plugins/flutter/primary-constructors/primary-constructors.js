"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.__testing = void 0;
exports.analyzePrimaryConstructors = analyzePrimaryConstructors;
exports.suggestPrimaryConstructors = suggestPrimaryConstructors;
exports.convertToPrimaryConstructors = convertToPrimaryConstructors;
exports.findPrimaryConstructors = findPrimaryConstructors;
exports.primaryConstructorFieldsByLine = primaryConstructorFieldsByLine;
exports.normalizePrimaryConstructorHeaders = normalizePrimaryConstructorHeaders;
/**
 * Primary Constructors Plugin
 * ============================
 * Obriga o uso de primary constructors (Dart 3.13+) em classes e enums que
 * ainda declaram o construtor principal dentro do corpo da classe.
 *
 * Padrão antigo (detectado):
 *   class Point {
 *     const Point(this.x, this.y);
 *     final int x;
 *     final int y;
 *   }
 *
 * Padrão novo (sugerido):
 *   class const Point(final int x, final int y);
 *
 * Reporta somente quando a conversão é segura e mantém a mesma semântica:
 * - O pacote do arquivo (pubspec.yaml mais próximo) exige SDK >= 3.13 e o
 *   arquivo não rebaixa a versão com `// @dart=`
 * - A classe tem exatamente um construtor generativo não-redirecionante
 *   (factories e construtores redirecionantes continuam no corpo)
 *
 * Não reporta (evita falsos positivos):
 * - mixin class, mixin application, extension type e classes que já usam
 *   primary constructor
 * - Classes sem construtor, com mais de um construtor generativo ou com
 *   construtor `external`
 * - Classes e construtores com anotações que podem gerar código
 *   (@JsonSerializable, @freezed, @RoutePage...), arquivos com `part` gerado
 *   (`x.g.dart`, `x.pb.dart`...), com cabeçalho de arquivo gerado ou `part of`
 *   de uma biblioteca com código gerado
 * - Construtor trivial (`Foo();`), que é equivalente ao construtor padrão
 * - Inicializadores de campo que citam nomes de parâmetros do construtor: com
 *   primary constructor eles passariam a enxergar o parâmetro (muda o valor)
 * - Situações que viram erro de compilação com primary constructor: campo
 *   inicializado na declaração e no construtor, atribuição a parâmetro no
 *   initializer list
 * - Construtor não-const em classe @immutable (Widgets, estados...) em que o
 *   lint prefer_const_constructors_in_immutables do Dart 3.13 pediria `const`
 *   indevidamente depois da conversão (o lint ignora o initializer list e os
 *   inicializadores de campo no primary constructor)
 * - Comentários que não teriam lugar na sugestão (depois do último parâmetro,
 *   entre `)` e `:`, dentro de parâmetro/campo, no fim da linha do construtor)
 *   e `// ignore:` acima do construtor
 * - Qualquer trecho que o parser não entenda com segurança
 *
 * A análise é feita sobre tokens: quebras de linha, indentação, CRLF e tabs
 * não mudam a decisão.
 *
 * Referência: https://dart.dev/language/primary-constructors
 */
const _types_1 = require("../../../types.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const lexer_1 = require("../../../dart/internal/lexer");
const syntax_1 = require("../../../dart/internal/syntax");
const pubspec_1 = require("../../../dart/internal/pubspec");
// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------
const MIN_LANGUAGE_MAJOR = 3;
const MIN_LANGUAGE_MINOR = 13;
const PAGE_WIDTH = 80;
const MAX_SNIPPET_ITEMS = 8;
/** Anotações de classe que não geram código nem dependem do construtor. */
const SAFE_CLASS_ANNOTATIONS = new Set([
  "immutable",
  "Deprecated",
  "deprecated",
  "visibleForTesting",
  "internal",
  "experimental",
  "sealed",
  "reopen",
  "pragma",
]);
/** Anotações de campo que podem acompanhar o campo até o parâmetro declarante. */
const SAFE_FIELD_ANNOTATIONS = new Set([
  "override",
  "Deprecated",
  "deprecated",
  "visibleForTesting",
  "protected",
  "internal",
]);
const GENERATED_SUFFIXES = [
  ".g.dart",
  ".freezed.dart",
  ".mocks.dart",
  ".gr.dart",
  ".gen.dart",
  ".config.dart",
  ".chopper.dart",
  ".mapper.dart",
  ".module.dart",
  ".graphql.dart",
  ".reflectable.dart",
  ".tailor.dart",
];
/** URI de `part` com extensão dupla (`x.g.dart`, `x.freezed.dart`, `x.pb.dart`...): código gerado. */
const GENERATED_PART_URI_RE = /^r?(['"])[^'"]*\.[A-Za-z0-9_]+\.dart\1$/;
/** Marcas de arquivo gerado no comentário de cabeçalho. */
const GENERATED_HEADER_RE =
  /\b(?:generated code|auto-?generated|do not (?:modify|edit)|@generated|generated by)\b/i;
const LANGUAGE_OVERRIDE_RE = /^\s*\/\/\s*@dart\s*=\s*(\d+)\.(\d+)\s*$/m;
/** Bases externas (Flutter e pacotes comuns) anotadas com @immutable. */
const IMMUTABLE_BASES = new Set([
  "Widget",
  "StatelessWidget",
  "StatefulWidget",
  "InheritedWidget",
  "InheritedModel",
  "InheritedNotifier",
  "InheritedTheme",
  "ProxyWidget",
  "ParentDataWidget",
  "RenderObjectWidget",
  "LeafRenderObjectWidget",
  "SingleChildRenderObjectWidget",
  "MultiChildRenderObjectWidget",
  "SlottedMultiChildRenderObjectWidget",
  "ImplicitlyAnimatedWidget",
  "AnimatedWidget",
  "FormField",
  "HookWidget",
  "StatefulHookWidget",
  "ConsumerWidget",
  "ConsumerStatefulWidget",
  "HookConsumerWidget",
  "Equatable",
  "Key",
  "LocalKey",
  "ValueKey",
  "ObjectKey",
  "Decoration",
  "ShapeBorder",
  "OutlinedBorder",
  "InputBorder",
  "TextStyle",
  "ThemeExtension",
  "Intent",
  "TextFormField",
  "RouteBase",
  "GoRoute",
]);
/** Bases externas cujo construtor sem nome é const (conferido na fonte do Flutter). */
const CONST_UNNAMED_CTOR_BASES = new Set([
  "Widget",
  "StatelessWidget",
  "StatefulWidget",
  "InheritedWidget",
  "InheritedModel",
  "InheritedNotifier",
  "InheritedTheme",
  "ProxyWidget",
  "ParentDataWidget",
  "RenderObjectWidget",
  "LeafRenderObjectWidget",
  "SingleChildRenderObjectWidget",
  "MultiChildRenderObjectWidget",
  "SlottedMultiChildRenderObjectWidget",
  "ImplicitlyAnimatedWidget",
  "AnimatedWidget",
  "FormField",
  "Equatable",
  "LocalKey",
  "ValueKey",
  "ObjectKey",
  "Decoration",
  "ShapeBorder",
  "OutlinedBorder",
  "InputBorder",
  "TextStyle",
  "ThemeExtension",
  "Intent",
]);
/** Bases externas cujo construtor sem nome não é const. */
const NON_CONST_UNNAMED_CTOR_BASES = new Set(["TextFormField", "GoRoute"]);
/** Bases externas conhecidas que não são @immutable. */
const MUTABLE_BASES = new Set([
  "Object",
  "ChangeNotifier",
  "ValueNotifier",
  "State",
  "Cubit",
  "Bloc",
  "Notifier",
  "AsyncNotifier",
  "StateNotifier",
  "GetxController",
  "Exception",
  "Error",
  "TextInputFormatter",
  "CustomPainter",
  "CustomClipper",
  "Listenable",
]);
const declsCache = new WeakMap();
function declsOf(lx) {
  let decls = declsCache.get(lx);
  if (decls === undefined) {
    decls = (0, syntax_1.scanTypeDeclarations)(lx);
    declsCache.set(lx, decls);
  }
  return decls;
}
function superclassName(decl) {
  const match = decl.clausesText.match(/\bextends\s+((?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*)/);
  if (!match) return null;
  const parts = match[1].split(".");
  return parts[parts.length - 1];
}
function lookupClass(name, lx, resolver) {
  const local = declsOf(lx).filter((d) => d.kind === "class" && d.name === name);
  if (local.length === 1) return { lx, decl: local[0] };
  if (local.length > 1) return null;
  return resolver?.find(name) ?? null;
}
/** A classe (ou alguma superclasse) é @immutable? Segue a mesma regra do analyzer. */
function immutability(lx, decl, resolver, depth = 0) {
  if (decl.annotations.some((a) => a.name === "immutable")) return "yes";
  const superName = superclassName(decl);
  if (superName === null) return "no";
  if (IMMUTABLE_BASES.has(superName)) return "yes";
  if (MUTABLE_BASES.has(superName)) return "no";
  if (depth >= 10) return "unknown";
  const found = lookupClass(superName, lx, resolver);
  if (found === null) return "unknown";
  return immutability(found.lx, found.decl, resolver, depth + 1);
}
/** Constância do construtor generativo `name` (null = sem nome) declarado em `decl`. */
function constructorConstness(lx, decl, name) {
  if (decl.hasPrimary && decl.primaryName === name) return decl.primaryIsConst ? "yes" : "no";
  if (decl.bodyOpenTok < 0) return !decl.hasPrimary && name === null ? "no" : "unknown";
  const body = (0, syntax_1.parseBody)(lx, decl);
  if (body === null) return "unknown";
  const ctors = body.members.filter((m) => m.kind === "constructor");
  const match = ctors.find((c) => !c.isFactory && (c.name === "new" ? null : c.name) === name);
  if (match) return match.isConst ? "yes" : "no";
  // Sem nenhum construtor declarado, vale o construtor padrão implícito (não é const).
  if (name === null && ctors.length === 0 && !decl.hasPrimary) return "no";
  return "unknown";
}
/** O construtor da superclasse chamado por `ctor` (explícito ou implícito) é const? */
function superConstructorConstness(lx, decl, ctor, resolver) {
  const call = ctor.initializers.find((e) => e.kind === "super");
  const rawName =
    call !== undefined && (0, lexer_1.isPunct)(lx.tokens[call.startTok + 1], ".")
      ? lx.tokens[call.startTok + 2].value
      : null;
  const ctorName = rawName === "new" ? null : rawName;
  const superName = superclassName(decl);
  if (superName === null) return ctorName === null ? "yes" : "unknown";
  if (ctorName === null && CONST_UNNAMED_CTOR_BASES.has(superName)) return "yes";
  if (ctorName === null && NON_CONST_UNNAMED_CTOR_BASES.has(superName)) return "no";
  const found = lookupClass(superName, lx, resolver);
  if (found === null) return "unknown";
  return constructorConstness(found.lx, found.decl, ctorName);
}
/** A própria classe declara um membro (campo, getter, método ou parâmetro declarante) com o nome? */
function declaresMember(lx, decl, name) {
  if (decl.primaryParamsOpenTok >= 0) {
    const close = (0, lexer_1.matchClose)(lx.tokens, decl.primaryParamsOpenTok);
    const params =
      close > 0 ? (0, syntax_1.parseParams)(lx, decl.primaryParamsOpenTok, close) : null;
    if (params?.some((p) => p.name === name && p.modifier !== null)) return true;
  }
  if (decl.bodyOpenTok < 0) return false;
  const body = (0, syntax_1.parseBody)(lx, decl);
  if (body === null) return false;
  return body.members.some((m) =>
    m.kind === "field"
      ? m.vars.some((v) => v.name === name)
      : m.kind === "method" && m.name === name
  );
}
/** O nome é um membro visível da classe ou de alguma superclasse? */
function memberVisibility(lx, decl, name, resolver, depth = 0) {
  if (declaresMember(lx, decl, name)) return "yes";
  const superName = superclassName(decl);
  if (superName === null) return "no";
  if (name === "key" && IMMUTABLE_BASES.has(superName) && superName.endsWith("Widget"))
    return "yes";
  if (depth >= 10) return "unknown";
  const found = lookupClass(superName, lx, resolver);
  if (found === null) return "unknown";
  return memberVisibility(found.lx, found.decl, name, resolver, depth + 1);
}
const CLASS_DECL_RE =
  /^[ \t]*(?:(?:abstract|base|final|interface|sealed|mixin)[ \t]+)*class[ \t]+(?:const[ \t]+)?([A-Za-z_$][\w$]*)/gm;
/** Índice (lazy) das classes declaradas em `lib/` do pacote. */
class PackageClassIndex {
  constructor(libDir) {
    this.libDir = libDir;
    this.names = null;
    this.lexedFiles = new Map();
  }
  find(name) {
    const files = this.index().get(name) ?? [];
    if (files.length !== 1) return null;
    const lx = this.lexFile(files[0]);
    if (lx === null) return null;
    const decls = declsOf(lx).filter((d) => d.kind === "class" && d.name === name);
    return decls.length === 1 ? { lx, decl: decls[0] } : null;
  }
  lexFile(file) {
    if (!this.lexedFiles.has(file)) {
      let lx = null;
      try {
        lx = (0, lexer_1.lex)(fs.readFileSync(file, "utf-8"));
      } catch {
        lx = null;
      }
      this.lexedFiles.set(file, lx);
    }
    return this.lexedFiles.get(file) ?? null;
  }
  index() {
    if (this.names) return this.names;
    const names = new Map();
    const visit = (dir) => {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          visit(full);
          continue;
        }
        if (!entry.name.endsWith(".dart")) continue;
        if (GENERATED_SUFFIXES.some((s) => entry.name.endsWith(s))) continue;
        let content;
        try {
          content = fs.readFileSync(full, "utf-8");
        } catch {
          continue;
        }
        for (const match of content.matchAll(CLASS_DECL_RE)) {
          const list = names.get(match[1]) ?? [];
          if (!list.includes(full)) list.push(full);
          names.set(match[1], list);
        }
      }
    };
    visit(this.libDir);
    this.names = names;
    return names;
  }
}
const resolverCache = new Map();
/** Resolver das classes do pacote do arquivo (pubspec.yaml mais próximo). */
function resolverFor(file) {
  const pubspec = (0, pubspec_1.findNearestPubspec)(file);
  if (!pubspec) return null;
  const libDir = path.join(path.dirname(pubspec), "lib");
  let resolver = resolverCache.get(libDir);
  if (resolver === undefined) {
    resolver = new PackageClassIndex(libDir);
    resolverCache.set(libDir, resolver);
  }
  return resolver;
}
function normalizeType(text) {
  return (text ?? "").replace(/\s+/g, "");
}
/**
 * Tipo dos tokens `[start, end]` para comparação: sem espaços e sem a vírgula
 * final do formato "tall" (`Function(\n  String url,\n)` = `Function(String url)`).
 */
function comparableType(lx, start, end, text) {
  return start >= 0 && end >= start
    ? normalizeType((0, lexer_1.joinTokens)(lx, start, end))
    : normalizeType(text);
}
/**
 * No Dart 3.13, o lint `prefer_const_constructors_in_immutables` pede `const` em
 * primary constructors de classes @immutable (Widgets, estados, entidades...)
 * sem avaliar os inicializadores de campo nem o initializer list — então pede
 * `const` até quando isso seria erro de compilação. Na forma clássica o lint
 * avalia tudo e não reporta. Nesse cenário (construtor não-const, sem mixin,
 * sem corpo, só campos final, hierarquia @immutable e construtor da superclasse
 * const) o plugin não sugere a conversão, para não gerar um aviso contraditório
 * no `flutter analyze`.
 */
function constLintWouldMisfire(lx, decl, ctor, fields, resolver) {
  if (/\bwith\b/.test(decl.clausesText) || hasBodyContent(lx, ctor)) return false;
  const instanceFields = fields.filter((f) => !f.modifiers.has("static"));
  if (!instanceFields.every((f) => f.modifiers.has("final"))) return false;
  if (immutability(lx, decl, resolver) === "no") return false;
  // O lint só reporta quando o construtor da superclasse chamado é const.
  return superConstructorConstness(lx, decl, ctor, resolver) !== "no";
}
function hasBodyContent(lx, ctor) {
  if (ctor.bodyOpenTok < 0) return false;
  if (ctor.bodyCloseTok > ctor.bodyOpenTok + 1) return true;
  return (0, lexer_1.hasCommentBetween)(
    lx,
    lx.tokens[ctor.bodyOpenTok].end,
    lx.tokens[ctor.bodyCloseTok].start
  );
}
/** Campo simples (uma variável, sem inicializador, sem late/static...) com o nome dado. */
function convertibleField(fields, name) {
  const field = fields.find((f) => f.vars.some((v) => v.name === name));
  if (field?.vars.length !== 1 || field.vars[0].initStartTok >= 0) return null;
  if (!field.typeText) return null;
  for (const mod of ["static", "late", "external", "covariant", "const", "abstract", "augment"]) {
    if (field.modifiers.has(mod)) return null;
  }
  if (field.annotations.some((a) => !SAFE_FIELD_ANNOTATIONS.has(a.name))) return null;
  return field;
}
/**
 * Analisa as classes/enums de um arquivo Dart (exportado para testes). Com
 * `file`, superclasses de outros arquivos do pacote também são resolvidas.
 */
function analyzePrimaryConstructors(source, file) {
  const lx = (0, lexer_1.lex)(source);
  const resolver = file ? resolverFor(file) : null;
  return declsOf(lx).map((decl) => analyzeDecl(lx, decl, resolver).report);
}
function analyzeDecl(lx, decl, resolver) {
  const { tokens } = lx;
  const classLine = (0, lexer_1.lineOf)(lx, tokens[decl.nameTok].start);
  const skip = (reason, line = classLine) => ({
    report: { name: decl.name, kind: decl.kind, line, status: "skip", reason, movedFields: [] },
    plan: null,
  });
  if (decl.isMixinApplication) return skip("mixin application");
  if (decl.modifiers.includes("mixin")) return skip("mixin class");
  if (decl.hasPrimary) return skip("já usa primary constructor");
  const unsafeAnnotation = decl.annotations.find((a) => !SAFE_CLASS_ANNOTATIONS.has(a.name));
  if (unsafeAnnotation) return skip(`anotação @${unsafeAnnotation.name} na classe`);
  if (decl.bodyOpenTok < 0) return skip("sem corpo");
  if (
    (0, lexer_1.hasCommentBetween)(lx, tokens[decl.nameTok].start, tokens[decl.bodyOpenTok].start)
  ) {
    return skip("comentário no cabeçalho da classe");
  }
  const body = (0, syntax_1.parseBody)(lx, decl);
  if (body === null) return skip("corpo da classe não reconhecido");
  const ctors = body.members.filter((m) => m.kind === "constructor");
  if (ctors.length === 0) return skip("sem construtor explícito");
  if (ctors.some((c) => c.isExternal)) return skip("construtor external");
  const roots = ctors.filter((c) => !c.isFactory && !c.isRedirecting);
  if (roots.length === 0) return skip("apenas factories ou construtores redirecionantes");
  if (roots.length > 1) return skip("mais de um construtor generativo não-redirecionante");
  const ctor = roots[0];
  const ctorLine = (0, lexer_1.lineOf)(lx, tokens[ctor.headTok].start);
  if (ctor.annotations.length > 0) return skip("construtor com anotação", ctorLine);
  if (ctor.params === null) return skip("parâmetros do construtor não reconhecidos", ctorLine);
  if (ctor.params.some((p) => p.modifier !== null)) {
    return skip("parâmetro com final/var/const", ctorLine);
  }
  if (ctor.initializers.some((e) => e.kind === "unknown")) {
    return skip("initializer list não reconhecida", ctorLine);
  }
  const isTrivial =
    decl.kind === "class" &&
    ctor.name === null &&
    !ctor.isConst &&
    ctor.params.length === 0 &&
    ctor.initializers.length === 0 &&
    !hasBodyContent(lx, ctor);
  if (isTrivial) return skip("construtor trivial (equivalente ao construtor padrão)", ctorLine);
  const paramNames = new Set(ctor.params.map((p) => p.name));
  for (const e of ctor.initializers) {
    if (
      (0, lexer_1.assignsAny)(
        tokens,
        e.kind === "field" ? e.exprStartTok : e.startTok,
        e.endTok,
        paramNames
      )
    ) {
      return skip("atribuição a parâmetro no initializer list", ctorLine);
    }
  }
  const fields = body.members.filter((m) => m.kind === "field");
  const initializedByCtor = new Set();
  for (const p of ctor.params) if (p.kind === "this") initializedByCtor.add(p.name);
  for (const e of ctor.initializers) if (e.fieldName) initializedByCtor.add(e.fieldName);
  for (const field of fields) {
    if (field.modifiers.has("static")) continue;
    for (const v of field.vars) {
      if (v.initStartTok < 0) continue;
      if (initializedByCtor.has(v.name)) {
        return skip(`campo ${v.name} inicializado na declaração e no construtor`, ctorLine);
      }
      if (
        !field.modifiers.has("late") &&
        (0, lexer_1.referencesAny)(tokens, v.initStartTok, v.initEndTok, paramNames)
      ) {
        return skip(`inicializador de ${v.name} cita um nome de parâmetro do construtor`, ctorLine);
      }
    }
  }
  if (
    !ctor.isConst &&
    decl.kind === "class" &&
    constLintWouldMisfire(lx, decl, ctor, fields, resolver)
  ) {
    return skip(
      "construtor não-const em classe @immutable (no Dart 3.13 o lint prefer_const_constructors_in_immutables pediria const indevidamente após a conversão)",
      ctorLine
    );
  }
  const plan = buildPlan(lx, decl, body, ctor, fields, resolver);
  if (plan === null) {
    return skip("comentário ou string multi-linha em trecho que seria movido", ctorLine);
  }
  return {
    report: {
      name: decl.name,
      kind: decl.kind,
      line: ctorLine,
      status: "flag",
      reason: "",
      movedFields: plan.movedFields.map((f) => f.vars[0].name),
    },
    plan,
  };
}
function commentLines(lx, comments) {
  const lines = [];
  for (const c of comments) {
    for (const line of lx.source.slice(c.start, c.end).split("\n")) lines.push(line.trim());
  }
  return lines;
}
function annotationsText(lx, annotations) {
  const parts = [];
  for (const a of annotations) {
    const text = (0, lexer_1.singleLine)(lx, a.startTok, a.endTok);
    if (text === null) return null;
    parts.push(text);
  }
  return parts.join(" ");
}
/** Comentário na mesma linha, logo após o fim do membro (ex.: `final int x; // ...`). */
function trailingComment(lx, endTok) {
  const end = lx.tokens[endTok].end;
  const comment = lx.comments.find((c) => c.start >= end && !lx.source.slice(end, c.start).trim());
  if (!comment || (0, lexer_1.lineOf)(lx, comment.start) !== (0, lexer_1.lineOf)(lx, end))
    return null;
  return comment;
}
/** Indentação (em espaços) da linha onde está o offset. */
function indentOf(lx, offset) {
  const lineStart = (0, lexer_1.lineStartOffset)(lx, offset);
  const line = lx.source.slice(lineStart, offset);
  return line.length - line.trimStart().length;
}
/** Texto de `{ ... }` com a indentação das linhas internas relativa ao membro. */
function relativeBlock(lx, open, close, baseIndent) {
  const lines = lx.source.slice(lx.tokens[open].start, lx.tokens[close].end).split("\n");
  return [
    lines[0],
    ...lines.slice(1).map((l) => l.slice(Math.min(l.length - l.trimStart().length, baseIndent))),
  ].join("\n");
}
function buildPlan(lx, decl, body, ctor, fields, resolver) {
  const { tokens } = lx;
  const params = ctor.params ?? [];
  const movedFields = [];
  const consumed = new Set();
  const rendered = [];
  /** Parâmetros renomeados para o nome do campo (ex.: `name` → `_name`). */
  const renames = new Map();
  const referencedElsewhere = (name, except) => {
    const names = new Set([name]);
    for (const e of ctor.initializers) {
      if (e !== except && (0, lexer_1.referencesAny)(tokens, e.startTok, e.endTok, names))
        return true;
    }
    return (
      ctor.bodyOpenTok >= 0 &&
      (0, lexer_1.referencesAny)(tokens, ctor.bodyOpenTok, ctor.bodyCloseTok, names)
    );
  };
  /** Comentários do construtor e dos campos movidos que a sugestão preserva. */
  const kept = new Set();
  let previousEnd = tokens[ctor.paramsOpenTok].end;
  for (const param of params) {
    const paramComments = (0, lexer_1.leadingComments)(lx, previousEnd, param.startTok);
    paramComments.forEach((c) => kept.add(c));
    const comments = commentLines(lx, paramComments);
    previousEnd = tokens[param.endTok].end;
    let field = null;
    let fieldName = param.name;
    let consumedInit = null;
    if (param.kind === "this" && !param.functionTyped && !param.isCovariant) {
      const candidate = convertibleField(fields, param.name);
      const sameType =
        candidate !== null &&
        (param.typeText === null ||
          comparableType(lx, param.typeStartTok, param.typeEndTok, param.typeText) ===
            comparableType(lx, candidate.typeStartTok, candidate.typeEndTok, candidate.typeText));
      if (candidate && sameType) field = candidate;
    } else if (
      param.kind === "plain" &&
      !param.functionTyped &&
      !param.isCovariant &&
      param.typeText
    ) {
      const uses = ctor.initializers.filter(
        (e) =>
          e.kind === "field" &&
          e.exprStartTok === e.endTok &&
          (0, lexer_1.isIdent)(tokens[e.endTok], param.name)
      );
      const init = uses.length === 1 ? uses[0] : null;
      const target = init?.fieldName ?? null;
      const namesMatch =
        target !== null &&
        (target === param.name || target === `_${param.name}` || `_${target}` === param.name);
      if (init && target && namesMatch && !referencedElsewhere(param.name, init)) {
        const candidate = convertibleField(fields, target);
        if (
          candidate &&
          comparableType(lx, param.typeStartTok, param.typeEndTok, param.typeText) ===
            comparableType(lx, candidate.typeStartTok, candidate.typeEndTok, candidate.typeText)
        ) {
          field = candidate;
          fieldName = target;
          consumedInit = init;
        }
      }
    }
    if (field) {
      const typeText = (0, lexer_1.typeTextOf)(lx, field.typeStartTok, field.typeEndTok);
      const defaultText =
        param.defaultStartTok >= 0
          ? (0, lexer_1.singleLine)(lx, param.defaultStartTok, param.endTok)
          : "";
      const fieldAnnotations = annotationsText(lx, field.annotations);
      const paramAnnotations = annotationsText(lx, param.annotations);
      if (typeText === null || defaultText === null) return null;
      if (fieldAnnotations === null || paramAnnotations === null) return null;
      movedFields.push(field);
      if (consumedInit) consumed.add(consumedInit);
      if (fieldName !== param.name) renames.set(param.name, fieldName);
      const fieldComments = (0, lexer_1.leadingComments)(
        lx,
        memberCommentStart(lx, body, field, decl),
        field.startTok
      );
      const trailing = trailingComment(lx, field.endTok);
      if (
        (0, lexer_1.hasCommentBetween)(lx, tokens[field.startTok].start, tokens[field.endTok].end)
      ) {
        return null; // comentário dentro da declaração do campo não teria lugar
      }
      const annotationPrefix = [fieldAnnotations, paramAnnotations].filter(Boolean).join(" ");
      const prefix =
        `${annotationPrefix ? `${annotationPrefix} ` : ""}${param.isRequired ? "required " : ""}` +
        `${field.modifiers.has("final") ? "final" : "var"}`;
      rendered.push({
        section: param.section,
        comments: [...comments, ...commentLines(lx, fieldComments)],
        trailing: trailing ? lx.source.slice(trailing.start, trailing.end) : null,
        text: `${prefix} ${typeText} ${fieldName}${defaultText ? ` = ${defaultText}` : ""}`,
        layout: {
          prefix,
          typeText,
          typeStartTok: field.typeStartTok,
          typeEndTok: field.typeEndTok,
          name: fieldName,
          defaultStartTok: param.defaultStartTok,
          defaultEndTok: param.endTok,
        },
      });
      continue;
    }
    const text = (0, lexer_1.singleLine)(lx, param.startTok, param.endTok);
    if (text === null) return null;
    const layout = plainParamLayout(lx, param);
    const defaultText =
      layout && layout.defaultStartTok >= 0
        ? (0, lexer_1.singleLine)(lx, layout.defaultStartTok, layout.defaultEndTok)
        : "";
    rendered.push({
      section: param.section,
      comments,
      trailing: null,
      // parâmetro comum tipado: tipo no formato canônico
      text:
        layout && defaultText !== null
          ? `${layout.prefix ? `${layout.prefix} ` : ""}${layout.typeText} ${layout.name}` +
            `${defaultText ? ` = ${defaultText}` : ""}`
          : text,
      layout,
    });
  }
  const remainingInitializers = ctor.initializers.filter((e) => !consumed.has(e));
  const initTexts = [];
  for (const e of remainingInitializers) {
    const text = (0, lexer_1.singleLine)(lx, e.startTok, e.endTok);
    if (text === null) return null;
    initTexts.push(text);
  }
  // Referências `[nome]` nos comentários passam a apontar para o nome novo do
  // parâmetro renomeado (senão o lint comment_references reclama).
  const renameDocRefs = (line) => {
    let result = line;
    for (const [from, to] of renames) result = result.split(`[${from}]`).join(`[${to}]`);
    return result;
  };
  for (const r of rendered) r.comments = r.comments.map(renameDocRefs);
  const ctorLeading = (0, lexer_1.leadingComments)(
    lx,
    memberCommentStart(lx, body, ctor, decl),
    ctor.startTok
  );
  let ctorComments = commentLines(lx, ctorLeading).map(renameDocRefs);
  // `// ignore:` vale para a linha seguinte: no bloco `this` não cobriria mais
  // o diagnóstico, que passaria a ser reportado nos parâmetros do cabeçalho.
  if (ctorComments.some((line) => /^\/\/\s*ignore\s*:/.test(line))) return null;
  // Comentário no fim da linha do construtor não tem lugar na sugestão.
  if (trailingComment(lx, ctor.endTok)) return null;
  // Todo comentário dentro do construtor precisa ter destino na sugestão:
  // antes de um parâmetro (vai junto) ou no corpo (copiado). Senão, não reporta.
  if (ctor.bodyOpenTok >= 0) {
    const bodyStart = tokens[ctor.bodyOpenTok].start;
    const bodyEnd = tokens[ctor.bodyCloseTok].end;
    lx.comments.forEach((c) => c.start >= bodyStart && c.end <= bodyEnd && kept.add(c));
  }
  const ctorStart = tokens[ctor.startTok].start;
  const ctorEnd = tokens[ctor.endTok].end;
  if (lx.comments.some((c) => c.start >= ctorStart && c.end <= ctorEnd && !kept.has(c))) {
    return null;
  }
  // No bloco `this`, `[p]` de um parâmetro super só resolve se a hierarquia
  // tiver um membro visível `p` (ex.: `message` da falha base). Caso contrário
  // vira `p` em código, para não gerar comment_references.
  for (const param of params) {
    if (param.kind !== "super") continue;
    const ref = `[${param.name}]`;
    if (!ctorComments.some((line) => line.includes(ref))) continue;
    if (memberVisibility(lx, decl, param.name, resolver) === "yes") continue;
    ctorComments = ctorComments.map((line) => line.split(ref).join(`\`${param.name}\``));
  }
  let bodyText = null;
  if (hasBodyContent(lx, ctor)) {
    if ((0, lexer_1.hasMultilineString)(lx, ctor.bodyOpenTok, ctor.bodyCloseTok)) return null;
    bodyText = relativeBlock(
      lx,
      ctor.bodyOpenTok,
      ctor.bodyCloseTok,
      indentOf(lx, tokens[ctor.headTok].start)
    );
  }
  let thisPart = null;
  if (ctorComments.length > 0 || initTexts.length > 0 || bodyText !== null) {
    const closing = bodyText !== null ? ` ${bodyText}` : ";";
    const ending = bodyText !== null ? " {" : ";";
    const inline = initTexts.length > 0 ? `this : ${initTexts.join(", ")}` : "this";
    if (`  ${inline}${ending}`.length <= PAGE_WIDTH) {
      thisPart = [...ctorComments, `${inline}${closing}`];
    } else {
      // Como o `dart format`: `this` sozinho, cada item do initializer list a
      // partir da coluna 6 e, se não couber, a chamada com um argumento por linha.
      const initLines = [];
      remainingInitializers.forEach((e, i) => {
        const isLast = i === remainingInitializers.length - 1;
        const lead = i === 0 ? "  : " : "    ";
        const end = isLast ? "" : ",";
        const line = `${lead}${initTexts[i]}${end}`;
        const call =
          `  ${line}${isLast ? ending : ""}`.length > PAGE_WIDTH ? splitCall(lx, e) : null;
        if (call === null) {
          initLines.push(line);
          return;
        }
        initLines.push(
          `${lead}${call.open}`,
          ...call.args.map((a) => `      ${a},`),
          `    ${call.close}${end}`
        );
      });
      initLines[initLines.length - 1] += closing;
      thisPart = [...ctorComments, "this", ...initLines];
    }
  }
  if (/['"]/.test(decl.typeParamsText)) return null;
  // Anotações da classe ficam como estão no código (a conversão não as altera).
  const annotationLines = [];
  for (const a of decl.annotations) {
    // anotação de topo: primeira linha sem indentação, as demais relativas a ela
    const column =
      tokens[a.startTok].start - (0, lexer_1.lineStartOffset)(lx, tokens[a.startTok].start);
    const [first, ...rest] = lx.source
      .slice(tokens[a.startTok].start, tokens[a.endTok].end)
      .split("\n");
    const relative = rest.map((l) => l.slice(Math.min(column, l.length - l.trimStart().length)));
    annotationLines.push(...[first, ...relative].map((l) => l.replace(/\s+$/, "")));
  }
  const clauses = splitClauses(lx, decl);
  if (clauses === null) return null;
  const removed = new Set([ctor, ...movedFields]);
  const emptyBody =
    decl.kind === "class" && thisPart === null && body.members.every((m) => removed.has(m));
  const modifiersText = decl.modifiers.length > 0 ? `${decl.modifiers.join(" ")} ` : "";
  const constText = ctor.isConst && decl.kind === "class" ? "const " : "";
  const ctorNameText = ctor.name !== null ? `.${ctor.name}` : "";
  let typeParams = "";
  if ((0, lexer_1.isPunct)(tokens[decl.nameTok + 1], "<")) {
    const close = (0, lexer_1.matchTypeArgs)(tokens, decl.nameTok + 1, tokens.length);
    if (close < 0) return null;
    typeParams = (0, lexer_1.joinTokens)(lx, decl.nameTok + 1, close);
  }
  return {
    lx,
    decl,
    body,
    ctor,
    params: rendered,
    movedFields,
    thisPart,
    annotationLines,
    headerPrefix: `${modifiersText}${decl.kind} ${constText}${decl.name}${typeParams}${ctorNameText}`,
    clauses,
    emptyBody,
  };
}
/** Partes de um parâmetro comum tipado (`required String nome = ''`), para quebra de linha. */
function plainParamLayout(lx, param) {
  if (param.kind !== "plain" || param.functionTyped || param.typeStartTok < 0) return null;
  const typeText = (0, lexer_1.typeTextOf)(lx, param.typeStartTok, param.typeEndTok);
  const prefix =
    param.typeStartTok > param.startTok
      ? (0, lexer_1.singleLine)(lx, param.startTok, param.typeStartTok - 1)
      : "";
  if (typeText === null || prefix === null) return null;
  return {
    prefix,
    typeText,
    typeStartTok: param.typeStartTok,
    typeEndTok: param.typeEndTok,
    name: param.name,
    defaultStartTok: param.defaultStartTok,
    defaultEndTok: param.endTok,
  };
}
/** Cláusulas `extends`/`with`/`implements` do cabeçalho, uma string por cláusula. */
function splitClauses(lx, decl) {
  const { tokens } = lx;
  const start = clausesStartTok(lx, decl);
  const bodyTok = decl.bodyOpenTok >= 0 ? decl.bodyOpenTok : decl.endTok;
  if (start <= 0 || start > bodyTok) return null;
  const clauses = [];
  let clauseStart = start;
  let depth = 0;
  for (let k = start; k < bodyTok; k++) {
    const t = tokens[k];
    if (t.kind === "punct" && (t.value === "<" || t.value === "(")) depth++;
    if (t.kind === "punct" && (t.value === ">" || t.value === ")")) depth--;
    const isKeyword =
      depth === 0 && (0, lexer_1.isIdent)(t) && ["extends", "with", "implements"].includes(t.value);
    if (isKeyword && k > clauseStart) {
      clauses.push((0, lexer_1.joinTokens)(lx, clauseStart, k - 1));
      clauseStart = k;
    }
  }
  if (bodyTok > clauseStart) clauses.push((0, lexer_1.joinTokens)(lx, clauseStart, bodyTok - 1));
  return clauses;
}
/** Tokens depois dos quais `[`/`{` abre um literal (e não uma indexação ou um bloco). */
const LITERAL_PREDECESSORS = new Set(["=", ">", "(", ",", ":"]);
/**
 * Chamada ou literal no fim de uma expressão (`assert(...)`, `super(...)`,
 * `_x = Foo(...)`, `const [...]`, `const {...}`) separado em abertura, itens e
 * fechamento, para a quebra "um item por linha" do `dart format`.
 */
function splitCall(lx, range) {
  const { tokens } = lx;
  const { startTok, endTok } = range;
  const last = tokens[endTok];
  if (
    !(0, lexer_1.isPunct)(last, ")") &&
    !(0, lexer_1.isPunct)(last, "]") &&
    !(0, lexer_1.isPunct)(last, "}")
  )
    return null;
  const open = (0, lexer_1.matchOpenBackward)(tokens, endTok, startTok);
  if (open < startTok) return null;
  const before = open > startTok ? tokens[open - 1] : undefined;
  if ((0, lexer_1.isPunct)(last, ")")) {
    // chamada: precisa do nome (ou dos argumentos de tipo) antes do `(`
    if (!before || (!(0, lexer_1.isIdent)(before) && !(0, lexer_1.isPunct)(before, ">")))
      return null;
  } else if (before && !(0, lexer_1.isIdent)(before, "const")) {
    if (before.kind !== "punct" || !LITERAL_PREDECESSORS.has(before.value)) return null;
  }
  const openText = (0, lexer_1.singleLine)(lx, startTok, open);
  if (openText === null) return null;
  const args = [];
  for (const [a, b] of (0, lexer_1.splitTopLevelCommas)(tokens, open + 1, endTok - 1)) {
    const text = (0, lexer_1.singleLine)(lx, a, b);
    if (text === null) return null;
    args.push(text);
  }
  return args.length > 0 ? { open: openText, args, close: last.value } : null;
}
/** Offset a partir do qual os comentários pertencem ao membro (fim do membro anterior). */
function memberCommentStart(lx, body, member, decl) {
  const index = body.members.indexOf(member);
  if (index > 0) return lx.tokens[body.members[index - 1].endTok].end;
  if (body.entriesEndTok >= 0) return lx.tokens[body.entriesEndTok].end;
  return lx.tokens[decl.bodyOpenTok].end;
}
// ---------------------------------------------------------------------------
// Renderização (formato do `dart format`)
// ---------------------------------------------------------------------------
function paramSections(plan) {
  const positional = plan.params.filter((p) => p.section === "positional");
  const grouped = plan.params.filter((p) => p.section !== "positional");
  const groupOpen = grouped.length > 0 && grouped[0].section === "optional" ? "[" : "{";
  const groupClose = groupOpen === "[" ? "]" : "}";
  return { positional, grouped, groupOpen, groupClose };
}
/** Lista de parâmetros em uma linha, ou null quando algum parâmetro tem comentário. */
function inlineParamList(plan) {
  if (plan.params.some((p) => p.comments.length > 0 || p.trailing !== null)) return null;
  const { positional, grouped, groupOpen, groupClose } = paramSections(plan);
  const pos = positional.map((p) => p.text).join(", ");
  const group =
    grouped.length > 0 ? `${groupOpen}${grouped.map((p) => p.text).join(", ")}${groupClose}` : "";
  return `(${[pos, group].filter(Boolean).join(", ")})`;
}
/** Lista de parâmetros "tall" (um por linha), como o `dart format`. */
function tallParamList(plan) {
  const { positional, grouped, groupOpen, groupClose } = paramSections(plan);
  const out = [grouped.length > 0 && positional.length === 0 ? `(${groupOpen}` : "("];
  // Linha em branco antes de parâmetro comentado, exceto o primeiro da lista
  // (inclusive logo após `, {` / `, [`, onde o formatter a mantém).
  const pushParam = (p, isFirst, suffix) => {
    if (p.comments.length > 0 && !isFirst) out.push("");
    for (const c of p.comments) out.push(`  ${c}`);
    out.push(...paramLines(plan.lx, p, suffix));
  };
  positional.forEach((p, i) => {
    const opensGroup = i === positional.length - 1 && grouped.length > 0;
    pushParam(p, i === 0, opensGroup ? `, ${groupOpen}` : ",");
  });
  grouped.forEach((p, i) => pushParam(p, i === 0 && positional.length === 0, ","));
  out.push(`${grouped.length > 0 ? groupClose : ""})`);
  return out;
}
/**
 * Linhas de um parâmetro da lista "tall". Se `  parâmetro,` passa de 80 colunas,
 * quebra como o `dart format`: depois do `=` (ou nos argumentos, se o valor
 * padrão é uma chamada), entre o tipo e o nome, ou na lista de um tipo função.
 */
function paramLines(lx, p, suffix) {
  const line = `  ${p.text}${suffix}${p.trailing ? ` ${p.trailing}` : ""}`;
  const layout = p.layout;
  if (line.length <= PAGE_WIDTH || layout === null || p.trailing !== null) return [line];
  const head = layout.prefix ? `${layout.prefix} ${layout.typeText}` : layout.typeText;
  if (layout.defaultStartTok >= 0) {
    const value = (0, lexer_1.singleLine)(lx, layout.defaultStartTok, layout.defaultEndTok);
    if (value === null) return [line];
    const call = splitCall(lx, { startTok: layout.defaultStartTok, endTok: layout.defaultEndTok });
    const open = call ? `  ${head} ${layout.name} = ${call.open}` : "";
    if (call && open.length <= PAGE_WIDTH) {
      return [open, ...call.args.map((a) => `    ${a},`), `  ${call.close}${suffix}`];
    }
    return [`  ${head} ${layout.name} =`, `      ${value}${suffix}`];
  }
  const nameLine = `  ${layout.name}${suffix}`;
  if (`  ${head}`.length <= PAGE_WIDTH) return [`  ${head}`, nameLine];
  const fn = splitFunctionType(lx, layout);
  if (fn === null) return [line];
  return [`  ${fn.open}`, ...fn.lines, `  ${fn.close}`, nameLine];
}
/**
 * Tipo função (`void Function(A a, {B b})?`) quebrado como o `dart format`:
 * abertura, um parâmetro por linha (grupo `{`/`[` aberto na linha do último
 * posicional) e fechamento. Linhas relativas ao início do parâmetro.
 */
function splitFunctionType(lx, layout) {
  const { tokens } = lx;
  let fnTok = -1;
  let depth = 0;
  for (let k = layout.typeStartTok; k <= layout.typeEndTok; k++) {
    const t = tokens[k];
    if (t.kind === "punct" && (t.value === "<" || t.value === "(")) depth++;
    if (t.kind === "punct" && (t.value === ">" || t.value === ")")) depth--;
    if (
      depth === 0 &&
      (0, lexer_1.isIdent)(t, "Function") &&
      (0, lexer_1.isPunct)(tokens[k + 1], "(")
    )
      fnTok = k;
  }
  if (fnTok < 0) return null;
  const close = (0, lexer_1.matchClose)(tokens, fnTok + 1);
  if (close < 0 || close > layout.typeEndTok) return null;
  const typeOpen = (0, lexer_1.typeTextOf)(lx, layout.typeStartTok, fnTok + 1);
  const tail =
    close < layout.typeEndTok ? (0, lexer_1.typeTextOf)(lx, close + 1, layout.typeEndTok) : "";
  if (typeOpen === null || tail === null) return null;
  const chunks = (0, lexer_1.splitTopLevelCommas)(tokens, fnTok + 2, close - 1);
  let group = null;
  const lastChunk = chunks[chunks.length - 1];
  if (
    lastChunk &&
    ((0, lexer_1.isPunct)(tokens[lastChunk[0]], "{") ||
      (0, lexer_1.isPunct)(tokens[lastChunk[0]], "["))
  ) {
    const groupClose = (0, lexer_1.matchClose)(tokens, lastChunk[0]);
    if (groupClose !== lastChunk[1]) return null;
    const items = [];
    for (const [a, b] of (0, lexer_1.splitTopLevelCommas)(
      tokens,
      lastChunk[0] + 1,
      groupClose - 1
    )) {
      const text = (0, lexer_1.typeTextOf)(lx, a, b);
      if (text === null) return null;
      items.push(text);
    }
    group = { open: tokens[lastChunk[0]].value, close: tokens[groupClose].value, items };
    chunks.pop();
  }
  const positional = [];
  for (const [a, b] of chunks) {
    const text = (0, lexer_1.typeTextOf)(lx, a, b);
    if (text === null) return null;
    positional.push(text);
  }
  if (positional.length === 0 && (group === null || group.items.length === 0)) return null;
  const lines = positional.map(
    (text, i) => `    ${text}${i === positional.length - 1 && group ? `, ${group.open}` : ","}`
  );
  if (group) lines.push(...group.items.map((item) => `    ${item},`));
  const opener = group && positional.length === 0 ? group.open : "";
  return {
    open: `${layout.prefix ? `${layout.prefix} ` : ""}${typeOpen}${opener}`,
    lines,
    close: `${group ? group.close : ""})${tail}`,
  };
}
/**
 * Cabeçalho do primary constructor (sem o `{`/`;` final), com as quebras do
 * `dart format`: tudo em uma linha; senão parâmetros em uma linha e cláusulas
 * nas linhas seguintes (+4); senão parâmetros um por linha, com a primeira
 * cláusula na linha do `})` e as demais nas linhas seguintes.
 */
function renderHeader(plan) {
  const ending = plan.emptyBody ? ";" : " {";
  const { clauses } = plan;
  const oneLineClauses = clauses.length > 0 ? ` ${clauses.join(" ")}` : "";
  const fits = (text) => text.length <= PAGE_WIDTH;
  const clauseLines = clauses.map((c) => `    ${c}`);
  const clauseLinesFit = clauseLines.every((l, i) =>
    fits(i === clauseLines.length - 1 ? `${l}${ending}` : l)
  );
  const inline = plan.params.length === 0 ? "()" : inlineParamList(plan);
  if (inline !== null) {
    const head = `${plan.headerPrefix}${inline}`;
    if (fits(`${head}${oneLineClauses}${ending}`)) return `${head}${oneLineClauses}`;
    if (clauses.length > 0 && fits(head) && (clauseLinesFit || plan.params.length === 0)) {
      return [head, ...clauseLines].join("\n");
    }
    if (plan.params.length === 0) return `${head}${oneLineClauses}`;
  }
  const lines = tallParamList(plan);
  lines[0] = `${plan.headerPrefix}${lines[0]}`;
  const closeLine = lines[lines.length - 1];
  if (fits(`${closeLine}${oneLineClauses}${ending}`) || clauses.length <= 1) {
    lines[lines.length - 1] = `${closeLine}${oneLineClauses}`;
  } else {
    lines[lines.length - 1] = `${closeLine} ${clauses[0]}`;
    lines.push(...clauseLines.slice(1));
  }
  return lines.join("\n");
}
function renderThisPart(plan, indent) {
  if (plan.thisPart === null) return [];
  return plan.thisPart.map((entry) =>
    entry
      .split("\n")
      .map((line) => (line ? `${indent}${line}` : line))
      .join("\n")
  );
}
// ---------------------------------------------------------------------------
// Snippets da mensagem
// ---------------------------------------------------------------------------
/** Linhas do código original entre dois offsets (sem cortar linhas que só contêm o trecho). */
function sourceLines(lx, fromOffset, toOffset) {
  const s = lx.source;
  const lineStart = (0, lexer_1.lineStartOffset)(lx, fromOffset);
  const start = s.slice(lineStart, fromOffset).trim() ? fromOffset : lineStart;
  const nl = s.indexOf("\n", toOffset);
  const lineEnd = nl < 0 ? s.length : nl;
  const end =
    s.slice(toOffset, lineEnd).trim() && !s.slice(toOffset, lineEnd).trim().startsWith("//")
      ? toOffset
      : lineEnd;
  const text = s.slice(start, end);
  return (start === lineStart ? text : `  ${text}`).split("\n");
}
function memberLines(lx, body, member, decl) {
  const comments = (0, lexer_1.leadingComments)(
    lx,
    memberCommentStart(lx, body, member, decl),
    member.startTok
  );
  const from = comments.length > 0 ? comments[0].start : lx.tokens[member.startTok].start;
  return sourceLines(lx, from, lx.tokens[member.endTok].end);
}
function buildWrongSnippet(lx, plan) {
  const { decl, ctor, body } = plan;
  const headerStart = lx.tokens[decl.firstTok].start;
  const headerEnd = lx.tokens[decl.bodyOpenTok].end;
  const lines = lx.source
    .slice((0, lexer_1.lineStartOffset)(lx, headerStart), headerEnd)
    .split("\n");
  if (decl.kind === "enum" && body.entriesEndTok >= 0) lines.push("  // ...valores do enum", "");
  lines.push(...memberLines(lx, body, ctor, decl));
  const shown = plan.movedFields.slice(0, MAX_SNIPPET_ITEMS);
  for (const field of shown) lines.push("", ...memberLines(lx, body, field, decl));
  if (plan.movedFields.length > shown.length) {
    lines.push("", `  // ... +${plan.movedFields.length - shown.length} campo(s)`);
  }
  const removed = new Set([ctor, ...plan.movedFields]);
  if (body.members.some((m) => !removed.has(m))) lines.push("", "  // ...");
  lines.push("}");
  // arquivos CRLF: o `\r` não vai para a mensagem
  return lines.join("\n").replace(/\r/g, "");
}
function buildCorrectSnippet(plan) {
  const header = renderHeader(plan);
  if (plan.emptyBody) return [...plan.annotationLines, `${header};`].join("\n");
  const removed = new Set([plan.ctor, ...plan.movedFields]);
  const hasOtherMembers = plan.body.members.some((m) => !removed.has(m));
  const lines = [...plan.annotationLines, `${header} {`];
  if (plan.decl.kind === "enum" && plan.body.entriesEndTok >= 0) {
    lines.push("  // ...valores do enum (sem alteração)");
    if (plan.thisPart !== null || hasOtherMembers) lines.push("");
  }
  lines.push(...renderThisPart(plan, "  "));
  if (hasOtherMembers) {
    if (plan.thisPart !== null) lines.push("");
    lines.push("  // ... demais membros sem alteração");
  }
  lines.push("}");
  // arquivos CRLF: o `\r` não vai para a mensagem
  return lines.join("\n").replace(/\r/g, "");
}
/** Intervalo a remover de um membro: linhas inteiras quando o membro ocupa a linha sozinho. */
function removalRange(lx, body, member, decl) {
  const s = lx.source;
  const comments = (0, lexer_1.leadingComments)(
    lx,
    memberCommentStart(lx, body, member, decl),
    member.startTok
  );
  let start = comments.length > 0 ? comments[0].start : lx.tokens[member.startTok].start;
  let end = lx.tokens[member.endTok].end;
  const trailing = trailingComment(lx, member.endTok);
  if (trailing) end = trailing.end;
  const lineStart = (0, lexer_1.lineStartOffset)(lx, start);
  if (!s.slice(lineStart, start).trim()) start = lineStart;
  const nl = s.indexOf("\n", end);
  if (nl >= 0 && !s.slice(end, nl).trim()) {
    end = nl + 1;
    const nextNl = s.indexOf("\n", end);
    if (nextNl >= 0 && !s.slice(end, nextNl).trim()) end = nextNl + 1;
  }
  return { start, end, text: "" };
}
/** Trechos "errado"/"correto" que o plugin publicaria para cada classe (exportado para testes). */
function suggestPrimaryConstructors(source, file) {
  const lx = (0, lexer_1.lex)(source);
  const resolver = file ? resolverFor(file) : null;
  const suggestions = [];
  for (const decl of declsOf(lx)) {
    const { report, plan } = analyzeDecl(lx, decl, resolver);
    if (plan === null) continue;
    suggestions.push({
      name: report.name,
      line: report.line,
      wrong: buildWrongSnippet(lx, plan),
      correct: buildCorrectSnippet(plan),
      hasCtorBody: hasBodyContent(lx, plan.ctor),
    });
  }
  return suggestions;
}
/** Aplica todas as conversões seguras do arquivo (exportado para testes). */
function convertToPrimaryConstructors(source, file) {
  const lx = (0, lexer_1.lex)(source);
  const { tokens } = lx;
  const resolver = file ? resolverFor(file) : null;
  const edits = [];
  for (const decl of declsOf(lx)) {
    const { plan } = analyzeDecl(lx, decl, resolver);
    if (plan === null) continue;
    const headerStart = tokens[decl.keywordTok - decl.modifiers.length].start;
    const header = renderHeader(plan);
    if (plan.emptyBody) {
      edits.push({ start: headerStart, end: tokens[decl.endTok].end, text: `${header};` });
      continue;
    }
    edits.push({ start: headerStart, end: tokens[decl.bodyOpenTok].start, text: `${header} ` });
    if (plan.thisPart !== null) {
      const insertAt =
        decl.kind === "enum" && plan.body.entriesEndTok >= 0
          ? tokens[plan.body.entriesEndTok].end
          : tokens[decl.bodyOpenTok].end;
      edits.push({
        start: insertAt,
        end: insertAt,
        text: `\n\n${renderThisPart(plan, "  ").join("\n")}\n`,
      });
    }
    for (const member of [plan.ctor, ...plan.movedFields]) {
      edits.push(removalRange(lx, plan.body, member, decl));
    }
  }
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = source;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}
/**
 * Filtro barato antes de tokenizar: algum `class`/`enum` com `const` ou com `(`
 * antes do `{`/`;` do cabeçalho. Pode dar falso "talvez" (a tokenização decide),
 * nunca falso "não" — senão os plugins que usam os helpers voltariam a errar.
 */
const PRIMARY_HEADER_HINT_RE = /\b(?:class|enum)\s+const\b|\b(?:class|enum)\s[^{;]*\(/;
function primaryDeclsOf(lx) {
  return declsOf(lx).filter((d) => d.hasPrimary && !d.isMixinApplication);
}
/** Primeiro token depois do nome, dos parâmetros de tipo e da lista do primary constructor. */
function clausesStartTok(lx, decl) {
  if (decl.primaryParamsOpenTok >= 0)
    return (0, lexer_1.matchClose)(lx.tokens, decl.primaryParamsOpenTok) + 1;
  const afterName = decl.nameTok + 1;
  if (!(0, lexer_1.isPunct)(lx.tokens[afterName], "<")) return afterName;
  return (0, lexer_1.matchTypeArgs)(lx.tokens, afterName, lx.tokens.length) + 1;
}
/** Cabeçalho clássico equivalente: `final class Foo<T> extends Bar implements Baz {`. */
function classicHeader(lx, decl) {
  const { tokens } = lx;
  let text = [...decl.modifiers, decl.kind, decl.name].join(" ");
  if ((0, lexer_1.isPunct)(tokens[decl.nameTok + 1], "<")) {
    const close = (0, lexer_1.matchTypeArgs)(tokens, decl.nameTok + 1, tokens.length);
    if (close < 0) return null;
    text += (0, lexer_1.joinTokens)(lx, decl.nameTok + 1, close);
  }
  const bodyTok = decl.bodyOpenTok >= 0 ? decl.bodyOpenTok : decl.endTok;
  const clausesStart = clausesStartTok(lx, decl);
  if (clausesStart <= 0 || clausesStart > bodyTok) return null;
  if (clausesStart < bodyTok) text += ` ${(0, lexer_1.joinTokens)(lx, clausesStart, bodyTok - 1)}`;
  return `${text} ${decl.bodyOpenTok >= 0 ? "{" : "{}"}`;
}
/** Linhas `///` imediatamente acima do parâmetro (como o `///` acima de um campo). */
function docLinesBefore(lx, comments) {
  const lines = commentLines(lx, comments);
  let first = lines.length;
  while (first > 0 && lines[first - 1].startsWith("///")) first--;
  return lines.slice(first);
}
function declaringFields(lx, decl) {
  const { tokens } = lx;
  if (decl.primaryParamsOpenTok < 0) return [];
  const close = (0, lexer_1.matchClose)(tokens, decl.primaryParamsOpenTok);
  const params = close < 0 ? null : (0, syntax_1.parseParams)(lx, decl.primaryParamsOpenTok, close);
  if (params === null) return [];
  const fields = [];
  let previousEnd = tokens[decl.primaryParamsOpenTok].end;
  for (const param of params) {
    const comments = (0, lexer_1.leadingComments)(lx, previousEnd, param.startTok);
    previousEnd = tokens[param.endTok].end;
    if (param.kind !== "plain" || (param.modifier !== "final" && param.modifier !== "var")) {
      continue;
    }
    fields.push({
      name: param.name,
      type:
        param.typeStartTok >= 0
          ? (0, lexer_1.joinTokens)(lx, param.typeStartTok, param.typeEndTok)
          : "",
      isFinal: param.modifier === "final",
      lineIndex: (0, lexer_1.lineOf)(lx, tokens[param.nameTok].start) - 1,
      text: (0, lexer_1.joinTokens)(lx, param.startTok, param.endTok),
      docLines: docLinesBefore(lx, comments),
    });
  }
  return fields;
}
/**
 * Classes e enums com primary constructor, com os parâmetros declarantes (que
 * também são campos da classe). Vazio quando o arquivo não usa o recurso.
 */
function findPrimaryConstructors(source) {
  if (!PRIMARY_HEADER_HINT_RE.test(source)) return [];
  try {
    const lx = (0, lexer_1.lex)(source);
    return primaryDeclsOf(lx).map((decl) => ({
      name: decl.name,
      kind: decl.kind,
      lineIndex:
        (0, lexer_1.lineOf)(lx, lx.tokens[decl.keywordTok - decl.modifiers.length].start) - 1,
      fields: declaringFields(lx, decl),
    }));
  } catch {
    return [];
  }
}
/** Campos do cabeçalho de cada classe, indexados pela linha (base 0) onde o cabeçalho começa. */
function primaryConstructorFieldsByLine(source) {
  return new Map(findPrimaryConstructors(source).map((d) => [d.lineIndex, d.fields]));
}
/**
 * Reescreve cada cabeçalho com primary constructor como o cabeçalho clássico
 * equivalente (`final class Foo extends Bar implements Baz {`), na linha da
 * palavra-chave `class`/`enum`, e deixa em branco as demais linhas do
 * cabeçalho: o corpo mantém a mesma numeração de linhas. Os parâmetros
 * declarantes somem do texto; use `findPrimaryConstructors` para obtê-los.
 * Sem primary constructor, devolve o texto original.
 */
function normalizePrimaryConstructorHeaders(source) {
  if (!PRIMARY_HEADER_HINT_RE.test(source)) return source;
  try {
    const lx = (0, lexer_1.lex)(source);
    let out = "";
    let cursor = 0;
    for (const decl of primaryDeclsOf(lx)) {
      const header = classicHeader(lx, decl);
      if (header === null) continue;
      const start = lx.tokens[decl.keywordTok - decl.modifiers.length].start;
      const end = lx.tokens[decl.bodyOpenTok >= 0 ? decl.bodyOpenTok : decl.endTok].end;
      const newlines = source.slice(start, end).split("\n").length - 1;
      out += source.slice(cursor, start) + header + "\n".repeat(newlines);
      cursor = end;
    }
    return out + source.slice(cursor);
  } catch {
    return source;
  }
}
// ---------------------------------------------------------------------------
// Versão da linguagem (pubspec.yaml + `// @dart=`)
// ---------------------------------------------------------------------------
function readPackageLanguageVersion(pubspecPath) {
  return (0, pubspec_1.readPubspec)(pubspecPath).version;
}
function isAtLeast(version) {
  return (
    version.major > MIN_LANGUAGE_MAJOR ||
    (version.major === MIN_LANGUAGE_MAJOR && version.minor >= MIN_LANGUAGE_MINOR)
  );
}
/** Motivo para não analisar o arquivo, ou null se primary constructors estão disponíveis. */
function languageVersionIssue(file, content) {
  const pubspec = (0, pubspec_1.findNearestPubspec)(file);
  if (!pubspec) return "pubspec.yaml não encontrado";
  const version = readPackageLanguageVersion(pubspec);
  if (!version) return `SDK não declarado em ${pubspec}`;
  if (!isAtLeast(version)) return `SDK mínimo ${version.major}.${version.minor} (< 3.13)`;
  const override = content.match(LANGUAGE_OVERRIDE_RE);
  if (override) {
    const fileVersion = { major: parseInt(override[1], 10), minor: parseInt(override[2], 10) };
    if (!isAtLeast(fileVersion)) return `// @dart=${override[1]}.${override[2]} no arquivo`;
  }
  return null;
}
// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
/** Arquivo apontado por uma URI de diretiva (relativa ou `package:` do próprio pacote). */
function resolveDartUri(file, uri) {
  if (!uri.startsWith("package:")) {
    return /^[a-z]+:/i.test(uri) ? null : path.resolve(path.dirname(file), uri);
  }
  const [pkg, ...rest] = uri.slice("package:".length).split("/");
  const pubspec = (0, pubspec_1.findNearestPubspec)(file);
  if (!pubspec || (0, pubspec_1.readPubspec)(pubspec).name !== pkg || rest.length === 0)
    return null;
  return path.join(path.dirname(pubspec), "lib", ...rest);
}
/**
 * Para arquivos `part of`: motivo para não analisar quando a biblioteca-mãe tem
 * código gerado (o `part 'x.g.dart';` fica nela) ou não pode ser verificada.
 */
function parentLibraryReason(lx, file) {
  const { tokens } = lx;
  for (let k = 0; k + 2 < tokens.length; k++) {
    if (!(0, lexer_1.isIdent)(tokens[k], "part") || !(0, lexer_1.isIdent)(tokens[k + 1], "of"))
      continue;
    if ((0, lexer_1.isPunct)(tokens[k - 1], ".")) continue;
    const uriTok = tokens[k + 2];
    if (uriTok.kind !== "string")
      return "part of por nome de biblioteca (biblioteca não verificável)";
    const uri = uriTok.value.replace(/^r/, "").slice(1, -1);
    const parent = resolveDartUri(file, uri);
    if (!parent || !fs.existsSync(parent)) return `biblioteca ${uri} não encontrada`;
    const reason = generatedCodeReason((0, lexer_1.lex)(fs.readFileSync(parent, "utf-8")));
    return reason ? `biblioteca ${path.basename(parent)}: ${reason}` : null;
  }
  return null;
}
/**
 * Motivo para tratar o arquivo como código gerado (ou ligado a código gerado):
 * `part 'x.g.dart';` (qualquer quebra de linha; comentários não contam) ou
 * comentário de cabeçalho como `// GENERATED CODE - DO NOT MODIFY BY HAND`.
 */
function generatedCodeReason(lx) {
  const { tokens } = lx;
  for (let k = 0; k + 2 < tokens.length; k++) {
    if (!(0, lexer_1.isIdent)(tokens[k], "part") || (0, lexer_1.isPunct)(tokens[k - 1], "."))
      continue;
    const uri = tokens[k + 1];
    if (
      uri.kind === "string" &&
      (0, lexer_1.isPunct)(tokens[k + 2], ";") &&
      GENERATED_PART_URI_RE.test(uri.value)
    ) {
      return `part de código gerado (${uri.value})`;
    }
  }
  const firstToken = tokens.length > 0 ? tokens[0].start : lx.source.length;
  for (const c of lx.comments) {
    if (c.start > firstToken) break;
    if (GENERATED_HEADER_RE.test(lx.source.slice(c.start, c.end))) return "arquivo gerado";
  }
  return null;
}
function reportClass(lx, file, report, plan) {
  const typeLabel = plan.decl.kind === "enum" ? "O enum" : "A classe";
  const fieldCount = plan.movedFields.length;
  const duplication =
    fieldCount > 0 ? ` e repete **${fieldCount} campo(s)** que já chegam pelos parâmetros` : "";
  const correct = buildCorrectSnippet(plan);
  (0, _types_1.sendFormattedFail)({
    title: "USAR PRIMARY CONSTRUCTOR",
    description:
      `${typeLabel} \`${report.name}\` declara o construtor dentro do corpo${duplication}. ` +
      "Declare o construtor principal no **cabeçalho da classe** (primary constructor).",
    problem: {
      wrong: buildWrongSnippet(lx, plan),
      correct,
      wrongLabel: "Construtor no corpo da classe",
      correctLabel: "Primary constructor",
    },
    action: {
      text:
        "Mova a lista de parâmetros para o cabeçalho. `this.campo` vira `final Tipo campo` e a declaração do campo sai do corpo. " +
        "Initializer list, corpo e `///` do construtor antigo ficam no bloco `this`. " +
        "Na IDE: **Convert to primary constructor** no construtor e depois **Convert to declaring parameter** em cada `this.campo`.",
      code: correct,
    },
    objective:
      "Declarar o estado da classe em **um único lugar**: sem repetir campos e parâmetros, com a mesma semântica em tempo de execução.",
    reference: {
      text: "Dart — Primary constructors",
      url: "https://dart.dev/language/primary-constructors",
    },
    file,
    line: report.line,
  });
}
/**
 * Arquivo analisado: `.dart` escrito à mão, fora de testes e de código gerado
 * (inclui qualquer pasta `test/` ou `integration_test/` no caminho).
 */
function isCandidateFile(file) {
  const p = _types_1.DartPath.of(file);
  return (
    p.isDart &&
    !p.isTest &&
    !p.isGenerated &&
    !p.inFolder("test") &&
    !p.inFolder("integration_test")
  );
}
/** Funções internas expostas só para os testes do plugin. */
exports.__testing = {
  parseSdkLowerBound: pubspec_1.parseSdkLowerBound,
  languageVersionIssue,
  isCandidateFile,
  generatedCodeReason: (source) => generatedCodeReason((0, lexer_1.lex)(source)),
  parentLibraryReason: (source, file) => parentLibraryReason((0, lexer_1.lex)(source), file),
};
exports.default = (0, _types_1.createPlugin)(
  {
    name: "primary-constructors",
    description: "Obriga o uso de primary constructors em classes e enums (Dart 3.13+)",
    enabled: true,
  },
  async () => {
    const files = _types_1.DartFile.changed({ createdFirst: true }).filter((f) =>
      isCandidateFile(f.path.path)
    );
    for (const dartFile of files) {
      const file = dartFile.path.path;
      const versionIssue = languageVersionIssue(file, dartFile.source);
      if (versionIssue) {
        (0, _types_1.verboseLog)(`[primary-constructors] ${file} ignorado: ${versionIssue}`);
        continue;
      }
      const lx = dartFile.lexed;
      const generated = generatedCodeReason(lx) ?? parentLibraryReason(lx, file);
      if (generated) {
        (0, _types_1.verboseLog)(`[primary-constructors] ${file} ignorado: ${generated}`);
        continue;
      }
      const resolver = resolverFor(file);
      for (const decl of declsOf(lx)) {
        const { report, plan } = analyzeDecl(lx, decl, resolver);
        if (plan !== null) {
          reportClass(lx, file, report, plan);
        } else {
          (0, _types_1.verboseLog)(
            `[primary-constructors] ${file}:${report.line} ${report.name}: ${report.reason}`
          );
        }
      }
    }
  }
);
