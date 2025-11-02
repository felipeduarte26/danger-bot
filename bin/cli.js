#!/usr/bin/env node

/**
 * DANGER BOT CLI
 * ==============
 * CLI para facilitar o desenvolvimento e uso do Danger Bot
 */

import { program } from "commander";
import { createPlugin } from "./commands/create-plugin.js";
import { listPlugins } from "./commands/list-plugins.js";
import { generateDangerfile } from "./commands/generate-dangerfile.js";
import { validatePlugin } from "./commands/validate-plugin.js";
import { showInfo } from "./commands/info.js";

// Configurar CLI
program
  .name("danger-bot")
  .description("CLI para Danger Bot - Facilita criação e gerenciamento de plugins")
  .version("1.8.0");

// Comando: criar plugin
program
  .command("create-plugin")
  .alias("new")
  .description("Criar um novo plugin interativamente")
  .action(createPlugin);

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

// Comando: info do projeto
program.command("info").description("Mostrar informações do projeto").action(showInfo);

// Parse dos argumentos
program.parse(process.argv);

// Se nenhum comando foi especificado, mostrar help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
