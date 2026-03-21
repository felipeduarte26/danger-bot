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
import { createPlugin, getDanger, sendFail } from "@types";
import * as fs from "fs";

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

// Verbos de ação que NÃO devem iniciar nomes de classes,
// mesmo que o WordNet os classifique também como noun.
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

const TARGET_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /\/domain\/repositories\/[^/]+\.dart$/, label: "Repository Interface" },
  { regex: /\/data\/repositories\/[^/]+\.dart$/, label: "Repository Implementation" },
  { regex: /\/data\/datasources\/[^/]+\.dart$/, label: "Datasource" },
  { regex: /_viewmodel\.dart$/, label: "ViewModel" },
];

function isTargetFile(file: string): string | null {
  for (const { regex, label } of TARGET_PATTERNS) {
    if (regex.test(file)) return label;
  }
  return null;
}

function splitPascalCase(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .split("_")
    .filter((w) => w.length > 0);
}

function stripLayerSuffix(name: string): string {
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

function isAgentNoun(word: string): boolean {
  const lower = word.toLowerCase();
  return AGENT_NOUN_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

async function loadWordPOS(): Promise<any> {
  try {
    const WordPOS = require("wordpos");
    return new WordPOS();
  } catch {
    return null;
  }
}

interface VerbViolation {
  file: string;
  className: string;
  layer: string;
  verbWords: string[];
  line: number;
}

export default createPlugin(
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

    const { git } = getDanger();

    const allFiles = [...git.created_files, ...git.modified_files];
    const targetFiles = allFiles
      .filter((f: string) => {
        if (f.endsWith(".g.dart") || f.endsWith(".freezed.dart")) return false;
        return isTargetFile(f) !== null;
      })
      .filter((f: string) => fs.existsSync(f));

    if (targetFiles.length === 0) return;

    const violations: VerbViolation[] = [];

    for (const file of targetFiles) {
      const layer = isTargetFile(file)!;
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

        const verbWords: string[] = [];

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
      const suggestion = buildSuggestion(v.className, v.verbWords);

      sendFail(
        `CLASSE COM VERBO NO NOME

**${v.layer}:** \`${v.className}\`
Verbo(s) detectado(s): ${verbs}

### Problema Identificado

Classes representam **coisas** (substantivos), não **ações** (verbos).
Uma classe com verbo no nome confunde responsabilidade com comportamento:

\`\`\`dart
// ❌ Verbo no nome da classe
class ${v.className} { }

// ✅ Substantivo no nome da classe
class ${suggestClassName(v.className, v.verbWords)} { }
\`\`\`

### 🎯 AÇÃO NECESSÁRIA

${suggestion}

> Sufixos aceitos: -Handler, -Builder, -Processor, -Observer, -Validator, etc.

### 🚀 Objetivo

Seguir **Clean Code** — classes como substantivos, métodos como verbos.

📖 [Clean Code: Naming Classes & Methods](https://medium.com/@mikhailhusyev/writing-clean-code-naming-variables-functions-methods-and-classes-6074a6796c7b)`,
        v.file,
        v.line
      );
    }
  }
);

function suggestClassName(className: string, verbWords: string[]): string {
  let result = className;
  for (const verb of verbWords) {
    const capitalized = verb.charAt(0).toUpperCase() + verb.slice(1);
    result = result.replace(new RegExp(capitalized, "g"), "");
  }
  return result || className;
}

function buildSuggestion(className: string, verbWords: string[]): string {
  const replacements: Record<string, string> = {
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

  return `**Sugestao:**\n${suggestions}`;
}
