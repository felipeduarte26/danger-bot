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
/**
 * Class Naming Convention Plugin
 *
 * Verifica se nomes de classes seguem a regra do Clean Code:
 * classes devem ser substantivos, não verbos.
 *
 * Escopo: Repository (interface e implementação), Datasource, ViewModel.
 * Exceção: UseCase (por padrão arquitetural, aceita verbos).
 *
 * Usa wordpos (WordNet) para detecção gramatical real.
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const AGENT_NOUN_SUFFIXES = [
  "er",
  "or",
  "tor",
  "sor",
  "ler",
  "ner",
  "ter",
  "handler",
  "builder",
  "processor",
  "observer",
  "listener",
  "converter",
  "adapter",
  "mapper",
  "parser",
  "formatter",
  "serializer",
  "deserializer",
  "controller",
  "manager",
  "provider",
  "generator",
  "validator",
  "dispatcher",
  "resolver",
  "transformer",
  "interceptor",
  "inspector",
  "iterator",
  "navigator",
  "selector",
  "detector",
  "connector",
  "collector",
  "executor",
  "monitor",
  "wrapper",
  "helper",
  "factory",
  "strategy",
  "notifier",
  "emitter",
];
const ACTION_VERBS = new Set([
  "get",
  "set",
  "fetch",
  "find",
  "load",
  "save",
  "put",
  "create",
  "delete",
  "remove",
  "update",
  "insert",
  "add",
  "send",
  "receive",
  "calculate",
  "compute",
  "validate",
  "check",
  "verify",
  "search",
  "filter",
  "sort",
  "parse",
  "format",
  "convert",
  "transform",
  "generate",
  "build",
  "execute",
  "run",
  "do",
  "make",
  "process",
  "handle",
  "manage",
  "register",
  "login",
  "logout",
  "authenticate",
  "authorize",
  "sync",
  "export",
  "import",
  "download",
  "upload",
  "submit",
  "cancel",
  "approve",
  "reject",
  "start",
  "stop",
  "open",
  "close",
  "init",
  "dispose",
  "connect",
  "disconnect",
  "subscribe",
  "unsubscribe",
  "notify",
  "emit",
  "dispatch",
  "invoke",
  "call",
  "read",
  "write",
  "edit",
  "modify",
  "alter",
  "show",
  "hide",
  "display",
  "render",
  "draw",
  "enable",
  "disable",
  "activate",
  "deactivate",
  "lock",
  "unlock",
  "block",
  "unblock",
  "merge",
  "split",
  "clone",
  "copy",
  "move",
  "attach",
  "detach",
  "bind",
  "unbind",
  "encode",
  "decode",
  "encrypt",
  "decrypt",
  "compress",
  "decompress",
  "serialize",
  "deserialize",
  "publish",
  "unpublish",
  "archive",
  "restore",
]);
const LAYER_SUFFIXES = [
  "Repository",
  "Datasource",
  "DataSource",
  "ViewModel",
  "Entity",
  "Model",
  "Failure",
  "State",
  "Event",
  "Service",
  "Impl",
  "Interface",
];
const TARGET_FOLDERS = [
  { folder: "/entities/", label: "Entity" },
  { folder: "/repositories/", label: "Repository" },
  { folder: "/datasources/", label: "Datasource" },
  { folder: "/viewmodels/", label: "ViewModel" },
];
function isTargetFile(file) {
  if (file.includes("/usecases/")) return null;
  for (const { folder, label } of TARGET_FOLDERS) {
    if (file.includes(folder)) return label;
  }
  if (file.endsWith("_viewmodel.dart") || file.endsWith("_view_model.dart")) return "ViewModel";
  return null;
}
function splitPascalCase(name) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .split("_")
    .filter((w) => w.length > 0);
}
function stripLayerSuffix(name) {
  let result = name;
  for (const suffix of LAYER_SUFFIXES) {
    if (result.endsWith(suffix) && result.length > suffix.length) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }
  if (result.startsWith("I") && result.length > 1 && result[1] === result[1].toUpperCase()) {
    result = result.slice(1);
  }
  return result;
}
function isAgentNoun(word) {
  const lower = word.toLowerCase();
  return AGENT_NOUN_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}
async function loadWordPOS() {
  try {
    const WordPOS = require("wordpos");
    return new WordPOS();
  } catch {
    return null;
  }
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "class-naming-convention",
    description: "Verifica se nomes de classes usam substantivos (Clean Code)",
    enabled: true,
  },
  async () => {
    const wp = await loadWordPOS();
    if (!wp) {
      console.warn("wordpos nao disponivel — plugin class-naming-convention desabilitado");
      return;
    }
    const { git } = (0, _types_1.getDanger)();
    const allFiles = [...git.created_files, ...git.modified_files];
    const targetFiles = allFiles
      .filter((f) => {
        if (f.endsWith(".g.dart") || f.endsWith(".freezed.dart")) return false;
        return isTargetFile(f) !== null;
      })
      .filter((f) => fs.existsSync(f));
    if (targetFiles.length === 0) return;
    const violations = [];
    for (const file of targetFiles) {
      const layer = isTargetFile(file);
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const classMatch = line.match(
          /(?:abstract\s+)?(?:interface\s+)?(?:final\s+|sealed\s+|base\s+)?class\s+([A-Za-z_]\w*)/
        );
        if (!classMatch) continue;
        const className = classMatch[1];
        const coreName = stripLayerSuffix(className);
        const words = splitPascalCase(coreName);
        const verbWords = [];
        for (let wi = 0; wi < words.length; wi++) {
          const word = words[wi];
          const lower = word.toLowerCase();
          if (lower.length < 2) continue;
          if (isAgentNoun(lower)) continue;
          const isFirstWord = wi === 0;
          if (isFirstWord && ACTION_VERBS.has(lower)) {
            verbWords.push(lower);
            continue;
          }
          try {
            const isVerb = await wp.isVerb(lower);
            if (!isVerb) continue;
            const isNoun = await wp.isNoun(lower);
            if (isNoun) continue;
            verbWords.push(lower);
          } catch {
            continue;
          }
        }
        if (verbWords.length > 0) {
          violations.push({ file, className, layer, verbWords, line: i + 1 });
        }
      }
    }
    if (violations.length === 0) return;
    for (const v of violations) {
      const verbs = v.verbWords.map((w) => `\`${w}\``).join(", ");
      const suggestion = buildSuggestion(v.verbWords);
      (0, _types_1.sendFormattedFail)({
        title: "CLASSE COM VERBO NO NOME",
        description: `**${v.layer}:** \`${v.className}\` — verbo(s) detectado(s): ${verbs}. Classes representam **coisas** (substantivos), não **ações** (verbos).`,
        problem: {
          wrong: `class ${v.className} { }`,
          correct: `class ${suggestClassName(v.className, v.verbWords)} { }`,
          wrongLabel: "Verbo no nome da classe",
          correctLabel: "Substantivo no nome da classe",
        },
        action: {
          text: suggestion,
          code: `class ${suggestClassName(v.className, v.verbWords)} { }`,
        },
        objective: "Seguir **Clean Code** — classes como substantivos, métodos como verbos.",
        reference: {
          text: "Clean Code: Naming Classes & Methods",
          url: "https://medium.com/@mikhailhusyev/writing-clean-code-naming-variables-functions-methods-and-classes-6074a6796c7b",
        },
        file: v.file,
        line: v.line,
      });
    }
  }
);
function suggestClassName(className, verbWords) {
  let result = className;
  for (const verb of verbWords) {
    const capitalized = verb.charAt(0).toUpperCase() + verb.slice(1);
    result = result.replace(new RegExp(capitalized, "g"), "");
  }
  return result || className;
}
function buildSuggestion(verbWords) {
  const replacements = {
    get: "Getter / Retriever / Fetcher",
    fetch: "Fetcher / Retriever",
    find: "Finder / Locator",
    search: "Searcher / Finder",
    create: "Creator / Factory",
    delete: "Deleter / Remover",
    remove: "Remover",
    update: "Updater",
    send: "Sender / Dispatcher",
    receive: "Receiver",
    calculate: "Calculator",
    validate: "Validator",
    manage: "Manager",
    load: "Loader",
    save: "Saver / Persister",
    convert: "Converter",
    parse: "Parser",
    format: "Formatter",
    filter: "FilterCriteria / Predicate",
    sort: "Sorter / Comparator",
    export: "Exporter",
    import: "Importer",
    generate: "Generator",
    process: "Processor",
    execute: "Executor",
    transform: "Transformer",
    register: "Registry / Registrar",
    sync: "Synchronizer",
    connect: "Connector",
    authenticate: "Authenticator",
    authorize: "Authorizer",
  };
  const suggestions = verbWords
    .map((v) => {
      const alt = replacements[v];
      return alt ? `\`${v}\` → ${alt}` : `\`${v}\` → use um substantivo`;
    })
    .join("\n");
  return `Sufixos aceitos: -Handler, -Builder, -Processor, -Observer, -Validator, etc.\n\n**Sugestão:**\n${suggestions}`;
}
