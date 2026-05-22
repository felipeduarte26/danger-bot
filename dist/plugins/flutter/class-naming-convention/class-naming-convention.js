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
 * 1. Verifica se nomes de classes usam substantivos, não verbos (Clean Code).
 * 2. Verifica se nomes de classes estão no singular (plural é para listas).
 *
 * Escopo: Repository, Datasource, Entity, Model, ViewModel.
 * Exceção: UseCase (por padrão arquitetural, aceita verbos).
 *
 * Usa wordpos (WordNet) para detecção gramatical e @boringnode/pluralize para singular/plural.
 */
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
let compromiseLib = null;
try {
  compromiseLib = require("compromise");
} catch {
  // compromise not available
}
function identifyWordNumber(word) {
  if (!compromiseLib) return "unknown";
  const lower = word.toLowerCase();
  const doc = compromiseLib("the " + lower);
  const singular = doc.nouns().toSingular().text().replace("the ", "");
  const plural = doc.nouns().toPlural().text().replace("the ", "");
  if (singular && singular !== lower) return "plural";
  if (plural && plural !== lower) return "singular";
  return "unknown";
}
function getSingularForm(word) {
  if (!compromiseLib) return word;
  const lower = word.toLowerCase();
  return (
    compromiseLib("the " + lower)
      .nouns()
      .toSingular()
      .text()
      .replace("the ", "") || lower
  );
}
const PLURAL_ALLOWLIST = new Set([
  "params",
  "items",
  "analytics",
  "media",
  "goods",
  "contents",
  "details",
  "icms",
  "cofins",
  "fgts",
  "https",
  "cors",
  "bios",
]);
const VOWELS = new Set(["a", "e", "i", "o", "u"]);
function isLikelyAcronym(word, singularForm) {
  const hasNoVowels = (w) => ![...w].some((c) => VOWELS.has(c));
  if (hasNoVowels(singularForm)) return true;
  if (hasNoVowels(word)) return true;
  const upperCount = [...word].filter((c) => c >= "A" && c <= "Z").length;
  if (upperCount === word.length) return true;
  return false;
}
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
  { folder: "/models/", label: "Model" },
];
function isTargetFile(file) {
  if (
    file.includes("/usecases/") ||
    file.includes("/use_cases/") ||
    file.endsWith("_usecase.dart") ||
    file.endsWith("_use_case.dart")
  ) {
    return null;
  }
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
const COMPOUND_PARTICLES = new Set([
  "in",
  "out",
  "up",
  "down",
  "over",
  "off",
  "on",
  "back",
  "away",
  "only",
  "through",
  "around",
  "time",
  "base",
  "source",
  "set",
  "line",
  "side",
  "end",
  "able",
]);
const KNOWN_COMPOUNDS = new Set([
  "read_only",
  "start_up",
  "startup",
  "set_up",
  "setup",
  "check_out",
  "checkout",
  "look_up",
  "lookup",
  "break_down",
  "log_in",
  "login",
  "log_out",
  "logout",
  "sign_in",
  "sign_up",
  "sign_out",
  "opt_in",
  "opt_out",
  "drop_down",
  "dropdown",
  "pop_up",
  "popup",
  "push_notification",
  "run_time",
  "runtime",
  "open_source",
  "read_write",
  "lock_down",
  "lock_out",
  "roll_back",
  "rollback",
  "call_back",
  "callback",
  "turn_over",
  "turnover",
  "make_over",
  "hand_over",
  "over_ride",
  "override",
  "over_load",
  "overload",
  "down_load",
  "download",
  "up_load",
  "upload",
  "search_result",
  "search_results",
  "search_criteria",
  "search_query",
  "search_bar",
  "search_field",
  "import_export",
  "export_import",
  "load_balance",
  "load_test",
  "read_model",
  "write_model",
  "split_view",
  "merge_request",
  "merge_conflict",
]);
function isPartOfCompoundNoun(words, verbIdx) {
  const verb = words[verbIdx].toLowerCase();
  const nextWord = words[verbIdx + 1]?.toLowerCase();
  const prevWord = words[verbIdx - 1]?.toLowerCase();
  if (nextWord) {
    if (COMPOUND_PARTICLES.has(nextWord)) return true;
    if (KNOWN_COMPOUNDS.has(`${verb}_${nextWord}`)) return true;
  }
  if (prevWord) {
    if (KNOWN_COMPOUNDS.has(`${prevWord}_${verb}`)) return true;
  }
  return false;
}
const VERB_ALSO_NOUN = new Set([
  "download",
  "upload",
  "export",
  "import",
  "update",
  "build",
  "search",
  "filter",
  "sort",
  "run",
  "call",
  "copy",
  "move",
  "edit",
  "display",
  "archive",
  "restore",
  "merge",
  "split",
  "sync",
  "login",
  "logout",
  "process",
  "load",
  "check",
  "format",
  "parse",
  "convert",
  "transform",
  "generate",
  "start",
  "stop",
  "lock",
  "clone",
  "render",
  "dispatch",
  "publish",
  "read",
  "write",
  "open",
  "close",
  "block",
  "handle",
  "find",
  "draw",
]);
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
    description: "Verifica nomes de classes: substantivos (não verbos) e singular (não plural)",
    enabled: true,
  },
  async () => {
    const wp = await loadWordPOS();
    const { git } = (0, _types_1.getDanger)();
    const allFiles = [...git.created_files, ...git.modified_files];
    const targetFiles = allFiles
      .filter((f) => {
        if (f.endsWith(".g.dart") || f.endsWith(".freezed.dart") || f.endsWith("_test.dart"))
          return false;
        return isTargetFile(f) !== null;
      })
      .filter((f) => fs.existsSync(f));
    if (targetFiles.length === 0) return;
    if (wp) {
      const violations = [];
      for (const file of targetFiles) {
        const layer = isTargetFile(file);
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");
        let inBlock = false;
        for (let i = 0; i < lines.length; i++) {
          const comment = isInsideComment(lines[i], inBlock);
          inBlock = comment.inBlock;
          if (comment.skip) continue;
          const classMatch = lines[i].match(
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
            if (isPartOfCompoundNoun(words, wi)) continue;
            const isFirstWord = wi === 0;
            if (ACTION_VERBS.has(lower)) {
              if (isFirstWord) {
                if (VERB_ALSO_NOUN.has(lower) && words.length === 1) continue;
                verbWords.push(lower);
                continue;
              }
              if (VERB_ALSO_NOUN.has(lower)) {
                if (wp) {
                  try {
                    const isNoun = await wp.isNoun(lower);
                    if (isNoun) continue;
                  } catch {
                    continue;
                  }
                } else {
                  continue;
                }
              }
              verbWords.push(lower);
              continue;
            }
            if (!wp) continue;
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
      for (const v of violations) {
        const verbs = v.verbWords.map((w) => `\`${w}\``).join(", ");
        const suggestion = buildSuggestion(v.verbWords);
        (0, _types_1.sendFormattedFail)({
          title: "CLASSE COM VERBO NO NOME",
          description: `**${v.layer}:** \`${v.className}\` — verbo(s) detectado(s): ${verbs}. Classes representam **coisas** (substantivos), não **ações** (verbos). Exceção: **UseCases** podem ter verbos pois representam comandos/ações do sistema.`,
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
          objective:
            "Seguir **Clean Code** — classes como substantivos, métodos como verbos. Somente **UseCases** devem ter verbos no nome (pois representam comandos: `GetUser`, `CreateOrder`, `DeleteAccount`).",
          reference: {
            text: "Clean Code: Naming Classes & Methods",
            url: "https://medium.com/@mikhailhusyev/writing-clean-code-naming-variables-functions-methods-and-classes-6074a6796c7b",
          },
          file: v.file,
          line: v.line,
        });
      }
    }
    if (compromiseLib) {
      checkPluralClassNames(targetFiles);
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
function isInsideComment(line, inBlock) {
  const trimmed = line.trimStart();
  if (inBlock) {
    if (trimmed.includes("*/")) return { skip: true, inBlock: false };
    return { skip: true, inBlock: true };
  }
  if (trimmed.startsWith("//")) return { skip: true, inBlock: false };
  if (trimmed.startsWith("/*")) {
    const closed = trimmed.includes("*/");
    return { skip: true, inBlock: !closed };
  }
  return { skip: false, inBlock: false };
}
function checkPluralClassNames(targetFiles) {
  for (const file of targetFiles) {
    const layer = isTargetFile(file);
    if (layer === "ViewModel") continue;
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    let inBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const comment = isInsideComment(lines[i], inBlock);
      inBlock = comment.inBlock;
      if (comment.skip) continue;
      const classMatch = lines[i].match(
        /(?:abstract\s+)?(?:interface\s+)?(?:final\s+|sealed\s+|base\s+)?class\s+([A-Za-z_]\w*)/
      );
      if (!classMatch) continue;
      const className = classMatch[1];
      const coreName = stripLayerSuffix(className);
      const words = splitPascalCase(coreName);
      if (words.length === 0) continue;
      const firstWord = words[0];
      const lower = firstWord.toLowerCase();
      if (lower.length < 3) continue;
      if (PLURAL_ALLOWLIST.has(lower)) continue;
      if (identifyWordNumber(lower) === "plural") {
        const singularForm = getSingularForm(lower);
        if (isLikelyAcronym(firstWord, singularForm)) continue;
        const singularPascal = singularForm.charAt(0).toUpperCase() + singularForm.slice(1);
        const correctedName = className.replace(firstWord, singularPascal);
        (0, _types_1.sendFormattedFail)({
          title: "CLASSE COM NOME NO PLURAL",
          description: `**${layer}:** \`${className}\` — \`${firstWord}\` está no plural. Nomes de classes devem ser **singulares**.`,
          problem: {
            wrong: `class ${className} { }`,
            correct: `class ${correctedName} { }`,
            wrongLabel: "Nome no plural",
            correctLabel: "Nome no singular",
          },
          action: {
            text: "Renomeie a classe para o singular — plural é reservado para variáveis de lista:",
            code: `// ${className} → ${correctedName}`,
          },
          objective:
            "Nomes de classes devem ser **singulares** — o plural é reservado para variáveis do tipo `List`.",
          file,
          line: i + 1,
        });
      }
    }
  }
}
