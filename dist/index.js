"use strict";
/**
 * DANGER-BOT - MAIN EXPORTS
 * ==========================
 * Main entry point of the package
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allPlugins = exports.allFlutterPlugins = exports.schedule = exports.markdown = exports.fail = exports.warn = exports.message = exports.danger = void 0;
// Re-export Danger JS for convenience (single import)
var danger_1 = require("danger");
Object.defineProperty(exports, "danger", { enumerable: true, get: function () { return danger_1.danger; } });
Object.defineProperty(exports, "message", { enumerable: true, get: function () { return danger_1.message; } });
Object.defineProperty(exports, "warn", { enumerable: true, get: function () { return danger_1.warn; } });
Object.defineProperty(exports, "fail", { enumerable: true, get: function () { return danger_1.fail; } });
Object.defineProperty(exports, "markdown", { enumerable: true, get: function () { return danger_1.markdown; } });
Object.defineProperty(exports, "schedule", { enumerable: true, get: function () { return danger_1.schedule; } });
// Export types and helpers
__exportStar(require("./types"), exports);
// Export all plugins (organized by platform)
__exportStar(require("./plugins"), exports);
// Export all plugins as a single array (barrel export)
const flutter_1 = require("./plugins/flutter");
/**
 * All available Flutter plugins in a single array
 * Use this for quick setup with all plugins enabled
 */
exports.allFlutterPlugins = [
    flutter_1.prSizeCheckerPlugin,
    flutter_1.changelogCheckerPlugin,
    flutter_1.flutterAnalyzePlugin,
    flutter_1.flutterArchitecturePlugin,
    flutter_1.spellCheckerPlugin,
    flutter_1.portugueseDocumentationPlugin,
];
/**
 * All available plugins (all platforms)
 * Use this for quick setup with all plugins enabled
 */
exports.allPlugins = [
    ...exports.allFlutterPlugins,
    // Add more platforms here when available
];
