/** Resultado da análise de uma classe/enum (exportado para testes). */
export interface PrimaryConstructorReport {
  name: string;
  kind: "class" | "enum";
  line: number;
  status: "flag" | "skip";
  reason: string;
  movedFields: string[];
}
/**
 * Analisa as classes/enums de um arquivo Dart (exportado para testes). Com
 * `file`, superclasses de outros arquivos do pacote também são resolvidas.
 */
export declare function analyzePrimaryConstructors(
  source: string,
  file?: string
): PrimaryConstructorReport[];
/** Trechos "errado"/"correto" que o plugin publicaria para cada classe (exportado para testes). */
export declare function suggestPrimaryConstructors(
  source: string,
  file?: string
): {
  name: string;
  line: number;
  wrong: string;
  correct: string;
  hasCtorBody: boolean;
}[];
/** Aplica todas as conversões seguras do arquivo (exportado para testes). */
export declare function convertToPrimaryConstructors(source: string, file?: string): string;
/** Campo criado por um parâmetro declarante (`final Tipo nome`) do primary constructor. */
export interface PrimaryConstructorField {
  /** Nome do campo (ex.: `_client`). */
  name: string;
  /** Tipo como escrito, em uma linha e sem comentários (vazio quando omitido). */
  type: string;
  isFinal: boolean;
  /** Índice (base 0) da linha do nome do parâmetro. */
  lineIndex: number;
  /** Parâmetro em uma linha e sem comentários (ex.: `required final String name`). */
  text: string;
  /** Linhas `///` logo acima do próprio parâmetro. */
  docLines: string[];
}
/** Classe ou enum que declara um primary constructor no cabeçalho. */
export interface PrimaryConstructorDecl {
  name: string;
  kind: "class" | "enum";
  /**
   * Índice (base 0) da linha onde começa o cabeçalho (modificadores + `class`),
   * a mesma em que `normalizePrimaryConstructorHeaders` escreve o cabeçalho clássico.
   */
  lineIndex: number;
  fields: PrimaryConstructorField[];
}
/**
 * Classes e enums com primary constructor, com os parâmetros declarantes (que
 * também são campos da classe). Vazio quando o arquivo não usa o recurso.
 */
export declare function findPrimaryConstructors(source: string): PrimaryConstructorDecl[];
/** Campos do cabeçalho de cada classe, indexados pela linha (base 0) onde o cabeçalho começa. */
export declare function primaryConstructorFieldsByLine(
  source: string
): Map<number, PrimaryConstructorField[]>;
/**
 * Reescreve cada cabeçalho com primary constructor como o cabeçalho clássico
 * equivalente (`final class Foo extends Bar implements Baz {`), na linha da
 * palavra-chave `class`/`enum`, e deixa em branco as demais linhas do
 * cabeçalho: o corpo mantém a mesma numeração de linhas. Os parâmetros
 * declarantes somem do texto; use `findPrimaryConstructors` para obtê-los.
 * Sem primary constructor, devolve o texto original.
 */
export declare function normalizePrimaryConstructorHeaders(source: string): string;
/**
 * Versão mínima (major.minor) de uma restrição de SDK: `^3.13.0`,
 * `>=3.13.0 <4.0.0`, `<4.0.0 >=3.13.0`, `">= 3.13.0-0"`, `3.13.0`. Limites
 * superiores (`<`, `<=`) não contam; sem limite inferior (`any`) retorna null.
 */
declare function parseSdkLowerBound(constraint: string): {
  major: number;
  minor: number;
} | null;
/** Motivo para não analisar o arquivo, ou null se primary constructors estão disponíveis. */
declare function languageVersionIssue(file: string, content: string): string | null;
declare function isCandidateFile(file: string): boolean;
/** Funções internas expostas só para os testes do plugin. */
export declare const __testing: {
  parseSdkLowerBound: typeof parseSdkLowerBound;
  languageVersionIssue: typeof languageVersionIssue;
  isCandidateFile: typeof isCandidateFile;
  generatedCodeReason: (source: string) => string | null;
  parentLibraryReason: (source: string, file: string) => string | null;
};
declare const _default: import("../../../types").DangerPlugin;
export default _default;
