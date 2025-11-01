#!/usr/bin/env node
// Extrai APENAS identificadores (classes, métodos, variáveis) de arquivos Dart
// Para uso com cspell - não verifica comentários nem strings

const fs = require('fs');
const path = require('path');

class DartIdentifierExtractor {
  constructor() {
    this.identifiers = new Set();
  }

  // Extrair identificadores de uma linha de código Dart
  extractFromLine(line, lineNumber) {
    const results = [];
    
    // Limpar linha de comentários e strings
    let cleanLine = line
      .replace(/\/\/.*$/, '')           // Remove comentários //
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários /* */
      .replace(/'[^']*'/g, '')          // Remove strings 'texto'
      .replace(/"[^"]*"/g, '')          // Remove strings "texto"
      .replace(/r'[^']*'/g, '')         // Remove raw strings r'texto'
      .replace(/r"[^"]*"/g, '');        // Remove raw strings r"texto"
    
    if (!cleanLine.trim()) return results;

    // 1. CLASSES
    const classMatch = cleanLine.match(/(?:class|abstract\s+class|final\s+class|sealed\s+class)\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (classMatch) {
      results.push({
        type: 'class',
        identifier: classMatch[1],
        line: lineNumber,
        context: line.trim()
      });
    }

    // 2. MÉTODOS E FUNÇÕES
    const methodMatches = cleanLine.matchAll(/(?:Future<[^>]*>|void|String|int|double|bool|List<[^>]*>|Map<[^,>]*,[^>]*>|[A-Za-z_][A-Za-z0-9_<>,]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g);
    for (const match of methodMatches) {
      const methodName = match[1];
      // Ignorar construtores, getters/setters padrão e palavras-chave
      if (!methodName.match(/^(get|set|build|createState|initState|dispose|toString|hashCode|operator|main|runApp)$/)) {
        results.push({
          type: 'method',
          identifier: methodName,
          line: lineNumber,
          context: line.trim()
        });
      }
    }

    // 3. VARIÁVEIS E CAMPOS
    const variableMatches = cleanLine.matchAll(/(?:final|const|var|late)\s+(?:[A-Za-z_][A-Za-z0-9_<>,\s]*\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*[=;]/g);
    for (const match of variableMatches) {
      results.push({
        type: 'variable',
        identifier: match[1],
        line: lineNumber,
        context: line.trim()
      });
    }

    // 4. PARÂMETROS DE FUNÇÃO
    const paramMatches = cleanLine.matchAll(/(?:required\s+)?(?:[A-Za-z_][A-Za-z0-9_<>,\s]*\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?=[,)])/g);
    for (const match of paramMatches) {
      const paramName = match[1];
      // Ignorar tipos conhecidos
      if (!paramName.match(/^(String|int|double|bool|List|Map|Set|Future|Stream|Widget|BuildContext|Key|this|super)$/)) {
        results.push({
          type: 'parameter',
          identifier: paramName,
          line: lineNumber,
          context: line.trim()
        });
      }
    }

    return results;
  }

  // Processar arquivo Dart completo
  extractFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const results = [];

      lines.forEach((line, index) => {
        // Pular imports, exports, parts
        if (line.trim().startsWith('import ') || 
            line.trim().startsWith('export ') || 
            line.trim().startsWith('part ')) {
          return;
        }

        const lineResults = this.extractFromLine(line, index + 1);
        results.push(...lineResults);
      });

      return results;
    } catch (error) {
      console.error(`Erro ao processar ${filePath}:`, error.message);
      return [];
    }
  }

  // Quebrar camelCase/PascalCase em palavras individuais para spell check
  breakCamelCase(identifier) {
    return identifier
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase -> camel Case
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // XMLHttpRequest -> XML Http Request
      .split(/[\s_]+/)
      .filter(word => word.length > 1) // Ignorar palavras de 1 letra
      .filter(word => !word.match(/^\d+$/)); // Ignorar números puros
  }
}

// SCRIPT PRINCIPAL
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Uso: node extract_dart_identifiers.js <arquivo1.dart> [arquivo2.dart] ...');
    process.exit(1);
  }

  const extractor = new DartIdentifierExtractor();
  const allWords = new Set();
  const allResults = [];

  // Processar cada arquivo
  args.forEach(filePath => {
    if (!filePath.endsWith('.dart')) {
      console.warn(`Ignorando arquivo não-Dart: ${filePath}`);
      return;
    }

    if (!fs.existsSync(filePath)) {
      console.warn(`Arquivo não encontrado: ${filePath}`);
      return;
    }

    const results = extractor.extractFromFile(filePath);
    
    results.forEach(result => {
      // Quebrar camelCase em palavras individuais
      const words = extractor.breakCamelCase(result.identifier);
      
      words.forEach(word => {
        allWords.add(word.toLowerCase());
        
        allResults.push({
          ...result,
          word: word,
          originalFile: filePath
        });
      });
    });
  });

  // Criar arquivo temporário com todas as palavras para cspell verificar
  const wordsArray = Array.from(allWords);
  const tempFile = 'temp_identifiers_for_spell_check.txt';
  fs.writeFileSync(tempFile, wordsArray.join('\n'));

  // Salvar metadados para correlacionar erros de volta aos arquivos
  const metadataFile = 'temp_spell_check_metadata.json';
  fs.writeFileSync(metadataFile, JSON.stringify(allResults, null, 2));

  console.log(`✅ Extraídos ${wordsArray.length} identificadores únicos de ${args.length} arquivos`);
  console.log(`📄 Arquivo temporário: ${tempFile}`);
  console.log(`📋 Metadados: ${metadataFile}`);
}

if (require.main === module) {
  main();
}

// Exportar para uso como módulo
module.exports = { DartIdentifierExtractor };

