import { createPlugin, getDanger, sendMessage, sendWarn, sendFail } from "@types";

export default createPlugin(
  {
    name: "plugin-test",
    description: "Plugin para teste",
    enabled: false, // Desabilitado por padrão (apenas para testes)
  },
  async () => {
    const d = getDanger();
    const modifiedFiles = d.git.modified_files;
    const createdFiles = d.git.created_files;
    const allFiles = [...modifiedFiles, ...createdFiles];

    // Exemplos de uso das abstrações
    sendMessage(`✅ Plugin plugin-test executed successfully!`);
    sendWarn(`⚠️ This is a warning from plugin-test.`);
    sendFail(`❌ This is a failure from plugin-test.`);
  }
);
