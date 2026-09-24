/**
 * Test File Checker Plugin
 * Verifica se arquivos criados/modificados na PR possuem arquivo de teste correspondente.
 *
 * Escopo (somente camadas testáveis):
 * - /usecases/       → _usecase.dart
 * - /datasources/    → _datasource.dart
 * - /repositories/   → _repository.dart (exclui interfaces do domain)
 * - /viewmodels/     → _viewmodel.dart
 * - /models/         → _model.dart
 * - /entities/       → _entity.dart
 *
 * Ignora:
 * - Barrel files (nome do arquivo = nome da pasta pai)
 * - Arquivos gerados (.g.dart, .freezed.dart)
 * - Arquivos de teste (_test.dart)
 * - Interfaces de repository no domain (_repository_interface.dart)
 *
 * Mapeamento: lib/(...)/file.dart → test/(...)/file_test.dart
 */
import { createPlugin, getDanger, sendWarn, sendMarkdown } from "@types";
import * as fs from "fs";
import * as path from "path";

interface TargetLayer {
  folder: string;
  label: string;
}

const TARGET_LAYERS: TargetLayer[] = [
  { folder: "/usecases/", label: "UseCase" },
  { folder: "/datasources/", label: "Datasource" },
  { folder: "/repositories/", label: "Repository" },
  { folder: "/viewmodels/", label: "ViewModel" },
  { folder: "/models/", label: "Model" },
  { folder: "/entities/", label: "Entity" },
];

function isBarrelFile(filePath: string): boolean {
  const fileName = path.basename(filePath, ".dart");
  const parentDir = path.basename(path.dirname(filePath));
  return fileName === parentDir;
}

function isGeneratedFile(filePath: string): boolean {
  return filePath.endsWith(".g.dart") || filePath.endsWith(".freezed.dart");
}

function isDomainRepositoryInterface(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.includes("/domain/") && normalized.endsWith("_repository_interface.dart");
}

function getTargetLayer(filePath: string): TargetLayer | null {
  const normalized = filePath.replace(/\\/g, "/");
  for (const layer of TARGET_LAYERS) {
    if (normalized.includes(layer.folder)) return layer;
  }
  return null;
}

/**
 * Separa o caminho em raiz do pacote e caminho dentro de `lib/`. Aceita o
 * formato do Danger (relativo à raiz: `lib/x.dart`), monorepo
 * (`packages/app/lib/x.dart`) e caminho absoluto. Null se não estiver em `lib/`.
 */
function splitLibPath(sourcePath: string): { root: string; relative: string } | null {
  const normalized = sourcePath.replace(/\\/g, "/");
  const match = /(^|\/)lib\//.exec(normalized);
  if (!match) return null;
  return {
    root: normalized.slice(0, match.index),
    relative: normalized.slice(match.index + match[0].length),
  };
}

/** Caminho esperado do teste: `lib/(...)/file.dart` → `test/(...)/file_test.dart`. */
function computeTestPath(sourcePath: string): string {
  const parts = splitLibPath(sourcePath);
  if (!parts) return sourcePath.replace(/\\/g, "/").replace(/\.dart$/, "_test.dart");
  const testRoot = parts.root ? `${parts.root}/test` : "test";
  return `${testRoot}/${parts.relative.replace(/\.dart$/, "_test.dart")}`;
}

/** Nomes de arquivos `_test.dart` sob cada pasta de testes (lida uma vez por execução). */
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

/** Teste com o mesmo nome em qualquer subpasta de `test/` (estrutura diferente de `lib/`). */
function findTestByName(sourcePath: string): boolean {
  const parts = splitLibPath(sourcePath);
  if (!parts) return false;
  const testFileName = path.basename(parts.relative, ".dart") + "_test.dart";
  const testRoot = parts.root ? `${parts.root}/test` : "test";
  return testFileNames(testRoot).has(testFileName);
}

export default createPlugin(
  {
    name: "test-file-checker",
    description: "Verifica se arquivos da PR possuem testes correspondentes",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const allPRFiles = new Set([...git.created_files, ...git.modified_files]);

    const sourceFiles = [...git.created_files, ...git.modified_files].filter((f: string) => {
      if (!f.endsWith(".dart")) return false;
      if (f.endsWith("_test.dart")) return false;
      if (isGeneratedFile(f)) return false;
      if (isBarrelFile(f)) return false;
      if (isDomainRepositoryInterface(f)) return false;
      if (!getTargetLayer(f)) return false;
      return true;
    });

    const missingTests: string[] = [];

    for (const file of sourceFiles) {
      const testPath = computeTestPath(file);

      const testExistsOnDisk = fs.existsSync(testPath);
      const testInPR = allPRFiles.has(testPath);
      const testFoundElsewhere = !testExistsOnDisk && findTestByName(file);

      if (!testExistsOnDisk && !testInPR && !testFoundElsewhere) {
        missingTests.push(path.basename(file));
      }
    }

    if (missingTests.length > 0) {
      sendWarn(`**Detectado ${missingTests.length} arquivo(s) sem testes**`);

      let md = `⚠️ **Arquivos sem testes** (${missingTests.length})\n\n`;
      for (const f of missingTests) {
        md += `- \`${f}\`\n`;
      }
      sendMarkdown(md);
    }
  }
);
