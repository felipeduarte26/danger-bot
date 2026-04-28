/**
 * Boolean Naming Convention Plugin
 *
 * Verifica se nomes de propriedades/variáveis/getters bool seguem o Effective Dart:
 * - PREFER a non-imperative verb phrase for a boolean property or variable
 * - Bons prefixos: is, has, can, should, was, will, must, does, did
 * - Nomes imperativos (verbos de ação) são flagrados: showPopup, deleteItem
 * - Adjetivos são aceitos: visible, enabled, active
 *
 * Usa wordpos (WordNet) para detecção gramatical, minimizando falsos positivos.
 *
 * @see https://dart.dev/effective-dart/design#prefer-a-non-imperative-verb-phrase-for-a-boolean-property-or-variable
 */
import { createPlugin, getDanger, sendFormattedFail } from "@types";
import * as fs from "fs";

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

const BOOL_FIELD_REGEX = /(?:final\s+)?bool(?:\?)?\s+(?!Function)(\w+)\s*[=;,)]/;

const BOOL_GETTER_REGEX = /bool\s+get\s+(\w+)/;

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

function findCommentStart(line: string): number {
  let inString = false;
  let stringChar = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inString) {
      if (ch === "\\" && i + 1 < line.length) {
        i++;
        continue;
      }
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "/" && i + 1 < line.length && line[i + 1] === "/") return i;
  }
  return -1;
}

function isInsideString(line: string): boolean {
  const trimmed = line.trim();
  const tripleQuotes = ["'''", '"""', "r'''", 'r"""'];
  for (const q of tripleQuotes) {
    if (trimmed.startsWith(q)) return true;
  }
  return false;
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

    const { git } = getDanger();
    const allFiles = [...git.created_files, ...git.modified_files];

    const dartFiles = allFiles.filter(
      (f: string) =>
        f.endsWith(".dart") &&
        !f.endsWith("_test.dart") &&
        !f.endsWith(".g.dart") &&
        !f.endsWith(".freezed.dart") &&
        !f.includes("/generated/") &&
        fs.existsSync(f)
    );

    if (dartFiles.length === 0) return;

    const violations: BoolNamingViolation[] = [];

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      let inBlockComment = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (inBlockComment) {
          if (line.includes("*/")) inBlockComment = false;
          continue;
        }

        if (line.startsWith("/*")) {
          if (!line.includes("*/")) inBlockComment = true;
          continue;
        }

        if (
          line.startsWith("//") ||
          line.startsWith("///") ||
          line.startsWith("*") ||
          line.startsWith("'") ||
          line.startsWith('"') ||
          line.startsWith("r'") ||
          line.startsWith('r"')
        )
          continue;

        const rawLine = lines[i];
        const commentIdx = findCommentStart(rawLine);
        const codePart = commentIdx >= 0 ? rawLine.substring(0, commentIdx).trim() : line;
        if (codePart.length === 0) continue;

        if (isInsideString(rawLine)) continue;

        let name: string | null = null;
        let kind: "field" | "getter" = "field";

        const getterMatch = codePart.match(BOOL_GETTER_REGEX);
        if (getterMatch) {
          name = getterMatch[1];
          kind = "getter";
        }

        if (!name) {
          const fieldMatch = codePart.match(BOOL_FIELD_REGEX);
          if (fieldMatch) {
            name = fieldMatch[1];
            kind = "field";
          }
        }

        if (!name) continue;

        const cleanName = name.replace(/^_+/, "");
        if (cleanName.length < 3) continue;

        const words = splitCamelCase(name);
        if (words.length === 0) continue;

        const firstWord = words[0];

        if (GOOD_PREFIXES.has(firstWord)) continue;

        if (GOOD_ADJECTIVES.has(cleanName.toLowerCase())) continue;
        if (GOOD_ADJECTIVES.has(firstWord)) continue;

        if (IMPERATIVE_VERBS.has(firstWord)) {
          violations.push({ file, name, line: i + 1, firstWord, kind });
          continue;
        }

        try {
          const isAdj = await wp.isAdjective(firstWord);
          if (isAdj) continue;

          const isVerb = await wp.isVerb(firstWord);
          if (!isVerb) continue;

          const isNoun = await wp.isNoun(firstWord);
          if (isNoun) continue;

          violations.push({ file, name, line: i + 1, firstWord, kind });
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
