"use strict";
/**
 * PLUGIN TEST PLUGIN
 * ==================
 * Plugin para teste
 */
Object.defineProperty(exports, "__esModule", { value: true });
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)({
    name: "plugin-test",
    description: "Plugin para teste",
    enabled: true,
}, async () => {
    const modifiedFiles = danger.git.modified_files;
    const createdFiles = danger.git.created_files;
    const allFiles = [...modifiedFiles, ...createdFiles];
    // Example: Send messages
    message(`✅ Plugin plugin-test executed successfully!`);
    warn(`⚠️ This is a warning from plugin-test.`);
    fail(`❌ This is a failure from plugin-test.`);
});
