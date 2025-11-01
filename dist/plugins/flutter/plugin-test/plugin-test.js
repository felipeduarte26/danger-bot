"use strict";
/**
 * PLUGIN TEST PLUGIN
 * ==================
 * Plugin para teste
 */
Object.defineProperty(exports, "__esModule", { value: true });
const danger_1 = require("danger");
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)({
    name: "plugin-test",
    description: "Plugin para teste",
    enabled: true,
}, async () => {
    const modifiedFiles = danger_1.danger.git.modified_files;
    const createdFiles = danger_1.danger.git.created_files;
    const allFiles = [...modifiedFiles, ...createdFiles];
    // Example: Send messages
    (0, danger_1.message)(`✅ Plugin plugin-test executed successfully!`);
    (0, danger_1.warn)(`⚠️ This is a warning from plugin-test.`);
    (0, danger_1.fail)(`❌ This is a failure from plugin-test.`);
});
