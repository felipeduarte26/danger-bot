/**
 * INSPECT COMMAND
 * ===============
 * Mostra o que o modelo Dart vê num arquivo, com os nomes das propriedades
 * que um plugin usa (docs/CRIANDO_PLUGINS.md)
 */

import path from "path";
import { createRequire } from "module";
import { exists } from "../utils/fs-helpers.js";

const SECTIONS = [
  "path",
  "imports",
  "classes",
  "functions",
  "variables",
  "calls",
  "strings",
  "comments",
  "locals",
  "identifiers",
  "errors",
];
/** `identifiers` repete o que as outras seções já mostram: só com `--only`. */
const DEFAULT_SECTIONS = SECTIONS.filter((s) => s !== "identifiers");

const MAX_TEXT = 70;
/** Valores mostrados inteiros (resumos e caminhos). */
const FULL_VALUES = new Set(["body", "expectedTestPath", "package"]);

const color = process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb";
const paint = (code) => (text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const bold = paint("1");
const dim = paint("2");
const cyan = paint("36");
const yellow = paint("33");

/**
 * Mostrar o modelo Dart de um arquivo
 * @param {string} fileArg - Caminho do arquivo .dart (relativo ao diretório atual)
 * @param {{ only?: string, line?: string, json?: boolean }} options
 */
export function inspectFile(fileArg, options) {
  const relative = path.relative(process.cwd(), path.resolve(fileArg)).split(path.sep).join("/");
  if (!exists(relative)) {
    console.error(`\nError: arquivo não encontrado: ${fileArg}`);
    process.exitCode = 1;
    return;
  }
  if (!relative.endsWith(".dart")) {
    console.error(`\nError: o inspect lê arquivos .dart (${fileArg})`);
    process.exitCode = 1;
    return;
  }

  const sections = options.only
    ? options.only.split(",").map((s) => s.trim().toLowerCase())
    : DEFAULT_SECTIONS;
  const unknown = sections.filter((s) => !SECTIONS.includes(s));
  if (unknown.length > 0) {
    console.error(`\nError: seção desconhecida: ${unknown.join(", ")}`);
    console.error(`Seções: ${SECTIONS.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  const line = options.line === undefined ? null : Number(options.line);
  if (line !== null && !(Number.isInteger(line) && line > 0)) {
    console.error(`\nError: --line precisa ser um número de linha (recebido: ${options.line})`);
    process.exitCode = 1;
    return;
  }

  const require = createRequire(import.meta.url);
  const { DartFile } = require("../../dist/dart/index.js");
  const file = DartFile.read(relative);

  const report = {};
  for (const section of sections) report[section] = collect(section, file, line);

  if (options.json) {
    console.log(JSON.stringify({ file: relative, line, ...report }, null, 2));
    return;
  }

  console.log(`\n${bold(`📄 ${relative}`)}${line === null ? "" : dim(`  (só a linha ${line})`)}`);
  console.log(dim("   flags: só as verdadeiras · tipos e textos em uma linha (compact)"));
  for (const section of sections) printSection(SECTION_TITLES[section], report[section]);
  console.log();
}

const SECTION_TITLES = {
  path: "file.path + fatos do arquivo",
  imports: "file.directives (imports, exports, parts)",
  classes: "file.declarations (classes, enums, mixins, extensions)",
  functions: "file.functions + file.typedefs",
  variables: "file.variables",
  calls: "file.calls()",
  strings: "file.strings",
  comments: "file.comments",
  locals: "file.localVariables()",
  identifiers: "file.identifiers",
  errors: "file.parseErrors + cls.unknownMembers",
};

// ─── Coleta (objetos simples, usados no texto e no --json) ──────────────────

function collect(section, file, line) {
  const at = (node) => line === null || (node.line <= line && line <= node.endLine);
  switch (section) {
    case "path": {
      const p = file.path;
      return {
        props: {
          layer: p.layer,
          layerFolder: p.layerFolder,
          feature: p.feature,
          category: p.category,
          isTest: p.isTest,
          isGenerated: p.isGenerated,
          isBarrel: p.isBarrel,
          expectedTestPath: p.expectedTestPath,
          package: p.package ? `${p.package.name} (sdk ${p.package.sdkMin ?? "?"})` : null,
          lineCount: file.lineCount,
          generatedReason: file.generatedReason,
          languageVersionOverride: file.languageVersionOverride,
          isComplete: file.isComplete,
        },
      };
    }
    case "imports":
      return file.directives.filter(at).map((d) =>
        item(d, d.uri, {
          kind: d.kind,
          uriKind: d.uriKind,
          packageName: d.packageName,
          packagePath: d.packagePath,
          prefix: d.prefix,
          show: d.show,
          hide: d.hide,
          isDeferred: d.isDeferred,
          hasConfigurations: d.hasConfigurations,
        })
      );
    case "classes":
      return file.declarations.filter(at).map((cls) => classItem(cls, at));
    case "functions":
      return [
        ...file.functions.filter(at).map((fn) => functionItem(fn)),
        ...file.typedefs.filter(at).map((t) =>
          item(t, `typedef ${t.name}`, {
            aliasedType: t.aliasedType?.canonical ?? null,
            typeParameters: t.typeParameters.map((tp) => tp.name),
          })
        ),
      ];
    case "variables":
      return file.variables.filter(at).map((v) => variableItem(v));
    case "calls":
      return file
        .calls()
        .filter(at)
        .map((c) =>
          item(c, c.compact, {
            callee: c.callee,
            name: c.name,
            receiver: c.receiver,
            isCascade: c.isCascade,
            cascadeTarget: c.cascadeTarget,
            isNullAware: c.isNullAware,
            isConst: c.isConst,
            postfixMember: c.postfixMember,
            insideClosure: c.insideClosure !== null,
            arguments: c.arguments.map((a) => (a.label ? `${a.label}: …` : "…")),
          })
        );
    case "strings":
      return file.strings.filter(at).map((s) =>
        item(s, s.text, {
          value: s.value,
          role: s.role,
          enclosingCallee: s.enclosingCallee,
          argumentLabel: s.argumentLabel,
          isRaw: s.isRaw,
          isMultiline: s.isMultiline,
          hasInterpolation: s.hasInterpolation,
        })
      );
    case "comments":
      return file.comments.filter(at).map((c) =>
        item(c, c.content, {
          kind: c.kind,
          directive: c.directive,
          directiveArgs: c.directiveArgs,
          isDoc: c.isDoc,
          isTrailing: c.isTrailing,
        })
      );
    case "locals":
      return file
        .localVariables()
        .filter(at)
        .map((v) =>
          item(v, v.name, {
            type: v.type?.canonical ?? null,
            nullability: v.nullability,
            isFinal: v.isFinal,
            isConst: v.isConst,
            isLate: v.isLate,
            isLoopVariable: v.isLoopVariable,
            isPatternVariable: v.isPatternVariable,
            insideClosure: v.insideClosure ? closureLabel(v.insideClosure) : null,
            initializer: v.initializer?.compact ?? null,
          })
        );
    case "identifiers":
      return file.identifiers
        .filter(at)
        .map((i) => item(i, i.name, { kind: i.kind, ownerName: i.ownerName }));
    case "errors":
      return [
        ...file.parseErrors.filter(at).map((e) => item(e, e.compact, { owner: "nível superior" })),
        ...file.declarations.flatMap((cls) =>
          cls.unknownMembers.filter(at).map((u) => item(u, u.compact, { owner: cls.name }))
        ),
      ];
    default:
      return [];
  }
}

function item(node, label, props, children) {
  const out = { line: node.line, endLine: node.endLine, label, props };
  if (children) out.children = children;
  return out;
}

function classItem(cls, at) {
  const group = (title, nodes, map) => {
    const items = nodes.filter(at).map(map);
    return items.length > 0 ? [{ title, items }] : [];
  };
  return item(
    cls,
    cls.header,
    {
      kind: cls.kind,
      name: cls.name,
      nameLine: cls.nameLine,
      modifiers: [...cls.modifiers],
      superclass: cls.superclass?.canonical ?? null,
      interfaces: cls.interfaces.map((t) => t.canonical),
      mixins: cls.mixins.map((t) => t.canonical),
      onTypes: cls.onTypes.map((t) => t.canonical),
      extendedType: cls.extendedType?.canonical ?? null,
      typeParameters: cls.typeParameters.map((t) => t.name),
      annotations: cls.annotations.map((a) => a.name),
      isComplete: cls.isComplete,
    },
    [
      ...group("cls.enumValues", cls.enumValues, (v) => item(v, v.name, {})),
      ...group("cls.fields", cls.fields, (f) => {
        const base = variableItem(f);
        return { ...base, props: { ...base.props, origin: f.origin, isOverride: f.isOverride } };
      }),
      ...group("cls.constructors", cls.constructors, (c) =>
        item(c, c.name, {
          constructorName: c.constructorName,
          isConst: c.isConst,
          isFactory: c.isFactory,
          isPrimary: c.isPrimary,
          isRedirecting: c.isRedirecting,
          parameters: c.parameters.map((p) => p.compact),
          initializers: c.initializers.map((i) => i.compact),
          body: c.body ? bodySummary(c.body) : null,
        })
      ),
      ...group("cls.methods", cls.methods, (m) => functionItem(m)),
    ]
  );
}

function functionItem(fn) {
  return item(fn, fn.signature, {
    memberKind: fn.memberKind,
    name: fn.name,
    returnType: fn.returnType?.canonical ?? null,
    isAsync: fn.isAsync,
    isStatic: fn.isStatic,
    isAbstract: fn.isAbstract,
    isOverride: fn.isOverride,
    body: fn.body ? bodySummary(fn.body) : null,
  });
}

function variableItem(v) {
  return item(v, v.name, {
    type: v.type?.canonical ?? null,
    nullability: v.nullability,
    isFinal: v.isFinal,
    isConst: v.isConst,
    isLate: v.isLate,
    isStatic: v.isStatic,
    isPrivate: v.isPrivate,
    initializer: v.initializer?.compact ?? null,
  });
}

/** Contagens do corpo: o que `body.calls`, `body.awaits`... devolvem. */
function bodySummary(body) {
  return (
    `${body.kind}${body.isAsync ? " async" : ""}: ` +
    `calls=${body.calls.length} awaits=${body.awaits.length} returns=${body.returns.length} ` +
    `tryStatements=${body.tryStatements.length} localVariables=${body.localVariables.length} ` +
    `closures=${body.closures.length}`
  );
}

function closureLabel(closure) {
  return closure.name ? `${closure.name} (L${closure.line})` : `anônima (L${closure.line})`;
}

// ─── Texto ─────────────────────────────────────────────────────────────────

function printSection(title, data) {
  const items = Array.isArray(data) ? data : null;
  console.log(`\n${cyan(bold(title))}${items ? dim(` — ${items.length}`) : ""}`);
  if (!items) {
    console.log(`  ${formatProps(data.props)}`);
    return;
  }
  if (items.length === 0) {
    console.log(dim("  (nada)"));
    return;
  }
  for (const entry of items) printItem(entry, "  ");
}

function printItem(entry, indent) {
  const lines = entry.endLine > entry.line ? `L${entry.line}-${entry.endLine}` : `L${entry.line}`;
  console.log(`${indent}${dim(lines.padEnd(9))} ${yellow(shorten(entry.label))}`);
  const props = formatProps(entry.props);
  if (props) console.log(`${indent}${" ".repeat(10)}${props}`);
  for (const group of entry.children ?? []) {
    console.log(`${indent}  ${cyan(group.title)}${dim(` — ${group.items.length}`)}`);
    for (const child of group.items) printItem(child, `${indent}    `);
  }
}

/** `chave=valor` dos valores preenchidos; booleanos só quando verdadeiros (como flag). */
function formatProps(props) {
  return Object.entries(props)
    .filter(([, v]) => v !== null && v !== undefined && v !== false && !isEmptyArray(v))
    .map(([k, v]) => (v === true ? k : `${dim(`${k}=`)}${formatValue(v, FULL_VALUES.has(k))}`))
    .join("  ");
}

function formatValue(value, full) {
  if (Array.isArray(value)) return `[${value.map((v) => shorten(String(v), 40)).join(", ")}]`;
  if (typeof value === "string") return full ? value : shorten(value);
  return String(value);
}

function isEmptyArray(value) {
  return Array.isArray(value) && value.length === 0;
}

function shorten(text, max = MAX_TEXT) {
  const oneLine = String(text).replace(/\s*\n\s*/g, " ⏎ ");
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}
