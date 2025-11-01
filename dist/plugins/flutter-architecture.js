"use strict";
/**
 * 🏗️ FLUTTER ARCHITECTURE CHECKER PLUGIN
 * ======================================
 * Verifica padrões de arquitetura do Flutter/Dart
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.default = (0, types_1.createPlugin)({
    name: "flutter-architecture",
    description: "Verifica padrões de arquitetura Flutter/Dart",
    enabled: true,
}, async () => {
    const allFiles = [
        ...danger.git.modified_files,
        ...danger.git.created_files,
    ];
    // Filtrar apenas arquivos .dart (exceto testes)
    const dartFiles = allFiles.filter(file => file.endsWith(".dart") && !file.includes(".test.") && !file.includes("_test.dart"));
    for (const file of dartFiles) {
        try {
            // Verificar se arquivo existe (pode ter sido deletado)
            if (!fs.existsSync(file))
                continue;
            const content = fs.readFileSync(file, "utf-8");
            const lines = content.split("\n");
            // 1. VERIFICAR: Classes devem ser 'final' quando não são abstratas
            checkFinalClasses(file, content, lines);
            // 2. VERIFICAR: Barrel files obrigatórios em pastas
            checkBarrelFiles(file, dartFiles);
            // 3. VERIFICAR: Uso de 'extends' deve ser justificado
            checkExtendsUsage(file, content, lines);
            // 4. VERIFICAR: Clean Architecture - estrutura de pastas
            checkCleanArchitecture(file);
        }
        catch (error) {
            console.warn(`⚠️ Erro ao verificar ${file}:`, error);
        }
    }
});
/**
 * Verifica se classes deveriam ser 'final'
 */
function checkFinalClasses(file, content, lines) {
    const classRegex = /^\s*class\s+(\w+)/gm;
    const matches = [...content.matchAll(classRegex)];
    for (const match of matches) {
        const fullLine = match[0];
        const className = match[1];
        // Ignorar classes abstratas, mixins, extensions
        if (content.includes(`abstract class ${className}`))
            continue;
        if (content.includes(`mixin ${className}`))
            continue;
        if (content.includes(`extension ${className}`))
            continue;
        // Se não é final e não é abstrata, avisar
        if (!fullLine.includes("final class")) {
            const lineNumber = lines.findIndex(l => l.includes(fullLine)) + 1;
            warn(`🏗️ **Classe '${className}' deveria ser 'final'**\n\n` +
                `Classes que não são estendidas devem ser marcadas como \`final\` para:\n` +
                `- ✅ Melhorar performance (permite otimizações do compilador)\n` +
                `- ✅ Deixar intenção clara (não é para ser estendida)\n` +
                `- ✅ Evitar problemas de herança acidental\n\n` +
                `**Sugestão**: \`final class ${className}\``, file, lineNumber);
        }
    }
}
/**
 * Verifica se há barrel files (exports centralizados)
 */
function checkBarrelFiles(file, allDartFiles) {
    const dir = path.dirname(file);
    const filename = path.basename(file);
    // Se é um barrel file, não verificar
    if (filename.endsWith(".dart") && !filename.includes("_")) {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n").filter(l => l.trim());
        const allExports = lines.every(line => line.startsWith("export ") ||
            line.startsWith("//") ||
            line.trim() === "");
        if (allExports)
            return; // É um barrel file
    }
    // Verificar se existe barrel file na pasta
    const possibleBarrelFiles = [
        path.join(dir, `${path.basename(dir)}.dart`),
        path.join(dir, "index.dart"),
    ];
    const hasBarrelFile = possibleBarrelFiles.some(f => fs.existsSync(f));
    if (!hasBarrelFile && !dir.includes("test")) {
        warn(`📦 **Barrel File Recomendado**\n\n` +
            `A pasta \`${dir}\` não possui barrel file.\n\n` +
            `**Recomendação**: Crie \`${path.basename(dir)}.dart\` com:\n` +
            `\`\`\`dart\n` +
            `export '${filename}';\n` +
            `// ... outros exports\n` +
            `\`\`\`\n\n` +
            `**Benefícios**:\n` +
            `- ✅ Imports mais limpos\n` +
            `- ✅ Facilita refatoração\n` +
            `- ✅ Organização padronizada`, file, 1);
    }
}
/**
 * Verifica uso de 'extends' (herança)
 */
function checkExtendsUsage(file, content, lines) {
    const extendsRegex = /class\s+\w+\s+extends\s+(\w+)/g;
    const matches = [...content.matchAll(extendsRegex)];
    for (const match of matches) {
        const baseClass = match[1];
        const lineNumber = lines.findIndex(l => l.includes(match[0])) + 1;
        // Ignorar casos válidos de extends
        const validBaseClasses = [
            "StatelessWidget", "StatefulWidget", "State",
            "ChangeNotifier", "Equatable", "Exception",
            "Error", "Stream", "Future"
        ];
        if (!validBaseClasses.includes(baseClass)) {
            warn(`🔗 **Uso de 'extends' detectado**\n\n` +
                `Classe estende \`${baseClass}\`.\n\n` +
                `**Atenção**: Prefira composição sobre herança.\n\n` +
                `**Pergunte-se**:\n` +
                `- 🤔 Esta herança é realmente necessária?\n` +
                `- 🤔 Poderia usar composição (has-a) ao invés de herança (is-a)?\n` +
                `- 🤔 Poderia usar um mixin?\n\n` +
                `**Herança é válida quando**:\n` +
                `- ✅ Widgets do Flutter\n` +
                `- ✅ Classes base do framework\n` +
                `- ✅ Relação "is-a" verdadeira`, file, lineNumber);
        }
    }
}
/**
 * Verifica Clean Architecture - estrutura de pastas
 */
function checkCleanArchitecture(file) {
    // Estrutura esperada: lib/{feature}/{layer}/
    const pathParts = file.split("/");
    if (!pathParts.includes("lib"))
        return;
    const layers = ["data", "domain", "presentation"];
    const hasLayer = layers.some(layer => pathParts.includes(layer));
    if (!hasLayer && !file.includes("test") && !file.includes("main.dart")) {
        warn(`🏛️ **Clean Architecture**\n\n` +
            `Arquivo \`${path.basename(file)}\` não está em uma camada definida.\n\n` +
            `**Estrutura esperada**:\n` +
            `\`\`\`\n` +
            `lib/\n` +
            `  ├── features/\n` +
            `  │   └── minha_feature/\n` +
            `  │       ├── data/       # Repositórios, datasources, models\n` +
            `  │       ├── domain/     # Entities, use cases, repositories (interface)\n` +
            `  │       └── presentation/ # Pages, widgets, controllers\n` +
            `\`\`\`\n\n` +
            `**Benefícios**:\n` +
            `- ✅ Separação de responsabilidades\n` +
            `- ✅ Testabilidade\n` +
            `- ✅ Manutenibilidade`, file, 1);
    }
}
