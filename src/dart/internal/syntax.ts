/**
 * Parser das declarações Dart (classes, enums, membros, parâmetros) sobre os
 * tokens do lexer. Uso interno do modelo em `src/dart` e do primary-constructors.
 */
import {
  Token,
  Lexed,
  isPunct,
  isIdent,
  tokText,
  matchClose,
  matchOpenBackward,
  startsTypeArgs,
  matchTypeArgs,
  findAtDepth0,
  splitTopLevelCommas,
  isExpressionEnd,
  joinTokens,
} from "./lexer";

export interface Annotation {
  name: string;
  startTok: number;
  endTok: number;
}

export interface TypeDecl {
  kind: "class" | "enum";
  name: string;
  firstTok: number;
  keywordTok: number;
  nameTok: number;
  typeParamsText: string;
  modifiers: string[];
  annotations: Annotation[];
  hasPrimary: boolean;
  isMixinApplication: boolean;
  /** `(` da lista de parâmetros do primary constructor no cabeçalho (-1 se não houver). */
  primaryParamsOpenTok: number;
  /** Nome do primary constructor (`Classe.nome`), null quando sem nome. */
  primaryName: string | null;
  primaryIsConst: boolean;
  clausesText: string;
  bodyOpenTok: number;
  endTok: number;
}

export interface FieldVar {
  name: string;
  /** Token do nome. */
  nameTok: number;
  initStartTok: number;
  initEndTok: number;
}

export interface FieldMember {
  kind: "field";
  startTok: number;
  endTok: number;
  headTok: number;
  annotations: Annotation[];
  modifiers: Set<string>;
  typeText: string | null;
  /** Intervalo de tokens do tipo declarado (-1 quando não há tipo). */
  typeStartTok: number;
  typeEndTok: number;
  vars: FieldVar[];
}

export interface InitializerElement {
  kind: "field" | "assert" | "super" | "redirect" | "unknown";
  startTok: number;
  endTok: number;
  fieldName: string | null;
  exprStartTok: number;
}

export interface ParamInfo {
  section: "positional" | "optional" | "named";
  startTok: number;
  endTok: number;
  annotations: Annotation[];
  isRequired: boolean;
  isCovariant: boolean;
  modifier: string | null;
  kind: "this" | "super" | "plain";
  typeText: string | null;
  /** Intervalo de tokens do tipo declarado (-1 quando não há tipo). */
  typeStartTok: number;
  typeEndTok: number;
  name: string;
  nameTok: number;
  /** Primeiro token do valor padrão (-1 quando não há `= valor`). */
  defaultStartTok: number;
  functionTyped: boolean;
}

export interface ConstructorMember {
  kind: "constructor";
  startTok: number;
  endTok: number;
  headTok: number;
  annotations: Annotation[];
  isConst: boolean;
  isExternal: boolean;
  isFactory: boolean;
  name: string | null;
  paramsOpenTok: number;
  paramsCloseTok: number;
  params: ParamInfo[] | null;
  initializers: InitializerElement[];
  isRedirecting: boolean;
  bodyOpenTok: number;
  bodyCloseTok: number;
}

export interface OtherMember {
  kind: "method";
  startTok: number;
  endTok: number;
  headTok: number;
  annotations: Annotation[];
  /** Nome do método/getter/setter (null para operadores). */
  name: string | null;
  /** Método comum, getter, setter ou operador. */
  memberKind: "method" | "getter" | "setter" | "operator";
  modifiers: Set<string>;
  /** Primeiro token depois dos modificadores: início do tipo de retorno. */
  declTok: number;
  /** Token do nome (no operador, o primeiro token do símbolo). */
  nameTok: number;
  /** `<` dos parâmetros de tipo do método (-1 se não houver). */
  typeParamsOpenTok: number;
  /** `(` e `)` da lista de parâmetros (-1 no getter). */
  paramsOpenTok: number;
  paramsCloseTok: number;
  /** `{` do corpo, `=>` do corpo de expressão ou `;` (sem corpo). */
  bodyTok: number;
}

/** Dados do cabeçalho de um método já identificados pelo `parseMember`. */
interface MethodHead {
  memberKind: OtherMember["memberKind"];
  modifiers: Set<string>;
  declTok: number;
  nameTok: number;
  typeParamsOpenTok: number;
}

export type Member = FieldMember | ConstructorMember | OtherMember;

export interface ParsedBody {
  members: Member[];
  /** Token `;` que encerra os valores do enum (-1 se não houver). */
  entriesEndTok: number;
}

export const DECL_MODIFIERS = new Set([
  "abstract",
  "base",
  "final",
  "interface",
  "sealed",
  "mixin",
]);

export const MEMBER_MODIFIERS = new Set([
  "external",
  "static",
  "abstract",
  "late",
  "covariant",
  "const",
  "final",
  "var",
  "augment",
]);

export function parseAnnotation(tokens: Token[], at: number): Annotation | null {
  if (!isPunct(tokens[at], "@") || !isIdent(tokens[at + 1])) return null;
  let j = at + 1;
  let name = tokens[j].value;
  j++;
  while (isPunct(tokens[j], ".") && isIdent(tokens[j + 1])) {
    name = tokens[j + 1].value;
    j += 2;
  }
  if (isPunct(tokens[j], "<")) {
    const close = matchTypeArgs(tokens, j, tokens.length);
    if (close < 0) return null;
    j = close + 1;
  }
  if (isPunct(tokens[j], "(")) {
    const close = matchClose(tokens, j);
    if (close < 0) return null;
    j = close + 1;
  }
  return { name, startTok: at, endTok: j - 1 };
}

/** Encontra as declarações `class` e `enum` de nível superior. */
export function scanTypeDeclarations(lx: Lexed): TypeDecl[] {
  const { tokens } = lx;
  const decls: TypeDecl[] = [];
  let i = 0;
  let declStart = 0;

  while (i < tokens.length) {
    const t = tokens[i];
    if (t.kind === "punct") {
      if (t.value === "(" || t.value === "[" || t.value === "{") {
        const close = matchClose(tokens, i);
        if (close < 0) return decls;
        i = close + 1;
        if (t.value === "{") declStart = i;
        continue;
      }
      if (t.value === ";") declStart = i + 1;
      i++;
      continue;
    }
    if ((t.value === "class" || t.value === "enum") && !isPunct(tokens[i - 1], ".")) {
      const decl = parseTypeDecl(lx, i, declStart);
      if (decl === null) return decls;
      decls.push(decl);
      i = decl.endTok + 1;
      declStart = i;
      continue;
    }
    i++;
  }
  return decls;
}

export function parseTypeDecl(lx: Lexed, keywordTok: number, declStart: number): TypeDecl | null {
  const { tokens } = lx;
  const kind = tokens[keywordTok].value === "class" ? "class" : "enum";

  const modifiers: string[] = [];
  let m = keywordTok - 1;
  if (kind === "class") {
    while (m >= declStart && isIdent(tokens[m]) && DECL_MODIFIERS.has(tokens[m].value)) {
      modifiers.unshift(tokens[m].value);
      m--;
    }
  }

  const annotations: Annotation[] = [];
  let a = declStart;
  while (a <= m) {
    const ann = parseAnnotation(tokens, a);
    if (ann === null) break;
    annotations.push(ann);
    a = ann.endTok + 1;
  }
  const firstTok = annotations.length > 0 ? annotations[0].startTok : m + 1;

  let j = keywordTok + 1;
  let hasPrimary = false;
  const primaryIsConst = isIdent(tokens[j], "const");
  if (primaryIsConst) {
    hasPrimary = true;
    j++;
  }
  if (!isIdent(tokens[j])) return null;
  const nameTok = j;
  j++;

  let typeParamsText = "";
  if (isPunct(tokens[j], "<")) {
    const close = matchTypeArgs(tokens, j, tokens.length);
    if (close < 0) return null;
    typeParamsText = tokText(lx, j, close);
    j = close + 1;
  }

  const base = {
    kind,
    name: tokens[nameTok].value,
    firstTok,
    keywordTok,
    nameTok,
    typeParamsText,
    modifiers,
    annotations,
  } as const;

  if (kind === "class" && isPunct(tokens[j], "=")) {
    const end = findAtDepth0(tokens, j, tokens.length, [";"]);
    if (end < 0) return null;
    return {
      ...base,
      hasPrimary,
      isMixinApplication: true,
      primaryParamsOpenTok: -1,
      primaryName: null,
      primaryIsConst,
      clausesText: "",
      bodyOpenTok: -1,
      endTok: end,
    };
  }

  let primaryName: string | null = null;
  if (isPunct(tokens[j], ".") && isIdent(tokens[j + 1]) && isPunct(tokens[j + 2], "(")) {
    hasPrimary = true;
    primaryName = tokens[j + 1].value === "new" ? null : tokens[j + 1].value;
    j += 2;
  }
  let primaryParamsOpenTok = -1;
  if (isPunct(tokens[j], "(")) {
    hasPrimary = true;
    primaryParamsOpenTok = j;
    const close = matchClose(tokens, j);
    if (close < 0) return null;
    j = close + 1;
  }

  const clausesStart = j;
  const bodyTok = findAtDepth0(tokens, j, tokens.length, ["{", ";"]);
  if (bodyTok < 0) return null;
  const clausesText = bodyTok > clausesStart ? joinTokens(lx, clausesStart, bodyTok - 1) : "";

  if (isPunct(tokens[bodyTok], ";")) {
    return {
      ...base,
      hasPrimary,
      isMixinApplication: false,
      primaryParamsOpenTok,
      primaryName,
      primaryIsConst,
      clausesText,
      bodyOpenTok: -1,
      endTok: bodyTok,
    };
  }
  const close = matchClose(tokens, bodyTok);
  if (close < 0) return null;
  return {
    ...base,
    hasPrimary,
    isMixinApplication: false,
    primaryParamsOpenTok,
    primaryName,
    primaryIsConst,
    clausesText,
    bodyOpenTok: bodyTok,
    endTok: close,
  };
}

// ---------------------------------------------------------------------------
// Membros do corpo
// ---------------------------------------------------------------------------

export function parseBody(lx: Lexed, decl: TypeDecl): ParsedBody | null {
  const { tokens } = lx;
  const limit = decl.endTok;
  let p = decl.bodyOpenTok + 1;
  let entriesEndTok = -1;

  if (decl.kind === "enum") {
    const semi = findAtDepth0(tokens, p, limit, [";"]);
    if (semi < 0) return { members: [], entriesEndTok: -1 };
    entriesEndTok = semi;
    p = semi + 1;
  }

  const members: Member[] = [];
  while (p < limit) {
    if (isPunct(tokens[p], ";")) {
      p++;
      continue;
    }
    const member = parseMember(lx, p, limit, decl.name);
    if (member === null) return null;
    members.push(member);
    p = member.endTok + 1;
  }
  return { members, entriesEndTok };
}

export function parseMember(
  lx: Lexed,
  startTok: number,
  limit: number,
  className: string
): Member | null {
  const { tokens } = lx;
  const annotations: Annotation[] = [];
  let p = startTok;
  while (isPunct(tokens[p], "@")) {
    const ann = parseAnnotation(tokens, p);
    if (ann === null) return null;
    annotations.push(ann);
    p = ann.endTok + 1;
  }
  const headTok = p;

  const modifiers = new Set<string>();
  while (p < limit && isIdent(tokens[p]) && MEMBER_MODIFIERS.has(tokens[p].value)) {
    modifiers.add(tokens[p].value);
    p++;
  }
  if (p >= limit) return null;

  const t = tokens[p];
  const isClassicCtor =
    isIdent(t, className) &&
    (isPunct(tokens[p + 1], "(") ||
      (isPunct(tokens[p + 1], ".") && isIdent(tokens[p + 2]) && isPunct(tokens[p + 3], "(")));

  if (isIdent(t, "factory") || isIdent(t, "new") || isClassicCtor) {
    return parseConstructor(lx, startTok, headTok, p, limit, modifiers, annotations, className);
  }

  // Método, getter, setter, operador ou campo.
  let q = p;
  while (q < limit) {
    const tok = tokens[q];
    if (tok.kind === "punct") {
      if (tok.value === ";" || tok.value === "=") {
        return parseField(lx, startTok, headTok, p, limit, modifiers, annotations);
      }
      if (tok.value === "=>" || tok.value === "{") return null;
      if (tok.value === "<" && q > p && tokens[q - 1].kind === "ident") {
        const close = matchTypeArgs(tokens, q, limit);
        if (close < 0) return null;
        if (isPunct(tokens[close + 1], "(")) {
          return parseMethodLike(
            lx,
            startTok,
            headTok,
            close + 1,
            limit,
            annotations,
            tokens[q - 1].value,
            { memberKind: "method", modifiers, declTok: p, nameTok: q - 1, typeParamsOpenTok: q }
          );
        }
        q = close + 1;
        continue;
      }
      if (tok.value === "(") {
        const prev = tokens[q - 1];
        const prevIsName =
          q > p &&
          prev.kind === "ident" &&
          prev.value !== "Function" &&
          !MEMBER_MODIFIERS.has(prev.value);
        if (prevIsName) {
          return parseMethodLike(lx, startTok, headTok, q, limit, annotations, prev.value, {
            memberKind: "method",
            modifiers,
            declTok: p,
            nameTok: q - 1,
            typeParamsOpenTok: -1,
          });
        }
        const close = matchClose(tokens, q, limit);
        if (close < 0) return null;
        q = close + 1;
        continue;
      }
    } else if (tok.kind === "ident") {
      if ((tok.value === "get" || tok.value === "set") && isIdent(tokens[q + 1])) {
        return parseMethodLike(
          lx,
          startTok,
          headTok,
          q + 1,
          limit,
          annotations,
          tokens[q + 1].value,
          {
            memberKind: tok.value === "get" ? "getter" : "setter",
            modifiers,
            declTok: p,
            nameTok: q + 1,
            typeParamsOpenTok: -1,
          }
        );
      }
      if (tok.value === "operator") {
        return parseMethodLike(lx, startTok, headTok, q + 1, limit, annotations, null, {
          memberKind: "operator",
          modifiers,
          declTok: p,
          nameTok: q + 1,
          typeParamsOpenTok: -1,
        });
      }
    }
    q++;
  }
  return null;
}

/**
 * Métodos, getters, setters e operadores: onde terminam, a lista de parâmetros
 * (o primeiro `(` depois do nome) e o início do corpo.
 */
export function parseMethodLike(
  lx: Lexed,
  startTok: number,
  headTok: number,
  from: number,
  limit: number,
  annotations: Annotation[],
  name: string | null,
  head: MethodHead
): OtherMember | null {
  const { tokens } = lx;
  let paramsOpenTok = -1;
  let paramsCloseTok = -1;
  const member = (endTok: number, bodyTok: number): OtherMember => ({
    kind: "method",
    startTok,
    endTok,
    headTok,
    annotations,
    name,
    ...head,
    paramsOpenTok,
    paramsCloseTok,
    bodyTok,
  });
  let j = from;
  while (j < limit) {
    const t = tokens[j];
    if (isPunct(t, "(")) {
      const close = matchClose(tokens, j, limit);
      if (close < 0) return null;
      if (paramsOpenTok < 0 && head.memberKind !== "getter") {
        paramsOpenTok = j;
        paramsCloseTok = close;
      }
      j = close + 1;
      continue;
    }
    if (isPunct(t, ";")) return member(j, j);
    if (isPunct(t, "=>")) {
      const end = findAtDepth0(tokens, j + 1, limit, [";"]);
      return end < 0 ? null : member(end, j);
    }
    if (isPunct(t, "{")) {
      const close = matchClose(tokens, j, limit);
      return close < 0 ? null : member(close, j);
    }
    j++;
  }
  return null;
}

export function parseField(
  lx: Lexed,
  startTok: number,
  headTok: number,
  declTok: number,
  limit: number,
  modifiers: Set<string>,
  annotations: Annotation[]
): FieldMember | null {
  const { tokens } = lx;
  const end = findAtDepth0(tokens, declTok, limit, [";"]);
  if (end < 0) return null;

  const chunks = splitTopLevelCommas(tokens, declTok, end - 1);
  if (chunks.length === 0) return null;

  const vars: FieldVar[] = [];
  let typeText: string | null = null;
  let typeStartTok = -1;
  let typeEndTok = -1;
  for (let c = 0; c < chunks.length; c++) {
    const [from, to] = chunks[c];
    const eq = findAtDepth0(tokens, from, to + 1, ["="]);
    const declEnd = eq >= 0 ? eq - 1 : to;
    if (declEnd < from || !isIdent(tokens[declEnd])) return null;
    if (c === 0) {
      if (declEnd > from) {
        typeText = tokText(lx, from, declEnd - 1);
        typeStartTok = from;
        typeEndTok = declEnd - 1;
      }
    } else if (declEnd !== from) {
      return null;
    }
    if (eq >= 0 && eq + 1 > to) return null;
    vars.push({
      name: tokens[declEnd].value,
      nameTok: declEnd,
      initStartTok: eq >= 0 ? eq + 1 : -1,
      initEndTok: eq >= 0 ? to : -1,
    });
  }
  return {
    kind: "field",
    startTok,
    endTok: end,
    headTok,
    annotations,
    modifiers,
    typeText,
    typeStartTok,
    typeEndTok,
    vars,
  };
}

export function parseConstructor(
  lx: Lexed,
  startTok: number,
  headTok: number,
  at: number,
  limit: number,
  modifiers: Set<string>,
  annotations: Annotation[],
  className: string
): ConstructorMember | null {
  const { tokens } = lx;
  let q = at;
  let isFactory = false;
  let name: string | null = null;

  if (isIdent(tokens[q], "factory")) {
    isFactory = true;
    q++;
    if (
      isIdent(tokens[q], className) &&
      (isPunct(tokens[q + 1], "(") || isPunct(tokens[q + 1], "."))
    ) {
      q++;
      if (isPunct(tokens[q], ".")) {
        name = tokens[q + 1].value;
        q += 2;
      }
    } else if (isIdent(tokens[q]) && isPunct(tokens[q + 1], "(")) {
      name = tokens[q].value;
      q++;
    }
  } else if (isIdent(tokens[q], "new")) {
    q++;
    if (isIdent(tokens[q]) && isPunct(tokens[q + 1], "(")) {
      name = tokens[q].value;
      q++;
    }
  } else {
    q++;
    if (isPunct(tokens[q], ".")) {
      name = tokens[q + 1].value;
      q += 2;
    }
  }

  if (!isPunct(tokens[q], "(")) return null;
  const paramsOpenTok = q;
  const paramsCloseTok = matchClose(tokens, q, limit);
  if (paramsCloseTok < 0) return null;
  q = paramsCloseTok + 1;

  const ctor: ConstructorMember = {
    kind: "constructor",
    startTok,
    endTok: -1,
    headTok,
    annotations,
    isConst: modifiers.has("const"),
    isExternal: modifiers.has("external"),
    isFactory,
    name,
    paramsOpenTok,
    paramsCloseTok,
    params: parseParams(lx, paramsOpenTok, paramsCloseTok),
    initializers: [],
    isRedirecting: false,
    bodyOpenTok: -1,
    bodyCloseTok: -1,
  };

  if (isFactory) {
    const end = findAtDepth0(tokens, q, limit, [";", "{"]);
    if (end < 0) return null;
    if (isPunct(tokens[end], ";")) {
      ctor.endTok = end;
      return ctor;
    }
    const arrow = findAtDepth0(tokens, q, end, ["=>", "="]);
    if (arrow >= 0) {
      // `=> {...}` ou `= Redirect<{...}>`: o corpo é uma expressão, termina em `;`.
      const semi = findAtDepth0(tokens, q, limit, [";"]);
      if (semi < 0) return null;
      ctor.endTok = semi;
      return ctor;
    }
    const close = matchClose(tokens, end, limit);
    if (close < 0) return null;
    ctor.endTok = close;
    return ctor;
  }

  if (isPunct(tokens[q], ";")) {
    ctor.endTok = q;
    return ctor;
  }
  if (isPunct(tokens[q], "{")) {
    ctor.bodyOpenTok = q;
    ctor.bodyCloseTok = matchClose(tokens, q, limit);
    if (ctor.bodyCloseTok < 0) return null;
    ctor.endTok = ctor.bodyCloseTok;
    return ctor;
  }
  if (!isPunct(tokens[q], ":")) return null;

  // Initializer list: termina em `;` ou no `{` do corpo (quando vem após uma expressão).
  const initStart = q + 1;
  let r = initStart;
  let initEnd = -1;
  while (r < limit) {
    const t = tokens[r];
    if (isPunct(t, ";")) {
      initEnd = r - 1;
      ctor.endTok = r;
      break;
    }
    if (isPunct(t, "=>")) return null;
    if (isPunct(t, "{") && isExpressionEnd(tokens[r - 1])) {
      initEnd = r - 1;
      ctor.bodyOpenTok = r;
      ctor.bodyCloseTok = matchClose(tokens, r, limit);
      if (ctor.bodyCloseTok < 0) return null;
      ctor.endTok = ctor.bodyCloseTok;
      break;
    }
    if (isPunct(t, "(") || isPunct(t, "[") || isPunct(t, "{")) {
      const close = matchClose(tokens, r, limit);
      if (close < 0) return null;
      r = close + 1;
      continue;
    }
    if (isPunct(t, "<") && startsTypeArgs(tokens[r - 1])) {
      const close = matchTypeArgs(tokens, r, limit);
      if (close > 0) {
        r = close + 1;
        continue;
      }
    }
    r++;
  }
  if (initEnd < initStart) return null;

  for (const [from, to] of splitTopLevelCommas(tokens, initStart, initEnd)) {
    ctor.initializers.push(classifyInitializer(tokens, from, to));
  }
  const last = ctor.initializers[ctor.initializers.length - 1];
  ctor.isRedirecting = last?.kind === "redirect";
  return ctor;
}

export function classifyInitializer(tokens: Token[], from: number, to: number): InitializerElement {
  const unknown: InitializerElement = {
    kind: "unknown",
    startTok: from,
    endTok: to,
    fieldName: null,
    exprStartTok: from,
  };
  const t = tokens[from];

  const callKind = (keywordKind: "super" | "redirect" | "assert"): InitializerElement => {
    let j = from + 1;
    if (keywordKind !== "assert" && isPunct(tokens[j], ".") && isIdent(tokens[j + 1])) j += 2;
    if (!isPunct(tokens[j], "(")) return unknown;
    const close = matchClose(tokens, j, to + 1);
    return close === to ? { ...unknown, kind: keywordKind } : unknown;
  };

  if (isIdent(t, "super")) return callKind("super");
  if (isIdent(t, "assert")) return callKind("assert");
  if (isIdent(t, "this") && !isPunct(tokens[from + 2], "=")) {
    if (isPunct(tokens[from + 1], "(") || isPunct(tokens[from + 3], "("))
      return callKind("redirect");
  }

  let nameTok = from;
  if (isIdent(t, "this") && isPunct(tokens[from + 1], ".")) nameTok = from + 2;
  if (!isIdent(tokens[nameTok]) || !isPunct(tokens[nameTok + 1], "=") || nameTok + 2 > to)
    return unknown;
  return {
    kind: "field",
    startTok: from,
    endTok: to,
    fieldName: tokens[nameTok].value,
    exprStartTok: nameTok + 2,
  };
}

export function parseParams(lx: Lexed, open: number, close: number): ParamInfo[] | null {
  const { tokens } = lx;
  const params: ParamInfo[] = [];
  let q = open + 1;

  const addChunks = (from: number, to: number, section: ParamInfo["section"]): boolean => {
    for (const [a, b] of splitTopLevelCommas(tokens, from, to)) {
      const param = parseParam(lx, a, b, section);
      if (param === null) return false;
      params.push(param);
    }
    return true;
  };

  while (q < close) {
    if (isPunct(tokens[q], "[") || isPunct(tokens[q], "{")) {
      const groupClose = matchClose(tokens, q, close);
      if (groupClose < 0) return null;
      const section = tokens[q].value === "[" ? "optional" : "named";
      if (!addChunks(q + 1, groupClose - 1, section)) return null;
      q = groupClose + 1;
      while (isPunct(tokens[q], ",")) q++;
      return q === close ? params : null;
    }
    const comma = findAtDepth0(tokens, q, close, [","]);
    const chunkEnd = comma < 0 ? close - 1 : comma - 1;
    if (chunkEnd < q) return null;
    const param = parseParam(lx, q, chunkEnd, "positional");
    if (param === null) return null;
    params.push(param);
    q = comma < 0 ? close : comma + 1;
  }
  return params;
}

export function parseParam(
  lx: Lexed,
  from: number,
  to: number,
  section: ParamInfo["section"]
): ParamInfo | null {
  const { tokens } = lx;
  const annotations: Annotation[] = [];
  let q = from;
  while (isPunct(tokens[q], "@")) {
    const ann = parseAnnotation(tokens, q);
    if (ann === null || ann.endTok >= to) return null;
    annotations.push(ann);
    q = ann.endTok + 1;
  }
  let isRequired = false;
  if (isIdent(tokens[q], "required")) {
    isRequired = true;
    q++;
  }
  let isCovariant = false;
  if (isIdent(tokens[q], "covariant")) {
    isCovariant = true;
    q++;
  }
  let modifier: string | null = null;
  if (isIdent(tokens[q]) && ["final", "var", "const"].includes(tokens[q].value)) {
    modifier = tokens[q].value;
    q++;
  }
  if (q > to) return null;

  const eq = findAtDepth0(tokens, q, to + 1, ["="]);
  const declEnd = eq >= 0 ? eq - 1 : to;
  if (declEnd < q) return null;
  if (eq >= 0 && eq + 1 > to) return null;

  const base = {
    section,
    startTok: from,
    endTok: to,
    annotations,
    isRequired,
    isCovariant,
    modifier,
    defaultStartTok: eq >= 0 ? eq + 1 : -1,
  };

  for (let k = q; k + 2 <= declEnd; k++) {
    if (
      (isIdent(tokens[k], "this") || isIdent(tokens[k], "super")) &&
      isPunct(tokens[k + 1], ".")
    ) {
      if (!isIdent(tokens[k + 2])) return null;
      let after = k + 3;
      let functionTyped = false;
      if (after <= declEnd && isPunct(tokens[after], "(")) {
        const close = matchClose(tokens, after, declEnd + 1);
        if (close < 0) return null;
        functionTyped = true;
        after = close + 1;
        if (after <= declEnd && isPunct(tokens[after], "?")) after++;
      }
      if (after !== declEnd + 1) return null;
      return {
        ...base,
        kind: tokens[k].value === "this" ? "this" : "super",
        typeText: k > q ? tokText(lx, q, k - 1) : null,
        typeStartTok: k > q ? q : -1,
        typeEndTok: k > q ? k - 1 : -1,
        name: tokens[k + 2].value,
        nameTok: k + 2,
        functionTyped,
      };
    }
  }

  let last = declEnd;
  let functionTyped = false;
  if (isPunct(tokens[last], "?") && isPunct(tokens[last - 1], ")")) last--;
  if (isPunct(tokens[last], ")")) {
    const open = matchOpenBackward(tokens, last, q);
    if (open <= q) return null;
    functionTyped = true;
    last = open - 1;
  }
  // `required` é palavra contextual: como modificador já foi consumido acima, aqui é o nome.
  if (!isIdent(tokens[last]) || ["this", "super"].includes(tokens[last].value)) return null;
  return {
    ...base,
    kind: "plain",
    typeText: last > q ? tokText(lx, q, last - 1) : null,
    typeStartTok: last > q ? q : -1,
    typeEndTok: last > q ? last - 1 : -1,
    name: tokens[last].value,
    nameTok: last,
    functionTyped,
  };
}
