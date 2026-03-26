/**
 * DANGER BOT - CONFIG LOADER
 * ==========================
 * Carrega configurações do arquivo danger-bot.yaml na raiz do projeto.
 * Permite definir plugins locais, arquivos ignorados e configurações gerais.
 */
import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import * as yaml from "js-yaml";
import type { DangerPlugin } from "./types";

export interface DangerBotConfig {
  /** Caminhos para plugins locais do projeto (arquivos .ts/.js ou diretórios) */
  local_plugins?: string[];
  /** Arquivos que devem ser ignorados por todos os plugins */
  ignore_files?: string[];
  /** Configurações gerais */
  settings?: {
    /** Se true, falha o CI ao encontrar erros (default: true) */
    fail_on_errors?: boolean;
    /** Se true, exibe logs detalhados (default: false) */
    verbose?: boolean;
    /** API keys do Google Gemini para o plugin ai-code-review (rotation automática) */
    gemini_api_keys?: string[];
    /** URL do webhook do Google Chat para notificações */
    google_chat_webhook?: string;
  };
}

const CONFIG_FILENAMES = ["danger-bot.yaml", "danger-bot.yml"];

function findConfigFile(): string | null {
  for (const name of CONFIG_FILENAMES) {
    const fullPath = path.resolve(process.cwd(), name);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

export function loadConfig(): DangerBotConfig {
  const configPath = findConfigFile();
  if (!configPath) return {};

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = yaml.load(raw) as DangerBotConfig | null;
    if (!parsed || typeof parsed !== "object") return {};

    console.log(`📄 Danger Bot config carregado: ${path.basename(configPath)}`);
    return parsed;
  } catch (err) {
    console.error(`⚠️ Erro ao ler config:`, err);
    return {};
  }
}

export async function loadLocalPlugins(pluginPaths: string[]): Promise<DangerPlugin[]> {
  const plugins: DangerPlugin[] = [];

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

async function tryLoadPlugin(filePath: string, originalPath: string): Promise<DangerPlugin | null> {
  try {
    const mod = await import(pathToFileURL(filePath).href);
    const plugin: unknown = mod.default ?? mod;

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

function isValidPlugin(obj: unknown): obj is DangerPlugin {
  if (!obj || typeof obj !== "object") return false;
  const p = obj as Record<string, unknown>;
  if (!p.config || typeof p.config !== "object") return false;
  const c = p.config as Record<string, unknown>;
  return typeof c.name === "string" && typeof p.run === "function";
}
