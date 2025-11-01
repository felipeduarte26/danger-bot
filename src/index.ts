/**
 * DANGER-BOT - MAIN EXPORTS
 * ==========================
 * Main entry point of the package
 */

// Export types and helpers
export * from "./types";

// Export all plugins (using barrel files)
export { default as prSizeCheckerPlugin } from "./plugins/pr-size-checker";
export { default as changelogCheckerPlugin } from "./plugins/changelog-checker";
export { default as flutterArchitecturePlugin } from "./plugins/flutter-architecture";
export { default as flutterAnalyzePlugin } from "./plugins/flutter-analyze";
export { default as spellCheckerPlugin } from "./plugins/spell-checker";
export { default as portugueseDocumentationPlugin } from "./plugins/portuguese-documentation";

