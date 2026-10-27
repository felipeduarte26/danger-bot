import { DartIdentifierKind, GeneratedReason } from "./enums";
import { DartPath } from "./path";
import {
  DartCall,
  DartClosure,
  DartComment,
  DartLocalVariable,
  DartNodeBase,
  DartString,
  DartTry,
} from "./nodes";
import {
  DartClass,
  DartDirective,
  DartFunction,
  DartTopLevelVariable,
  DartTypedef,
} from "./declarations";
import { Lexed } from "./internal/lexer";
/** Identificador DECLARADO no arquivo (classe, método, campo, variável, parâmetro...). */
export declare class DartIdentifier extends DartNodeBase {
  readonly kind: DartIdentifierKind;
  readonly name: string;
  /** Nome da classe/função onde foi declarado (`null` no nível superior). */
  readonly ownerName: string | null;
  /** @internal */
  constructor(file: DartFile, tok: number, kind: DartIdentifierKind, ownerName: string | null);
}
/** Trecho de nível superior que o parser não reconheceu. */
export declare class DartParseError extends DartNodeBase {
  readonly message: string;
  /** @internal */
  constructor(file: DartFile, start: number, end: number, message: string);
}
/** Um arquivo Dart lido e analisado. Crie com `DartFile.read(caminho)`. */
export declare class DartFile {
  readonly path: DartPath;
  readonly exists: boolean;
  readonly source: string;
  /** `source.split("\n")` — o mesmo índice que os plugins usavam (`lines[i]` = linha `i + 1`). */
  readonly lines: readonly string[];
  readonly lineCount: number;
  private lexedCache;
  private topCache;
  private declarationsCache;
  private commentsCache;
  private stringsCache;
  private stringByToken;
  private identifiersCache;
  private addedLinesSet;
  private diffErrorText;
  private constructor();
  /**
   * Lê o arquivo do disco (`fs.readFileSync`, caminho relativo à raiz do
   * projeto, como o Danger informa) e devolve o modelo. Um parse por arquivo
   * por execução. Nunca lança exceção: arquivo inexistente vem com
   * `exists = false` e listas vazias.
   */
  static read(filePath: string): DartFile;
  /** Modelo a partir de um texto (testes, conteúdo que não está no disco). Sem cache. */
  static fromSource(source: string, filePath?: string): DartFile;
  /**
   * `read` + as linhas adicionadas no PR (`danger.git.structuredDiffForFile`),
   * para os plugins que só olham o diff. Sem diff, `addedLines` fica vazio.
   */
  static readWithDiff(filePath: string): Promise<DartFile>;
  /**
   * Arquivos `.dart` modificados + criados no PR que existem no disco
   * (`ignore_files` já aplicado). Por padrão sem testes e sem gerados.
   * `createdFirst`: criados antes dos modificados (a ordem define a ordem das mensagens).
   */
  static changed(options?: {
    includeTests?: boolean;
    includeGenerated?: boolean;
    createdFirst?: boolean;
  }): DartFile[];
  /** Limpa o cache de arquivos e caminhos (o `runPlugins` chama no início de cada execução). */
  static clearCache(): void;
  /** @internal Tokens e comentários. */
  get lexed(): Lexed;
  /** @internal Linha (base 1) de um offset. */
  lineAtOffset(offset: number): number;
  /** @internal Coluna (base 1) de um offset. */
  columnAtOffset(offset: number): number;
  private get top();
  /** Texto original da linha (base 1, sem `trim`). */
  lineAt(line: number): string;
  /** Texto original das linhas `fromLine` a `toLine` (base 1, inclusive). */
  snippet(fromLine: number, toLine: number): string;
  /**
   * A linha tem código: algum token começa ou passa por ela. Linha vazia, só
   * comentário ou só continuação de comentário de bloco → `false`. Linha
   * dentro de uma string multilinha conta como código.
   */
  isCode(line: number): boolean;
  private codeLinesCache;
  private get codeLines();
  /** A linha está dentro de um comentário (de linha, de doc ou de bloco) e não tem código. */
  isCommentLine(line: number): boolean;
  /** Linhas adicionadas no PR (base 1). Vazio se o arquivo não veio de `readWithDiff`. */
  get addedLines(): ReadonlySet<number>;
  isAdded(line: number): boolean;
  /**
   * Por que o `readWithDiff` não leu o diff (exceção do Danger ou diff ausente), ou `null`.
   * Diferencia "o diff falhou" de "nenhuma linha adicionada" (`addedLines` vazio nos dois casos).
   */
  get diffError(): string | null;
  /** `// @dart=3.x` do arquivo, ou `null`. */
  get languageVersionOverride(): string | null;
  /** Por que o arquivo é gerado: caminho, `part 'x.g.dart'` ou cabeçalho GENERATED; `null` se não for. */
  get generatedReason(): GeneratedReason | null;
  get isGenerated(): boolean;
  /** URI ou nome da biblioteca de `part of`, ou `null`. */
  get partOf(): string | null;
  /** `true` quando todo o nível superior foi reconhecido e todas as classes estão completas. */
  get isComplete(): boolean;
  /** Trechos de nível superior não reconhecidos. */
  get parseErrors(): readonly DartParseError[];
  private directivesCache;
  get directives(): readonly DartDirective[];
  get imports(): readonly DartDirective[];
  get exports(): readonly DartDirective[];
  get parts(): readonly DartDirective[];
  /** Todas as declarações de tipo (class, enum, mixin, extension...), na ordem do arquivo. */
  get declarations(): readonly DartClass[];
  /** Só `class` (inclui `abstract`, `sealed`, `base`, `interface`, `final`, `mixin class` e mixin application). */
  get classes(): readonly DartClass[];
  get enums(): readonly DartClass[];
  get mixins(): readonly DartClass[];
  get extensions(): readonly DartClass[];
  get extensionTypes(): readonly DartClass[];
  private typedefsCache;
  get typedefs(): readonly DartTypedef[];
  private functionsCache;
  /** Funções, getters e setters de nível superior. */
  get functions(): readonly DartFunction[];
  private variablesCache;
  /** Variáveis de nível superior (uma por nome em `final a = 1, b = 2;`). */
  get variables(): readonly DartTopLevelVariable[];
  /** Declaração de tipo que contém a linha (a mais interna não existe: Dart não aninha classes). */
  declarationAt(line: number): DartClass | null;
  /** Declaração de tipo pelo nome. */
  findClass(name: string): DartClass | null;
  /** Todos os comentários, na ordem do arquivo. */
  get comments(): readonly DartComment[];
  /** Todas as strings literais, na ordem do arquivo, com o papel sintático (`role`). */
  get strings(): readonly DartString[];
  /** @internal String do token `k` (ou `null`). */
  stringAtToken(k: number): DartString | null;
  private buildStrings;
  /** Faixas de tokens com expressões: corpos, inicializadores, parâmetros, initializer lists, argumentos de enum. */
  private expressionRanges;
  private callsCache;
  /**
   * Todas as chamadas do arquivo: corpos de métodos/funções/construtores,
   * inicializadores de campos e variáveis, initializer lists, valores padrão e
   * argumentos de valores de enum. Não inclui anotações.
   */
  calls(): readonly DartCall[];
  private closuresCache;
  /**
   * Todas as closures e funções locais do arquivo (nos mesmos lugares que
   * `calls()`), inclusive as de inicializadores: `final onTap = (bool reload) {};`.
   */
  closures(): readonly DartClosure[];
  private rangeScansCache;
  private rangeScans;
  /**
   * Todos os `try` do arquivo (nos mesmos lugares que `calls()`: corpos e closures, inclusive as de
   * inicializadores), na ordem do arquivo.
   */
  tryStatements(): readonly DartTry[];
  /**
   * Todas as variáveis locais do arquivo (statements, `for`, patterns; corpos e closures, inclusive
   * as de inicializadores), na ordem do arquivo. `insideClosure` é a closure mais interna.
   */
  localVariables(): readonly DartLocalVariable[];
  /** Identificadores DECLARADOS no arquivo (não os usos), na ordem do arquivo. */
  get identifiers(): readonly DartIdentifier[];
}
