/**
 * DANGER BOT - MAIN ENTRY POINT
 * =============================
 * Exporta todos os plugins, tipos e helpers do pacote @felipeduarte26/danger-bot
 */

// Export tipos e helpers
export * from "./types";
export * from "./helpers";
export * from "./config";

// Export all plugins
export {
  prSummaryPlugin,
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  spellCheckerPlugin,
  prValidationPlugin,
  fileNamingPlugin,
  domainEntitiesPlugin,
  domainFailuresPlugin,
  repositoriesPlugin,
  domainUseCasesPlugin,
  dataDatasourcesPlugin,
  dataModelsPlugin,
  presentationViewModelsPlugin,
  flutterPerformancePlugin,
  flutterWidgetsPlugin,
  cleanArchitecturePlugin,
  lateFinalCheckerPlugin,
  memoryLeakDetectorPlugin,
  mediaqueryModernPlugin,
  commentsCheckerPlugin,
  securityCheckerPlugin,
  barrelFilesEnforcerPlugin,
  identifierLanguagePlugin,
  classNamingConventionPlugin,
  presentationTryCatchCheckerPlugin,
  mergeConflictCheckerPlugin,
} from "./plugins/flutter";

/**
 * All available Flutter plugins in a single array
 * Use this for quick setup with all plugins enabled
 */
export const allFlutterPlugins = [
  require("./plugins/flutter/pr-summary").default,
  require("./plugins/flutter/pr-size-checker").default,
  require("./plugins/flutter/changelog-checker").default,
  require("./plugins/flutter/flutter-analyze").default,
  require("./plugins/flutter/spell-checker").default,
  require("./plugins/flutter/pr-validation").default,
  require("./plugins/flutter/file-naming").default,
  require("./plugins/flutter/domain-entities").default,
  require("./plugins/flutter/domain-failures").default,
  require("./plugins/flutter/repositories").default,
  require("./plugins/flutter/domain-usecases").default,
  require("./plugins/flutter/data-datasources").default,
  require("./plugins/flutter/data-models").default,
  require("./plugins/flutter/presentation-viewmodels").default,
  require("./plugins/flutter/flutter-performance").default,
  require("./plugins/flutter/flutter-widgets").default,
  require("./plugins/flutter/clean-architecture").default,
  require("./plugins/flutter/late-final-checker").default,
  require("./plugins/flutter/memory-leak-detector").default,
  require("./plugins/flutter/mediaquery-modern").default,
  require("./plugins/flutter/comments-checker").default,
  require("./plugins/flutter/security-checker").default,
  require("./plugins/flutter/barrel-files-enforcer").default,
  require("./plugins/flutter/identifier-language").default,
  require("./plugins/flutter/class-naming-convention").default,
  require("./plugins/flutter/presentation-try-catch-checker").default,
  require("./plugins/flutter/merge-conflict-checker").default,
  require("./plugins/flutter/avoid-god-class").default,
  require("./plugins/flutter/avoid-setstate-after-async").default,
  require("./plugins/flutter/column-row-spacing").default,
  require("./plugins/flutter/date-type-checker").default,
  require("./plugins/flutter/ai-code-review").default,
  require("./plugins/flutter/google-chat-notification").default,
];

// Export arrays for specific layers/categories
import {
  domainEntitiesPlugin,
  domainFailuresPlugin,
  repositoriesPlugin,
  domainUseCasesPlugin,
  dataDatasourcesPlugin,
  dataModelsPlugin,
  presentationViewModelsPlugin,
  cleanArchitecturePlugin,
  lateFinalCheckerPlugin,
  memoryLeakDetectorPlugin,
  commentsCheckerPlugin,
  securityCheckerPlugin,
  barrelFilesEnforcerPlugin,
  identifierLanguagePlugin,
  classNamingConventionPlugin,
  flutterPerformancePlugin,
  mediaqueryModernPlugin,
  presentationTryCatchCheckerPlugin,
  avoidGodClassPlugin,
  avoidSetstateAfterAsyncPlugin,
  columnRowSpacingPlugin,
  dateTypeCheckerPlugin,
  aiCodeReviewPlugin,
} from "./plugins/flutter";

export const domainLayerPlugins = [
  domainEntitiesPlugin,
  domainFailuresPlugin,
  repositoriesPlugin,
  domainUseCasesPlugin,
];

export const dataLayerPlugins = [dataDatasourcesPlugin, dataModelsPlugin];

export const presentationLayerPlugins = [
  presentationViewModelsPlugin,
  presentationTryCatchCheckerPlugin,
];

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
  identifierLanguagePlugin,
  classNamingConventionPlugin,
  avoidGodClassPlugin,
  avoidSetstateAfterAsyncPlugin,
  dateTypeCheckerPlugin,
  aiCodeReviewPlugin,
];

export const performancePlugins = [
  flutterPerformancePlugin,
  mediaqueryModernPlugin,
  columnRowSpacingPlugin,
];
