/**
 * DANGER BOT - MAIN ENTRY POINT
 * =============================
 * Exporta todos os plugins, tipos e helpers do pacote @diletta/danger-bot
 */

// Export tipos e helpers
export * from "./types";
export * from "./helpers";

// Export all plugins
export {
  prSummaryPlugin,
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  portugueseDocumentationPlugin,
  spellCheckerPlugin,
  prValidationPlugin,
  fileNamingPlugin,
  domainEntitiesPlugin,
  domainFailuresPlugin,
  domainRepositoriesPlugin,
  domainUseCasesPlugin,
  dataDatasourcesPlugin,
  dataModelsPlugin,
  dataRepositoriesPlugin,
  presentationViewModelsPlugin,
  presentationStatesPlugin,
  flutterPerformancePlugin,
  flutterWidgetsPlugin,
  cleanArchitecturePlugin,
  lateFinalCheckerPlugin,
  memoryLeakDetectorPlugin,
  mediaqueryModernPlugin,
  commentsCheckerPlugin,
  securityCheckerPlugin,
  barrelFilesEnforcerPlugin,
} from "./plugins/flutter";

/**
 * All available Flutter plugins in a single array (26 plugins)
 * Use this for quick setup with all plugins enabled
 */
export const allFlutterPlugins = [
  // Sumário deve ser PRIMEIRO para aparecer no topo
  require("./plugins/flutter/pr-summary").default,

  // Importar os plugins
  require("./plugins/flutter/pr-size-checker").default,
  require("./plugins/flutter/changelog-checker").default,
  require("./plugins/flutter/flutter-analyze").default,
  require("./plugins/flutter/portuguese-documentation").default,
  require("./plugins/flutter/spell-checker").default,
  require("./plugins/flutter/pr-validation").default,
  require("./plugins/flutter/file-naming").default,
  require("./plugins/flutter/domain-entities").default,
  require("./plugins/flutter/domain-failures").default,
  require("./plugins/flutter/domain-repositories").default,
  require("./plugins/flutter/domain-usecases").default,
  require("./plugins/flutter/data-datasources").default,
  require("./plugins/flutter/data-models").default,
  require("./plugins/flutter/data-repositories").default,
  require("./plugins/flutter/presentation-viewmodels").default,
  require("./plugins/flutter/presentation-states").default,
  require("./plugins/flutter/flutter-performance").default,
  require("./plugins/flutter/flutter-widgets").default,
  require("./plugins/flutter/clean-architecture").default,
  require("./plugins/flutter/late-final-checker").default,
  require("./plugins/flutter/memory-leak-detector").default,
  require("./plugins/flutter/mediaquery-modern").default,
  require("./plugins/flutter/comments-checker").default,
  require("./plugins/flutter/security-checker").default,
  require("./plugins/flutter/barrel-files-enforcer").default,
];

// Export arrays for specific layers/categories
import {
  domainEntitiesPlugin,
  domainFailuresPlugin,
  domainRepositoriesPlugin,
  domainUseCasesPlugin,
  dataDatasourcesPlugin,
  dataModelsPlugin,
  dataRepositoriesPlugin,
  presentationViewModelsPlugin,
  presentationStatesPlugin,
  cleanArchitecturePlugin,
  lateFinalCheckerPlugin,
  memoryLeakDetectorPlugin,
  commentsCheckerPlugin,
  securityCheckerPlugin,
  barrelFilesEnforcerPlugin,
  flutterPerformancePlugin,
  mediaqueryModernPlugin,
} from "./plugins/flutter";

export const domainLayerPlugins = [
  domainEntitiesPlugin,
  domainFailuresPlugin,
  domainRepositoriesPlugin,
  domainUseCasesPlugin,
];

export const dataLayerPlugins = [dataDatasourcesPlugin, dataModelsPlugin, dataRepositoriesPlugin];

export const presentationLayerPlugins = [presentationViewModelsPlugin, presentationStatesPlugin];

export const cleanArchitecturePlugins = [
  ...domainLayerPlugins,
  ...dataLayerPlugins,
  ...presentationLayerPlugins,
  cleanArchitecturePlugin,
];

export const codeQualityPlugins = [
  lateFinalCheckerPlugin,
  memoryLeakDetectorPlugin,
  commentsCheckerPlugin,
  securityCheckerPlugin,
  barrelFilesEnforcerPlugin,
];

export const performancePlugins = [flutterPerformancePlugin, mediaqueryModernPlugin];
