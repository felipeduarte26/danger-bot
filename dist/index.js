"use strict";
/**
 * DANGER BOT - MAIN ENTRY POINT
 * =============================
 * Exporta todos os plugins, tipos e helpers do pacote @felipeduarte26/danger-bot
 */
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
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPlugins =
  exports.performancePlugins =
  exports.codeQualityPlugins =
  exports.cleanArchitecturePlugins =
  exports.presentationLayerPlugins =
  exports.dataLayerPlugins =
  exports.domainLayerPlugins =
  exports.allFlutterPlugins =
  exports.folderNamingConventionPlugin =
  exports.presentationEncapsulationPlugin =
  exports.spellCheckerPtbrPlugin =
  exports.buildDocCheckerPlugin =
  exports.positionalBoolParamsPlugin =
  exports.booleanNamingConventionPlugin =
  exports.testCoverageSummaryPlugin =
  exports.flutterTestRunnerPlugin =
  exports.testFileCheckerPlugin =
  exports.modelEntityInheritancePlugin =
  exports.futureWaitModernizerPlugin =
  exports.emptyCatchDetectorPlugin =
  exports.printStatementDetectorPlugin =
  exports.mergeConflictCheckerPlugin =
  exports.presentationTryCatchCheckerPlugin =
  exports.classNamingConventionPlugin =
  exports.identifierLanguagePlugin =
  exports.barrelFilesEnforcerPlugin =
  exports.securityCheckerPlugin =
  exports.commentsCheckerPlugin =
  exports.mediaqueryModernPlugin =
  exports.memoryLeakDetectorPlugin =
  exports.lateFinalCheckerPlugin =
  exports.cleanArchitecturePlugin =
  exports.flutterWidgetsPlugin =
  exports.flutterPerformancePlugin =
  exports.presentationViewModelsPlugin =
  exports.dataModelsPlugin =
  exports.dataDatasourcesPlugin =
  exports.domainUseCasesPlugin =
  exports.repositoriesPlugin =
  exports.domainFailuresPlugin =
  exports.domainEntitiesPlugin =
  exports.fileNamingPlugin =
  exports.prValidationPlugin =
  exports.spellCheckerPlugin =
  exports.flutterAnalyzePlugin =
  exports.changelogCheckerPlugin =
  exports.prSizeCheckerPlugin =
  exports.prSummaryPlugin =
    void 0;
// Export tipos e helpers
__exportStar(require("./types"), exports);
__exportStar(require("./helpers"), exports);
__exportStar(require("./config"), exports);
// Export all plugins
var flutter_1 = require("./plugins/flutter");
Object.defineProperty(exports, "prSummaryPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.prSummaryPlugin;
  },
});
Object.defineProperty(exports, "prSizeCheckerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.prSizeCheckerPlugin;
  },
});
Object.defineProperty(exports, "changelogCheckerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.changelogCheckerPlugin;
  },
});
Object.defineProperty(exports, "flutterAnalyzePlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.flutterAnalyzePlugin;
  },
});
Object.defineProperty(exports, "spellCheckerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.spellCheckerPlugin;
  },
});
Object.defineProperty(exports, "prValidationPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.prValidationPlugin;
  },
});
Object.defineProperty(exports, "fileNamingPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.fileNamingPlugin;
  },
});
Object.defineProperty(exports, "domainEntitiesPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.domainEntitiesPlugin;
  },
});
Object.defineProperty(exports, "domainFailuresPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.domainFailuresPlugin;
  },
});
Object.defineProperty(exports, "repositoriesPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.repositoriesPlugin;
  },
});
Object.defineProperty(exports, "domainUseCasesPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.domainUseCasesPlugin;
  },
});
Object.defineProperty(exports, "dataDatasourcesPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.dataDatasourcesPlugin;
  },
});
Object.defineProperty(exports, "dataModelsPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.dataModelsPlugin;
  },
});
Object.defineProperty(exports, "presentationViewModelsPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.presentationViewModelsPlugin;
  },
});
Object.defineProperty(exports, "flutterPerformancePlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.flutterPerformancePlugin;
  },
});
Object.defineProperty(exports, "flutterWidgetsPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.flutterWidgetsPlugin;
  },
});
Object.defineProperty(exports, "cleanArchitecturePlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.cleanArchitecturePlugin;
  },
});
Object.defineProperty(exports, "lateFinalCheckerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.lateFinalCheckerPlugin;
  },
});
Object.defineProperty(exports, "memoryLeakDetectorPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.memoryLeakDetectorPlugin;
  },
});
Object.defineProperty(exports, "mediaqueryModernPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.mediaqueryModernPlugin;
  },
});
Object.defineProperty(exports, "commentsCheckerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.commentsCheckerPlugin;
  },
});
Object.defineProperty(exports, "securityCheckerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.securityCheckerPlugin;
  },
});
Object.defineProperty(exports, "barrelFilesEnforcerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.barrelFilesEnforcerPlugin;
  },
});
Object.defineProperty(exports, "identifierLanguagePlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.identifierLanguagePlugin;
  },
});
Object.defineProperty(exports, "classNamingConventionPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.classNamingConventionPlugin;
  },
});
Object.defineProperty(exports, "presentationTryCatchCheckerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.presentationTryCatchCheckerPlugin;
  },
});
Object.defineProperty(exports, "mergeConflictCheckerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.mergeConflictCheckerPlugin;
  },
});
Object.defineProperty(exports, "printStatementDetectorPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.printStatementDetectorPlugin;
  },
});
Object.defineProperty(exports, "emptyCatchDetectorPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.emptyCatchDetectorPlugin;
  },
});
Object.defineProperty(exports, "futureWaitModernizerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.futureWaitModernizerPlugin;
  },
});
Object.defineProperty(exports, "modelEntityInheritancePlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.modelEntityInheritancePlugin;
  },
});
Object.defineProperty(exports, "testFileCheckerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.testFileCheckerPlugin;
  },
});
Object.defineProperty(exports, "flutterTestRunnerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.flutterTestRunnerPlugin;
  },
});
Object.defineProperty(exports, "testCoverageSummaryPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.testCoverageSummaryPlugin;
  },
});
Object.defineProperty(exports, "booleanNamingConventionPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.booleanNamingConventionPlugin;
  },
});
Object.defineProperty(exports, "positionalBoolParamsPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.positionalBoolParamsPlugin;
  },
});
Object.defineProperty(exports, "buildDocCheckerPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.buildDocCheckerPlugin;
  },
});
Object.defineProperty(exports, "spellCheckerPtbrPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.spellCheckerPtbrPlugin;
  },
});
Object.defineProperty(exports, "presentationEncapsulationPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.presentationEncapsulationPlugin;
  },
});
Object.defineProperty(exports, "folderNamingConventionPlugin", {
  enumerable: true,
  get: function () {
    return flutter_1.folderNamingConventionPlugin;
  },
});
/**
 * All available Flutter plugins in a single array
 * Use this for quick setup with all plugins enabled
 */
exports.allFlutterPlugins = [
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
  require("./plugins/flutter/print-statement-detector").default,
  require("./plugins/flutter/empty-catch-detector").default,
  require("./plugins/flutter/future-wait-modernizer").default,
  require("./plugins/flutter/ai-code-review").default,
  require("./plugins/flutter/boolean-naming-convention").default,
  require("./plugins/flutter/positional-bool-params").default,
  require("./plugins/flutter/model-entity-inheritance").default,
  require("./plugins/flutter/test-file-checker").default,
  require("./plugins/flutter/flutter-test-runner").default,
  require("./plugins/flutter/test-coverage-summary").default,
  require("./plugins/flutter/build-doc-checker").default,
  require("./plugins/flutter/spell-checker-ptbr").default,
  require("./plugins/flutter/presentation-encapsulation").default,
  require("./plugins/flutter/folder-naming-convention").default,
  // google-chat-notification deve ser sempre o último plugin
  require("./plugins/flutter/google-chat-notification").default,
];
// Export arrays for specific layers/categories
const flutter_2 = require("./plugins/flutter");
exports.domainLayerPlugins = [
  flutter_2.domainEntitiesPlugin,
  flutter_2.domainFailuresPlugin,
  flutter_2.repositoriesPlugin,
  flutter_2.domainUseCasesPlugin,
];
exports.dataLayerPlugins = [
  flutter_2.dataDatasourcesPlugin,
  flutter_2.dataModelsPlugin,
  flutter_2.modelEntityInheritancePlugin,
];
exports.presentationLayerPlugins = [
  flutter_2.presentationViewModelsPlugin,
  flutter_2.presentationTryCatchCheckerPlugin,
  flutter_2.presentationEncapsulationPlugin,
];
exports.cleanArchitecturePlugins = [
  ...exports.domainLayerPlugins,
  ...exports.dataLayerPlugins,
  ...exports.presentationLayerPlugins,
  flutter_2.cleanArchitecturePlugin,
  flutter_2.folderNamingConventionPlugin,
];
exports.codeQualityPlugins = [
  flutter_2.lateFinalCheckerPlugin,
  flutter_2.memoryLeakDetectorPlugin,
  flutter_2.commentsCheckerPlugin,
  flutter_2.securityCheckerPlugin,
  flutter_2.barrelFilesEnforcerPlugin,
  flutter_2.identifierLanguagePlugin,
  flutter_2.classNamingConventionPlugin,
  flutter_2.avoidGodClassPlugin,
  flutter_2.avoidSetstateAfterAsyncPlugin,
  flutter_2.dateTypeCheckerPlugin,
  flutter_2.printStatementDetectorPlugin,
  flutter_2.emptyCatchDetectorPlugin,
  flutter_2.futureWaitModernizerPlugin,
  flutter_2.aiCodeReviewPlugin,
  flutter_2.booleanNamingConventionPlugin,
  flutter_2.positionalBoolParamsPlugin,
  flutter_2.buildDocCheckerPlugin,
  flutter_2.spellCheckerPtbrPlugin,
];
exports.performancePlugins = [
  flutter_2.flutterPerformancePlugin,
  flutter_2.mediaqueryModernPlugin,
  flutter_2.columnRowSpacingPlugin,
];
exports.testPlugins = [
  flutter_2.testFileCheckerPlugin,
  flutter_2.flutterTestRunnerPlugin,
  flutter_2.testCoverageSummaryPlugin,
];
