"use strict";
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
exports.loadConfig = loadConfig;
exports.loadLocalPlugins = loadLocalPlugins;
/**
 * DANGER BOT - CONFIG LOADER
 * ==========================
 * Carrega configurações do arquivo danger-bot.yaml na raiz do projeto.
 * Permite definir plugins locais, arquivos ignorados e configurações gerais.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
const yaml = __importStar(require("js-yaml"));
const CONFIG_FILENAMES = ["danger-bot.yaml", "danger-bot.yml"];
function findConfigFile() {
  for (const name of CONFIG_FILENAMES) {
    const fullPath = path.resolve(process.cwd(), name);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}
function loadConfig() {
  const configPath = findConfigFile();
  if (!configPath) return {};
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = yaml.load(raw);
    if (!parsed || typeof parsed !== "object") return {};
    console.log(`📄 Danger Bot config carregado: ${path.basename(configPath)}`);
    return parsed;
  } catch (err) {
    console.error(`⚠️ Erro ao ler config:`, err);
    return {};
  }
}
async function loadLocalPlugins(pluginPaths) {
  const plugins = [];
  for (const pluginPath of pluginPaths) {
    const resolved = path.resolve(process.cwd(), pluginPath);
    if (!fs.existsSync(resolved)) {
      console.warn(`⚠️ Plugin local não encontrado: ${pluginPath}`);
      continue;
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      const files = fs
        .readdirSync(resolved)
        .filter((f) => /\.(ts|js)$/.test(f) && !f.startsWith("index."));
      for (const file of files) {
        const plugin = await tryLoadPlugin(path.join(resolved, file), pluginPath);
        if (plugin) plugins.push(plugin);
      }
    } else {
      const plugin = await tryLoadPlugin(resolved, pluginPath);
      if (plugin) plugins.push(plugin);
    }
  }
  if (plugins.length > 0) {
    console.log(`🔌 ${plugins.length} plugin(s) local(is) carregado(s)`);
  }
  return plugins;
}
async function tryLoadPlugin(filePath, originalPath) {
  try {
    const mod = await Promise.resolve(`${(0, url_1.pathToFileURL)(filePath).href}`).then((s) =>
      __importStar(require(s))
    );
    const plugin = mod.default ?? mod;
    if (isValidPlugin(plugin)) {
      console.log(`  ✅ ${plugin.config.name} (${originalPath})`);
      return plugin;
    }
    console.warn(
      `  ⚠️ ${path.basename(filePath)}: não é um plugin válido (falta config.name ou run())`
    );
    return null;
  } catch (err) {
    console.error(`  ❌ Erro ao carregar ${path.basename(filePath)}:`, err);
    return null;
  }
}
function isValidPlugin(obj) {
  if (!obj || typeof obj !== "object") return false;
  const p = obj;
  if (!p.config || typeof p.config !== "object") return false;
  const c = p.config;
  return typeof c.name === "string" && typeof p.run === "function";
}
