/**
 * PLUGIN TEST PLUGIN
 * ==================
 * Plugin para teste
 */

import { danger, message, warn, fail } from "danger";
import { createPlugin } from "@types";

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
