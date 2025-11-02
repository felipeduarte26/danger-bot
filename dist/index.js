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
exports.allFlutterPlugins = void 0;
// Export Danger helpers (to avoid conflicts with Danger's import removal)
// NÃO re-exportar 'danger' diretamente pois o Danger JS detecta e remove!
__exportStar(require("./helpers"), exports);
// Export types and helpers
__exportStar(require("./types"), exports);
// Export configuration
__exportStar(require("./config"), exports);
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
    flutter_1.pluginTestPlugin,
];
