"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _types_1 = require("../../../types");
exports.default = (0, _types_1.createPlugin)({
    name: "plugin-test",
    description: "Plugin para teste",
    enabled: false, // Desabilitado por padrão (apenas para testes)
}, async () => {
    const d = (0, _types_1.getDanger)();
    const modifiedFiles = d.git.modified_files;
    const createdFiles = d.git.created_files;
    const allFiles = [...modifiedFiles, ...createdFiles];
    // Exemplos de uso das abstrações
    (0, _types_1.sendMessage)(`✅ Plugin plugin-test executed successfully!`);
    (0, _types_1.sendWarn)(`⚠️ This is a warning from plugin-test.`);
    (0, _types_1.sendFail)(`❌ This is a failure from plugin-test.`);
});
