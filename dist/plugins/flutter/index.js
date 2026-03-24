"use strict";
/**
 * FLUTTER PLUGINS - BARREL FILE
 * ==============================
 * Exporta todos os plugins relacionados ao Flutter/Dart
 */
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
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
// Plugin de sumário (deve rodar primeiro)
var pr_summary_1 = require("./pr-summary");
Object.defineProperty(exports, "prSummaryPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(pr_summary_1).default;
  },
});
// Plugins originais
var pr_size_checker_1 = require("./pr-size-checker");
Object.defineProperty(exports, "prSizeCheckerPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(pr_size_checker_1).default;
  },
});
var changelog_checker_1 = require("./changelog-checker");
Object.defineProperty(exports, "changelogCheckerPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(changelog_checker_1).default;
  },
});
var flutter_analyze_1 = require("./flutter-analyze");
Object.defineProperty(exports, "flutterAnalyzePlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(flutter_analyze_1).default;
  },
});
var spell_checker_1 = require("./spell-checker");
Object.defineProperty(exports, "spellCheckerPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(spell_checker_1).default;
  },
});
// Novos plugins convertidos para createPlugin
var pr_validation_1 = require("./pr-validation");
Object.defineProperty(exports, "prValidationPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(pr_validation_1).default;
  },
});
var file_naming_1 = require("./file-naming");
Object.defineProperty(exports, "fileNamingPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(file_naming_1).default;
  },
});
var domain_entities_1 = require("./domain-entities");
Object.defineProperty(exports, "domainEntitiesPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(domain_entities_1).default;
  },
});
var domain_failures_1 = require("./domain-failures");
Object.defineProperty(exports, "domainFailuresPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(domain_failures_1).default;
  },
});
var repositories_1 = require("./repositories");
Object.defineProperty(exports, "repositoriesPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(repositories_1).default;
  },
});
var domain_usecases_1 = require("./domain-usecases");
Object.defineProperty(exports, "domainUseCasesPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(domain_usecases_1).default;
  },
});
var data_datasources_1 = require("./data-datasources");
Object.defineProperty(exports, "dataDatasourcesPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(data_datasources_1).default;
  },
});
var data_models_1 = require("./data-models");
Object.defineProperty(exports, "dataModelsPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(data_models_1).default;
  },
});
var presentation_viewmodels_1 = require("./presentation-viewmodels");
Object.defineProperty(exports, "presentationViewModelsPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(presentation_viewmodels_1).default;
  },
});
var flutter_performance_1 = require("./flutter-performance");
Object.defineProperty(exports, "flutterPerformancePlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(flutter_performance_1).default;
  },
});
var flutter_widgets_1 = require("./flutter-widgets");
Object.defineProperty(exports, "flutterWidgetsPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(flutter_widgets_1).default;
  },
});
var clean_architecture_1 = require("./clean-architecture");
Object.defineProperty(exports, "cleanArchitecturePlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(clean_architecture_1).default;
  },
});
var late_final_checker_1 = require("./late-final-checker");
Object.defineProperty(exports, "lateFinalCheckerPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(late_final_checker_1).default;
  },
});
var memory_leak_detector_1 = require("./memory-leak-detector");
Object.defineProperty(exports, "memoryLeakDetectorPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(memory_leak_detector_1).default;
  },
});
var mediaquery_modern_1 = require("./mediaquery-modern");
Object.defineProperty(exports, "mediaqueryModernPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(mediaquery_modern_1).default;
  },
});
var comments_checker_1 = require("./comments-checker");
Object.defineProperty(exports, "commentsCheckerPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(comments_checker_1).default;
  },
});
var security_checker_1 = require("./security-checker");
Object.defineProperty(exports, "securityCheckerPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(security_checker_1).default;
  },
});
var barrel_files_enforcer_1 = require("./barrel-files-enforcer");
Object.defineProperty(exports, "barrelFilesEnforcerPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(barrel_files_enforcer_1).default;
  },
});
var identifier_language_1 = require("./identifier-language");
Object.defineProperty(exports, "identifierLanguagePlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(identifier_language_1).default;
  },
});
var class_naming_convention_1 = require("./class-naming-convention");
Object.defineProperty(exports, "classNamingConventionPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(class_naming_convention_1).default;
  },
});
var presentation_try_catch_checker_1 = require("./presentation-try-catch-checker");
Object.defineProperty(exports, "presentationTryCatchCheckerPlugin", {
  enumerable: true,
  get: function () {
    return __importDefault(presentation_try_catch_checker_1).default;
  },
});
