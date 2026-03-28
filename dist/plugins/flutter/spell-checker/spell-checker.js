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
 * Spell Checker Plugin
 * Verifica ortografia em identificadores Dart usando cspell.
 *
 * Analisa apenas linhas adicionadas no diff (não o arquivo inteiro).
 * Extrai classes, métodos, variáveis e parâmetros, quebra camelCase/PascalCase
 * em palavras individuais, e verifica cada uma com cspell.
 *
 * Agrupa erros por arquivo para evitar ruído excessivo.
 */
const _types_1 = require("../../../types");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const TECH_WORDS = [
  "viewmodel",
  "usecase",
  "datasource",
  "dto",
  "auth",
  "config",
  "admin",
  "navbar",
  "sidebar",
  "dropdown",
  "popup",
  "integrator",
  "dashboard",
  "analytics",
  "workflow",
  "notification",
  "realtime",
  "offline",
  "sync",
  "async",
  "api",
  "endpoint",
  "serializable",
  "bloc",
  "cubit",
  "riverpod",
  "getx",
  "hive",
  "isar",
  "freezed",
  "equatable",
  "dartz",
  "fpdart",
  "sliver",
  "scaffold",
  "appbar",
  "snackbar",
  "bottomsheet",
  "pageview",
  "tabbar",
  "listview",
  "gridview",
  "textfield",
  "checkbox",
  "radiobutton",
  "inkwell",
  "gesturedetector",
  "stateful",
  "stateless",
  "mixin",
  "typedef",
  "enum",
  "impl",
  "repo",
  "infra",
  "params",
  "args",
  "ctx",
  "btn",
  "img",
  "nav",
  "util",
  "utils",
  "validator",
  "formatter",
  "mapper",
  "adapter",
  "middleware",
  "interceptor",
  "injectable",
  "singleton",
  "multiton",
  "debounce",
  "throttle",
  "paginator",
  "pagination",
  "serializer",
  "deserializer",
  "locator",
  "localization",
  "i18n",
  "l10n",
  "dio",
  "retrofit",
  "chopper",
  "http",
  "grpc",
  "graphql",
  "websocket",
  "mqtt",
  "firebase",
  "supabase",
  "appwrite",
  "amplify",
  "crashlytics",
  "pubspec",
  "yaml",
  "json",
  "xml",
  "csv",
  "sqlite",
  "hivedb",
  "objectbox",
  "sharedpreferences",
  "securestorage",
  "keychain",
  "biometric",
  "onboarding",
  "signup",
  "signin",
  "logout",
  "otp",
  "oauth",
  "jwt",
  "uuid",
  "regex",
  "cron",
  "webhook",
  "sdk",
  "cli",
  "env",
  "devtools",
  "lottie",
  "rive",
  "svg",
  "png",
  "webp",
  "rgba",
  "argb",
  "hex",
  "datetime",
  "timestamp",
  "timezone",
  "utc",
  "nullable",
  "nonnull",
  "iterable",
  "streamable",
  "disposable",
  "cancelable",
  "listenable",
  "notifier",
  "changenotifier",
  "valuenotifier",
  "statenotifier",
  "asyncnotifier",
  "futurebuilder",
  "streambuilder",
  "valuelistenablebuilder",
  "animationcontroller",
  "tweenanimation",
  "pagecontroller",
  "scrollcontroller",
  "tabcontroller",
  "textcontroller",
  "focusnode",
  "formkey",
  "globalkey",
  "navigatorkey",
  "scaffoldkey",
  "mediaquery",
  "layoutbuilder",
  "orientationbuilder",
  "sliverappbar",
  "sliverlist",
  "slivergrid",
  "customscrollview",
  "nestedscrollview",
  "reorderablelist",
  "dismissible",
  "draggable",
  "interactivviewer",
  "repaintboundary",
  "cliprrect",
  "clipoval",
  "clippath",
  "backdropfilter",
  "colorfiltered",
  "imagefiltered",
  "shadermask",
  "custompaint",
  "custompainter",
  "renderobject",
  "renderbox",
  "widgetspan",
  "textspan",
  "richtext",
  "selectabletext",
  "editabletext",
  "autocomplete",
  "typeahead",
  "searchbar",
  "filterchip",
  "choicechip",
  "actionchip",
  "inputchip",
  "datatable",
  "paginateddatatable",
  "expansiontile",
  "expansionpanel",
  "stepper",
  "timeline",
  "carousel",
  "parallax",
  "shimmer",
  "skeleton",
  "placeholder",
  "errorwidget",
  "fallback",
  "initializer",
  "bootstrapper",
  "usecase",
  "interactor",
  "presenter",
  "viewstate",
  "uistate",
  "baserepository",
  "basedatasource",
  "baseviewmodel",
  "baseentity",
  "basefailure",
  "basemodel",
  "basestate",
  "basewidget",
  "basepage",
];
const NON_ENGLISH_FALLBACK = new Set(["cupons", "frete", "exames", "remover", "mover"]);
let _eld = null;
async function loadEld() {
  if (_eld) return _eld;
  try {
    const mod = await Promise.resolve(`${"eld/large"}`).then((s) => __importStar(require(s)));
    _eld = mod.default || mod;
    return _eld;
  } catch {
    return null;
  }
}
function isNonEnglishWord(word, eld) {
  if (NON_ENGLISH_FALLBACK.has(word.toLowerCase())) return true;
  const result = eld.detect(word);
  return result.language !== "en";
}
function breakCamelCase(identifier) {
  return identifier
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .split(/[\s_]+/)
    .filter((w) => w.length > 2)
    .filter((w) => !/^\d+$/.test(w))
    .map((w) => w.toLowerCase());
}
function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("///");
}
function extractIdentifiers(line, lineNumber) {
  const results = [];
  if (isCommentLine(line)) return results;
  const clean = line
    .replace(/\/\/.*$/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'[^']*'/g, '""')
    .replace(/"[^"]*"/g, '""')
    .replace(/r'[^']*'/g, '""')
    .replace(/r"[^"]*"/g, '""');
  if (!clean.trim()) return results;
  const classMatch = clean.match(
    /(?:abstract\s+interface\s+class|abstract\s+class|final\s+class|sealed\s+class|class)\s+([A-Za-z_]\w*)/
  );
  if (classMatch) {
    for (const word of breakCamelCase(classMatch[1])) {
      results.push({
        word,
        identifier: classMatch[1],
        type: "class",
        line: lineNumber,
        context: line.trim(),
      });
    }
  }
  const methodRe =
    /(?:Future<[^>]*>|void|String|int|double|bool|dynamic|List<[^>]*>|Map<[^,>]*,[^>]*>|Set<[^>]*>|[A-Z]\w*(?:<[^>]*>)?)\s+([a-z_]\w*)\s*\(/g;
  let m;
  while ((m = methodRe.exec(clean)) !== null) {
    const name = m[1];
    if (
      /^(get|set|build|createState|initState|dispose|toString|hashCode|main|runApp|of|from|parse|tryParse)$/.test(
        name
      )
    )
      continue;
    for (const word of breakCamelCase(name)) {
      results.push({
        word,
        identifier: name,
        type: "method",
        line: lineNumber,
        context: line.trim(),
      });
    }
  }
  const varRe =
    /(?:final|const|var|late\s+final|late)\s+(?:[A-Za-z_]\w*(?:<[^>]*>)?\s+)?([a-z_]\w*)\s*[=;]/g;
  while ((m = varRe.exec(clean)) !== null) {
    const name = m[1];
    if (/^(i|j|k|e|x|y|_)$/.test(name)) continue;
    for (const word of breakCamelCase(name)) {
      results.push({
        word,
        identifier: name,
        type: "variable",
        line: lineNumber,
        context: line.trim(),
      });
    }
  }
  return results;
}
function getVscodeWords() {
  try {
    if (!fs.existsSync(".vscode/settings.json")) return [];
    const settings = JSON.parse(fs.readFileSync(".vscode/settings.json", "utf-8"));
    return settings["cSpell.words"] || [];
  } catch {
    return [];
  }
}
exports.default = (0, _types_1.createPlugin)(
  {
    name: "spell-checker",
    description: "Verifica ortografia em identificadores Dart",
    enabled: true,
  },
  async () => {
    const danger = (0, _types_1.getDanger)();
    const dartFiles = [...danger.git.created_files, ...danger.git.modified_files].filter(
      (f) =>
        f.endsWith(".dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        !f.endsWith(".mocks.dart") &&
        !f.includes("/generated/") &&
        fs.existsSync(f)
    );
    if (dartFiles.length === 0) return;
    const tmpDir = path.join(os.tmpdir(), `danger-spell-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const wordsFile = path.join(tmpDir, "words.txt");
    const configFile = path.join(tmpDir, "cspell.json");
    try {
      const allIdentifiers = [];
      const uniqueWords = new Set();
      for (const file of dartFiles) {
        const diff = await danger.git.structuredDiffForFile(file);
        if (!diff) continue;
        for (const chunk of diff.chunks) {
          for (const change of chunk.changes) {
            if (change.type !== "add") continue;
            const lineContent = change.content?.replace(/^\+/, "") ?? "";
            const lineNum = change.ln ?? 1;
            if (lineContent.trim().startsWith("import ")) continue;
            if (lineContent.trim().startsWith("export ")) continue;
            if (lineContent.trim().startsWith("part ")) continue;
            const identifiers = extractIdentifiers(lineContent, lineNum);
            for (const id of identifiers) {
              uniqueWords.add(id.word);
              allIdentifiers.push({ ...id, file });
            }
          }
        }
      }
      if (uniqueWords.size === 0) return;
      fs.writeFileSync(wordsFile, Array.from(uniqueWords).join("\n"));
      const vscodeWords = getVscodeWords();
      const allCustomWords = [...new Set([...TECH_WORDS, ...vscodeWords])];
      const cspellConfig = {
        version: "0.2",
        language: "en",
        import: [
          "@cspell/dict-dart/cspell-ext.json",
          "@cspell/dict-flutter/cspell-ext.json",
          "@cspell/dict-software-terms/cspell-ext.json",
        ],
        dictionaries: ["dart", "flutter", "softwareTerms", "custom-terms"],
        dictionaryDefinitions: [{ name: "custom-terms", words: allCustomWords }],
      };
      fs.writeFileSync(configFile, JSON.stringify(cspellConfig, null, 2));
      let cspellOutput = "";
      try {
        (0, child_process_1.execSync)(
          `./node_modules/.bin/cspell --config ${configFile} --no-progress --no-summary ${wordsFile}`,
          { encoding: "utf-8", stdio: "pipe", timeout: 30000 }
        );
      } catch (error) {
        cspellOutput = error.stdout || "";
      }
      const misspelled = new Set();
      const regex = /words\.txt:\d+:\d+\s*-\s*Unknown word \(([^)]+)\)/g;
      let match;
      while ((match = regex.exec(cspellOutput)) !== null) {
        misspelled.add(match[1].toLowerCase());
      }
      if (misspelled.size === 0) return;
      const eld = await loadEld();
      const errorsByFile = new Map();
      for (const id of allIdentifiers) {
        if (!misspelled.has(id.word.toLowerCase())) continue;
        const reason = eld && isNonEnglishWord(id.word, eld) ? "non-english" : "typo";
        const existing = errorsByFile.get(id.file) ?? [];
        const isDup = existing.some((e) => e.word === id.word && e.line === id.line);
        if (!isDup) {
          existing.push({ ...id, reason });
          errorsByFile.set(id.file, existing);
        }
      }
      const typeMap = {
        class: "classe",
        method: "método",
        variable: "variável",
        parameter: "parâmetro",
      };
      let totalErrors = 0;
      for (const [file, errors] of errorsByFile) {
        const nonEnErrors = errors.filter((e) => e.reason === "non-english").slice(0, 10);
        const typoErrors = errors.filter((e) => e.reason === "typo").slice(0, 10);
        if (nonEnErrors.length > 0) {
          totalErrors += nonEnErrors.length;
          const items = nonEnErrors
            .map(
              (e) =>
                `\`${e.word}\` em ${typeMap[e.type] || e.type} \`${e.identifier}\` (linha ${e.line})`
            )
            .join("\n");
          (0, _types_1.sendFormattedFail)({
            title: "IDENTIFICADOR NÃO ESTÁ EM INGLÊS",
            description: `**${nonEnErrors.length} palavra(s)** em outro idioma detectada(s). Identificadores devem ser em **inglês**.`,
            problem: {
              wrong: items,
              correct: `// Renomeie para inglês`,
              wrongLabel: "Palavras não-inglês",
              correctLabel: "Ação",
            },
            action: {
              text: "Renomeie os identificadores para inglês:",
              code: `// Exemplo: usuario → user, pedido → order`,
            },
            objective: "Código em inglês facilita **manutenção** e **padronização**.",
            file,
            line: nonEnErrors[0].line,
          });
        }
        if (typoErrors.length > 0) {
          totalErrors += typoErrors.length;
          const items = typoErrors
            .map(
              (e) =>
                `\`${e.word}\` em ${typeMap[e.type] || e.type} \`${e.identifier}\` (linha ${e.line})`
            )
            .join("\n");
          (0, _types_1.sendFormattedFail)({
            title: "ERRO ORTOGRÁFICO",
            description: `**${typoErrors.length} palavra(s)** com possível typo detectada(s).`,
            problem: {
              wrong: items,
              correct: `// Corrija ou adicione ao dicionário`,
              wrongLabel: "Possíveis typos",
              correctLabel: "Ação",
            },
            action: {
              text: "Corrija o nome ou adicione ao dicionário:",
              code: `// .vscode/settings.json → "cSpell.words": ["palavra"]`,
            },
            objective: "Nomes corretos melhoram **legibilidade** do código.",
            file,
            line: typoErrors[0].line,
          });
        }
      }
      if (totalErrors > 0) {
        (0, _types_1.sendMessage)(
          `**Spell Check**: ${totalErrors} problema(s) em ${errorsByFile.size} arquivo(s)`
        );
      }
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }
);
