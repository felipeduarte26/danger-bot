/**
 * Leitura do nível superior de um arquivo Dart: diretivas, declarações de tipo
 * (class, enum, mixin, extension, extension type, mixin application), typedefs,
 * funções e variáveis. Um trecho não reconhecido vira `unknown` e a leitura
 * continua no próximo `;`/`}` do nível 0 — nunca lança exceção.
 */
import { Lexed, findAtDepth0, isIdent, isPunct, matchClose, matchTypeArgs } from "./lexer";
import {
  Annotation,
  DECL_MODIFIERS,
  FieldMember,
  Member,
  OtherMember,
  TypeDecl,
  parseAnnotation,
  parseMember,
  parseTypeDecl,
} from "./syntax";

export type RawDeclKind =
  "class" | "enum" | "mixin" | "extension" | "extensionType" | "mixinApplication";

/** Declaração de tipo de nível superior. */
export interface RawTypeDecl {
  kind: RawDeclKind;
  /** `""` na extension sem nome. */
  name: string;
  /** -1 na extension sem nome. */
  nameTok: number;
  /** `class`/`enum`/`mixin`/`extension`. */
  keywordTok: number;
  /** Primeiro modificador (ou a palavra-chave). */
  headTok: number;
  /** Primeira anotação (ou `headTok`). */
  firstTok: number;
  modifiers: string[];
  annotations: Annotation[];
  isAugmentation: boolean;
  /** `<` dos parâmetros de tipo (-1 se não houver). */
  typeParamsOpenTok: number;
  /** `(` do primary constructor / representação da extension type (-1 se não houver). */
  primaryParamsOpenTok: number;
  primaryName: string | null;
  primaryIsConst: boolean;
  hasPrimary: boolean;
  /** Tokens das cláusulas (`extends`, `with`, `implements`, `on`); vazio se `end < start`. */
  clausesStartTok: number;
  clausesEndTok: number;
  /** `{` do corpo (-1 sem corpo). */
  bodyOpenTok: number;
  endTok: number;
}

export interface RawDirective {
  kind: "library" | "import" | "export" | "part" | "partOf";
  startTok: number;
  endTok: number;
}

export interface RawTypedef {
  name: string;
  nameTok: number;
  firstTok: number;
  headTok: number;
  annotations: Annotation[];
  typeParamsOpenTok: number;
  /** Tokens do tipo depois do `=` (-1 na sintaxe antiga `typedef void F(int x);`). */
  aliasStartTok: number;
  aliasEndTok: number;
  endTok: number;
}

export interface RawUnknown {
  startTok: number;
  endTok: number;
}

export interface TopLevel {
  directives: RawDirective[];
  types: RawTypeDecl[];
  typedefs: RawTypedef[];
  /** Funções, getters e setters de nível superior. */
  functions: OtherMember[];
  /** Declarações de variáveis de nível superior. */
  variables: FieldMember[];
  unknown: RawUnknown[];
}

const DIRECTIVE_WORDS = new Set(["library", "import", "export", "part"]);

/** Converte o `TypeDecl` do parser (class/enum) para a forma comum. */
export function fromTypeDecl(lx: Lexed, decl: TypeDecl): RawTypeDecl {
  const { tokens } = lx;
  const headTok = decl.keywordTok - decl.modifiers.length;
  const typeParamsOpenTok = isPunct(tokens[decl.nameTok + 1], "<") ? decl.nameTok + 1 : -1;
  let clausesStartTok: number;
  if (decl.isMixinApplication) {
    clausesStartTok = findAtDepth0(tokens, decl.nameTok, decl.endTok + 1, ["="]) + 1;
  } else if (decl.primaryParamsOpenTok >= 0) {
    clausesStartTok = matchClose(tokens, decl.primaryParamsOpenTok) + 1;
  } else if (typeParamsOpenTok >= 0) {
    clausesStartTok = matchTypeArgs(tokens, typeParamsOpenTok, tokens.length) + 1;
  } else {
    clausesStartTok = decl.nameTok + 1;
  }
  const bodyOrEnd = decl.bodyOpenTok >= 0 ? decl.bodyOpenTok : decl.endTok;
  return {
    kind: decl.isMixinApplication ? "mixinApplication" : decl.kind,
    name: decl.name,
    nameTok: decl.nameTok,
    keywordTok: decl.keywordTok,
    headTok,
    firstTok: Math.min(decl.firstTok, headTok),
    modifiers: decl.modifiers,
    annotations: decl.annotations,
    isAugmentation: isIdent(tokens[headTok - 1], "augment"),
    typeParamsOpenTok,
    primaryParamsOpenTok: decl.primaryParamsOpenTok,
    primaryName: decl.primaryName,
    primaryIsConst: decl.primaryIsConst,
    hasPrimary: decl.hasPrimary && !decl.isMixinApplication,
    clausesStartTok,
    clausesEndTok: bodyOrEnd - 1,
    bodyOpenTok: decl.bodyOpenTok,
    endTok: decl.endTok,
  };
}

/** Anotações a partir de `from`; devolve as anotações e o primeiro token depois delas. */
function readAnnotations(lx: Lexed, from: number): [Annotation[], number] {
  const annotations: Annotation[] = [];
  let p = from;
  while (isPunct(lx.tokens[p], "@")) {
    const ann = parseAnnotation(lx.tokens, p);
    if (ann === null) break;
    annotations.push(ann);
    p = ann.endTok + 1;
  }
  return [annotations, p];
}

/** `mixin`, `extension` e `extension type` (class/enum ficam com o `parseTypeDecl`). */
function parseOtherTypeDecl(
  lx: Lexed,
  keywordTok: number,
  headTok: number,
  firstTok: number,
  modifiers: string[],
  annotations: Annotation[],
  isAugmentation: boolean
): RawTypeDecl | null {
  const { tokens } = lx;
  const keyword = tokens[keywordTok].value;
  let j = keywordTok + 1;
  let kind: RawDeclKind = keyword === "mixin" ? "mixin" : "extension";
  let primaryIsConst = false;
  if (
    kind === "extension" &&
    isIdent(tokens[j], "type") &&
    (isIdent(tokens[j + 1]) || isPunct(tokens[j + 1], "<"))
  ) {
    kind = "extensionType";
    j++;
    if (isIdent(tokens[j], "const") && isIdent(tokens[j + 1])) {
      primaryIsConst = true;
      j++;
    }
  }
  let name = "";
  let nameTok = -1;
  if (isIdent(tokens[j]) && !(kind === "extension" && isIdent(tokens[j], "on"))) {
    name = tokens[j].value;
    nameTok = j;
    j++;
  } else if (kind !== "extension") {
    return null;
  }
  let typeParamsOpenTok = -1;
  if (isPunct(tokens[j], "<")) {
    const close = matchTypeArgs(tokens, j, tokens.length);
    if (close < 0) return null;
    typeParamsOpenTok = j;
    j = close + 1;
  }
  let primaryParamsOpenTok = -1;
  let primaryName: string | null = null;
  if (kind === "extensionType") {
    if (isPunct(tokens[j], ".") && isIdent(tokens[j + 1])) {
      primaryName = tokens[j + 1].value;
      j += 2;
    }
    if (!isPunct(tokens[j], "(")) return null;
    primaryParamsOpenTok = j;
    const close = matchClose(tokens, j);
    if (close < 0) return null;
    j = close + 1;
  }
  const bodyTok = findAtDepth0(tokens, j, tokens.length, ["{", ";"]);
  if (bodyTok < 0) return null;
  let endTok = bodyTok;
  let bodyOpenTok = -1;
  if (isPunct(tokens[bodyTok], "{")) {
    endTok = matchClose(tokens, bodyTok);
    if (endTok < 0) return null;
    bodyOpenTok = bodyTok;
  }
  return {
    kind,
    name,
    nameTok,
    keywordTok,
    headTok,
    firstTok,
    modifiers,
    annotations,
    isAugmentation,
    typeParamsOpenTok,
    primaryParamsOpenTok,
    primaryName,
    primaryIsConst,
    hasPrimary: primaryParamsOpenTok >= 0,
    clausesStartTok: j,
    clausesEndTok: bodyTok - 1,
    bodyOpenTok,
    endTok,
  };
}

/** Fim de um trecho não reconhecido que começa em `from` (próximo `;` ou bloco `{}` do nível 0). */
export function skipUnknown(lx: Lexed, from: number, limit: number): number {
  const { tokens } = lx;
  const stop = findAtDepth0(tokens, from, limit, [";", "{"]);
  if (stop < 0) return limit - 1;
  if (isPunct(tokens[stop], ";")) return stop;
  const close = matchClose(tokens, stop, limit);
  if (close < 0) return limit - 1;
  return isPunct(tokens[close + 1], ";") ? close + 1 : close;
}

/** Lê todo o nível superior do arquivo. */
export function scanTopLevel(lx: Lexed): TopLevel {
  const { tokens } = lx;
  const n = tokens.length;
  const result: TopLevel = {
    directives: [],
    types: [],
    typedefs: [],
    functions: [],
    variables: [],
    unknown: [],
  };
  let i = 0;
  while (i < n) {
    if (isPunct(tokens[i], ";")) {
      i++;
      continue;
    }
    const start = i;
    const [annotations, p] = readAnnotations(lx, i);
    if (p >= n) {
      result.unknown.push({ startTok: start, endTok: n - 1 });
      break;
    }
    const t = tokens[p];

    // Diretivas
    if (
      isIdent(t) &&
      DIRECTIVE_WORDS.has(t.value) &&
      !isPunct(tokens[p + 1], ".") &&
      !isPunct(tokens[p + 1], "(")
    ) {
      const end = findAtDepth0(tokens, p, n, [";"]);
      if (end < 0) {
        result.unknown.push({ startTok: start, endTok: n - 1 });
        break;
      }
      const kind =
        t.value === "part" && isIdent(tokens[p + 1], "of")
          ? "partOf"
          : (t.value as RawDirective["kind"]);
      result.directives.push({ kind, startTok: p, endTok: end });
      i = end + 1;
      continue;
    }

    // Declarações de tipo: [augment] [modificadores] class|enum|mixin|extension
    let k = p;
    const isAugmentation = isIdent(tokens[k], "augment");
    if (isAugmentation) k++;
    const modifiers: string[] = [];
    while (isIdent(tokens[k]) && DECL_MODIFIERS.has(tokens[k].value) && isIdent(tokens[k + 1])) {
      // `mixin` seguido do nome é a palavra-chave da declaração, não modificador
      if (tokens[k].value === "mixin" && !isIdent(tokens[k + 1], "class")) break;
      modifiers.push(tokens[k].value);
      k++;
    }
    const kw = tokens[k];
    if (isIdent(kw, "class") || isIdent(kw, "enum")) {
      const decl = parseTypeDecl(lx, k, start);
      if (decl !== null) {
        const raw = fromTypeDecl(lx, decl);
        raw.isAugmentation = isAugmentation;
        if (isAugmentation) raw.firstTok = Math.min(raw.firstTok, p);
        result.types.push(raw);
        i = decl.endTok + 1;
        continue;
      }
    } else if ((isIdent(kw, "mixin") || isIdent(kw, "extension")) && !isPunct(tokens[k + 1], ".")) {
      const headTok = isAugmentation ? p + 1 : p;
      const raw = parseOtherTypeDecl(
        lx,
        k,
        k - modifiers.length,
        start === p ? Math.min(p, headTok) : start,
        modifiers,
        annotations,
        isAugmentation
      );
      if (raw !== null) {
        raw.headTok = k - modifiers.length;
        raw.firstTok = annotations.length > 0 ? annotations[0].startTok : p;
        result.types.push(raw);
        i = raw.endTok + 1;
        continue;
      }
    } else if (isIdent(kw, "typedef")) {
      const end = findAtDepth0(tokens, k, n, [";"]);
      if (end >= 0) {
        let nameTok = k + 1;
        let typeParamsOpenTok = -1;
        let aliasStartTok = -1;
        let aliasEndTok = -1;
        if (
          isIdent(tokens[k + 1]) &&
          (isPunct(tokens[k + 2], "=") || isPunct(tokens[k + 2], "<"))
        ) {
          let q = k + 2;
          if (isPunct(tokens[q], "<")) {
            typeParamsOpenTok = q;
            q = matchTypeArgs(tokens, q, end) + 1;
          }
          if (isPunct(tokens[q], "=")) {
            aliasStartTok = q + 1;
            aliasEndTok = end - 1;
          }
        } else {
          // sintaxe antiga: typedef void Callback(int x); / typedef void Callback<T>(T x);
          const paren = findAtDepth0(tokens, k + 1, end, ["("]);
          nameTok = paren > k + 1 ? paren - 1 : k + 1;
          if (isPunct(tokens[nameTok], ">")) {
            // nome antes dos parâmetros de tipo: volta até o `<` correspondente
            let depth = 0;
            let lt = -1;
            for (let j = nameTok; j > k; j--) {
              if (isPunct(tokens[j], ">")) depth++;
              else if (isPunct(tokens[j], "<") && --depth === 0) {
                lt = j;
                break;
              }
            }
            nameTok = lt > k + 1 ? lt - 1 : k + 1;
          }
        }
        if (isIdent(tokens[nameTok])) {
          result.typedefs.push({
            name: tokens[nameTok].value,
            nameTok,
            firstTok: start,
            headTok: p,
            annotations,
            typeParamsOpenTok,
            aliasStartTok,
            aliasEndTok,
            endTok: end,
          });
          i = end + 1;
          continue;
        }
      }
    } else {
      // Função ou variável de nível superior
      const member: Member | null = parseMember(lx, start, n, "\0");
      if (member !== null && (member.kind === "field" || member.kind === "method")) {
        if (member.kind === "field") result.variables.push(member);
        else result.functions.push(member);
        i = member.endTok + 1;
        continue;
      }
    }
    const end = skipUnknown(lx, start, n);
    result.unknown.push({ startTok: start, endTok: end });
    i = end + 1;
  }
  return result;
}
