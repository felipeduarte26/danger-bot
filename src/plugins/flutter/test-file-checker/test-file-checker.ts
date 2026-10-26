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
 * - Arquivos gerados (.g.dart, .freezed.dart...) e de teste
 * - Interfaces de repository no domain (_repository_interface.dart)
 *
 * Mapeamento: lib/(...)/file.dart → test/(...)/file_test.dart (também em monorepo);
 * vale também um teste com o mesmo nome em qualquer subpasta de test/.
 */
import {
  DartLayer,
  DartLayerFolder,
  DartPath,
  createPlugin,
  getDanger,
  sendMarkdown,
  sendWarn,
} from "@types";

const TARGET_FOLDERS = [
  DartLayerFolder.UseCases,
  DartLayerFolder.DataSources,
  DartLayerFolder.Repositories,
  DartLayerFolder.ViewModels,
  DartLayerFolder.Models,
  DartLayerFolder.Entities,
];

function isDomainRepositoryInterface(file: DartPath): boolean {
  return file.inLayer(DartLayer.Domain) && file.fileName.endsWith("_repository_interface.dart");
}

export default createPlugin(
  {
    name: "test-file-checker",
    description: "Verifica se arquivos da PR possuem testes correspondentes",
    enabled: true,
  },
  async () => {
    const { git } = getDanger();

    const prFiles = [...git.created_files, ...git.modified_files];

    const sourceFiles = prFiles
      .map((f: string) => DartPath.of(f))
      .filter(
        (file) =>
          file.isDart &&
          !file.isTest &&
          !file.isGenerated &&
          !file.isBarrel &&
          !isDomainRepositoryInterface(file) &&
          TARGET_FOLDERS.some((folder) => file.inFolder(folder))
      );

    const missingTests = sourceFiles
      .filter((file) => !file.hasTest(prFiles))
      .map((file) => file.fileName);

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
