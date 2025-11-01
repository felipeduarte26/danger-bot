"use strict";
/**
 * FLUTTER PLUGINS - BARREL FILE
 * ==============================
 * Exporta todos os plugins relacionados ao Flutter/Dart
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluginTestPlugin = exports.spellCheckerPlugin = exports.portugueseDocumentationPlugin = exports.flutterArchitecturePlugin = exports.flutterAnalyzePlugin = exports.changelogCheckerPlugin = exports.prSizeCheckerPlugin = void 0;
var pr_size_checker_1 = require("./pr-size-checker");
Object.defineProperty(exports, "prSizeCheckerPlugin", { enumerable: true, get: function () { return __importDefault(pr_size_checker_1).default; } });
var changelog_checker_1 = require("./changelog-checker");
Object.defineProperty(exports, "changelogCheckerPlugin", { enumerable: true, get: function () { return __importDefault(changelog_checker_1).default; } });
var flutter_analyze_1 = require("./flutter-analyze");
Object.defineProperty(exports, "flutterAnalyzePlugin", { enumerable: true, get: function () { return __importDefault(flutter_analyze_1).default; } });
var flutter_architecture_1 = require("./flutter-architecture");
Object.defineProperty(exports, "flutterArchitecturePlugin", { enumerable: true, get: function () { return __importDefault(flutter_architecture_1).default; } });
var portuguese_documentation_1 = require("./portuguese-documentation");
Object.defineProperty(exports, "portugueseDocumentationPlugin", { enumerable: true, get: function () { return __importDefault(portuguese_documentation_1).default; } });
var spell_checker_1 = require("./spell-checker");
Object.defineProperty(exports, "spellCheckerPlugin", { enumerable: true, get: function () { return __importDefault(spell_checker_1).default; } });
var plugin_test_1 = require("./plugin-test");
Object.defineProperty(exports, "pluginTestPlugin", { enumerable: true, get: function () { return __importDefault(plugin_test_1).default; } });
