"use strict";
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
    message(`✅ ISSO ESTÁ SENDO EXECUTDO PELO PLUGIN-TEST.`);
});
