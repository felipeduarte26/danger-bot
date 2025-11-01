/**
 * DANGER-BOT - MAIN EXPORTS
 * ==========================
 * Main entry point of the package
 */
export { danger, message, warn, fail, markdown, schedule } from "danger";
export * from "./types";
export * from "./plugins";
/**
 * All available Flutter plugins in a single array
 * Use this for quick setup with all plugins enabled
 */
export declare const allFlutterPlugins: import("./types").DangerPlugin[];
/**
 * All available plugins (all platforms)
 * Use this for quick setup with all plugins enabled
 */
export declare const allPlugins: import("./types").DangerPlugin[];
