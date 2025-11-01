#!/usr/bin/env node

/**
 * DANGER BOT CLI
 * ================
 * CLI para facilitar o desenvolvimento e uso do Danger Bot
 */

const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para fazer perguntas
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Converter para kebab-case
function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Converter para camelCase
function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase());
}

// Converter para PascalCase
function toPascalCase(str) {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// Emojis disponíveis para plugins
const EMOJIS = [
  '🔍', '📄', '🏗️', '🔤', '🌐', '⚡', '🎨', '🔧', '📊', '🚀',
  '💡', '🎯', '📝', '🔒', '🎁', '🔔', '📱', '💻', '🌟', '✨'
];

// Template para novo plugin
function generatePluginTemplate(name, description, enabled) {
  const kebabName = toKebabCase(name);
  
  return `/**
 * ${name.toUpperCase()} PLUGIN
 * ${'='.repeat(name.length + 7)}
 * ${description}
 */

import { createPlugin } from "../../types";

export default createPlugin(
  {
    name: "${kebabName}",
    description: "${description}",
    enabled: ${enabled},
  },
  async () => {
    // TODO: Implement plugin logic
    
    // Example: Access Danger data
    const modifiedFiles = danger.git.modified_files;
    const createdFiles = danger.git.created_files;
    const allFiles = [...modifiedFiles, ...createdFiles];
    
    // Example: Send messages
    message("Plugin ${kebabName} executed successfully!");
    
    // Other options:
    // warn("Warning message");
    // fail("Critical error");
    // message("Success message");
  }
);
`;
}

// Template para README do plugin
function generatePluginReadme(name, description, kebabName, camelName) {
  return `# ${name}

## Overview

${description}

## Purpose

This plugin helps maintain:
- Code quality
- Best practices
- Consistency across the project

## How It Works

1. Analyzes modified/created files
2. Runs validation checks
3. Reports findings in the PR

## Configuration

\`\`\`typescript
import { ${camelName}Plugin } from "danger-bot";

const plugins = [
  ${camelName}Plugin,  // Enabled by default
];
\`\`\`

## Example Output

**When issues are found:**
\`\`\`
[Warning message example]
\`\`\`

**When everything is OK:**
\`\`\`
✅ ${name}: All checks passed!
\`\`\`

## Best Practices

- Follow the plugin recommendations
- Keep code clean and maintainable
- Document your changes

## Customization

To disable this plugin:

\`\`\`typescript
${camelName}Plugin.config.enabled = false;
\`\`\`

## Platforms Supported

- ✅ GitHub
- ✅ Bitbucket Cloud
- ✅ GitLab

## Dependencies

None - uses Danger JS built-in APIs only.

## Related Plugins

- \`pr-size-checker\` - PR size validation
- \`changelog-checker\` - CHANGELOG validation

---

**Note:** Update this documentation with specific details about your plugin's functionality.
`;
}

// Criar novo plugin
async function createPlugin() {
  console.log('\n' + '='.repeat(60));
  console.log('CREATE NEW DANGER BOT PLUGIN');
  console.log('='.repeat(60) + '\n');
  
  const name = await question('Plugin name (e.g., "My Custom Plugin"): ');
  if (!name) {
    console.error('\nError: Plugin name is required!');
    rl.close();
    return;
  }
  
  const description = await question('Description: ');
  if (!description) {
    console.error('\nError: Description is required!');
    rl.close();
    return;
  }
  
  const enabledInput = await question('Enable by default? (y/n) [y]: ');
  const enabled = !enabledInput || enabledInput.toLowerCase() === 'y' || enabledInput.toLowerCase() === 's';
  
  rl.close();
  
  console.log('\n' + '-'.repeat(60));
  console.log('CREATING PLUGIN...');
  console.log('-'.repeat(60) + '\n');
  
  // Gerar nomes
  const kebabName = toKebabCase(name);
  const camelName = toCamelCase(name);
  const fileName = `${kebabName}.ts`;
  
  // Caminhos - agora cada plugin tem sua pasta
  const pluginsDir = path.join(process.cwd(), 'src', 'plugins');
  const pluginFolder = path.join(pluginsDir, kebabName);
  const filePath = path.join(pluginFolder, fileName);
  const barrelPath = path.join(pluginFolder, 'index.ts');
  const readmePath = path.join(pluginFolder, 'README.md');
  const indexPath = path.join(process.cwd(), 'src', 'index.ts');
  
  // Verificar se já existe
  if (fs.existsSync(pluginFolder)) {
    console.error(`\nError: Plugin already exists: ${pluginFolder}`);
    return;
  }
  
  // Criar diretório do plugin
  fs.mkdirSync(pluginFolder, { recursive: true });
  console.log(`[OK] Created plugin folder: ${kebabName}/`);
  
  // Gerar e escrever arquivo principal do plugin
  const content = generatePluginTemplate(name, description, enabled);
  fs.writeFileSync(filePath, content);
  console.log(`[OK] Created plugin file: ${kebabName}/${fileName}`);
  
  // Criar barrel file (index.ts)
  const barrelContent = `export { default } from "./${kebabName}";\n`;
  fs.writeFileSync(barrelPath, barrelContent);
  console.log(`[OK] Created barrel file: ${kebabName}/index.ts`);
  
  // Criar README.md
  const readmeContent = generatePluginReadme(name, description, kebabName, camelName);
  fs.writeFileSync(readmePath, readmeContent);
  console.log(`[OK] Created documentation: ${kebabName}/README.md`);
  
  // Atualizar index.ts principal
  if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf-8');
    
    // Adicionar export
    const exportLine = `export { default as ${camelName}Plugin } from "./plugins/${kebabName}";`;
    
    if (!indexContent.includes(exportLine)) {
      // Encontrar onde adicionar (após os outros exports de plugins)
      const lastPluginExport = indexContent.lastIndexOf('export { default as');
      if (lastPluginExport !== -1) {
        const endOfLine = indexContent.indexOf('\n', lastPluginExport);
        indexContent = 
          indexContent.slice(0, endOfLine + 1) +
          exportLine + '\n' +
          indexContent.slice(endOfLine + 1);
      } else {
        // Se não houver outros plugins, adicionar no final
        indexContent += `\n${exportLine}\n`;
      }
      
      fs.writeFileSync(indexPath, indexContent);
      console.log(`[OK] Export added to src/index.ts`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('PLUGIN CREATED SUCCESSFULLY!');
  console.log('='.repeat(60) + '\n');
  
  console.log('Plugin structure:');
  console.log(`  src/plugins/${kebabName}/`);
  console.log(`  ├── ${fileName}      # Plugin implementation`);
  console.log(`  ├── index.ts        # Barrel file`);
  console.log(`  └── README.md       # Documentation`);
  console.log();
  console.log('Next steps:');
  console.log(`  1. Edit: ${filePath}`);
  console.log(`  2. Update documentation: ${readmePath}`);
  console.log(`  3. Implement the plugin logic`);
  console.log(`  4. Run: npm run build`);
  console.log(`  5. Use: import { ${camelName}Plugin } from "danger-bot"\n`);
}

// Listar plugins
function listPlugins() {
  const pluginsDir = path.join(process.cwd(), 'src', 'plugins');
  
  if (!fs.existsSync(pluginsDir)) {
    console.log('\nError: Plugins directory not found!');
    return;
  }
  
  // Agora cada plugin está em uma pasta
  const pluginFolders = fs.readdirSync(pluginsDir).filter(f => {
    const fullPath = path.join(pluginsDir, f);
    return fs.statSync(fullPath).isDirectory();
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('DANGER BOT PLUGINS');
  console.log('='.repeat(60) + '\n');
  
  pluginFolders.forEach((folder, index) => {
    // Buscar arquivo .ts dentro da pasta (ignorar index.ts)
    const pluginFolder = path.join(pluginsDir, folder);
    const files = fs.readdirSync(pluginFolder).filter(f => f.endsWith('.ts') && f !== 'index.ts');
    
    if (files.length === 0) return;
    
    const pluginFile = path.join(pluginFolder, files[0]);
    const content = fs.readFileSync(pluginFile, 'utf-8');
    
    // Extrair informações do plugin
    const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
    const descMatch = content.match(/description:\s*["']([^"']+)["']/);
    const enabledMatch = content.match(/enabled:\s*(true|false)/);
    
    const name = nameMatch ? nameMatch[1] : folder;
    const desc = descMatch ? descMatch[1] : 'No description';
    const enabled = enabledMatch ? enabledMatch[1] === 'true' : true;
    
    console.log(`[${index + 1}] ${name.toUpperCase()}`);
    console.log(`    Folder: ${folder}/`);
    console.log(`    File: ${files[0]}`);
    console.log(`    Description: ${desc}`);
    console.log(`    Status: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    // Verificar se tem README
    const readmePath = path.join(pluginFolder, 'README.md');
    if (fs.existsSync(readmePath)) {
      console.log(`    Documentation: README.md`);
    }
    console.log();
  });
  
  console.log('='.repeat(60));
  console.log(`Total: ${pluginFolders.length} plugin(s)\n`);
}

// Gerar dangerfile de exemplo
function generateDangerfile() {
  const pluginsDir = path.join(process.cwd(), 'src', 'plugins');
  
  if (!fs.existsSync(pluginsDir)) {
    console.log('❌ Diretório de plugins não encontrado!');
    return;
  }
  
  const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.ts'));
  
  // Extrair nomes dos plugins
  const plugins = files.map(file => {
    const content = fs.readFileSync(path.join(pluginsDir, file), 'utf-8');
    const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
    const name = nameMatch ? nameMatch[1] : file.replace('.ts', '');
    const camelName = toCamelCase(name);
    return `${camelName}Plugin`;
  });
  
  const dangerfileContent = `import {
  ${plugins.join(',\n  ')},
  runPlugins,
} from "danger-bot";

// Configurar plugins ativos
const plugins = [
  ${plugins.join(',\n  ')},
];

// Executar análise
(async () => {
  try {
    const pr = danger.github?.pr || danger.bitbucket_cloud?.pr || danger.gitlab?.mr;
    
    if (pr) {
      message(
        \`🔍 **Danger CI** executando análise automática\\n\\n\` +
        \`**Título**: \${pr.title}\\n\` +
        \`📦 Plugins ativos: \${plugins.filter(p => p.config.enabled).length}/\${plugins.length}\`
      );
    }
    
    await runPlugins(plugins);
    message("✅ **Danger CI** - Análise concluída com sucesso!");

  } catch (error) {
    message("⚠️ **Erro no Danger CI**: Verifique os logs do CI.");
    throw error;
  }
})();
`;
  
  const outputPath = path.join(process.cwd(), 'dangerfile.example.ts');
  fs.writeFileSync(outputPath, dangerfileContent);
  
  console.log(`\n✅ Dangerfile de exemplo criado: ${outputPath}`);
  console.log('\n📝 Para usar:');
  console.log('   1. Renomeie para dangerfile.ts');
  console.log('   2. Customize conforme necessário');
}

// Validar plugin
function validatePlugin(pluginPath) {
  if (!fs.existsSync(pluginPath)) {
    console.error(`❌ Arquivo não encontrado: ${pluginPath}`);
    return;
  }
  
  const content = fs.readFileSync(pluginPath, 'utf-8');
  const errors = [];
  const warnings = [];
  
  // Verificações obrigatórias
  if (!content.includes('import { createPlugin }')) {
    errors.push('❌ Falta import do createPlugin');
  }
  
  if (!content.includes('export default createPlugin')) {
    errors.push('❌ Falta export default createPlugin');
  }
  
  if (!content.match(/name:\s*["'][^"']+["']/)) {
    errors.push('❌ Falta campo "name"');
  }
  
  if (!content.match(/description:\s*["'][^"']+["']/)) {
    errors.push('❌ Falta campo "description"');
  }
  
  if (!content.match(/enabled:\s*(true|false)/)) {
    warnings.push('⚠️ Falta campo "enabled" (será true por padrão)');
  }
  
  // Verificações de boas práticas
  if (!content.includes('async ()')) {
    warnings.push('⚠️ Função run não é async');
  }
  
  if (!content.includes('/**')) {
    warnings.push('⚠️ Falta documentação JSDoc no topo do arquivo');
  }
  
  // Mostrar resultados
  console.log('\n🔍 Validando plugin...\n');
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Plugin válido! Nenhum problema encontrado.');
  } else {
    if (errors.length > 0) {
      console.log('❌ Erros encontrados:');
      errors.forEach(err => console.log(`   ${err}`));
      console.log();
    }
    
    if (warnings.length > 0) {
      console.log('⚠️ Avisos:');
      warnings.forEach(warn => console.log(`   ${warn}`));
      console.log();
    }
  }
}

// Informações do projeto
function showInfo() {
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    console.error('\nError: package.json not found!');
    return;
  }
  
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  
  console.log('\n' + '='.repeat(60));
  console.log('DANGER BOT - PROJECT INFO');
  console.log('='.repeat(60) + '\n');
  
  console.log(`Name:        ${pkg.name}`);
  console.log(`Version:     ${pkg.version}`);
  console.log(`Description: ${pkg.description}`);
  console.log();
  
  // Listar plugins (agora em pastas)
  const pluginsDir = path.join(process.cwd(), 'src', 'plugins');
  if (fs.existsSync(pluginsDir)) {
    const pluginFolders = fs.readdirSync(pluginsDir).filter(f => {
      const fullPath = path.join(pluginsDir, f);
      return fs.statSync(fullPath).isDirectory();
    });
    console.log(`Plugins:     ${pluginFolders.length}`);
    console.log();
    pluginFolders.forEach((folder, i) => {
      console.log(`  ${i + 1}. ${folder}/`);
    });
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// Configurar CLI
program
  .name('danger-bot')
  .description('CLI para Danger Bot - Facilita criação e gerenciamento de plugins')
  .version('1.0.0');

program
  .command('create-plugin')
  .alias('new')
  .description('Criar um novo plugin interativamente')
  .action(createPlugin);

program
  .command('list')
  .alias('ls')
  .description('Listar todos os plugins disponíveis')
  .action(listPlugins);

program
  .command('generate-dangerfile')
  .alias('gen')
  .description('Gerar dangerfile de exemplo com todos os plugins')
  .action(generateDangerfile);

program
  .command('validate <plugin-file>')
  .description('Validar se um plugin segue o padrão correto')
  .action(validatePlugin);

program
  .command('info')
  .description('Mostrar informações do projeto')
  .action(showInfo);

// Parse dos argumentos
program.parse(process.argv);

// Se nenhum comando foi especificado, mostrar help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}


