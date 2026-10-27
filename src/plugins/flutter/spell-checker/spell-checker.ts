/**
 * Spell Checker Plugin
 * Verifica ortografia em identificadores Dart usando cspell.
 *
 * Analisa apenas os nomes declarados nas linhas adicionadas do PR:
 *   - classes;
 *   - métodos, funções e funções locais com tipo de retorno escrito
 *     (getters, setters, operadores e `build`, `dispose`, `toString`... ficam de fora);
 *   - variáveis, campos e parâmetros declarados com `final`, `const`, `var` ou `late`
 *     (exceto a variável do `for-in` e `i`, `j`, `k`, `e`, `x`, `y`, `_`).
 * Comentários e strings nunca contam. Cada nome é quebrado em palavras
 * (camelCase/snake_case); palavras com até 2 letras e números ficam de fora.
 *
 * Agrupa erros por arquivo para evitar ruído excessivo (máx. 10 por motivo).
 */
import {
  DartBody,
  DartFile,
  DartFunction,
  DartMemberKind,
  DartParameter,
  DartParameterSource,
  DartText,
  DartType,
  DartTypeKind,
  DartVariable,
  createPlugin,
  sendFormattedFail,
  sendMessage,
} from "@types";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { importModule } from "../../../native-import";

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

let _eld: { detect: (text: string) => { language: string } } | null = null;

async function loadEld(): Promise<typeof _eld> {
  if (_eld) return _eld;
  try {
    const mod = await importModule("eld/large");
    _eld = mod.eld ?? mod.default;
    return _eld;
  } catch {
    return null;
  }
}

/**
 * Idiomas que contam como "não está em inglês". Palavra solta o eld detecta mal:
 * qualquer idioma ≠ en rotulava 6 de 10 typos em inglês (`paramter` → de,
 * `contoller` → fr) como outro idioma. Só PT/ES (o caso do time) não erra typos.
 */
const NON_ENGLISH_LANGS = new Set(["pt", "es"]);

function isNonEnglishWord(word: string, eld: NonNullable<typeof _eld>): boolean {
  if (NON_ENGLISH_FALLBACK.has(word.toLowerCase())) return true;
  return NON_ENGLISH_LANGS.has(eld.detect(word).language);
}

interface IdentifierInfo {
  word: string;
  identifier: string;
  type: string;
  line: number;
}

/** Gerados que o plugin não verifica (os outros, como `.gen.dart`, são verificados). */
const SKIPPED_SUFFIXES = [".g.dart", ".freezed.dart", ".mocks.dart"];

/** Ordem dos nomes de uma mesma linha nas mensagens: classe, métodos, variáveis. */
const TYPE_ORDER = ["class", "method", "variable"];

/** Métodos que o Flutter/Dart impõem ou que são comuns demais para verificar. */
const IGNORED_METHODS = new Set([
  "get",
  "set",
  "build",
  "createState",
  "initState",
  "dispose",
  "toString",
  "hashCode",
  "main",
  "runApp",
  "of",
  "from",
  "parse",
  "tryParse",
]);

/** Variáveis de laço e de catch curtas demais para verificar. */
const IGNORED_VARIABLES = new Set(["i", "j", "k", "e", "x", "y", "_"]);

/**
 * Tipo "simples": nomeado e sem genérico aninhado (`User`, `Future<User>`, `Map<String, dynamic>`).
 * É o escopo que o plugin sempre verificou: tipo de função, record e genérico aninhado
 * (`Future<Either<F, X>>`) deixam o nome de fora. Mantido para não aumentar as reprovações.
 */
function isSimpleType(type: DartType): boolean {
  return (
    type.kind === DartTypeKind.Named &&
    type.typeArguments.every((arg) => !arg.some((t) => t.typeArguments.length > 0))
  );
}

/** Método/função com tipo de retorno escrito, simples e não nulo (`Future<User> load()`). */
function isCheckedFunction(fn: DartFunction): boolean {
  return (
    fn.memberKind === DartMemberKind.Method &&
    fn.returnType !== null &&
    !fn.returnType.isNullable &&
    isSimpleType(fn.returnType) &&
    !IGNORED_METHODS.has(fn.name)
  );
}

/** Variável/campo com `final`/`const`/`var`/`late` e sem tipo ou com tipo simples. */
function isCheckedVariable(v: DartVariable): boolean {
  return (
    (v.isFinal || v.isConst || v.isVar || v.isLate) &&
    (v.type === null || isSimpleType(v.type)) &&
    !IGNORED_VARIABLES.has(v.name)
  );
}

/** Parâmetro com `final` (`(final String name)`), sem tipo ou com tipo simples. */
function isCheckedParameter(p: DartParameter): boolean {
  return p.isFinal && (p.type === null || isSimpleType(p.type)) && !IGNORED_VARIABLES.has(p.name);
}

/** Nomes declarados no arquivo que o plugin verifica, por linha (classe, métodos, variáveis). */
function declaredNames(file: DartFile): { name: string; type: string; line: number }[] {
  const found: { name: string; type: string; line: number; column: number }[] = [];
  const add = (type: string, name: string, line: number, column: number): void => {
    found.push({ name, type, line, column });
  };

  const functions: DartFunction[] = [...file.functions];
  const parameters: DartParameter[] = [];
  const bodies: DartBody[] = [];

  for (const cls of file.classes) add("class", cls.name, cls.nameLine, cls.column);
  for (const decl of file.declarations) {
    // os parâmetros `final`/`var` do primary constructor estão em `fields`
    for (const field of decl.fields) {
      if (isCheckedVariable(field)) add("variable", field.name, field.nameLine, field.column);
    }
    functions.push(...decl.methods);
    for (const ctor of decl.constructors) {
      parameters.push(...ctor.parameters.filter((p) => p.source !== DartParameterSource.Declaring));
      if (ctor.body) bodies.push(ctor.body);
    }
  }
  for (const v of file.variables) {
    if (isCheckedVariable(v)) add("variable", v.name, v.nameLine, v.column);
  }
  for (const fn of functions) {
    if (isCheckedFunction(fn)) add("method", fn.name, fn.nameLine, fn.column);
    parameters.push(...fn.parameters);
    if (fn.body) bodies.push(fn.body);
  }
  // closures e funções locais de todo o arquivo, inclusive em inicializadores
  for (const closure of file.closures()) {
    // o modelo não diz se a função local tem tipo de retorno: todas contam
    if (closure.name !== null && !IGNORED_METHODS.has(closure.name)) {
      add("method", closure.name, closure.line, closure.column);
    }
    parameters.push(...closure.parameters);
    bodies.push(closure.body);
  }
  for (const p of parameters) {
    if (isCheckedParameter(p)) add("variable", p.name, p.nameLine, p.column);
  }
  // o corpo de um método também lista as variáveis das closures dele: uma vez cada
  const seenLocals = new Set<string>();
  for (const body of bodies) {
    for (const v of body.localVariables) {
      const key = `${v.startOffset}:${v.name}`;
      if (seenLocals.has(key)) continue;
      seenLocals.add(key);
      // `for (final item in items)`: a variável do for-in nunca foi verificada
      if (v.isLoopVariable && v.initializer === null) continue;
      if (isCheckedVariable(v)) add("variable", v.name, v.nameLine, v.column);
    }
  }

  return found.sort(
    (a, b) =>
      a.line - b.line ||
      TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
      a.column - b.column
  );
}

/** Palavras com mais de 2 letras, sem números: `fetchHTTPData2` → `fetch`, `http`, `data2`. */
function identifierWords(identifier: string): string[] {
  return DartText.splitWords(identifier).filter((w) => w.length > 2 && !/^\d+$/.test(w));
}

function getVscodeWords(): string[] {
  try {
    if (!fs.existsSync(".vscode/settings.json")) return [];
    const settings = JSON.parse(fs.readFileSync(".vscode/settings.json", "utf-8"));
    return settings["cSpell.words"] || [];
  } catch {
    return [];
  }
}

export default createPlugin(
  {
    name: "spell-checker",
    description: "Verifica ortografia em identificadores Dart",
    enabled: true,
  },
  async () => {
    // Fora: `_test.dart`, `.g`, `.freezed`, `.mocks` e `generated/`. Os outros gerados
    // (`.gen`, `.config`...) e os auxiliares de `test/` entram.
    const dartFiles = DartFile.changed({
      createdFirst: true,
      includeTests: true,
      includeGenerated: true,
    }).filter(
      ({ path: p }) =>
        !p.fileName.endsWith("_test.dart") &&
        !SKIPPED_SUFFIXES.includes(p.compoundSuffix ?? "") &&
        !p.inFolder("generated")
    );

    if (dartFiles.length === 0) return;

    const tmpDir = path.join(os.tmpdir(), `danger-spell-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const wordsFile = path.join(tmpDir, "words.txt");
    const configFile = path.join(tmpDir, "cspell.json");

    try {
      const allIdentifiers: (IdentifierInfo & { file: string })[] = [];
      const uniqueWords = new Set<string>();

      for (const { path: p } of dartFiles) {
        const file = await DartFile.readWithDiff(p.path);

        for (const { name, type, line } of declaredNames(file)) {
          if (!file.isAdded(line)) continue;
          for (const word of identifierWords(name)) {
            uniqueWords.add(word);
            allIdentifiers.push({ word, identifier: name, type, line, file: p.path });
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
        execSync(
          // --root: o cspell ignora arquivos fora da raiz (cwd por padrão) — sem isso o
          // words.txt do tmpdir não era verificado e o plugin nunca reportava nada
          `./node_modules/.bin/cspell --config ${configFile} --root ${tmpDir} --no-progress --no-summary ${wordsFile}`,
          { encoding: "utf-8", stdio: "pipe", timeout: 30000 }
        );
      } catch (error: any) {
        cspellOutput = error.stdout || "";
      }

      const misspelled = new Set<string>();
      const regex = /words\.txt:\d+:\d+\s*-\s*Unknown word \(([^)]+)\)/g;
      let match;
      while ((match = regex.exec(cspellOutput)) !== null) {
        misspelled.add(match[1].toLowerCase());
      }

      if (misspelled.size === 0) return;

      const eld = await loadEld();

      type TaggedId = IdentifierInfo & { file: string; reason: "typo" | "non-english" };
      const errorsByFile = new Map<string, TaggedId[]>();

      for (const id of allIdentifiers) {
        if (!misspelled.has(id.word.toLowerCase())) continue;

        const reason: "typo" | "non-english" =
          eld && isNonEnglishWord(id.word, eld) ? "non-english" : "typo";

        const existing = errorsByFile.get(id.file) ?? [];
        const isDup = existing.some((e) => e.word === id.word && e.line === id.line);
        if (!isDup) {
          existing.push({ ...id, reason });
          errorsByFile.set(id.file, existing);
        }
      }

      const typeMap: Record<string, string> = {
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

          sendFormattedFail({
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

          sendFormattedFail({
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
        sendMessage(
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
