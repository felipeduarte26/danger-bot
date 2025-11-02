/**
 * DANGER-BOT - MAIN EXPORTS
 * ==========================
 * Main entry point of the package
 */

// Re-export Danger JS for convenience (single import)
export { danger, message, warn, fail, markdown, schedule } from "danger";

// Export Danger helpers (to avoid conflicts with Danger's import removal)
export * from "./helpers";

// Export types and helpers
export * from "./types";

// Export all plugins (organized by platform)
export * from "./plugins";

// Export all plugins as a single array (barrel export)
import {
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  flutterArchitecturePlugin,
  portugueseDocumentationPlugin,
  prSizeCheckerPlugin,
  spellCheckerPlugin,
  pluginTestPlugin,
} from "./plugins/flutter";

/**
 * All available Flutter plugins in a single array
 * Use this for quick setup with all plugins enabled
 */
export const allFlutterPlugins = [
  prSizeCheckerPlugin,
  changelogCheckerPlugin,
  flutterAnalyzePlugin,
  flutterArchitecturePlugin,
  spellCheckerPlugin,
  portugueseDocumentationPlugin,
  pluginTestPlugin,
];
