"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromTypeDecl = fromTypeDecl;
exports.skipUnknown = skipUnknown;
exports.scanTopLevel = scanTopLevel;
/**
 * Leitura do nível superior de um arquivo Dart: diretivas, declarações de tipo
 * (class, enum, mixin, extension, extension type, mixin application), typedefs,
 * funções e variáveis. Um trecho não reconhecido vira `unknown` e a leitura
 * continua no próximo `;`/`}` do nível 0 — nunca lança exceção.
 */
const lexer_1 = require("./lexer");
const syntax_1 = require("./syntax");
const DIRECTIVE_WORDS = new Set(["library", "import", "export", "part"]);
/** Converte o `TypeDecl` do parser (class/enum) para a forma comum. */
function fromTypeDecl(lx, decl) {
  const { tokens } = lx;
  const headTok = decl.keywordTok - decl.modifiers.length;
  const typeParamsOpenTok = (0, lexer_1.isPunct)(tokens[decl.nameTok + 1], "<")
    ? decl.nameTok + 1
    : -1;
  let clausesStartTok;
  if (decl.isMixinApplication) {
    clausesStartTok = (0, lexer_1.findAtDepth0)(tokens, decl.nameTok, decl.endTok + 1, ["="]) + 1;
  } else if (decl.primaryParamsOpenTok >= 0) {
    clausesStartTok = (0, lexer_1.matchClose)(tokens, decl.primaryParamsOpenTok) + 1;
  } else if (typeParamsOpenTok >= 0) {
    clausesStartTok = (0, lexer_1.matchTypeArgs)(tokens, typeParamsOpenTok, tokens.length) + 1;
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
    isAugmentation: (0, lexer_1.isIdent)(tokens[headTok - 1], "augment"),
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
function readAnnotations(lx, from) {
  const annotations = [];
  let p = from;
  while ((0, lexer_1.isPunct)(lx.tokens[p], "@")) {
    const ann = (0, syntax_1.parseAnnotation)(lx.tokens, p);
    if (ann === null) break;
    annotations.push(ann);
    p = ann.endTok + 1;
  }
  return [annotations, p];
}
/** `mixin`, `extension` e `extension type` (class/enum ficam com o `parseTypeDecl`). */
function parseOtherTypeDecl(
  lx,
  keywordTok,
  headTok,
  firstTok,
  modifiers,
  annotations,
  isAugmentation
) {
  const { tokens } = lx;
  const keyword = tokens[keywordTok].value;
  let j = keywordTok + 1;
  let kind = keyword === "mixin" ? "mixin" : "extension";
  let primaryIsConst = false;
  if (
    kind === "extension" &&
    (0, lexer_1.isIdent)(tokens[j], "type") &&
    ((0, lexer_1.isIdent)(tokens[j + 1]) || (0, lexer_1.isPunct)(tokens[j + 1], "<"))
  ) {
    kind = "extensionType";
    j++;
    if ((0, lexer_1.isIdent)(tokens[j], "const") && (0, lexer_1.isIdent)(tokens[j + 1])) {
      primaryIsConst = true;
      j++;
    }
  }
  let name = "";
  let nameTok = -1;
  if (
    (0, lexer_1.isIdent)(tokens[j]) &&
    !(kind === "extension" && (0, lexer_1.isIdent)(tokens[j], "on"))
  ) {
    name = tokens[j].value;
    nameTok = j;
    j++;
  } else if (kind !== "extension") {
    return null;
  }
  let typeParamsOpenTok = -1;
  if ((0, lexer_1.isPunct)(tokens[j], "<")) {
    const close = (0, lexer_1.matchTypeArgs)(tokens, j, tokens.length);
    if (close < 0) return null;
    typeParamsOpenTok = j;
    j = close + 1;
  }
  let primaryParamsOpenTok = -1;
  let primaryName = null;
  if (kind === "extensionType") {
    if ((0, lexer_1.isPunct)(tokens[j], ".") && (0, lexer_1.isIdent)(tokens[j + 1])) {
      primaryName = tokens[j + 1].value;
      j += 2;
    }
    if (!(0, lexer_1.isPunct)(tokens[j], "(")) return null;
    primaryParamsOpenTok = j;
    const close = (0, lexer_1.matchClose)(tokens, j);
    if (close < 0) return null;
    j = close + 1;
  }
  const bodyTok = (0, lexer_1.findAtDepth0)(tokens, j, tokens.length, ["{", ";"]);
  if (bodyTok < 0) return null;
  let endTok = bodyTok;
  let bodyOpenTok = -1;
  if ((0, lexer_1.isPunct)(tokens[bodyTok], "{")) {
    endTok = (0, lexer_1.matchClose)(tokens, bodyTok);
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
function skipUnknown(lx, from, limit) {
  const { tokens } = lx;
  const stop = (0, lexer_1.findAtDepth0)(tokens, from, limit, [";", "{"]);
  if (stop < 0) return limit - 1;
  if ((0, lexer_1.isPunct)(tokens[stop], ";")) return stop;
  const close = (0, lexer_1.matchClose)(tokens, stop, limit);
  if (close < 0) return limit - 1;
  return (0, lexer_1.isPunct)(tokens[close + 1], ";") ? close + 1 : close;
}
/** Lê todo o nível superior do arquivo. */
function scanTopLevel(lx) {
  const { tokens } = lx;
  const n = tokens.length;
  const result = {
    directives: [],
    types: [],
    typedefs: [],
    functions: [],
    variables: [],
    unknown: [],
  };
  let i = 0;
  while (i < n) {
    if ((0, lexer_1.isPunct)(tokens[i], ";")) {
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
      (0, lexer_1.isIdent)(t) &&
      DIRECTIVE_WORDS.has(t.value) &&
      !(0, lexer_1.isPunct)(tokens[p + 1], ".") &&
      !(0, lexer_1.isPunct)(tokens[p + 1], "(")
    ) {
      const end = (0, lexer_1.findAtDepth0)(tokens, p, n, [";"]);
      if (end < 0) {
        result.unknown.push({ startTok: start, endTok: n - 1 });
        break;
      }
      const kind =
        t.value === "part" && (0, lexer_1.isIdent)(tokens[p + 1], "of") ? "partOf" : t.value;
      result.directives.push({ kind, startTok: p, endTok: end });
      i = end + 1;
      continue;
    }
    // Declarações de tipo: [augment] [modificadores] class|enum|mixin|extension
    let k = p;
    const isAugmentation = (0, lexer_1.isIdent)(tokens[k], "augment");
    if (isAugmentation) k++;
    const modifiers = [];
    while (
      (0, lexer_1.isIdent)(tokens[k]) &&
      syntax_1.DECL_MODIFIERS.has(tokens[k].value) &&
      (0, lexer_1.isIdent)(tokens[k + 1])
    ) {
      // `mixin` seguido do nome é a palavra-chave da declaração, não modificador
      if (tokens[k].value === "mixin" && !(0, lexer_1.isIdent)(tokens[k + 1], "class")) break;
      modifiers.push(tokens[k].value);
      k++;
    }
    const kw = tokens[k];
    if ((0, lexer_1.isIdent)(kw, "class") || (0, lexer_1.isIdent)(kw, "enum")) {
      const decl = (0, syntax_1.parseTypeDecl)(lx, k, start);
      if (decl !== null) {
        const raw = fromTypeDecl(lx, decl);
        raw.isAugmentation = isAugmentation;
        if (isAugmentation) raw.firstTok = Math.min(raw.firstTok, p);
        result.types.push(raw);
        i = decl.endTok + 1;
        continue;
      }
    } else if (
      ((0, lexer_1.isIdent)(kw, "mixin") || (0, lexer_1.isIdent)(kw, "extension")) &&
      !(0, lexer_1.isPunct)(tokens[k + 1], ".")
    ) {
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
    } else if ((0, lexer_1.isIdent)(kw, "typedef")) {
      const end = (0, lexer_1.findAtDepth0)(tokens, k, n, [";"]);
      if (end >= 0) {
        let nameTok = k + 1;
        let typeParamsOpenTok = -1;
        let aliasStartTok = -1;
        let aliasEndTok = -1;
        if (
          (0, lexer_1.isIdent)(tokens[k + 1]) &&
          ((0, lexer_1.isPunct)(tokens[k + 2], "=") || (0, lexer_1.isPunct)(tokens[k + 2], "<"))
        ) {
          let q = k + 2;
          if ((0, lexer_1.isPunct)(tokens[q], "<")) {
            typeParamsOpenTok = q;
            q = (0, lexer_1.matchTypeArgs)(tokens, q, end) + 1;
          }
          if ((0, lexer_1.isPunct)(tokens[q], "=")) {
            aliasStartTok = q + 1;
            aliasEndTok = end - 1;
          }
        } else {
          // sintaxe antiga: typedef void Callback(int x); / typedef void Callback<T>(T x);
          const paren = (0, lexer_1.findAtDepth0)(tokens, k + 1, end, ["("]);
          nameTok = paren > k + 1 ? paren - 1 : k + 1;
          if ((0, lexer_1.isPunct)(tokens[nameTok], ">")) {
            // nome antes dos parâmetros de tipo: volta até o `<` correspondente
            let depth = 0;
            let lt = -1;
            for (let j = nameTok; j > k; j--) {
              if ((0, lexer_1.isPunct)(tokens[j], ">")) depth++;
              else if ((0, lexer_1.isPunct)(tokens[j], "<") && --depth === 0) {
                lt = j;
                break;
              }
            }
            nameTok = lt > k + 1 ? lt - 1 : k + 1;
          }
        }
        if ((0, lexer_1.isIdent)(tokens[nameTok])) {
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
      const member = (0, syntax_1.parseMember)(lx, start, n, "\0");
      // `Foo.bar() {}` fora de uma classe não é função: vira trecho não reconhecido
      const qualified =
        member !== null &&
        member.kind === "method" &&
        (0, lexer_1.isPunct)(tokens[member.nameTok - 1], ".");
      if (member !== null && !qualified && (member.kind === "field" || member.kind === "method")) {
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
