"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DartPackage =
  exports.DartPath =
  exports.TEST_DIRS =
  exports.GENERATED_DIRS =
  exports.GENERATED_SUFFIXES =
    void 0;
exports.clearDartPathCaches = clearDartPathCaches;
/**
 * DartPath e DartPackage: fatos que dependem só do caminho do arquivo (servem
 * para qualquer arquivo do PR, até deletado) e do pubspec.yaml mais próximo.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const enums_1 = require("./enums");
const pubspec_1 = require("./internal/pubspec");
/**
 * Sufixos de código gerado: a união das listas que os plugins usavam. Um
 * plugin que exclui `isGenerated` nunca analisa um arquivo que antes pulava.
 */
exports.GENERATED_SUFFIXES = [
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
exports.GENERATED_DIRS = ["generated", ".dart_tool", "build"];
/** Pastas de testes do pacote (raiz ou pacote de monorepo, fora de `lib/`). */
exports.TEST_DIRS = ["test", "integration_test", "test_driver"];
const LAYER_ORDER = [
  enums_1.DartLayer.Domain,
  enums_1.DartLayer.Data,
  enums_1.DartLayer.Presentation,
  enums_1.DartLayer.Core,
];
const LAYER_FOLDERS = Object.values(enums_1.DartLayerFolder);
const pathCache = new Map();
/** Fatos do caminho de um arquivo. Crie com `DartPath.of(caminho)`. */
class DartPath {
  constructor(filePath) {
    const normalized = filePath.replace(/\\/g, "/");
    this.path = normalized;
    this.fileName = path.posix.basename(normalized);
    this.directory = path.posix.dirname(normalized) === "." ? "" : path.posix.dirname(normalized);
    this.folderName = this.directory === "" ? "" : path.posix.basename(this.directory);
    this.segments = this.directory === "" ? [] : this.directory.split("/");
    this.extension = path.posix.extname(normalized);
    this.compoundSuffix = exports.GENERATED_SUFFIXES.find((s) => normalized.endsWith(s)) ?? null;
    this.baseName = this.compoundSuffix
      ? this.fileName.slice(0, -this.compoundSuffix.length)
      : this.fileName.slice(0, this.fileName.length - this.extension.length);
    this.isDart = normalized.endsWith(".dart");
    // pasta de testes do pacote (`test/`, `packages/app/test/`), nunca uma pasta dentro de `lib/`
    const libIndex = this.segments.indexOf("lib");
    this.isTest =
      normalized.endsWith("_test.dart") ||
      this.segments.some((s, i) => exports.TEST_DIRS.includes(s) && (libIndex < 0 || i < libIndex));
    this.generatedReason = this.compoundSuffix
      ? enums_1.GeneratedReason.FileSuffix
      : this.segments.some((s) => exports.GENERATED_DIRS.includes(s))
        ? enums_1.GeneratedReason.Directory
        : null;
    this.isGenerated = this.generatedReason !== null;
    this.isBarrel =
      path.posix.basename(normalized, ".dart") ===
      path.posix.basename(path.posix.dirname(normalized));
    this.category = categorize(normalized);
    this.layer = LAYER_ORDER.find((l) => normalized.includes(`/${l}/`)) ?? null;
    let deepest = null;
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
  static of(filePath) {
    let cached = pathCache.get(filePath);
    if (!cached) {
      cached = new DartPath(filePath);
      pathCache.set(filePath, cached);
    }
    return cached;
  }
  /** `path.includes("/domain/")` — a mesma semântica do `isInLayer` e dos plugins. */
  inLayer(layer) {
    return this.path.includes(`/${layer}/`);
  }
  /**
   * `path.includes("/entities/")`. Aceita também nome livre de pasta fora do
   * enum: `inFolder("enums")`, `inFolder("usecase")`.
   */
  inFolder(folder) {
    return this.path.includes(`/${folder}/`);
  }
  /** Pubspec mais próximo do arquivo (nome do pacote, SDK mínimo). */
  get package() {
    return DartPackage.of(this.path);
  }
  /**
   * Existe teste para o arquivo: no disco no `expectedTestPath`, no próprio PR
   * (`prFiles`) ou com o mesmo nome (`x_test.dart`) em qualquer subpasta da
   * pasta `test/` do pacote.
   */
  hasTest(prFiles = []) {
    return this.findTest(prFiles) !== null;
  }
  /**
   * Caminho do teste do arquivo, pela mesma regra do `hasTest`: o `expectedTestPath` (no disco ou
   * no PR) ou o primeiro `x_test.dart` em alguma subpasta de `test/` do pacote. `null` se não houver.
   */
  findTest(prFiles = []) {
    if (fs.existsSync(this.expectedTestPath)) return this.expectedTestPath;
    for (const f of prFiles) {
      if (f === this.expectedTestPath) return f;
    }
    if (this.libRelativePath === null) return null;
    const testRoot = this.packageRootPath ? `${this.packageRootPath}/test` : "test";
    const name = `${path.posix.basename(this.libRelativePath, ".dart")}_test.dart`;
    return testFiles(testRoot).get(name) ?? null;
  }
}
exports.DartPath = DartPath;
function categorize(file) {
  if (/\.(g|freezed|mocks?)\.dart$/.test(file)) return enums_1.FileCategory.Generated;
  if (file.endsWith("_test.dart")) return enums_1.FileCategory.Test;
  if (file.endsWith(".dart")) return enums_1.FileCategory.Dart;
  if (/pubspec\.(yaml|lock)$|\.gradle|Podfile|analysis_options|\.env|\.properties/.test(file)) {
    return enums_1.FileCategory.Config;
  }
  if (/\.(png|jpg|jpeg|gif|svg|webp|ttf|otf|json)$/.test(file) || file.includes("/assets/")) {
    return enums_1.FileCategory.Asset;
  }
  if (/\.(md|txt)$/i.test(file) || /README|CHANGELOG|LICENSE/i.test(file))
    return enums_1.FileCategory.Docs;
  return enums_1.FileCategory.Other;
}
/** Nomes de arquivos `_test.dart` sob uma pasta de testes (lida uma vez por execução). */
const testNamesCache = new Map();
/** `x_test.dart` → primeiro caminho com esse nome em `testRoot` (com cache). */
function testFiles(testRoot) {
  const cached = testNamesCache.get(testRoot);
  if (cached) return cached;
  const names = new Map();
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) walk(path.posix.join(dir, entry.name));
      else if (entry.name.endsWith("_test.dart") && !names.has(entry.name)) {
        names.set(entry.name, path.posix.join(dir, entry.name));
      }
    }
  };
  walk(testRoot);
  testNamesCache.set(testRoot, names);
  return names;
}
const packageCache = new Map();
/** Pacote Dart: o `pubspec.yaml` mais próximo de um arquivo. */
class DartPackage {
  constructor(pubspecPath) {
    const info = (0, pubspec_1.readPubspec)(pubspecPath);
    this.pubspecPath = pubspecPath;
    this.root = path.dirname(pubspecPath);
    this.name = info.name ?? "";
    this.languageVersion = info.version;
    this.sdkMin = info.version ? `${info.version.major}.${info.version.minor}` : null;
  }
  /** Pacote do arquivo (pubspec mais próximo, subindo as pastas), com cache. */
  static of(filePath) {
    const pubspec = (0, pubspec_1.findNearestPubspec)(filePath);
    if (pubspec === null) return null;
    if (!packageCache.has(pubspec)) packageCache.set(pubspec, new DartPackage(pubspec));
    return packageCache.get(pubspec) ?? null;
  }
  /** Pacote do diretório atual (a raiz do projeto, onde roda o Danger). */
  static current() {
    return DartPackage.of(path.join(process.cwd(), "pubspec.yaml"));
  }
  /** `true` se o SDK mínimo é pelo menos `major.minor`. */
  supportsLanguage(major, minor) {
    const v = this.languageVersion;
    return v !== null && (v.major > major || (v.major === major && v.minor >= minor));
  }
}
exports.DartPackage = DartPackage;
/** Limpa os caches de caminho e de pacote (o `runPlugins` chama no início de cada execução). */
function clearDartPathCaches() {
  pathCache.clear();
  packageCache.clear();
  testNamesCache.clear();
}
