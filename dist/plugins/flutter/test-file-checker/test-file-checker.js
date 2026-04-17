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
const _types_1 = require("../../../types");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const TARGET_LAYERS = [
  { folder: "/usecases/", label: "UseCase" },
  { folder: "/datasources/", label: "Datasource" },
  { folder: "/repositories/", label: "Repository" },
  { folder: "/viewmodels/", label: "ViewModel" },
  { folder: "/models/", label: "Model" },
  { folder: "/entities/", label: "Entity" },
];
function isBarrelFile(filePath) {
  const fileName = path.basename(filePath, ".dart");
  const parentDir = path.basename(path.dirname(filePath));
  return fileName === parentDir;
}
function isGeneratedFile(filePath) {
  return filePath.endsWith(".g.dart") || filePath.endsWith(".freezed.dart");
}
function isDomainRepositoryInterface(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.includes("/domain/") && normalized.endsWith("_repository_interface.dart");
}
function getTargetLayer(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  for (const layer of TARGET_LAYERS) {
    if (normalized.includes(layer.folder)) return layer;
  }
  return null;
}
function computeTestPath(sourcePath) {
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
function computeExpectedTestInPR(sourcePath) {
  const normalized = sourcePath.replace(/\\/g, "/");
  const libIdx = normalized.indexOf("lib/");
  if (libIdx === -1) return normalized.replace(/\.dart$/, "_test.dart");
  const relative = normalized.substring(libIdx + "lib/".length);
  return "test/" + relative.replace(/\.dart$/, "_test.dart");
}
function findTestByName(sourcePath) {
  const normalized = sourcePath.replace(/\\/g, "/");
  const libIndex = normalized.indexOf("/lib/");
  if (libIndex === -1) return false;
  const projectRoot = normalized.substring(0, libIndex);
  const testFileName = path.basename(normalized, ".dart") + "_test.dart";
  const testRoot = `${projectRoot}/test`;
  if (!fs.existsSync(testRoot)) return false;
  function searchDir(dir) {
    let entries;
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
exports.default = (0, _types_1.createPlugin)(
  {
    name: "test-file-checker",
    description: "Verifica se arquivos da PR possuem testes correspondentes",
    enabled: true,
  },
  async () => {
    const { git } = (0, _types_1.getDanger)();
    const allPRFiles = new Set([...git.created_files, ...git.modified_files]);
    const sourceFiles = [...git.created_files, ...git.modified_files].filter((f) => {
      if (!f.endsWith(".dart")) return false;
      if (f.endsWith("_test.dart")) return false;
      if (isGeneratedFile(f)) return false;
      if (isBarrelFile(f)) return false;
      if (isDomainRepositoryInterface(f)) return false;
      if (!getTargetLayer(f)) return false;
      return true;
    });
    const missingTests = [];
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
      (0, _types_1.sendWarn)(`**Detectado ${missingTests.length} arquivo(s) sem testes**`);
      let md = `⚠️ **Arquivos sem testes** (${missingTests.length})\n\n`;
      for (const f of missingTests) {
        md += `- \`${f}\`\n`;
      }
      (0, _types_1.sendMarkdown)(md);
    }
  }
);
