"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEMBER_MODIFIERS = exports.DECL_MODIFIERS = void 0;
exports.parseAnnotation = parseAnnotation;
exports.scanTypeDeclarations = scanTypeDeclarations;
exports.parseTypeDecl = parseTypeDecl;
exports.parseBody = parseBody;
exports.parseMember = parseMember;
exports.parseMethodLike = parseMethodLike;
exports.parseField = parseField;
exports.parseConstructor = parseConstructor;
exports.classifyInitializer = classifyInitializer;
exports.parseParams = parseParams;
exports.parseParam = parseParam;
/**
 * Parser das declarações Dart (classes, enums, membros, parâmetros) sobre os
 * tokens do lexer. Uso interno do modelo em `src/dart` e do primary-constructors.
 */
const lexer_1 = require("./lexer");
exports.DECL_MODIFIERS = new Set(["abstract", "base", "final", "interface", "sealed", "mixin"]);
exports.MEMBER_MODIFIERS = new Set([
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
function parseAnnotation(tokens, at) {
  if (!(0, lexer_1.isPunct)(tokens[at], "@") || !(0, lexer_1.isIdent)(tokens[at + 1])) return null;
  let j = at + 1;
  let name = tokens[j].value;
  j++;
  while ((0, lexer_1.isPunct)(tokens[j], ".") && (0, lexer_1.isIdent)(tokens[j + 1])) {
    name = tokens[j + 1].value;
    j += 2;
  }
  if ((0, lexer_1.isPunct)(tokens[j], "<")) {
    const close = (0, lexer_1.matchTypeArgs)(tokens, j, tokens.length);
    if (close < 0) return null;
    j = close + 1;
  }
  if ((0, lexer_1.isPunct)(tokens[j], "(")) {
    const close = (0, lexer_1.matchClose)(tokens, j);
    if (close < 0) return null;
    j = close + 1;
  }
  return { name, startTok: at, endTok: j - 1 };
}
/** Encontra as declarações `class` e `enum` de nível superior. */
function scanTypeDeclarations(lx) {
  const { tokens } = lx;
  const decls = [];
  let i = 0;
  let declStart = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.kind === "punct") {
      if (t.value === "(" || t.value === "[" || t.value === "{") {
        const close = (0, lexer_1.matchClose)(tokens, i);
        if (close < 0) return decls;
        i = close + 1;
        if (t.value === "{") declStart = i;
        continue;
      }
      if (t.value === ";") declStart = i + 1;
      i++;
      continue;
    }
    if ((t.value === "class" || t.value === "enum") && !(0, lexer_1.isPunct)(tokens[i - 1], ".")) {
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
function parseTypeDecl(lx, keywordTok, declStart) {
  const { tokens } = lx;
  const kind = tokens[keywordTok].value === "class" ? "class" : "enum";
  const modifiers = [];
  let m = keywordTok - 1;
  if (kind === "class") {
    while (
      m >= declStart &&
      (0, lexer_1.isIdent)(tokens[m]) &&
      exports.DECL_MODIFIERS.has(tokens[m].value)
    ) {
      modifiers.unshift(tokens[m].value);
      m--;
    }
  }
  const annotations = [];
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
  const primaryIsConst = (0, lexer_1.isIdent)(tokens[j], "const");
  if (primaryIsConst) {
    hasPrimary = true;
    j++;
  }
  if (!(0, lexer_1.isIdent)(tokens[j])) return null;
  const nameTok = j;
  j++;
  let typeParamsText = "";
  if ((0, lexer_1.isPunct)(tokens[j], "<")) {
    const close = (0, lexer_1.matchTypeArgs)(tokens, j, tokens.length);
    if (close < 0) return null;
    typeParamsText = (0, lexer_1.tokText)(lx, j, close);
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
  };
  if (kind === "class" && (0, lexer_1.isPunct)(tokens[j], "=")) {
    const end = (0, lexer_1.findAtDepth0)(tokens, j, tokens.length, [";"]);
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
  let primaryName = null;
  if (
    (0, lexer_1.isPunct)(tokens[j], ".") &&
    (0, lexer_1.isIdent)(tokens[j + 1]) &&
    (0, lexer_1.isPunct)(tokens[j + 2], "(")
  ) {
    hasPrimary = true;
    primaryName = tokens[j + 1].value === "new" ? null : tokens[j + 1].value;
    j += 2;
  }
  let primaryParamsOpenTok = -1;
  if ((0, lexer_1.isPunct)(tokens[j], "(")) {
    hasPrimary = true;
    primaryParamsOpenTok = j;
    const close = (0, lexer_1.matchClose)(tokens, j);
    if (close < 0) return null;
    j = close + 1;
  }
  const clausesStart = j;
  const bodyTok = (0, lexer_1.findAtDepth0)(tokens, j, tokens.length, ["{", ";"]);
  if (bodyTok < 0) return null;
  const clausesText =
    bodyTok > clausesStart ? (0, lexer_1.joinTokens)(lx, clausesStart, bodyTok - 1) : "";
  if ((0, lexer_1.isPunct)(tokens[bodyTok], ";")) {
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
  const close = (0, lexer_1.matchClose)(tokens, bodyTok);
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
function parseBody(lx, decl) {
  const { tokens } = lx;
  const limit = decl.endTok;
  let p = decl.bodyOpenTok + 1;
  let entriesEndTok = -1;
  if (decl.kind === "enum") {
    const semi = (0, lexer_1.findAtDepth0)(tokens, p, limit, [";"]);
    if (semi < 0) return { members: [], entriesEndTok: -1 };
    entriesEndTok = semi;
    p = semi + 1;
  }
  const members = [];
  while (p < limit) {
    if ((0, lexer_1.isPunct)(tokens[p], ";")) {
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
function parseMember(lx, startTok, limit, className) {
  const { tokens } = lx;
  const annotations = [];
  let p = startTok;
  while ((0, lexer_1.isPunct)(tokens[p], "@")) {
    const ann = parseAnnotation(tokens, p);
    if (ann === null) return null;
    annotations.push(ann);
    p = ann.endTok + 1;
  }
  const headTok = p;
  const modifiers = new Set();
  while (
    p < limit &&
    (0, lexer_1.isIdent)(tokens[p]) &&
    exports.MEMBER_MODIFIERS.has(tokens[p].value)
  ) {
    modifiers.add(tokens[p].value);
    p++;
  }
  if (p >= limit) return null;
  const t = tokens[p];
  const isClassicCtor =
    (0, lexer_1.isIdent)(t, className) &&
    ((0, lexer_1.isPunct)(tokens[p + 1], "(") ||
      ((0, lexer_1.isPunct)(tokens[p + 1], ".") &&
        (0, lexer_1.isIdent)(tokens[p + 2]) &&
        (0, lexer_1.isPunct)(tokens[p + 3], "(")));
  if ((0, lexer_1.isIdent)(t, "factory") || (0, lexer_1.isIdent)(t, "new") || isClassicCtor) {
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
        const close = (0, lexer_1.matchTypeArgs)(tokens, q, limit);
        if (close < 0) return null;
        if ((0, lexer_1.isPunct)(tokens[close + 1], "(")) {
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
          !exports.MEMBER_MODIFIERS.has(prev.value);
        if (prevIsName) {
          return parseMethodLike(lx, startTok, headTok, q, limit, annotations, prev.value, {
            memberKind: "method",
            modifiers,
            declTok: p,
            nameTok: q - 1,
            typeParamsOpenTok: -1,
          });
        }
        const close = (0, lexer_1.matchClose)(tokens, q, limit);
        if (close < 0) return null;
        q = close + 1;
        continue;
      }
    } else if (tok.kind === "ident") {
      if ((tok.value === "get" || tok.value === "set") && (0, lexer_1.isIdent)(tokens[q + 1])) {
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
function parseMethodLike(lx, startTok, headTok, from, limit, annotations, name, head) {
  const { tokens } = lx;
  let paramsOpenTok = -1;
  let paramsCloseTok = -1;
  const member = (endTok, bodyTok) => ({
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
    if ((0, lexer_1.isPunct)(t, "(")) {
      const close = (0, lexer_1.matchClose)(tokens, j, limit);
      if (close < 0) return null;
      if (paramsOpenTok < 0 && head.memberKind !== "getter") {
        paramsOpenTok = j;
        paramsCloseTok = close;
      }
      j = close + 1;
      continue;
    }
    if ((0, lexer_1.isPunct)(t, ";")) return member(j, j);
    if ((0, lexer_1.isPunct)(t, "=>")) {
      const end = (0, lexer_1.findAtDepth0)(tokens, j + 1, limit, [";"]);
      return end < 0 ? null : member(end, j);
    }
    if ((0, lexer_1.isPunct)(t, "{")) {
      const close = (0, lexer_1.matchClose)(tokens, j, limit);
      return close < 0 ? null : member(close, j);
    }
    j++;
  }
  return null;
}
function parseField(lx, startTok, headTok, declTok, limit, modifiers, annotations) {
  const { tokens } = lx;
  const end = (0, lexer_1.findAtDepth0)(tokens, declTok, limit, [";"]);
  if (end < 0) return null;
  const chunks = (0, lexer_1.splitTopLevelCommas)(tokens, declTok, end - 1);
  if (chunks.length === 0) return null;
  const vars = [];
  let typeText = null;
  let typeStartTok = -1;
  let typeEndTok = -1;
  for (let c = 0; c < chunks.length; c++) {
    const [from, to] = chunks[c];
    const eq = (0, lexer_1.findAtDepth0)(tokens, from, to + 1, ["="]);
    const declEnd = eq >= 0 ? eq - 1 : to;
    if (declEnd < from || !(0, lexer_1.isIdent)(tokens[declEnd])) return null;
    if (c === 0) {
      if (declEnd > from) {
        typeText = (0, lexer_1.tokText)(lx, from, declEnd - 1);
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
function parseConstructor(lx, startTok, headTok, at, limit, modifiers, annotations, className) {
  const { tokens } = lx;
  let q = at;
  let isFactory = false;
  let name = null;
  if ((0, lexer_1.isIdent)(tokens[q], "factory")) {
    isFactory = true;
    q++;
    if (
      (0, lexer_1.isIdent)(tokens[q], className) &&
      ((0, lexer_1.isPunct)(tokens[q + 1], "(") || (0, lexer_1.isPunct)(tokens[q + 1], "."))
    ) {
      q++;
      if ((0, lexer_1.isPunct)(tokens[q], ".")) {
        name = tokens[q + 1].value;
        q += 2;
      }
    } else if ((0, lexer_1.isIdent)(tokens[q]) && (0, lexer_1.isPunct)(tokens[q + 1], "(")) {
      name = tokens[q].value;
      q++;
    }
  } else if ((0, lexer_1.isIdent)(tokens[q], "new")) {
    q++;
    if ((0, lexer_1.isIdent)(tokens[q]) && (0, lexer_1.isPunct)(tokens[q + 1], "(")) {
      name = tokens[q].value;
      q++;
    }
  } else {
    q++;
    if ((0, lexer_1.isPunct)(tokens[q], ".")) {
      name = tokens[q + 1].value;
      q += 2;
    }
  }
  if (!(0, lexer_1.isPunct)(tokens[q], "(")) return null;
  const paramsOpenTok = q;
  const paramsCloseTok = (0, lexer_1.matchClose)(tokens, q, limit);
  if (paramsCloseTok < 0) return null;
  q = paramsCloseTok + 1;
  const ctor = {
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
    const end = (0, lexer_1.findAtDepth0)(tokens, q, limit, [";", "{"]);
    if (end < 0) return null;
    if ((0, lexer_1.isPunct)(tokens[end], ";")) {
      ctor.endTok = end;
      return ctor;
    }
    const arrow = (0, lexer_1.findAtDepth0)(tokens, q, end, ["=>", "="]);
    if (arrow >= 0) {
      // `=> {...}` ou `= Redirect<{...}>`: o corpo é uma expressão, termina em `;`.
      const semi = (0, lexer_1.findAtDepth0)(tokens, q, limit, [";"]);
      if (semi < 0) return null;
      ctor.endTok = semi;
      return ctor;
    }
    const close = (0, lexer_1.matchClose)(tokens, end, limit);
    if (close < 0) return null;
    ctor.endTok = close;
    return ctor;
  }
  if ((0, lexer_1.isPunct)(tokens[q], ";")) {
    ctor.endTok = q;
    return ctor;
  }
  if ((0, lexer_1.isPunct)(tokens[q], "{")) {
    ctor.bodyOpenTok = q;
    ctor.bodyCloseTok = (0, lexer_1.matchClose)(tokens, q, limit);
    if (ctor.bodyCloseTok < 0) return null;
    ctor.endTok = ctor.bodyCloseTok;
    return ctor;
  }
  if (!(0, lexer_1.isPunct)(tokens[q], ":")) return null;
  // Initializer list: termina em `;` ou no `{` do corpo (quando vem após uma expressão).
  const initStart = q + 1;
  let r = initStart;
  let initEnd = -1;
  while (r < limit) {
    const t = tokens[r];
    if ((0, lexer_1.isPunct)(t, ";")) {
      initEnd = r - 1;
      ctor.endTok = r;
      break;
    }
    if ((0, lexer_1.isPunct)(t, "=>")) return null;
    if ((0, lexer_1.isPunct)(t, "{") && (0, lexer_1.isExpressionEnd)(tokens[r - 1])) {
      initEnd = r - 1;
      ctor.bodyOpenTok = r;
      ctor.bodyCloseTok = (0, lexer_1.matchClose)(tokens, r, limit);
      if (ctor.bodyCloseTok < 0) return null;
      ctor.endTok = ctor.bodyCloseTok;
      break;
    }
    if (
      (0, lexer_1.isPunct)(t, "(") ||
      (0, lexer_1.isPunct)(t, "[") ||
      (0, lexer_1.isPunct)(t, "{")
    ) {
      const close = (0, lexer_1.matchClose)(tokens, r, limit);
      if (close < 0) return null;
      r = close + 1;
      continue;
    }
    if ((0, lexer_1.isPunct)(t, "<") && (0, lexer_1.startsTypeArgs)(tokens[r - 1])) {
      const close = (0, lexer_1.matchTypeArgs)(tokens, r, limit);
      if (close > 0) {
        r = close + 1;
        continue;
      }
    }
    r++;
  }
  if (initEnd < initStart) return null;
  for (const [from, to] of (0, lexer_1.splitTopLevelCommas)(tokens, initStart, initEnd)) {
    ctor.initializers.push(classifyInitializer(tokens, from, to));
  }
  const last = ctor.initializers[ctor.initializers.length - 1];
  ctor.isRedirecting = last?.kind === "redirect";
  return ctor;
}
function classifyInitializer(tokens, from, to) {
  const unknown = {
    kind: "unknown",
    startTok: from,
    endTok: to,
    fieldName: null,
    exprStartTok: from,
  };
  const t = tokens[from];
  const callKind = (keywordKind) => {
    let j = from + 1;
    if (
      keywordKind !== "assert" &&
      (0, lexer_1.isPunct)(tokens[j], ".") &&
      (0, lexer_1.isIdent)(tokens[j + 1])
    )
      j += 2;
    if (!(0, lexer_1.isPunct)(tokens[j], "(")) return unknown;
    const close = (0, lexer_1.matchClose)(tokens, j, to + 1);
    return close === to ? { ...unknown, kind: keywordKind } : unknown;
  };
  if ((0, lexer_1.isIdent)(t, "super")) return callKind("super");
  if ((0, lexer_1.isIdent)(t, "assert")) return callKind("assert");
  if ((0, lexer_1.isIdent)(t, "this") && !(0, lexer_1.isPunct)(tokens[from + 2], "=")) {
    if ((0, lexer_1.isPunct)(tokens[from + 1], "(") || (0, lexer_1.isPunct)(tokens[from + 3], "("))
      return callKind("redirect");
  }
  let nameTok = from;
  if ((0, lexer_1.isIdent)(t, "this") && (0, lexer_1.isPunct)(tokens[from + 1], "."))
    nameTok = from + 2;
  if (
    !(0, lexer_1.isIdent)(tokens[nameTok]) ||
    !(0, lexer_1.isPunct)(tokens[nameTok + 1], "=") ||
    nameTok + 2 > to
  )
    return unknown;
  return {
    kind: "field",
    startTok: from,
    endTok: to,
    fieldName: tokens[nameTok].value,
    exprStartTok: nameTok + 2,
  };
}
function parseParams(lx, open, close) {
  const { tokens } = lx;
  const params = [];
  let q = open + 1;
  const addChunks = (from, to, section) => {
    for (const [a, b] of (0, lexer_1.splitTopLevelCommas)(tokens, from, to)) {
      const param = parseParam(lx, a, b, section);
      if (param === null) return false;
      params.push(param);
    }
    return true;
  };
  while (q < close) {
    if ((0, lexer_1.isPunct)(tokens[q], "[") || (0, lexer_1.isPunct)(tokens[q], "{")) {
      const groupClose = (0, lexer_1.matchClose)(tokens, q, close);
      if (groupClose < 0) return null;
      const section = tokens[q].value === "[" ? "optional" : "named";
      if (!addChunks(q + 1, groupClose - 1, section)) return null;
      q = groupClose + 1;
      while ((0, lexer_1.isPunct)(tokens[q], ",")) q++;
      return q === close ? params : null;
    }
    const comma = (0, lexer_1.findAtDepth0)(tokens, q, close, [","]);
    const chunkEnd = comma < 0 ? close - 1 : comma - 1;
    if (chunkEnd < q) return null;
    const param = parseParam(lx, q, chunkEnd, "positional");
    if (param === null) return null;
    params.push(param);
    q = comma < 0 ? close : comma + 1;
  }
  return params;
}
function parseParam(lx, from, to, section) {
  const { tokens } = lx;
  const annotations = [];
  let q = from;
  while ((0, lexer_1.isPunct)(tokens[q], "@")) {
    const ann = parseAnnotation(tokens, q);
    if (ann === null || ann.endTok >= to) return null;
    annotations.push(ann);
    q = ann.endTok + 1;
  }
  let isRequired = false;
  if ((0, lexer_1.isIdent)(tokens[q], "required")) {
    isRequired = true;
    q++;
  }
  let isCovariant = false;
  if ((0, lexer_1.isIdent)(tokens[q], "covariant")) {
    isCovariant = true;
    q++;
  }
  let modifier = null;
  if ((0, lexer_1.isIdent)(tokens[q]) && ["final", "var", "const"].includes(tokens[q].value)) {
    modifier = tokens[q].value;
    q++;
  }
  if (q > to) return null;
  const eq = (0, lexer_1.findAtDepth0)(tokens, q, to + 1, ["="]);
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
      ((0, lexer_1.isIdent)(tokens[k], "this") || (0, lexer_1.isIdent)(tokens[k], "super")) &&
      (0, lexer_1.isPunct)(tokens[k + 1], ".")
    ) {
      if (!(0, lexer_1.isIdent)(tokens[k + 2])) return null;
      let after = k + 3;
      let functionTyped = false;
      if (after <= declEnd && (0, lexer_1.isPunct)(tokens[after], "(")) {
        const close = (0, lexer_1.matchClose)(tokens, after, declEnd + 1);
        if (close < 0) return null;
        functionTyped = true;
        after = close + 1;
        if (after <= declEnd && (0, lexer_1.isPunct)(tokens[after], "?")) after++;
      }
      if (after !== declEnd + 1) return null;
      return {
        ...base,
        kind: tokens[k].value === "this" ? "this" : "super",
        typeText: k > q ? (0, lexer_1.tokText)(lx, q, k - 1) : null,
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
  if ((0, lexer_1.isPunct)(tokens[last], "?") && (0, lexer_1.isPunct)(tokens[last - 1], ")"))
    last--;
  if ((0, lexer_1.isPunct)(tokens[last], ")")) {
    const open = (0, lexer_1.matchOpenBackward)(tokens, last, q);
    if (open <= q) return null;
    functionTyped = true;
    last = open - 1;
  }
  // `required` é palavra contextual: como modificador já foi consumido acima, aqui é o nome.
  if (!(0, lexer_1.isIdent)(tokens[last]) || ["this", "super"].includes(tokens[last].value))
    return null;
  return {
    ...base,
    kind: "plain",
    typeText: last > q ? (0, lexer_1.tokText)(lx, q, last - 1) : null,
    typeStartTok: last > q ? q : -1,
    typeEndTok: last > q ? last - 1 : -1,
    name: tokens[last].value,
    nameTok: last,
    functionTyped,
  };
}
