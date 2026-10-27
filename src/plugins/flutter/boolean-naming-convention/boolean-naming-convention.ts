/**
 * Boolean Naming Convention Plugin
 *
 * Verifica se nomes de propriedades/variáveis/getters bool seguem o Effective Dart:
 * - PREFER a non-imperative verb phrase for a boolean property or variable
 * - Bons prefixos: is, has, can, should, was, will, must, does, did
 * - Nomes imperativos (verbos de ação) são flagrados: showPopup, deleteItem
 * - Adjetivos são aceitos: visible, enabled, active
 *
 * Analisa todo nome declarado com tipo `bool`/`bool?`: campos, variáveis (de topo e
 * locais), parâmetros (de métodos, funções, construtores, closures e de tipos de
 * função) e getters `bool get`. Comentários e strings nunca contam. Nomes com menos
 * de 3 letras são ignorados. Exclui `_test.dart` e arquivos gerados (`.g`, `.freezed`, `.gen`, `generated/`...).
 *
 * Usa wordpos (WordNet) para detecção gramatical, minimizando falsos positivos;
 * sem wordpos, o plugin não roda.
 *
 * @see https://dart.dev/effective-dart/design#prefer-a-non-imperative-verb-phrase-for-a-boolean-property-or-variable
 */
import {
  DartBody,
  DartFile,
  DartFunction,
  DartMemberKind,
  DartParameter,
  DartParameterSource,
  DartType,
  createPlugin,
  sendFormattedFail,
} from "@types";

const GOOD_PREFIXES = new Set([
  "is",
  "has",
  "can",
  "should",
  "was",
  "will",
  "must",
  "does",
  "did",
  "allows",
  "needs",
  "wants",
  "accepts",
  "contains",
  "requires",
  "supports",
  "uses",
  "owns",
  "matches",
  "exceeds",
  "exists",
  "ignores",
  "includes",
  "enables",
]);

const GOOD_ADJECTIVES = new Set([
  "visible",
  "enabled",
  "disabled",
  "active",
  "selected",
  "expanded",
  "collapsed",
  "loading",
  "loaded",
  "empty",
  "valid",
  "invalid",
  "ready",
  "done",
  "open",
  "closed",
  "locked",
  "unlocked",
  "mounted",
  "disposed",
  "connected",
  "disconnected",
  "authenticated",
  "authorized",
  "available",
  "editable",
  "focusable",
  "scrollable",
  "clickable",
  "draggable",
  "resizable",
  "nullable",
  "immutable",
  "mutable",
  "required",
  "optional",
  "private",
  "public",
  "abstract",
  "final",
  "sealed",
  "obscured",
  "checked",
  "dismissed",
  "completed",
  "paused",
  "running",
  "cancelled",
  "finished",
  "initialized",
  "pinned",
  "wrapped",
  "cached",
  "dirty",
  "clean",
  "stale",
  "fresh",
]);

const IMPERATIVE_VERBS = new Set([
  "show",
  "hide",
  "delete",
  "remove",
  "add",
  "insert",
  "update",
  "create",
  "destroy",
  "send",
  "fetch",
  "load",
  "save",
  "get",
  "set",
  "put",
  "post",
  "push",
  "pop",
  "reset",
  "clear",
  "close",
  "open",
  "start",
  "stop",
  "play",
  "pause",
  "resume",
  "cancel",
  "submit",
  "apply",
  "execute",
  "run",
  "call",
  "invoke",
  "trigger",
  "emit",
  "dispatch",
  "notify",
  "refresh",
  "reload",
  "retry",
  "toggle",
  "swap",
  "move",
  "copy",
  "clone",
  "merge",
  "split",
  "sort",
  "filter",
  "validate",
  "check",
  "verify",
  "compute",
  "calculate",
  "render",
  "draw",
  "paint",
  "build",
  "init",
  "dispose",
  "connect",
  "disconnect",
  "subscribe",
  "unsubscribe",
  "register",
  "login",
  "logout",
  "sync",
  "download",
  "upload",
  "import",
  "export",
  "print",
  "log",
  "debug",
  "test",
  "animate",
  "scroll",
  "navigate",
  "redirect",
  "request",
  "respond",
  "process",
  "handle",
  "manage",
  "configure",
  "setup",
  "enable",
  "disable",
  "activate",
  "deactivate",
  "lock",
  "unlock",
  "block",
  "unblock",
  "mount",
  "unmount",
  "attach",
  "detach",
  "bind",
  "unbind",
  "wrap",
  "unwrap",
  "encode",
  "decode",
  "encrypt",
  "decrypt",
  "compress",
]);

function splitCamelCase(name: string): string[] {
  return name
    .replace(/^_+/, "")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .split("_")
    .filter((w) => w.length > 0)
    .map((w) => w.toLowerCase());
}

async function loadWordPOS(): Promise<any> {
  try {
    const WordPOS = require("wordpos");
    return new WordPOS();
  } catch {
    return null;
  }
}

interface BoolNamingViolation {
  file: string;
  name: string;
  line: number;
  firstWord: string;
  kind: "field" | "getter";
}

function suggestName(name: string, firstWord: string): string {
  const rest = name.startsWith("_")
    ? "_is" + name.slice(1).charAt(0).toUpperCase() + name.slice(2)
    : "is" + name.charAt(0).toUpperCase() + name.slice(1);

  const suggestions: Record<string, string> = {
    show: name.replace(new RegExp(`^_?${firstWord}`, "i"), (m) =>
      m.startsWith("_") ? "_shouldShow" : "shouldShow"
    ),
    hide: name.replace(new RegExp(`^_?${firstWord}`, "i"), (m) =>
      m.startsWith("_") ? "_isHidden" : "isHidden"
    ),
    delete: name.replace(new RegExp(`^_?${firstWord}`, "i"), (m) =>
      m.startsWith("_") ? "_isDeleted" : "isDeleted"
    ),
    enable: name.replace(new RegExp(`^_?${firstWord}`, "i"), (m) =>
      m.startsWith("_") ? "_isEnabled" : "isEnabled"
    ),
    disable: name.replace(new RegExp(`^_?${firstWord}`, "i"), (m) =>
      m.startsWith("_") ? "_isDisabled" : "isDisabled"
    ),
    load: name.replace(new RegExp(`^_?${firstWord}`, "i"), (m) =>
      m.startsWith("_") ? "_isLoaded" : "isLoaded"
    ),
    toggle: name.replace(new RegExp(`^_?${firstWord}`, "i"), (m) =>
      m.startsWith("_") ? "_isToggled" : "isToggled"
    ),
    connect: name.replace(new RegExp(`^_?${firstWord}`, "i"), (m) =>
      m.startsWith("_") ? "_isConnected" : "isConnected"
    ),
  };

  return suggestions[firstWord] ?? rest;
}

/** Nome declarado com tipo `bool`, na linha do nome. */
interface BoolDeclaration {
  name: string;
  line: number;
  kind: "field" | "getter";
}

/**
 * Todos os nomes `bool` declarados no arquivo, na ordem das linhas: campos,
 * variáveis, parâmetros (inclusive de closures e de tipos de função) e getters.
 */
function boolDeclarations(file: DartFile): BoolDeclaration[] {
  const found: BoolDeclaration[] = [];

  /**
   * Nomes `bool` dentro de um tipo: parâmetros de tipo de função
   * (`void Function(bool show)`) e campos nomeados de record (`({bool reset})`).
   */
  const addTypeNames = (type: DartType | null): void => {
    if (type === null) return;
    for (const param of type.parameters) {
      if (param.name !== null && param.type?.isBool) {
        found.push({ name: param.name, line: param.nameLine, kind: "field" });
      }
      addTypeNames(param.type);
    }
    addTypeNames(type.returnType);
    for (const arg of type.typeArguments) addTypeNames(arg);
    for (const field of type.recordFields) {
      if (field.name !== null && field.type.isBool) {
        found.push({ name: field.name, line: field.nameLine, kind: "field" });
      }
      addTypeNames(field.type);
    }
  };

  const addVariable = (v: { name: string; nameLine: number; type: DartType | null }): void => {
    if (v.type?.isBool) found.push({ name: v.name, line: v.nameLine, kind: "field" });
    addTypeNames(v.type);
  };

  const addParameters = (params: readonly DartParameter[]): void => {
    for (const p of params) addVariable(p);
  };

  const addBody = (body: DartBody | null): void => {
    if (body === null) return;
    for (const v of body.localVariables) addVariable(v);
  };

  const addFunction = (fn: DartFunction): void => {
    // `bool get x` (o `bool?` nunca contou como getter bool)
    if (
      fn.memberKind === DartMemberKind.Getter &&
      fn.returnType?.isBool &&
      !fn.returnType.isNullable
    ) {
      found.push({ name: fn.name, line: fn.nameLine, kind: "getter" });
    }
    addTypeNames(fn.returnType);
    addParameters(fn.parameters);
    addBody(fn.body);
  };

  for (const decl of file.declarations) {
    for (const field of decl.fields) addVariable(field);
    for (const method of decl.methods) addFunction(method);
    for (const ctor of decl.constructors) {
      // os parâmetros `final`/`var` do primary constructor já estão em `fields`
      addParameters(ctor.parameters.filter((p) => p.source !== DartParameterSource.Declaring));
      addBody(ctor.body);
    }
  }
  for (const v of file.variables) addVariable(v);
  for (const fn of file.functions) addFunction(fn);
  for (const t of file.typedefs) addTypeNames(t.aliasedType);
  // closures e funções locais de todo o arquivo, inclusive em inicializadores
  // (`final onTap = (bool reload) {}`) e valores padrão
  for (const closure of file.closures()) addParameters(closure.parameters);

  return found.sort((a, b) => a.line - b.line);
}

export default createPlugin(
  {
    name: "boolean-naming-convention",
    description: "Verifica nomes de booleans seguindo Effective Dart (is/has/can/should)",
    enabled: true,
  },
  async () => {
    const wp = await loadWordPOS();
    if (!wp) {
      console.warn("wordpos não disponível — plugin boolean-naming-convention desabilitado");
      return;
    }

    // Gerados ficam fora (`.g`, `.freezed`, `.gen`, `generated/`...); auxiliares de `test/` entram.
    const dartFiles = DartFile.changed({ createdFirst: true, includeTests: true }).filter(
      (file) => !file.path.fileName.endsWith("_test.dart")
    );

    if (dartFiles.length === 0) return;

    const violations: BoolNamingViolation[] = [];

    for (const dartFile of dartFiles) {
      const file = dartFile.path.path;

      for (const { name, line, kind } of boolDeclarations(dartFile)) {
        const cleanName = name.replace(/^_+/, "");
        if (cleanName.length < 3) continue;

        const words = splitCamelCase(name);
        if (words.length === 0) continue;

        const firstWord = words[0];

        if (GOOD_PREFIXES.has(firstWord)) continue;

        if (GOOD_ADJECTIVES.has(cleanName.toLowerCase())) continue;
        if (GOOD_ADJECTIVES.has(firstWord)) continue;

        if (IMPERATIVE_VERBS.has(firstWord)) {
          violations.push({ file, name, line, firstWord, kind });
          continue;
        }

        try {
          const isAdj = await wp.isAdjective(firstWord);
          if (isAdj) continue;

          const isVerb = await wp.isVerb(firstWord);
          if (!isVerb) continue;

          const isNoun = await wp.isNoun(firstWord);
          if (isNoun) continue;

          violations.push({ file, name, line, firstWord, kind });
        } catch {
          continue;
        }
      }
    }

    if (violations.length === 0) return;

    for (const v of violations) {
      const suggested = suggestName(v.name, v.firstWord);
      const typeLabel = v.kind === "getter" ? "getter bool" : "bool";

      sendFormattedFail({
        title: "NOME DE BOOLEAN NÃO SEGUE EFFECTIVE DART",
        description: `O ${typeLabel} \`${v.name}\` começa com verbo imperativo (\`${v.firstWord}\`). Booleans devem usar frases verbais **não imperativas** — prefixos como \`is\`, \`has\`, \`can\`, \`should\`.`,
        problem: {
          wrong: `bool ${v.name};`,
          correct: `bool ${suggested};`,
          wrongLabel: "Verbo imperativo (parece um comando)",
          correctLabel: "Frase não imperativa (descreve estado)",
        },
        action: {
          text: `Prefixos recomendados: \`is\` (to be), \`has\` (posse), \`can\` (capacidade), \`should\` (recomendação), \`was\`/\`will\` (temporal).`,
          code: `bool ${suggested};`,
        },
        objective: "Seguir **Effective Dart** — booleans descrevem **estado**, não **comandos**.",
        reference: {
          text: "Effective Dart: PREFER a non-imperative verb phrase for a boolean",
          url: "https://dart.dev/effective-dart/design#prefer-a-non-imperative-verb-phrase-for-a-boolean-property-or-variable",
        },
        file: v.file,
        line: v.line,
      });
    }
  }
);
