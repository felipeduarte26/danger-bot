#!/usr/bin/env node

/**
 * DANGER BOT CLI
 * ==============
 * CLI para facilitar o desenvolvimento e uso do Danger Bot
 */

import { program } from "commander";
import { createPlugin } from "./commands/create-plugin.js";
import { removePlugin } from "./commands/remove-plugin.js";
import { listPlugins } from "./commands/list-plugins.js";
import { generateDangerfile } from "./commands/generate-dangerfile.js";
import { validatePlugin } from "./commands/validate-plugin.js";
import { showInfo } from "./commands/info.js";
import { initConfig } from "./commands/init-config.js";
import { dryRun } from "./commands/dry-run.js";

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
const VERSION = pkg.version;

const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb";

const c = supportsColor
  ? {
      reset: "\x1b[0m",
      bold: "\x1b[1m",
      dim: "\x1b[2m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",
    }
  : {
      reset: "",
      bold: "",
      dim: "",
      red: "",
      green: "",
      yellow: "",
      blue: "",
      magenta: "",
      cyan: "",
      white: "",
    };

function showBanner() {
  console.log(`
${c.red}     _                                 ${c.reset}
${c.red}  __| | __ _ _ __   __ _  ___ _ __     ${c.reset}
${c.red} / _\` |/ _\` | '_ \\ / _\` |/ _ \\ '__|    ${c.reset}
${c.red}| (_| | (_| | | | | (_| |  __/ |       ${c.reset}
${c.red} \\__,_|\\__,_|_| |_|\\__, |\\___|_|       ${c.reset}
${c.cyan}  _           _${c.red}   |___/${c.cyan}               ${c.reset}
${c.cyan} | |__   ___ | |_                      ${c.reset}
${c.cyan} | '_ \\ / _ \\| __|                     ${c.reset}
${c.cyan} | |_) | (_) | |_                      ${c.reset}
${c.cyan} |_.__/ \\___/ \\__|  ${c.dim}v${VERSION}${c.reset}

${c.dim}  Automacao de code review para Flutter/Dart${c.reset}
${c.bold}  Node:${c.reset} ${c.dim}${process.version}${c.reset}  ${c.bold}Alias:${c.reset} ${c.dim}danger-bot, db${c.reset}
`);
}

function showStyledHelp() {
  showBanner();
  console.log(`${c.bold}  Comandos:${c.reset}
  
  ${c.yellow}dry-run${c.reset} ${c.dim}(run)${c.reset}     Executar plugins localmente ${c.green}← mais usado${c.reset}
  ${c.yellow}list${c.reset} ${c.dim}(ls)${c.reset}         Listar todos os plugins
  ${c.yellow}create-plugin${c.reset} ${c.dim}(new)${c.reset} Criar novo plugin
  ${c.yellow}remove-plugin${c.reset} ${c.dim}(rm)${c.reset}  Remover plugin existente
  ${c.yellow}gen${c.reset}              Gerar dangerfile de exemplo
  ${c.yellow}validate${c.reset}         Validar estrutura de um plugin
  ${c.yellow}init${c.reset}             Gerar danger-bot.yaml
  ${c.yellow}info${c.reset}             Informações do projeto

${c.bold}  Uso rápido:${c.reset}

  ${c.dim}$${c.reset} db run -b develop          ${c.dim}# testar localmente${c.reset}
  ${c.dim}$${c.reset} db run --plugins "model"   ${c.dim}# plugin específico${c.reset}
  ${c.dim}$${c.reset} db ls                      ${c.dim}# ver plugins${c.reset}
  ${c.dim}$${c.reset} db --help                  ${c.dim}# ajuda completa${c.reset}
`);
}

// Interceptar --version e -V antes do commander
if (process.argv.includes("--version") || process.argv.includes("-V")) {
  showBanner();
  process.exit(0);
}

// Sem argumentos: mostrar help estilizado
if (!process.argv.slice(2).length) {
  showStyledHelp();
  process.exit(0);
}

// Configurar CLI
program
  .name("danger-bot")
  .description("Automação de code review para Flutter/Dart")
  .version(VERSION, "-V, --version", "Mostrar versão")
  .configureOutput({
    outputError: (str, write) => write(`${c.red}${str}${c.reset}`),
  });

// Comando: dry-run (executar plugins localmente)
program
  .command("dry-run")
  .alias("run")
  .description("Executar plugins localmente sem precisar do CI (simula o Danger)")
  .option("-p, --project <path>", "Caminho do projeto a analisar (default: diretório atual)")
  .option("-b, --base <branch>", "Branch base para comparação (default: main)", "main")
  .option("--plugins <list>", "Lista de plugins para executar (separados por vírgula)")
  .option("--all", "Executar todos os plugins (incluindo os que precisam de API/CLI externa)")
  .option("-v, --verbose", "Exibir detalhes completos")
  .action(dryRun);

// Comando: criar plugin
program
  .command("create-plugin")
  .alias("new")
  .description("Criar um novo plugin interativamente")
  .action(createPlugin);

// Comando: remover plugin
program
  .command("remove-plugin")
  .alias("rm")
  .description("Remover um plugin existente")
  .action(removePlugin);

// Comando: listar plugins
program
  .command("list")
  .alias("ls")
  .description("Listar todos os plugins disponíveis")
  .action(listPlugins);

// Comando: gerar dangerfile
program
  .command("generate-dangerfile")
  .alias("gen")
  .description("Gerar dangerfile de exemplo com todos os plugins")
  .action(generateDangerfile);

// Comando: validar plugin
program
  .command("validate <plugin-file>")
  .description("Validar se um plugin segue o padrão correto")
  .action(validatePlugin);

// Comando: gerar config yaml
program
  .command("init")
  .description("Gerar arquivo danger-bot.yaml de configuração na raiz do projeto")
  .action(initConfig);

// Comando: info do projeto
program.command("info").description("Mostrar informações do projeto").action(showInfo);

// Parse dos argumentos
program.parse(process.argv);
