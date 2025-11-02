/**
 * PLUGIN TEST PLUGIN
 * ==================
 * Plugin para teste
 */

import { createPlugin } from "@types";

// Não importar danger, message, warn, fail!
// Eles são injetados globalmente pelo Danger JS em runtime
// Declarar como globais para o TypeScript reconhecer
declare const danger: any;
declare const message: (msg: string) => void;
declare const warn: (msg: string) => void;
declare const fail: (msg: string) => void;

export default createPlugin(
  {
    name: "plugin-test",
    description: "Plugin para teste",
    enabled: true,
  },
  async () => {
    const modifiedFiles = danger.git.modified_files;
    const createdFiles = danger.git.created_files;
    const allFiles = [...modifiedFiles, ...createdFiles];

    // Example: Send messages
    message(`✅ Plugin plugin-test executed successfully!`);
    warn(`⚠️ This is a warning from plugin-test.`);
    fail(`❌ This is a failure from plugin-test.`);
  }
);
