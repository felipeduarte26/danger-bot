import { DartLayer, DartLayerFolder, FileCategory, GeneratedReason } from "./enums";
/**
 * Sufixos de código gerado: a união das listas que os plugins usavam. Um
 * plugin que exclui `isGenerated` nunca analisa um arquivo que antes pulava.
 */
export declare const GENERATED_SUFFIXES: readonly string[];
/** Pastas de código gerado (em qualquer nível do caminho). */
export declare const GENERATED_DIRS: readonly string[];
/** Pastas de testes do pacote (raiz ou pacote de monorepo, fora de `lib/`). */
export declare const TEST_DIRS: readonly string[];
/** Fatos do caminho de um arquivo. Crie com `DartPath.of(caminho)`. */
export declare class DartPath {
  /** Como veio do Danger: relativo à raiz do repositório (barras normais). */
  readonly path: string;
  /** `user_entity.dart` */
  readonly fileName: string;
  /** Nome sem a extensão composta: `user.g.dart` → `user`, `user_entity.dart` → `user_entity`. */
  readonly baseName: string;
  /** `.dart`, `.yaml`... (`""` sem extensão) */
  readonly extension: string;
  /** `.g.dart`, `.freezed.dart`... (só os sufixos de `GENERATED_SUFFIXES`) ou `null`. */
  readonly compoundSuffix: string | null;
  /** `lib/features/x/domain/entities` (`""` na raiz) */
  readonly directory: string;
  /** Pasta do arquivo: `entities` (`""` na raiz) */
  readonly folderName: string;
  /** Pastas do caminho, em ordem: `["lib", "features", "x", ...]`. */
  readonly segments: readonly string[];
  readonly isDart: boolean;
  /**
   * `_test.dart` ou dentro da pasta de testes do pacote: `test/`, `integration_test/`,
   * `test_driver/` na raiz ou em monorepo (`packages/app/test/`). Uma pasta chamada `test`
   * dentro de `lib/` (`lib/features/test/`) é código de produção. Para a regra antiga
   * "qualquer `/test/` no caminho", use `inFolder("test")`.
   */
  readonly isTest: boolean;
  /** Sufixo de gerado (`GENERATED_SUFFIXES`) ou pasta `generated/`, `.dart_tool/`, `build/`. */
  readonly isGenerated: boolean;
  /** `FileSuffix`/`Directory` ou `null` (só pelo caminho; `DartFile.generatedReason` olha o conteúdo). */
  readonly generatedReason: GeneratedReason | null;
  /** Barrel file: nome do arquivo (sem `.dart`) igual ao nome da pasta. */
  readonly isBarrel: boolean;
  readonly category: FileCategory;
  /** Primeira camada do caminho, na ordem Domain → Data → Presentation → Core. */
  readonly layer: DartLayer | null;
  /** Pasta de papel mais próxima do arquivo. Para REGRA, prefira `inFolder`. */
  readonly layerFolder: DartLayerFolder | null;
  /** Segmento logo depois de `features/` (`null` fora de features). */
  readonly feature: string | null;
  /** Caminho depois de `lib/` (`features/x/x.dart`), também em monorepo; `null` fora de `lib/`. */
  readonly libRelativePath: string | null;
  /** Prefixo antes de `lib/` (`""` na raiz, `packages/app` em monorepo); `null` fora de `lib/`. */
  readonly packageRootPath: string | null;
  /** `lib/(...)/x.dart` → `test/(...)/x_test.dart` (com o prefixo do pacote em monorepo). */
  readonly expectedTestPath: string;
  private constructor();
  /** `DartPath` do caminho (com cache). */
  static of(filePath: string): DartPath;
  /** `path.includes("/domain/")` — a mesma semântica do `isInLayer` e dos plugins. */
  inLayer(layer: DartLayer): boolean;
  /**
   * `path.includes("/entities/")`. Aceita também nome livre de pasta fora do
   * enum: `inFolder("enums")`, `inFolder("usecase")`.
   */
  inFolder(folder: DartLayerFolder | string): boolean;
  /** Pubspec mais próximo do arquivo (nome do pacote, SDK mínimo). */
  get package(): DartPackage | null;
  /**
   * Existe teste para o arquivo: no disco no `expectedTestPath`, no próprio PR
   * (`prFiles`) ou com o mesmo nome (`x_test.dart`) em qualquer subpasta da
   * pasta `test/` do pacote.
   */
  hasTest(prFiles?: Iterable<string>): boolean;
  /**
   * Caminho do teste do arquivo, pela mesma regra do `hasTest`: o `expectedTestPath` (no disco ou
   * no PR) ou o primeiro `x_test.dart` em alguma subpasta de `test/` do pacote. `null` se não houver.
   */
  findTest(prFiles?: Iterable<string>): string | null;
}
/** Pacote Dart: o `pubspec.yaml` mais próximo de um arquivo. */
export declare class DartPackage {
  /** `name:` do pubspec (`""` se não houver). */
  readonly name: string;
  /** Pasta do pubspec (caminho absoluto). */
  readonly root: string;
  /** Caminho absoluto do `pubspec.yaml`. */
  readonly pubspecPath: string;
  /** Mínimo de `environment.sdk` como `"3.13"`, ou `null`. */
  readonly sdkMin: string | null;
  /** `{ major, minor }` do SDK mínimo, ou `null`. */
  readonly languageVersion: {
    major: number;
    minor: number;
  } | null;
  private constructor();
  /** Pacote do arquivo (pubspec mais próximo, subindo as pastas), com cache. */
  static of(filePath: string): DartPackage | null;
  /** Pacote do diretório atual (a raiz do projeto, onde roda o Danger). */
  static current(): DartPackage | null;
  /** `true` se o SDK mínimo é pelo menos `major.minor`. */
  supportsLanguage(major: number, minor: number): boolean;
}
/** Limpa os caches de caminho e de pacote (o `runPlugins` chama no início de cada execução). */
export declare function clearDartPathCaches(): void;
