/**
 * Spell Checker PT-BR Plugin
 * Verifica ortografia em strings literais de arquivos Dart (português brasileiro).
 *
 * Analisa apenas linhas adicionadas no diff (não o arquivo inteiro).
 * Extrai conteúdo de strings (entre aspas) usando um parser stateful
 * que lida corretamente com aspas aninhadas, escapadas e triple-quoted.
 *
 * Usa nodehun + dictionary-pt como verificador primário (Hunspell nativo),
 * com fallback para padrões de sufixo nos casos em que o dicionário
 * VERO aceita a forma sem acento como válida.
 *
 * Detecta: erros de acentuação, cedilha, ortografia geral.
 * Sempre inclui sugestões de correção quando disponíveis.
 */
import { createPlugin, getDanger, sendFormattedFail, sendMessage } from "@types";
import * as fs from "fs";

// ---------------------------------------------------------------------------
// Nodehun lazy loader (singleton)
// ---------------------------------------------------------------------------

interface SpellChecker {
  spell(word: string): Promise<boolean>;
  suggest(word: string): Promise<string[] | null>;
}

let _spell: SpellChecker | null = null;
let _spellLoadAttempted = false;

async function loadSpell(): Promise<SpellChecker | null> {
  if (_spell) return _spell;
  if (_spellLoadAttempted) return null;
  _spellLoadAttempted = true;
  try {
    const { createRequire } = await import("module");
    const req = createRequire(__filename);
    const Nodehun = req("nodehun" as string);
    const dictMod = await import("dictionary-pt" as string);
    const dict = dictMod.default || dictMod;
    _spell = new Nodehun(dict.aff, dict.dic) as SpellChecker;
    return _spell;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Suffix pattern fallback — cobre palavras que o Hunspell VERO aceita sem acento
// ---------------------------------------------------------------------------

interface SuffixRule {
  suffix: string;
  correction: string;
  minLen: number;
}

const SUFFIX_RULES: SuffixRule[] = [
  { suffix: "cao", correction: "ção", minLen: 4 },
  { suffix: "coes", correction: "ções", minLen: 5 },
  { suffix: "sao", correction: "são", minLen: 5 },
  { suffix: "soes", correction: "sões", minLen: 6 },
  { suffix: "ario", correction: "ário", minLen: 6 },
  { suffix: "aria", correction: "ária", minLen: 6 },
  { suffix: "arios", correction: "ários", minLen: 7 },
  { suffix: "arias", correction: "árias", minLen: 7 },
  { suffix: "orio", correction: "ório", minLen: 6 },
  { suffix: "oria", correction: "ória", minLen: 6 },
  { suffix: "orios", correction: "órios", minLen: 7 },
  { suffix: "orias", correction: "órias", minLen: 7 },
  { suffix: "avel", correction: "ável", minLen: 5 },
  { suffix: "aveis", correction: "áveis", minLen: 6 },
  { suffix: "ivel", correction: "ível", minLen: 5 },
  { suffix: "iveis", correction: "íveis", minLen: 6 },
  { suffix: "encia", correction: "ência", minLen: 7 },
  { suffix: "encias", correction: "ências", minLen: 8 },
  { suffix: "ancia", correction: "ância", minLen: 7 },
  { suffix: "ancias", correction: "âncias", minLen: 8 },
];

/**
 * Palavras que o Hunspell VERO aceita sem acento (spell() → true)
 * mas que na escrita correta PRECISAM de acento.
 * Servem como fallback quando nodehun não flagga.
 */
const HUNSPELL_BLIND_SPOTS: Record<string, string> = {
  catalogo: "catálogo",
  catalogos: "catálogos",
  titulo: "título",
  titulos: "títulos",
  subtitulo: "subtítulo",
  pagina: "página",
  paginas: "páginas",
  numero: "número",
  numeros: "números",
  publico: "público",
  publica: "pública",
  publicos: "públicos",
  publicas: "públicas",
  experiencia: "experiência",
  experiencias: "experiências",
  ultimo: "último",
  ultima: "última",
  ultimos: "últimos",
  ultimas: "últimas",
  proximo: "próximo",
  proxima: "próxima",
  proximos: "próximos",
  especifico: "específico",
  especifica: "específica",
  especificos: "específicos",
  politica: "política",
  politicas: "políticas",
  pratica: "prática",
  praticas: "práticas",
  unico: "único",
  unica: "única",
  unicos: "únicos",
  periodo: "período",
  periodos: "períodos",
  minimo: "mínimo",
  maximo: "máximo",
  automatico: "automático",
  automatica: "automática",
  codigo: "código",
  codigos: "códigos",
  simbolo: "símbolo",
  analise: "análise",
  analises: "análises",
  logica: "lógica",
  tecnica: "técnica",
  tecnicas: "técnicas",
  grafico: "gráfico",
  graficos: "gráficos",
  topico: "tópico",
  topicos: "tópicos",
  dialogo: "diálogo",
  dialogos: "diálogos",
  metodo: "método",
  metodos: "métodos",
  credito: "crédito",
  creditos: "créditos",
  debito: "débito",
  debitos: "débitos",
  musica: "música",
  musicas: "músicas",
  maquina: "máquina",
  maquinas: "máquinas",
  fabrica: "fábrica",
  agua: "água",
  saida: "saída",
  saidas: "saídas",
  saude: "saúde",
  conteudo: "conteúdo",
  conteudos: "conteúdos",
  veiculo: "veículo",
  veiculos: "veículos",
  valido: "válido",
  valida: "válida",
  invalido: "inválido",
  invalida: "inválida",
  nivel: "nível",
  niveis: "níveis",
  dificil: "difícil",
  facil: "fácil",
  util: "útil",
  uteis: "úteis",
  comercio: "comércio",
};

// ---------------------------------------------------------------------------
// Accent helpers
// ---------------------------------------------------------------------------

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function hasAccent(word: string): boolean {
  return /[àáâãçéêíóôõúüÀÁÂÃÇÉÊÍÓÔÕÚÜ]/.test(word);
}

function isAccentOnlyDifference(original: string, suggestion: string): boolean {
  return stripAccents(suggestion.toLowerCase()) === stripAccents(original.toLowerCase());
}

// ---------------------------------------------------------------------------
// Stateful string parser
// ---------------------------------------------------------------------------

function resolveEscape(char: string): string {
  switch (char) {
    case "n":
    case "t":
    case "r":
      return " ";
    case "'":
    case '"':
      return char;
    case "$":
      return "";
    default:
      return " ";
  }
}

function extractStringLiterals(line: string): string[] {
  const results: string[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    if (line[i] === "/" && i + 1 < len && line[i + 1] === "/") break;

    if (line[i] === "/" && i + 1 < len && line[i + 1] === "*") {
      i += 2;
      while (i + 1 < len && !(line[i] === "*" && line[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    if (
      line[i] === "r" &&
      i + 1 < len &&
      (line[i + 1] === "'" || line[i + 1] === '"') &&
      (i === 0 || !/[a-zA-Z0-9_]/.test(line[i - 1]))
    ) {
      const q = line[i + 1];
      i += 2;
      if (i + 1 < len && line[i] === q && line[i + 1] === q) {
        i += 2;
        while (i + 2 < len && !(line[i] === q && line[i + 1] === q && line[i + 2] === q)) i++;
        i += 3;
      } else {
        while (i < len && line[i] !== q) i++;
        if (i < len) i++;
      }
      continue;
    }

    if (line[i] === "'" || line[i] === '"') {
      const q = line[i];

      if (i + 2 < len && line[i + 1] === q && line[i + 2] === q) {
        i += 3;
        let content = "";
        let closed = false;
        while (i < len) {
          if (i + 2 < len && line[i] === q && line[i + 1] === q && line[i + 2] === q) {
            i += 3;
            closed = true;
            break;
          }
          if (line[i] === "\\") {
            content += resolveEscape(line[i + 1] ?? "");
            i += 2;
            continue;
          }
          content += line[i];
          i++;
        }
        if (closed && content.trim().length >= 3) {
          results.push(cleanInterpolation(content));
        }
        continue;
      }

      i++;
      let content = "";
      let closed = false;
      while (i < len && line[i] !== q) {
        if (line[i] === "\\") {
          content += resolveEscape(line[i + 1] ?? "");
          i += 2;
          continue;
        }
        content += line[i];
        i++;
      }
      if (i < len) {
        closed = true;
        i++;
      }
      if (closed && content.trim().length >= 3) {
        results.push(cleanInterpolation(content));
      }
      continue;
    }

    i++;
  }

  return results;
}

function cleanInterpolation(content: string): string {
  return content.replace(/\$\{[^}]*\}/g, " ").replace(/\$[a-zA-Z_]\w*/g, " ");
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const NON_TEXT_PATTERNS = [
  /^package:/,
  /^dart:/,
  /^assets?\//i,
  /^images?\//i,
  /^fonts?\//i,
  /^https?:\/\//,
  /^ftp:\/\//,
  /^mailto:/,
  /^tel:/,
  /\.[a-z]{2,4}$/i,
  /^[A-Z_][A-Z0-9_]*$/,
  /^[a-z]+[A-Z][a-zA-Z]*$/,
  /^[a-z_]+(?:\.[a-z_]+)+$/,
  /^\d{4}[-/]\d{2}/,
  /^[yMdHhmsS]{2,}[-/:.\s]/,
  /^#[0-9A-Fa-f]{3,8}$/,
  /^[\d.]+$/,
  /^[a-z]{1,2}$/,
  /^\/[^\s]*$/,
  /^\{[^}]*\}$/,
  /^%[sd]/,
  /^[a-z_]+:[a-z_]+$/i,
  /^[A-Z][a-z]+(?:[A-Z][a-z]+)+$/,
  /^[0-9a-f]{8}-[0-9a-f]{4}-/i,
  /^[A-Za-z0-9+/]{20,}={0,2}$/,
  /^[a-z][a-z0-9]*_[a-z0-9_]*$/,
  /^<[a-zA-Z/].*>$/,
  /^\[.*\]$/,
  /^[-+*=<>|&!~^]+$/,
  /^\\[nrtbfv\\]$/,
  /^[a-z]+:\/\//,
  /^com\.[a-z]/i,
  /^org\.[a-z]/i,
  /^io\.[a-z]/i,
  /^[A-Z][a-z]{0,2}$/,
  /^[a-z]+\([^)]*\)$/,
];

function isNonTextString(str: string): boolean {
  return NON_TEXT_PATTERNS.some((p) => p.test(str.trim()));
}

const SKIP_WORDS = new Set([
  "app",
  "ok",
  "login",
  "logout",
  "email",
  "token",
  "chat",
  "link",
  "online",
  "offline",
  "widget",
  "click",
  "scroll",
  "swipe",
  "tap",
  "drag",
  "drop",
  "push",
  "pop",
  "get",
  "post",
  "put",
  "patch",
  "reset",
  "submit",
  "load",
  "reload",
  "save",
  "show",
  "hide",
  "skip",
  "done",
  "next",
  "back",
  "home",
  "admin",
  "guest",
  "search",
  "sort",
  "filter",
  "tag",
  "theme",
  "mode",
  "flag",
  "server",
  "client",
  "cache",
  "header",
  "web",
  "debug",
  "log",
  "build",
  "config",
  "setup",
  "init",
  "string",
  "int",
  "bool",
  "void",
  "null",
  "true",
  "false",
  "async",
  "await",
  "stream",
  "callback",
  "enum",
  "overflow",
  "scaffold",
  "dropdown",
  "checkbox",
  "snackbar",
  "tooltip",
  "bottom",
  "sheet",
  "splash",
  "wrapper",
  "container",
  "stack",
  "update",
  "insert",
  "delete",
  "remove",
  "flutter",
  "dart",
  "android",
  "ios",
  "linux",
  "macos",
  "windows",
  "feedback",
  "layout",
  "slot",
  "flex",
  "grid",
  "badge",
  "chip",
  "switch",
  "slider",
  "stepper",
  "drawer",
  "banner",
  "card",
  "icon",
  "avatar",
  "fab",
  "alert",
  "modal",
  "popover",
  "picker",
  "select",
  "input",
  "output",
  "placeholder",
  "hint",
  "label",
  "bold",
  "italic",
  "font",
  "display",
  "preview",
  "thumbnail",
  "tab",
  "bar",
  "view",
  "list",
  "row",
  "column",
  "wrap",
  "align",
  "padding",
  "margin",
  "border",
  "shadow",
  "fade",
  "slide",
  "zoom",
  "crop",
  "clip",
  "pin",
  "lock",
  "unlock",
  "add",
  "edit",
  "share",
  "download",
  "upload",
  "refresh",
  "settings",
  "profile",
  "dashboard",
  "timeline",
  "feed",
  "map",
  "super",
  "return",
  "import",
  "export",
  "class",
  "mock",
  "stub",
  "test",
  "spec",
  "assert",
  "http",
  "https",
  "ftp",
  "api",
  "sdk",
  "dev",
  "prod",
  "staging",
  "bucket",
  "blob",
  "hash",
  "key",
  "secret",
  "query",
  "param",
  "status",
  "state",
  "props",
  "context",
  "store",
  "bloc",
  "provider",
  "consumer",
  "listener",
  "observer",
  "notifier",
  "handler",
  "manager",
  "service",
  "repository",
  "controller",
]);

function isSkippableWord(word: string): boolean {
  if (word.length < 3) return true;
  if (/^\d+$/.test(word)) return true;
  if (/^[A-Z]{2,}$/.test(word)) return true;
  if (/^[a-z]+[A-Z]/.test(word)) return true;
  if (word.includes("_")) return true;
  if (word.includes("-")) return true;
  if (hasAccent(word)) return true;
  if (/\d/.test(word)) return true;
  if (SKIP_WORDS.has(word.toLowerCase())) return true;
  if (/^[A-Z][a-z]{0,2}$/.test(word)) return true;
  if (/^[a-z]+ed$/.test(word)) return true;
  if (/^[a-z]+ing$/.test(word)) return true;
  if (/^[a-z]+tion$/.test(word)) return true;
  if (/^[a-z]+ment$/.test(word)) return true;
  if (/^[a-z]+ness$/.test(word)) return true;
  if (/^[a-z]+able$/.test(word)) return true;
  if (/^[a-z]+ible$/.test(word)) return true;
  if (/^[a-z]+ful$/.test(word)) return true;
  if (/^[a-z]+less$/.test(word)) return true;
  if (/^[a-z]+ous$/.test(word)) return true;
  if (/^[a-z]+ive$/.test(word)) return true;
  if (/^[a-z]+ly$/.test(word)) return true;
  return false;
}

function isSkippableLine(line: string): boolean {
  const trimmed = line.trim();
  if (
    trimmed.startsWith("///") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("import ") ||
    trimmed.startsWith("export ") ||
    trimmed.startsWith("part ")
  ) {
    return true;
  }
  if (/^\s*@\w+/.test(trimmed)) return true;
  if (/\bassert\s*\(/.test(trimmed)) return true;
  if (/\b(?:debugPrint|print|log\.(?:d|i|w|e|v))\s*\(/.test(trimmed)) return true;
  if (/\bRegExp\s*\(/.test(trimmed)) return true;
  if (/\bcase\s+'[^']*'\s*:/.test(trimmed)) return true;
  if (/\bcase\s+"[^"]*"\s*:/.test(trimmed)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Word checking
// ---------------------------------------------------------------------------

interface CheckResult {
  suggestions: string[];
  isAccentError: boolean;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
      );
  return dp[m][n];
}

async function checkWordWithNodehun(
  word: string,
  spell: SpellChecker
): Promise<CheckResult | null> {
  const lower = word.toLowerCase();

  const isCorrect = await spell.spell(lower);
  if (isCorrect) return null;

  const suggestions = await spell.suggest(lower);
  if (!suggestions || suggestions.length === 0) return null;

  const accentMatch = suggestions.find((s) => isAccentOnlyDifference(word, s));
  if (accentMatch) {
    return { suggestions: suggestions.slice(0, 5), isAccentError: true };
  }

  const maxDist = Math.max(2, Math.floor(lower.length * 0.4));
  const closeSuggestions = suggestions.filter(
    (s) => levenshtein(lower, s.toLowerCase()) <= maxDist
  );
  if (closeSuggestions.length === 0) return null;

  return { suggestions: closeSuggestions.slice(0, 5), isAccentError: false };
}

function checkWordWithFallback(word: string): CheckResult | null {
  const lower = word.toLowerCase();

  const blind = HUNSPELL_BLIND_SPOTS[lower];
  if (blind) return { suggestions: [blind], isAccentError: true };

  for (const rule of SUFFIX_RULES) {
    if (lower.length >= rule.minLen && lower.endsWith(rule.suffix)) {
      const correction = lower.slice(0, -rule.suffix.length) + rule.correction;
      return { suggestions: [correction], isAccentError: true };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

interface SpellingError {
  word: string;
  suggestions: string[];
  isAccentError: boolean;
  line: number;
  context: string;
}

function formatSuggestions(suggestions: string[]): string {
  if (suggestions.length === 0) return "";
  if (suggestions.length === 1) return `\`${suggestions[0]}\``;
  return suggestions.map((s) => `\`${s}\``).join(", ");
}

export default createPlugin(
  {
    name: "spell-checker-ptbr",
    description: "Verifica ortografia em strings PT-BR de arquivos Dart",
    enabled: true,
  },
  async () => {
    const danger = getDanger();

    const GENERATED_SUFFIXES = [
      "_test.dart",
      ".g.dart",
      ".freezed.dart",
      ".mocks.dart",
      ".gr.dart",
      ".gen.dart",
      ".chopper.dart",
      ".graphql.dart",
      ".mapper.dart",
      ".module.dart",
      ".config.dart",
      ".reflectable.dart",
      ".tailor.dart",
    ];

    const EXCLUDED_DIRS = [
      "/generated/",
      "/l10n/",
      "/.dart_tool/",
      "/build/",
      "/test/",
      "/test_driver/",
      "/integration_test/",
    ];

    const dartFiles = [...danger.git.created_files, ...danger.git.modified_files].filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !GENERATED_SUFFIXES.some((s) => f.endsWith(s)) &&
        !EXCLUDED_DIRS.some((d) => f.includes(d)) &&
        fs.existsSync(f)
    );

    if (dartFiles.length === 0) return;

    const spell = await loadSpell();
    const errorsByFile = new Map<string, SpellingError[]>();

    for (const file of dartFiles) {
      const diff = await danger.git.structuredDiffForFile(file);
      if (!diff) continue;

      for (const chunk of diff.chunks) {
        for (const change of chunk.changes) {
          if ((change as any).type !== "add") continue;

          const lineContent = (change as any).content?.replace(/^\+/, "") ?? "";
          const lineNum = (change as any).ln ?? 1;

          if (isSkippableLine(lineContent)) continue;

          const strings = extractStringLiterals(lineContent);

          for (const str of strings) {
            if (isNonTextString(str)) continue;

            const words = str
              .split(/[\s.,;:!?()[\]{}<>/\\|@#$%^&*+=~`"'0-9]+/)
              .filter((w) => w.length >= 2);

            for (const word of words) {
              if (isSkippableWord(word)) continue;

              let result: CheckResult | null = null;

              if (spell) {
                result = await checkWordWithNodehun(word, spell);
              }

              if (!result) {
                result = checkWordWithFallback(word);
              }

              if (!result) continue;

              const existing = errorsByFile.get(file) ?? [];
              const isDup = existing.some(
                (e) => e.word === word.toLowerCase() && e.line === lineNum
              );
              if (!isDup) {
                existing.push({
                  word: word.toLowerCase(),
                  suggestions: result.suggestions,
                  isAccentError: result.isAccentError,
                  line: lineNum,
                  context: lineContent.trim(),
                });
                errorsByFile.set(file, existing);
              }
            }
          }
        }
      }
    }

    let totalErrors = 0;

    for (const [file, errors] of errorsByFile) {
      const limited = errors.slice(0, 15);
      totalErrors += limited.length;

      for (const err of limited) {
        if (err.isAccentError) {
          sendFormattedFail({
            title: "ACENTUAÇÃO INCORRETA EM STRING PT-BR",
            description: `Palavra **\`${err.word}\`** sem acentuação correta.`,
            problem: {
              wrong: `'${err.word}'`,
              correct: `'${err.suggestions[0] ?? err.word}'`,
              wrongLabel: "Encontrado",
              correctLabel: "Correto",
            },
            action: {
              text: "Corrija a acentuação:",
              code: `// '${err.word}' → '${err.suggestions[0] ?? err.word}'`,
            },
            objective: "Textos visíveis ao usuário devem ter **acentuação correta** em português.",
            file,
            line: err.line,
          });
        } else {
          sendFormattedFail({
            title: "POSSÍVEL ERRO ORTOGRÁFICO EM STRING PT-BR",
            description: `Palavra **\`${err.word}\`** com possível erro ortográfico.`,
            problem: {
              wrong: `'${err.word}'`,
              correct: formatSuggestions(err.suggestions) || "Verifique a ortografia",
              wrongLabel: "Encontrado",
              correctLabel: "Sugestões",
            },
            action: {
              text: "Verifique e corrija a ortografia:",
              code: `// '${err.word}' → '${err.suggestions[0] ?? "?"}'`,
            },
            objective:
              "Textos visíveis ao usuário devem estar com **ortografia correta** em português.",
            file,
            line: err.line,
          });
        }
      }
    }

    if (totalErrors > 0) {
      sendMessage(
        `**Spell Check PT-BR**: ${totalErrors} problema(s) de ortografia em ${errorsByFile.size} arquivo(s)`
      );
    }
  }
);
