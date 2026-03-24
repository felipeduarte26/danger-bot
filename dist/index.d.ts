/**
 * DANGER BOT - MAIN ENTRY POINT
 * =============================
 * Exporta todos os plugins, tipos e helpers do pacote @felipeduarte26/danger-bot
 */
export * from "./types";
export * from "./helpers";
export * from "./config";
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
export declare const allFlutterPlugins: any[];
export declare const domainLayerPlugins: import("./types").DangerPlugin[];
export declare const dataLayerPlugins: import("./types").DangerPlugin[];
export declare const presentationLayerPlugins: import("./types").DangerPlugin[];
export declare const cleanArchitecturePlugins: import("./types").DangerPlugin[];
export declare const codeQualityPlugins: import("./types").DangerPlugin[];
export declare const performancePlugins: import("./types").DangerPlugin[];
