/**
 * Nós do modelo Dart que aparecem em qualquer nível: anotações, docs,
 * comentários, strings, parâmetros, variáveis e tudo o que existe dentro de
 * corpos (statements, chamadas, closures, try/catch, awaits).
 *
 * As declarações de nível de classe/arquivo (DartClass, DartMethod...) ficam em
 * `declarations.ts`; o arquivo (DartFile) em `file.ts`.
 */
import type { DartFile } from "./file";
import {
  DartAsyncKind,
  DartBodyKind,
  DartCommentDirective,
  DartCommentKind,
  DartExpressionKind,
  DartParameterKind,
  DartParameterSource,
  DartStatementKind,
  DartStringRole,
  Nullability,
} from "./enums";
import { DartType } from "./type";
import { CommentRange, Token } from "./internal/lexer";
import { Annotation, ParamInfo } from "./internal/syntax";
/** Posição no arquivo. Linhas e colunas começam em 1, como no comentário inline. */
export interface DartRange {
  /** Linha onde o nó começa (sem doc e anotações, nas declarações). */
  readonly line: number;
  readonly endLine: number;
  readonly column: number;
}
/** Qualquer trecho do arquivo que um plugin pode apontar. */
export interface DartNode extends DartRange {
  readonly file: DartFile;
  /** Texto ORIGINAL do nó (para `problem.wrong`). */
  readonly text: string;
  /** Linha `line` do arquivo sem espaços nas pontas: o `lines[i].trim()` dos plugins. */
  readonly lineText: string;
}
/** Nó com nome, doc e anotações: classe, campo, método, construtor, parâmetro, função. */
export interface DartDeclaration extends DartNode {
  readonly name: string;
  /** Linha do nome (difere de `line` quando o cabeçalho quebra a linha). */
  readonly nameLine: number;
  /** Primeira linha contando doc e anotações. */
  readonly startLine: number;
  readonly isPrivate: boolean;
  readonly annotations: readonly DartAnnotation[];
  readonly doc: DartDoc | null;
  hasAnnotation(name: string): boolean;
  isIgnoredBy(plugin: string, linesAbove?: number): boolean;
}
/** Base dos nós: posição calculada a partir dos offsets no texto do arquivo. */
export declare abstract class DartNodeBase implements DartNode {
  readonly file: DartFile;
  /** Offset (caracteres) do início do nó no `file.source`. */
  readonly startOffset: number;
  /** Offset (caracteres) logo depois do fim do nó. */
  readonly endOffset: number;
  readonly line: number;
  readonly endLine: number;
  readonly column: number;
  protected constructor(file: DartFile, startOffset: number, endOffset: number);
  get text(): string;
  get lineText(): string;
  /** O nó `other` (do mesmo arquivo) está dentro deste: `method.contains(call)`. */
  contains(other: DartNodeBase): boolean;
  /**
   * Texto do nó em uma linha, sem comentários nem a vírgula final do formato
   * "tall": `required final String createdAt = 'a' 'b'` mesmo quando o código
   * quebra a declaração em várias linhas. Nó sem tokens (comentário): `text`.
   */
  get compact(): string;
}
/** Offsets `[início, fim)` dos tokens `[from, to]`. */
export declare function tokenSpan(file: DartFile, from: number, to: number): [number, number];
/**
 * Texto compacto dos tokens `[from, to]` (sem quebras de linha nem comentários):
 * espaço só entre duas palavras e depois de vírgula, sem a vírgula final que o
 * `dart format` coloca ao quebrar argumentos. `widget\n  .controller` → `widget.controller`.
 */
export declare function compactText(file: DartFile, from: number, to: number): string;
/**
 * Texto dos tokens `[from, to]` em uma linha, sem comentários: mantém um
 * espaço onde a linha tinha espaço; numa quebra de linha, põe um espaço, exceto
 * depois de `(`/`[`/`{`/`.` e antes de fechamento, `,`, `;`, `.` e `!`.
 * Remove a vírgula final do formato "tall". Usado em `node.compact`.
 */
export declare function oneLineText(file: DartFile, from: number, to: number): string;
/** `@override`, `@JsonKey(name: 'x')`, `@p.Annotation()`. */
export declare class DartAnnotation extends DartNodeBase {
  /** Último segmento do nome: `@JsonKey(...)` → `"JsonKey"`, `@override` → `"override"`. */
  readonly name: string;
  /** `@p.JsonKey` → `"p"` */
  readonly prefix: string | null;
  private readonly openParenTok;
  private readonly closeParenTok;
  private argumentsCache;
  /** @internal */
  constructor(file: DartFile, raw: Annotation);
  /** Argumentos (`name: 'x'` → rótulo `name`). Vazio sem parênteses. */
  get arguments(): readonly DartArgument[];
  /** Argumento pelo rótulo (`@JsonKey(name: ...)` → `argument("name")`). */
  argument(label: string): DartArgument | null;
}
/** Comentário do código. */
export declare class DartComment extends DartNodeBase {
  readonly kind: DartCommentKind;
  /** Texto sem os marcadores (`//`, `///`, delimitadores e `*` de margem dos blocos), sem espaços nas pontas. */
  readonly content: string;
  /** Há código antes do comentário na mesma linha. */
  readonly isTrailing: boolean;
  readonly directive: DartCommentDirective | null;
  /** `// ignore: a, b` → `["a", "b"]`; `// ignore_for_file: x` → `["x"]`. */
  readonly directiveArgs: readonly string[];
  /** @internal */
  constructor(file: DartFile, range: CommentRange, isTrailing: boolean);
  /** `true` em `///` e comentário de bloco de documentação. */
  get isDoc(): boolean;
}
/** Documentação (`///` ou bloco de doc) logo acima de uma declaração. */
export declare class DartDoc extends DartNodeBase {
  /** Linhas do texto, sem os marcadores. */
  readonly lines: readonly string[];
  readonly comments: readonly DartComment[];
  /** @internal */
  constructor(file: DartFile, comments: DartComment[]);
  /** Texto completo (linhas unidas por `\n`). */
  get content(): string;
  /** `{@macro nome}` usados. */
  get macros(): readonly string[];
  /** `{@template nome}` definidos. */
  get templates(): readonly string[];
  /** Só `{@macro x}` (sem texto próprio). */
  get isMacroOnly(): boolean;
}
/**
 * Doc e comentários antes do token `firstTok` (anotações incluídas),
 * depois do token anterior.
 * @internal
 */
export declare function leadingTrivia(
  file: DartFile,
  firstTok: number,
  headTok?: number
): DartComment[];
/** @internal */
export declare function docOf(file: DartFile, firstTok: number, headTok?: number): DartDoc | null;
/**
 * `// ignore: <plugin>` ou `// danger:ignore` acima do nó (até `linesAbove`
 * linhas), entre ele e o código anterior, ou no fim da linha do nó.
 * @internal
 */
export declare function ignoredBy(
  file: DartFile,
  firstTok: number,
  headTok: number,
  plugin: string,
  linesAbove: number
): boolean;
/** String literal do código (cada pedaço de `'a' 'b'` é uma DartString). */
export declare class DartString extends DartNodeBase {
  /** Conteúdo sem `r` e sem as aspas (escapes mantidos). */
  readonly value: string;
  readonly isRaw: boolean;
  /** Aspas triplas. */
  readonly isMultiline: boolean;
  /** `'` ou `"` */
  readonly quote: string;
  readonly role: DartStringRole;
  /** Chamada que recebe a string como argumento: `Text`, `print`, `RegExp`, `Key`, `l10n.translate`... */
  readonly enclosingCallee: string | null;
  /** Rótulo do argumento: `Text(semanticsLabel: 'x')` → `"semanticsLabel"`. */
  readonly argumentLabel: string | null;
  /** @internal Índice do token. */
  readonly tokenIndex: number;
  /** @internal */
  constructor(
    file: DartFile,
    tokenIndex: number,
    role: DartStringRole,
    enclosingCallee: string | null,
    argumentLabel: string | null
  );
  /** Conteúdo com cada `$x`/`${...}` trocado por espaços (mesmo comprimento). */
  get valueWithoutInterpolation(): string;
  /** Tem `$x` ou `${...}`. */
  get hasInterpolation(): boolean;
}
/** Parâmetro de tipo: `T extends Comparable<T>`. */
export declare class DartTypeParameter {
  readonly name: string;
  /** `T extends Comparable<T>` → `Comparable<T>` */
  readonly bound: DartType | null;
  readonly line: number;
  /** @internal */
  readonly nameTokIndex: number;
  /** @internal */
  constructor(name: string, bound: DartType | null, line: number, nameTokIndex: number);
}
/** @internal Parâmetros de tipo de `<` em `open`. */
export declare function buildTypeParameters(
  file: DartFile,
  open: number,
  outer: ReadonlySet<string>
): DartTypeParameter[];
/** Parâmetro de método, função, construtor ou closure. */
export declare class DartParameter extends DartNodeBase implements DartDeclaration {
  /** Como escrito: `_repository`, `onTap`. */
  readonly name: string;
  /** Nome usado na chamada: parâmetro nomeado `this._repository` → `repository`. */
  readonly publicName: string;
  readonly isPrivate: boolean;
  readonly nameLine: number;
  readonly startLine: number;
  readonly annotations: readonly DartAnnotation[];
  readonly doc: DartDoc | null;
  /** `null` em `this.x`/`super.x` sem tipo e em parâmetro de closure sem tipo. */
  readonly type: DartType | null;
  readonly nullability: Nullability;
  readonly kind: DartParameterKind;
  readonly source: DartParameterSource;
  /** Posicional obrigatório ou nomeado com `required`. */
  readonly isRequired: boolean;
  /** `final`/`var` escrito no parâmetro. */
  readonly isFinal: boolean;
  readonly isCovariant: boolean;
  /** `void callback(int x)` (sintaxe antiga de parâmetro função). */
  readonly isFunctionTyped: boolean;
  readonly defaultValue: DartExpression | null;
  /** @internal */
  readonly rawInfo: ParamInfo;
  /** @internal Token do nome. */
  readonly nameTokIndex: number;
  private readonly firstTok;
  private readonly headTok;
  /** @internal */
  constructor(file: DartFile, raw: ParamInfo, inPrimary: boolean, typeParams: ReadonlySet<string>);
  hasAnnotation(name: string): boolean;
  isIgnoredBy(plugin: string, linesAbove?: number): boolean;
}
/** @internal Parâmetros de `(` `open` a `)` `close`; `null` se a lista não foi reconhecida. */
export declare function buildParameters(
  file: DartFile,
  open: number,
  close: number,
  inPrimary: boolean,
  typeParams: ReadonlySet<string>
): DartParameter[] | null;
/** Dados de uma variável já identificados pelo parser. @internal */
export interface VariableInit {
  firstTok: number;
  headTok: number;
  nameTok: number;
  endTok: number;
  modifiers: ReadonlySet<string>;
  typeStartTok: number;
  typeEndTok: number;
  initStartTok: number;
  initEndTok: number;
  annotations: Annotation[];
  typeParams: ReadonlySet<string>;
}
/** Base de campo, variável de nível superior e variável local. */
export declare abstract class DartVariable extends DartNodeBase implements DartDeclaration {
  readonly name: string;
  readonly isPrivate: boolean;
  readonly nameLine: number;
  readonly startLine: number;
  readonly annotations: readonly DartAnnotation[];
  readonly doc: DartDoc | null;
  /** `null` quando não há tipo escrito (`var x`, `final x = 1`). */
  readonly type: DartType | null;
  /** `Unknown` quando `type` é `null`. */
  readonly nullability: Nullability;
  readonly isFinal: boolean;
  readonly isConst: boolean;
  readonly isLate: boolean;
  /** `var` escrito */
  readonly isVar: boolean;
  readonly isStatic: boolean;
  readonly isCovariant: boolean;
  readonly isExternal: boolean;
  readonly isAbstract: boolean;
  readonly initializer: DartExpression | null;
  /** @internal Token do nome. */
  readonly nameTokIndex: number;
  /** @internal */
  protected readonly firstTok: number;
  /** @internal */
  protected readonly headTok: number;
  protected constructor(file: DartFile, init: VariableInit);
  hasAnnotation(name: string): boolean;
  isIgnoredBy(plugin: string, linesAbove?: number): boolean;
  /** Comentário `//` no fim da última linha da declaração. */
  get trailingComment(): DartComment | null;
}
/**
 * Variável declarada dentro de um corpo: statement, cabeçalho de `for` (também o `for` de
 * coleção) ou pattern. Nunca aparece em `DartClass.fields`.
 */
export declare class DartLocalVariable extends DartVariable {
  /** Declarada no cabeçalho de um `for` (statement ou `[for (final x in xs) x]`). */
  readonly isLoopVariable: boolean;
  /**
   * Declarada por um pattern: `final (a, b) = ...`, `case Foo(:final x)`, `if (o case String s)`,
   * braço de switch expression, `for (final (k, v) in ...)`. Não tem `initializer`.
   */
  readonly isPatternVariable: boolean;
  /** Closure (ou função local) mais interna que contém a declaração. */
  readonly insideClosure: DartClosure | null;
  /** @internal */
  constructor(
    file: DartFile,
    init: VariableInit,
    isLoopVariable: boolean,
    insideClosure: DartClosure | null,
    isPatternVariable?: boolean
  );
}
/** Uma expressão (inicializador, argumento, valor padrão, elemento de lista...). */
export declare class DartExpression extends DartNodeBase {
  readonly kind: DartExpressionKind;
  /** @internal */
  readonly fromTok: number;
  /** @internal */
  readonly toTok: number;
  private callCache;
  private elementsCache;
  /** @internal */
  constructor(file: DartFile, fromTok: number, toTok: number);
  /** A chamada, quando `kind === Call` (a mais externa: `a.b(c).d(e)` → `d`). */
  get call(): DartCall | null;
  /** Elementos de list/set literal (`children: [...]`). Vazio nos outros tipos. */
  get elements(): readonly DartExpression[];
  /** Valor de `NumberLiteral` (`-8.5` → -8.5), senão `null`. */
  get numberValue(): number | null;
  /** Strings de `StringLiteral` (`'a' 'b'` → duas). */
  get strings(): readonly DartString[];
  /** Usa `this` ou `widget` (identificador solto, não `x.widget`). */
  get usesThis(): boolean;
  /** Texto em uma linha (ver `DartNodeBase.compact`). */
  get compact(): string;
  /** Chamadas dentro da expressão (inclusive aninhadas e em closures). */
  get calls(): readonly DartCall[];
  /** Closures dentro da expressão (`final onTap = (bool reload) {}`), inclusive aninhadas. */
  get closures(): readonly DartClosure[];
}
/** Argumento de uma chamada ou anotação. */
export declare class DartArgument extends DartNodeBase {
  /** `height: 8` → `"height"`; posicional → `null`. */
  readonly label: string | null;
  readonly value: DartExpression;
  /** @internal */
  constructor(file: DartFile, from: number, to: number);
}
/** @internal */
export declare function buildArguments(file: DartFile, open: number, close: number): DartArgument[];
/** Uma chamada: `print(x)`, `MediaQuery.of(context)`, `_controller.dispose()`, `..addListener(f)`. */
export declare class DartCall extends DartNodeBase {
  /** Receptor e nome: `MediaQuery.of`, `_controller.dispose`, `print`. Em cascata, só o nome. */
  readonly callee: string;
  /** Nome chamado: `of`, `dispose`, `print`. */
  readonly name: string;
  /** Texto do receptor (`MediaQuery`, `widget.controller`); `null` sem receptor ou em cascata. */
  readonly receiver: string | null;
  /** Alvo da cascata: `_controller..addListener(f)..dispose()` → `_controller`. */
  readonly cascadeTarget: string | null;
  /** `..dispose()` / `?..dispose()` */
  readonly isCascade: boolean;
  /** `?.dispose()` / `?..dispose()` */
  readonly isNullAware: boolean;
  /** `const Foo()` / `new Foo()` */
  readonly isConst: boolean;
  readonly typeArguments: readonly DartType[];
  /** Linha do nome chamado. */
  readonly nameLine: number;
  /** Acesso logo depois do `)`: `MediaQuery.of(context).size` → `"size"`. */
  readonly postfixMember: string | null;
  /** Closure mais interna que contém a chamada. */
  readonly insideClosure: DartClosure | null;
  /** @internal */
  readonly nameTok: number;
  /** @internal */
  readonly openParenTok: number;
  /** @internal */
  readonly closeParenTok: number;
  private argumentsCache;
  /** @internal */
  constructor(
    file: DartFile,
    init: {
      startTok: number;
      nameTok: number;
      openParenTok: number;
      closeParenTok: number;
      receiver: string | null;
      cascadeTarget: string | null;
      isCascade: boolean;
      isNullAware: boolean;
      isConst: boolean;
      typeArguments: DartType[];
      postfixMember: string | null;
      insideClosure: DartClosure | null;
    }
  );
  get arguments(): readonly DartArgument[];
  /** Argumento nomeado pelo rótulo (`call.argument("children")`). */
  argument(label: string): DartArgument | null;
  /** Argumentos posicionais, em ordem. */
  get positionalArguments(): readonly DartArgument[];
}
/** Chamada cujo nome está em `nameTok`; `lower` limita a busca do receptor. @internal */
export declare function buildCall(
  file: DartFile,
  nameTok: number,
  lower: number,
  insideClosure: DartClosure | null
): DartCall | null;
/** Chamadas nos tokens `[from, to]`. `closures`: para preencher `insideClosure`. @internal */
export declare function scanCalls(
  file: DartFile,
  from: number,
  to: number,
  closures: readonly DartClosure[]
): DartCall[];
/** Função anônima (`(x) => ...`, `() async { ... }`) ou função local (`void f() { ... }`). */
export declare class DartClosure extends DartNodeBase {
  /** Nome da função local; `null` na função anônima. */
  readonly name: string | null;
  readonly asyncKind: DartAsyncKind;
  readonly isAsync: boolean;
  /** @internal `(` dos parâmetros (ou o nome, na função local). */
  readonly openTok: number;
  /** @internal Último token do corpo. */
  readonly endTok: number;
  /** Tipo de retorno escrito da função local (`Future<int> buscar() async`); `null` na anônima ou sem tipo. */
  readonly returnType: DartType | null;
  /** `<T>(T valor) {}` / `T primeiro<T>(List<T> xs) {}` */
  readonly typeParameters: readonly DartTypeParameter[];
  private readonly paramsOpen;
  private readonly paramsClose;
  private readonly bodyTok;
  private parametersCache;
  private bodyCache;
  /** @internal */
  constructor(
    file: DartFile,
    init: {
      startTok: number;
      name: string | null;
      paramsOpen: number;
      paramsClose: number;
      bodyTok: number;
      endTok: number;
      asyncKind: DartAsyncKind;
      typeParamsOpen: number;
      returnFrom: number;
      returnTo: number;
    }
  );
  get parameters(): readonly DartParameter[];
  get body(): DartBody;
}
/** `async`/`async*`/`sync*` a partir de `k`; devolve o tipo e o primeiro token depois. */
export declare function readAsyncMarker(tokens: Token[], k: number): [DartAsyncKind, number];
/** Closures e funções locais nos tokens `[from, to]` (também genéricas: `<T>(T x) {}`, `T f<T>() {}`). @internal */
export declare function scanClosures(file: DartFile, from: number, to: number): DartClosure[];
/** `await` em um corpo. */
export declare class DartAwait extends DartNodeBase {
  readonly insideClosure: DartClosure | null;
  /** @internal */
  constructor(file: DartFile, tok: number, insideClosure: DartClosure | null);
}
/** `return` em um corpo. */
export declare class DartReturn extends DartNodeBase {
  readonly insideClosure: DartClosure | null;
  /** `return;` sem valor. */
  readonly isEmpty: boolean;
  /** @internal */
  constructor(file: DartFile, tok: number, endTok: number, insideClosure: DartClosure | null);
}
/** Um `catch`/`on` de um try. */
export declare class DartCatch extends DartNodeBase {
  /** `on FormatException` → o tipo; `catch (e)` puro → `null`. */
  readonly onType: DartType | null;
  readonly exceptionName: string | null;
  readonly stackTraceName: string | null;
  readonly body: DartBody;
  /** Sem nenhum statement no bloco (comentários não contam). */
  readonly isEmpty: boolean;
  /** @internal Tokens dos nomes `e` e `s` de `catch (e, s)`. */
  readonly variableTokens: readonly number[];
  /** @internal */
  constructor(
    file: DartFile,
    init: {
      startTok: number;
      onType: DartType | null;
      exceptionName: string | null;
      stackTraceName: string | null;
      bodyOpen: number;
      bodyClose: number;
      variableTokens: number[];
    }
  );
}
/** `try { } on X catch (e) { } finally { }`. */
export declare class DartTry extends DartNodeBase {
  readonly body: DartBody;
  readonly catches: readonly DartCatch[];
  readonly finallyBody: DartBody | null;
  readonly insideClosure: DartClosure | null;
  /** @internal */
  constructor(
    file: DartFile,
    init: {
      tryTok: number;
      endTok: number;
      bodyOpen: number;
      bodyClose: number;
      catches: DartCatch[];
      finallyOpen: number;
      finallyClose: number;
      insideClosure: DartClosure | null;
    }
  );
}
/** Um statement de nível 1 de um bloco. */
export declare class DartStatement extends DartNodeBase {
  readonly kind: DartStatementKind;
  /** Blocos filhos: corpo do `if`/`else`, do `for`, do `try`... */
  readonly children: readonly DartBody[];
  /** @internal */
  readonly fromTok: number;
  /** @internal */
  readonly toTok: number;
  /** @internal */
  constructor(
    file: DartFile,
    kind: DartStatementKind,
    fromTok: number,
    toTok: number,
    children: DartBody[]
  );
  /** Expressão de um statement `Expression`/`Return`/`Throw` (sem o `;`). */
  get expression(): DartExpression | null;
}
/** Corpo de método, função, construtor, closure, catch... */
export declare class DartBody extends DartNodeBase {
  readonly kind: DartBodyKind;
  readonly asyncKind: DartAsyncKind;
  readonly isAsync: boolean;
  /** @internal `{` do bloco ou `=>`. */
  readonly openTok: number;
  /** @internal `}` do bloco ou último token da expressão (o `;` do membro, se houver). */
  readonly closeTok: number;
  private scanCache;
  private statementsCache;
  /** @internal */
  constructor(
    file: DartFile,
    kind: DartBodyKind,
    openTok: number,
    closeTok: number,
    asyncKind: DartAsyncKind
  );
  /** Tokens do conteúdo (sem `{`/`}` nem `=>`, sem o `;` final do arrow). */
  private get inner();
  private get scan();
  /** Statements de nível 1 (bloco). No corpo `=>`, vazio: use `expression`. */
  get statements(): readonly DartStatement[];
  /** Expressão do corpo `=>` (`null` no bloco). */
  get expression(): DartExpression | null;
  /** Bloco sem nenhum statement (comentários não contam). */
  get isEmpty(): boolean;
  /** Comentários dentro do corpo. */
  get comments(): readonly DartComment[];
  /** Todas as chamadas do corpo, inclusive aninhadas e dentro de closures (`insideClosure`). */
  get calls(): readonly DartCall[];
  get awaits(): readonly DartAwait[];
  get returns(): readonly DartReturn[];
  /** Closures e funções locais (todas, inclusive aninhadas). */
  get closures(): readonly DartClosure[];
  /** Todos os `try` do corpo (inclusive aninhados e em closures). */
  get tryStatements(): readonly DartTry[];
  /** Variáveis declaradas no corpo (todas, inclusive em blocos internos, closures e `for`). */
  get localVariables(): readonly DartLocalVariable[];
  /** Linha do primeiro `return` fora de closures/funções locais. */
  get firstTopLevelReturnLine(): number | null;
  /**
   * Acessos `target.membro` / `target?.membro` no corpo (também `this.target.membro`), na ordem:
   * `body.memberAccesses("context")` → `[{ member: "mounted", line: 12 }, ...]`.
   */
  memberAccesses(target: string): readonly {
    member: string;
    line: number;
  }[];
  /**
   * Linhas onde `name` é usado como identificador (fora de strings e comentários).
   * Por padrão `x.name` não conta; com `includeMemberAccess` conta também
   * (`context.mounted`, `this.mounted`).
   */
  references(
    name: string,
    options?: {
      includeMemberAccess?: boolean;
    }
  ): readonly number[];
}
/** @internal */
export interface BodyScan {
  closures: DartClosure[];
  calls: DartCall[];
  awaits: DartAwait[];
  returns: DartReturn[];
  tries: DartTry[];
  locals: DartLocalVariable[];
}
/** @internal */
export declare function scanBody(file: DartFile, from: number, to: number): BodyScan;
/** Statements de nível 1 dos tokens `[from, to]`. @internal */
export declare function readStatements(file: DartFile, from: number, to: number): DartStatement[];
