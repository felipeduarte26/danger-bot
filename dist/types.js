"use strict";
/**
 * DANGER PLUGIN INTERFACE
 * =========================
 * Interface padronizada para todos os plugins de Danger
 *
 * Cada plugin deve implementar esta interface para garantir
 * consistência e facilitar manutenção
 */
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadLocalPlugins =
  exports.loadConfig =
  exports.verboseLog =
  exports.isVerbose =
  exports.setVerbose =
  exports.getIgnoredFiles =
  exports.setIgnoredFiles =
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
Object.defineProperty(exports, "setIgnoredFiles", {
  enumerable: true,
  get: function () {
    return helpers_1.setIgnoredFiles;
  },
});
Object.defineProperty(exports, "getIgnoredFiles", {
  enumerable: true,
  get: function () {
    return helpers_1.getIgnoredFiles;
  },
});
Object.defineProperty(exports, "setVerbose", {
  enumerable: true,
  get: function () {
    return helpers_1.setVerbose;
  },
});
Object.defineProperty(exports, "isVerbose", {
  enumerable: true,
  get: function () {
    return helpers_1.isVerbose;
  },
});
Object.defineProperty(exports, "verboseLog", {
  enumerable: true,
  get: function () {
    return helpers_1.verboseLog;
  },
});
var config_1 = require("./config");
Object.defineProperty(exports, "loadConfig", {
  enumerable: true,
  get: function () {
    return config_1.loadConfig;
  },
});
Object.defineProperty(exports, "loadLocalPlugins", {
  enumerable: true,
  get: function () {
    return config_1.loadLocalPlugins;
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
  const { isVerbose } = await Promise.resolve().then(() => __importStar(require("./helpers")));
  const verbose = isVerbose();
  const totalStart = Date.now();
  if (verbose) {
    const enabled = plugins.filter((p) => p.config.enabled).length;
    const disabled = plugins.length - enabled;
    console.log(
      `[verbose] 🔌 ${plugins.length} plugin(s) total — ${enabled} ativo(s), ${disabled} desabilitado(s)`
    );
  }
  for (const plugin of plugins) {
    if (!plugin.config.enabled) {
      console.log(`⏭️  Plugin '${plugin.config.name}' está desabilitado`);
      continue;
    }
    try {
      const pluginStart = Date.now();
      console.log(`⚡ Executando plugin: ${plugin.config.name}`);
      await plugin.run();
      const elapsed = Date.now() - pluginStart;
      if (verbose) {
        console.log(`[verbose] ✅ ${plugin.config.name} — ${elapsed}ms`);
      } else {
        console.log(`✅ Plugin '${plugin.config.name}' executado com sucesso`);
      }
    } catch (error) {
      console.error(`❌ Erro no plugin '${plugin.config.name}':`, error);
      throw error;
    }
  }
  if (verbose) {
    const totalElapsed = Date.now() - totalStart;
    console.log(`[verbose] ⏱️  Tempo total de execução: ${totalElapsed}ms`);
  }
}
/**
 * Execute Danger Bot with plugins - Simplifies dangerfile.ts
 *
 * Carrega automaticamente o arquivo `danger-bot.yaml` da raiz do projeto.
 * - `ignore_files`: arquivos ignorados por todos os plugins
 * - `local_plugins`: plugins locais do projeto, carregados e executados junto com os plugins padrão
 *
 * @param plugins - Array of plugins to run
 * @param callbacks - Optional callbacks for lifecycle hooks
 *
 * @example
 * ```typescript
 * import { executeDangerBot, allFlutterPlugins } from "@felipeduarte26/danger-bot";
 *
 * executeDangerBot(allFlutterPlugins, {
 *   onBeforeRun: () => {
 *     sendMessage("Starting Danger CI...");
 *     return true;
 *   },
 *   onSuccess: () => sendMessage("✅ Success!"),
 *   onError: (error) => sendWarn(`⚠️ Error: ${error.message}`)
 * });
 * ```
 */
function executeDangerBot(plugins, callbacks) {
  void (async () => {
    try {
      const { loadConfig, loadLocalPlugins } = await Promise.resolve().then(() =>
        __importStar(require("./config"))
      );
      const { setIgnoredFiles, setVerbose, verboseLog } = await Promise.resolve().then(() =>
        __importStar(require("./helpers"))
      );
      const config = loadConfig();
      const verbose = config.settings?.verbose ?? false;
      setVerbose(verbose);
      if (verbose) {
        console.log("[verbose] ═══════════════════════════════════════");
        console.log("[verbose] 🤖 Danger Bot — modo verbose ativo");
        console.log("[verbose] ═══════════════════════════════════════");
        verboseLog(`📦 ${plugins.length} plugin(s) do pacote`);
        verboseLog(`📂 local_plugins: ${config.local_plugins?.length ?? 0} caminho(s)`);
        verboseLog(`🚫 ignore_files: ${config.ignore_files?.length ?? 0} arquivo(s)`);
      }
      if (config.ignore_files?.length) {
        setIgnoredFiles(config.ignore_files);
      }
      let allPlugins = [...plugins];
      if (config.local_plugins?.length) {
        const localPlugins = await loadLocalPlugins(config.local_plugins);
        allPlugins = [...allPlugins, ...localPlugins];
      }
      if (verbose) {
        verboseLog(`🔌 Total de plugins para execução: ${allPlugins.length}`);
        console.log("[verbose] ───────────────────────────────────────");
      }
      if (callbacks?.onBeforeRun) {
        const shouldContinue = await callbacks.onBeforeRun();
        if (shouldContinue === false) {
          verboseLog("⛔ onBeforeRun retornou false — execução cancelada");
          return;
        }
      }
      await runPlugins(allPlugins);
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
