/**
 * DartPath e DartPackage: fatos que dependem só do caminho do arquivo (servem
 * para qualquer arquivo do PR, até deletado) e do pubspec.yaml mais próximo.
 */
import * as fs from "fs";
import * as path from "path";
import { DartLayer, DartLayerFolder, FileCategory, GeneratedReason } from "./enums";
import { findNearestPubspec, readPubspec } from "./internal/pubspec";

/**
 * Sufixos de código gerado: a união das listas que os plugins usavam. Um
 * plugin que exclui `isGenerated` nunca analisa um arquivo que antes pulava.
 */
export const GENERATED_SUFFIXES: readonly string[] = [
  ".g.dart",
  ".freezed.dart",
  ".mocks.dart",
  ".mock.dart",
  ".gr.dart",
  ".gen.dart",
  ".config.dart",
  ".chopper.dart",
  ".mapper.dart",
  ".module.dart",
  ".graphql.dart",
  ".reflectable.dart",
  ".tailor.dart",
];

/** Pastas de código gerado (em qualquer nível do caminho). */
export const GENERATED_DIRS: readonly string[] = ["generated", ".dart_tool", "build"];

/** Pastas de testes do pacote (raiz ou pacote de monorepo, fora de `lib/`). */
export const TEST_DIRS: readonly string[] = ["test", "integration_test", "test_driver"];

const LAYER_ORDER = [DartLayer.Domain, DartLayer.Data, DartLayer.Presentation, DartLayer.Core];
const LAYER_FOLDERS = Object.values(DartLayerFolder);

const pathCache = new Map<string, DartPath>();

/** Fatos do caminho de um arquivo. Crie com `DartPath.of(caminho)`. */
export class DartPath {
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

  private constructor(filePath: string) {
    const normalized = filePath.replace(/\\/g, "/");
    this.path = normalized;
    this.fileName = path.posix.basename(normalized);
    this.directory = path.posix.dirname(normalized) === "." ? "" : path.posix.dirname(normalized);
    this.folderName = this.directory === "" ? "" : path.posix.basename(this.directory);
    this.segments = this.directory === "" ? [] : this.directory.split("/");
    this.extension = path.posix.extname(normalized);
    this.compoundSuffix = GENERATED_SUFFIXES.find((s) => normalized.endsWith(s)) ?? null;
    this.baseName = this.compoundSuffix
      ? this.fileName.slice(0, -this.compoundSuffix.length)
      : this.fileName.slice(0, this.fileName.length - this.extension.length);
    this.isDart = normalized.endsWith(".dart");
    // pasta de testes do pacote (`test/`, `packages/app/test/`), nunca uma pasta dentro de `lib/`
    const libIndex = this.segments.indexOf("lib");
    this.isTest =
      normalized.endsWith("_test.dart") ||
      this.segments.some((s, i) => TEST_DIRS.includes(s) && (libIndex < 0 || i < libIndex));
    this.generatedReason = this.compoundSuffix
      ? GeneratedReason.FileSuffix
      : this.segments.some((s) => GENERATED_DIRS.includes(s))
        ? GeneratedReason.Directory
        : null;
    this.isGenerated = this.generatedReason !== null;
    this.isBarrel =
      path.posix.basename(normalized, ".dart") ===
      path.posix.basename(path.posix.dirname(normalized));
    this.category = categorize(normalized);
    this.layer = LAYER_ORDER.find((l) => normalized.includes(`/${l}/`)) ?? null;
    let deepest: DartLayerFolder | null = null;
    let deepestIndex = -1;
    for (const folder of LAYER_FOLDERS) {
      const index = normalized.lastIndexOf(`/${folder}/`);
      if (index > deepestIndex) {
        deepest = folder;
        deepestIndex = index;
      }
    }
    this.layerFolder = deepest;
    const featureIndex = this.segments.indexOf("features");
    this.feature =
      featureIndex >= 0 && featureIndex + 1 < this.segments.length
        ? this.segments[featureIndex + 1]
        : null;
    const lib = /(^|\/)lib\//.exec(normalized);
    this.packageRootPath = lib ? normalized.slice(0, lib.index) : null;
    this.libRelativePath = lib ? normalized.slice(lib.index + lib[0].length) : null;
    if (this.libRelativePath === null) {
      this.expectedTestPath = normalized.replace(/\.dart$/, "_test.dart");
    } else {
      const testRoot = this.packageRootPath ? `${this.packageRootPath}/test` : "test";
      this.expectedTestPath = `${testRoot}/${this.libRelativePath.replace(/\.dart$/, "_test.dart")}`;
    }
  }

  /** `DartPath` do caminho (com cache). */
  static of(filePath: string): DartPath {
    let cached = pathCache.get(filePath);
    if (!cached) {
      cached = new DartPath(filePath);
      pathCache.set(filePath, cached);
    }
    return cached;
  }

  /** `path.includes("/domain/")` — a mesma semântica do `isInLayer` e dos plugins. */
  inLayer(layer: DartLayer): boolean {
    return this.path.includes(`/${layer}/`);
  }

  /**
   * `path.includes("/entities/")`. Aceita também nome livre de pasta fora do
   * enum: `inFolder("enums")`, `inFolder("usecase")`.
   */
  inFolder(folder: DartLayerFolder | string): boolean {
    return this.path.includes(`/${folder}/`);
  }

  /** Pubspec mais próximo do arquivo (nome do pacote, SDK mínimo). */
  get package(): DartPackage | null {
    return DartPackage.of(this.path);
  }

  /**
   * Existe teste para o arquivo: no disco no `expectedTestPath`, no próprio PR
   * (`prFiles`) ou com o mesmo nome (`x_test.dart`) em qualquer subpasta da
   * pasta `test/` do pacote.
   */
  hasTest(prFiles: Iterable<string> = []): boolean {
    if (fs.existsSync(this.expectedTestPath)) return true;
    for (const f of prFiles) {
      if (f === this.expectedTestPath) return true;
    }
    if (this.libRelativePath === null) return false;
    const testRoot = this.packageRootPath ? `${this.packageRootPath}/test` : "test";
    return testFileNames(testRoot).has(
      `${path.posix.basename(this.libRelativePath, ".dart")}_test.dart`
    );
  }
}

function categorize(file: string): FileCategory {
  if (/\.(g|freezed|mocks?)\.dart$/.test(file)) return FileCategory.Generated;
  if (file.endsWith("_test.dart")) return FileCategory.Test;
  if (file.endsWith(".dart")) return FileCategory.Dart;
  if (/pubspec\.(yaml|lock)$|\.gradle|Podfile|analysis_options|\.env|\.properties/.test(file)) {
    return FileCategory.Config;
  }
  if (/\.(png|jpg|jpeg|gif|svg|webp|ttf|otf|json)$/.test(file) || file.includes("/assets/")) {
    return FileCategory.Asset;
  }
  if (/\.(md|txt)$/i.test(file) || /README|CHANGELOG|LICENSE/i.test(file)) return FileCategory.Docs;
  return FileCategory.Other;
}

/** Nomes de arquivos `_test.dart` sob uma pasta de testes (lida uma vez por execução). */
const testNamesCache = new Map<string, Set<string>>();

function testFileNames(testRoot: string): Set<string> {
  const cached = testNamesCache.get(testRoot);
  if (cached) return cached;
  const names = new Set<string>();
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name));
      else if (entry.name.endsWith("_test.dart")) names.add(entry.name);
    }
  };
  walk(testRoot);
  testNamesCache.set(testRoot, names);
  return names;
}

const packageCache = new Map<string, DartPackage | null>();

/** Pacote Dart: o `pubspec.yaml` mais próximo de um arquivo. */
export class DartPackage {
  /** `name:` do pubspec (`""` se não houver). */
  readonly name: string;
  /** Pasta do pubspec (caminho absoluto). */
  readonly root: string;
  /** Caminho absoluto do `pubspec.yaml`. */
  readonly pubspecPath: string;
  /** Mínimo de `environment.sdk` como `"3.13"`, ou `null`. */
  readonly sdkMin: string | null;
  /** `{ major, minor }` do SDK mínimo, ou `null`. */
  readonly languageVersion: { major: number; minor: number } | null;

  private constructor(pubspecPath: string) {
    const info = readPubspec(pubspecPath);
    this.pubspecPath = pubspecPath;
    this.root = path.dirname(pubspecPath);
    this.name = info.name ?? "";
    this.languageVersion = info.version;
    this.sdkMin = info.version ? `${info.version.major}.${info.version.minor}` : null;
  }

  /** Pacote do arquivo (pubspec mais próximo, subindo as pastas), com cache. */
  static of(filePath: string): DartPackage | null {
    const pubspec = findNearestPubspec(filePath);
    if (pubspec === null) return null;
    if (!packageCache.has(pubspec)) packageCache.set(pubspec, new DartPackage(pubspec));
    return packageCache.get(pubspec) ?? null;
  }

  /** Pacote do diretório atual (a raiz do projeto, onde roda o Danger). */
  static current(): DartPackage | null {
    return DartPackage.of(path.join(process.cwd(), "pubspec.yaml"));
  }

  /** `true` se o SDK mínimo é pelo menos `major.minor`. */
  supportsLanguage(major: number, minor: number): boolean {
    const v = this.languageVersion;
    return v !== null && (v.major > major || (v.major === major && v.minor >= minor));
  }
}

/** Limpa os caches de caminho e de pacote (o `runPlugins` chama no início de cada execução). */
export function clearDartPathCaches(): void {
  pathCache.clear();
  packageCache.clear();
  testNamesCache.clear();
}
