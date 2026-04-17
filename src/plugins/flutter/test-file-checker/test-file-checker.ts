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
import { createPlugin, getDanger, sendWarn } from "@types";
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

function computeTestPath(sourcePath: string): string {
  const normalized = sourcePath.replace(/\\/g, "/");
  const libIndex = normalized.indexOf("/lib/");
  if (libIndex === -1) {
    return normalized.replace(/\.dart$/, "_test.dart");
  }

  const projectRoot = normalized.substring(0, libIndex);
  const relativePath = normalized.substring(libIndex + "/lib/".length);
  const testRelative = relativePath.replace(/\.dart$/, "_test.dart");
  return `${projectRoot}/test/${testRelative}`;
}

function computeExpectedTestInPR(sourcePath: string): string {
  const normalized = sourcePath.replace(/\\/g, "/");
  const libIdx = normalized.indexOf("lib/");
  if (libIdx === -1) return normalized.replace(/\.dart$/, "_test.dart");
  const relative = normalized.substring(libIdx + "lib/".length);
  return "test/" + relative.replace(/\.dart$/, "_test.dart");
}

function findTestByName(sourcePath: string): boolean {
  const normalized = sourcePath.replace(/\\/g, "/");
  const libIndex = normalized.indexOf("/lib/");
  if (libIndex === -1) return false;

  const projectRoot = normalized.substring(0, libIndex);
  const testFileName = path.basename(normalized, ".dart") + "_test.dart";
  const testRoot = `${projectRoot}/test`;

  if (!fs.existsSync(testRoot)) return false;

  function searchDir(dir: string): boolean {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return false;
    }
    for (const entry of entries) {
      if (entry === testFileName) return true;
      const full = path.join(dir, entry);
      try {
        if (fs.statSync(full).isDirectory()) {
          if (searchDir(full)) return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }

  return searchDir(testRoot);
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
      const testPathAbsolute = computeTestPath(file);
      const testPathRelative = computeExpectedTestInPR(file);

      const testExistsOnDisk = fs.existsSync(testPathAbsolute);
      const testInPR = allPRFiles.has(testPathRelative);
      const testFoundElsewhere = !testExistsOnDisk && findTestByName(file);

      if (!testExistsOnDisk && !testInPR && !testFoundElsewhere) {
        missingTests.push(path.basename(file));
      }
    }

    if (missingTests.length > 0) {
      const fileList = missingTests.map((f) => `\`${f}\``).join(", ");
      sendWarn(`**Detectado ${missingTests.length} arquivo(s) sem testes:** ${fileList}`);
    }
  }
);
