"use strict";
/**
 * DANGER PLUGIN INTERFACE
 * =========================
 * Interface padronizada para todos os plugins de Danger
 *
 * Cada plugin deve implementar esta interface para garantir
 * consistência e facilitar manutenção
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInLayer =
  exports.getLinesChanged =
  exports.getPRTitle =
  exports.getPRDescription =
  exports.fileContainsPattern =
  exports.getFileContent =
  exports.hasFilesMatching =
  exports.getFilesByExtension =
  exports.getFilesMatching =
  exports.getPresentationDartFiles =
  exports.getDataDartFiles =
  exports.getDomainDartFiles =
  exports.getDartFilesInDirectory =
  exports.getDartFiles =
  exports.getAllChangedFiles =
  exports.scheduleTask =
  exports.sendMarkdown =
  exports.sendFail =
  exports.sendWarn =
  exports.sendMessage =
  exports.getDanger =
    void 0;
exports.createPlugin = createPlugin;
exports.runPlugins = runPlugins;
exports.executeDangerBot = executeDangerBot;
// Não importar tipos do Danger - usar 'any' para evitar problemas de ESM
// O Danger JS injeta o objeto 'danger' em runtime
// Re-exportar helpers para facilitar imports
var helpers_1 = require("./helpers");
Object.defineProperty(exports, "getDanger", {
  enumerable: true,
  get: function () {
    return helpers_1.getDanger;
  },
});
Object.defineProperty(exports, "sendMessage", {
  enumerable: true,
  get: function () {
    return helpers_1.sendMessage;
  },
});
Object.defineProperty(exports, "sendWarn", {
  enumerable: true,
  get: function () {
    return helpers_1.sendWarn;
  },
});
Object.defineProperty(exports, "sendFail", {
  enumerable: true,
  get: function () {
    return helpers_1.sendFail;
  },
});
Object.defineProperty(exports, "sendMarkdown", {
  enumerable: true,
  get: function () {
    return helpers_1.sendMarkdown;
  },
});
Object.defineProperty(exports, "scheduleTask", {
  enumerable: true,
  get: function () {
    return helpers_1.scheduleTask;
  },
});
Object.defineProperty(exports, "getAllChangedFiles", {
  enumerable: true,
  get: function () {
    return helpers_1.getAllChangedFiles;
  },
});
Object.defineProperty(exports, "getDartFiles", {
  enumerable: true,
  get: function () {
    return helpers_1.getDartFiles;
  },
});
Object.defineProperty(exports, "getDartFilesInDirectory", {
  enumerable: true,
  get: function () {
    return helpers_1.getDartFilesInDirectory;
  },
});
Object.defineProperty(exports, "getDomainDartFiles", {
  enumerable: true,
  get: function () {
    return helpers_1.getDomainDartFiles;
  },
});
Object.defineProperty(exports, "getDataDartFiles", {
  enumerable: true,
  get: function () {
    return helpers_1.getDataDartFiles;
  },
});
Object.defineProperty(exports, "getPresentationDartFiles", {
  enumerable: true,
  get: function () {
    return helpers_1.getPresentationDartFiles;
  },
});
Object.defineProperty(exports, "getFilesMatching", {
  enumerable: true,
  get: function () {
    return helpers_1.getFilesMatching;
  },
});
Object.defineProperty(exports, "getFilesByExtension", {
  enumerable: true,
  get: function () {
    return helpers_1.getFilesByExtension;
  },
});
Object.defineProperty(exports, "hasFilesMatching", {
  enumerable: true,
  get: function () {
    return helpers_1.hasFilesMatching;
  },
});
Object.defineProperty(exports, "getFileContent", {
  enumerable: true,
  get: function () {
    return helpers_1.getFileContent;
  },
});
Object.defineProperty(exports, "fileContainsPattern", {
  enumerable: true,
  get: function () {
    return helpers_1.fileContainsPattern;
  },
});
Object.defineProperty(exports, "getPRDescription", {
  enumerable: true,
  get: function () {
    return helpers_1.getPRDescription;
  },
});
Object.defineProperty(exports, "getPRTitle", {
  enumerable: true,
  get: function () {
    return helpers_1.getPRTitle;
  },
});
Object.defineProperty(exports, "getLinesChanged", {
  enumerable: true,
  get: function () {
    return helpers_1.getLinesChanged;
  },
});
Object.defineProperty(exports, "isInLayer", {
  enumerable: true,
  get: function () {
    return helpers_1.isInLayer;
  },
});
/**
 * HELPER: Criar plugin facilmente
 */
function createPlugin(config, runFn) {
  return {
    config,
    run: runFn,
  };
}
/**
 * HELPER: Execute list of plugins sequentially
 *
 * @param plugins - Array of plugins to run
 */
async function runPlugins(plugins) {
  for (const plugin of plugins) {
    if (!plugin.config.enabled) {
      console.log(`⏭️  Plugin '${plugin.config.name}' está desabilitado`);
      continue;
    }
    try {
      console.log(`⚡ Executando plugin: ${plugin.config.name}`);
      await plugin.run();
      console.log(`✅ Plugin '${plugin.config.name}' executado com sucesso`);
    } catch (error) {
      console.error(`❌ Erro no plugin '${plugin.config.name}':`, error);
      throw error;
    }
  }
}
/**
 * Execute Danger Bot with plugins - Simplifies dangerfile.ts
 *
 * @param plugins - Array of plugins to run
 * @param callbacks - Optional callbacks for lifecycle hooks
 *
 * @example
 * import { executeDangerBot, getDanger, sendMessage, sendWarn } from "@felipeduarte26/danger-bot";
 *
 * executeDangerBot([pluginTestPlugin], {
 *   onBeforeRun: () => {
 *     const pr = getDanger().github?.pr;
 *     sendMessage("Starting Danger CI...");
 *     return true;
 *   },
 *   onSuccess: () => sendMessage("✅ Success!"),
 *   onError: (error) => sendWarn(`⚠️ Error: ${error.message}`)
 * });
 */
function executeDangerBot(plugins, callbacks) {
  void (async () => {
    try {
      if (callbacks?.onBeforeRun) {
        const shouldContinue = await callbacks.onBeforeRun();
        if (shouldContinue === false) {
          return;
        }
      }
      await runPlugins(plugins);
      if (callbacks?.onSuccess) {
        await callbacks.onSuccess();
      }
    } catch (error) {
      if (callbacks?.onError) {
        await callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      console.error("Danger Bot execution error:", error);
    } finally {
      if (callbacks?.onFinally) {
        await callbacks.onFinally();
      }
    }
  })();
}
