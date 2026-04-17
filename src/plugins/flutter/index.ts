/**
 * FLUTTER PLUGINS - BARREL FILE
 * ==============================
 * Exporta todos os plugins relacionados ao Flutter/Dart
 */

// Plugin de sumário (deve rodar primeiro)
export { default as prSummaryPlugin } from "./pr-summary";

// Plugins originais
export { default as prSizeCheckerPlugin } from "./pr-size-checker";
export { default as changelogCheckerPlugin } from "./changelog-checker";
export { default as flutterAnalyzePlugin } from "./flutter-analyze";
export { default as spellCheckerPlugin } from "./spell-checker";

// Novos plugins convertidos para createPlugin
export { default as prValidationPlugin } from "./pr-validation";
export { default as fileNamingPlugin } from "./file-naming";
export { default as domainEntitiesPlugin } from "./domain-entities";
export { default as domainFailuresPlugin } from "./domain-failures";
export { default as repositoriesPlugin } from "./repositories";
export { default as domainUseCasesPlugin } from "./domain-usecases";
export { default as dataDatasourcesPlugin } from "./data-datasources";
export { default as dataModelsPlugin } from "./data-models";
export { default as presentationViewModelsPlugin } from "./presentation-viewmodels";
export { default as flutterPerformancePlugin } from "./flutter-performance";
export { default as flutterWidgetsPlugin } from "./flutter-widgets";
export { default as cleanArchitecturePlugin } from "./clean-architecture";
export { default as lateFinalCheckerPlugin } from "./late-final-checker";
export { default as memoryLeakDetectorPlugin } from "./memory-leak-detector";
export { default as mediaqueryModernPlugin } from "./mediaquery-modern";
export { default as commentsCheckerPlugin } from "./comments-checker";
export { default as securityCheckerPlugin } from "./security-checker";
export { default as barrelFilesEnforcerPlugin } from "./barrel-files-enforcer";
export { default as identifierLanguagePlugin } from "./identifier-language";
export { default as classNamingConventionPlugin } from "./class-naming-convention";
export { default as presentationTryCatchCheckerPlugin } from "./presentation-try-catch-checker";
export { default as mergeConflictCheckerPlugin } from "./merge-conflict-checker";
export { default as avoidGodClassPlugin } from "./avoid-god-class";
export { default as avoidSetstateAfterAsyncPlugin } from "./avoid-setstate-after-async";
export { default as columnRowSpacingPlugin } from "./column-row-spacing";
export { default as dateTypeCheckerPlugin } from "./date-type-checker";
export { default as printStatementDetectorPlugin } from "./print-statement-detector";
export { default as emptyCatchDetectorPlugin } from "./empty-catch-detector";
export { default as futureWaitModernizerPlugin } from "./future-wait-modernizer";
export { default as aiCodeReviewPlugin } from "./ai-code-review";
export { default as googleChatNotificationPlugin } from "./google-chat-notification";
export { default as testFileCheckerPlugin } from "./test-file-checker";
export { default as flutterTestRunnerPlugin } from "./flutter-test-runner";
export { default as testCoverageSummaryPlugin } from "./test-coverage-summary";
