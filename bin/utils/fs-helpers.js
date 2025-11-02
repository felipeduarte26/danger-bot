/**
 * FILE SYSTEM HELPERS
 * ===================
 * Funções utilitárias para manipulação de arquivos e diretórios
 */

import fs from "fs";
import path from "path";

/**
 * Verificar se um arquivo ou diretório existe
 * @param {string} filePath
 * @returns {boolean}
 */
export function exists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Ler conteúdo de um arquivo
 * @param {string} filePath
 * @returns {string}
 */
export function readFile(filePath) {
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Escrever conteúdo em um arquivo
 * @param {string} filePath
 * @param {string} content
 */
export function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Criar diretório (recursivo)
 * @param {string} dirPath
 */
export function createDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Listar arquivos/diretórios em um diretório
 * @param {string} dirPath
 * @returns {string[]}
 */
export function listDirectory(dirPath) {
  return fs.readdirSync(dirPath);
}

/**
 * Verificar se um caminho é um diretório
 * @param {string} dirPath
 * @returns {boolean}
 */
export function isDirectory(dirPath) {
  return fs.statSync(dirPath).isDirectory();
}

/**
 * Obter diretórios dentro de um diretório
 * @param {string} dirPath
 * @returns {string[]}
 */
export function getDirectories(dirPath) {
  return listDirectory(dirPath).filter((f) => {
    const fullPath = path.join(dirPath, f);
    return isDirectory(fullPath);
  });
}

/**
 * Obter arquivos dentro de um diretório
 * @param {string} dirPath
 * @param {string} extension - Extensão do arquivo (ex: '.ts')
 * @returns {string[]}
 */
export function getFiles(dirPath, extension = null) {
  const files = listDirectory(dirPath).filter((f) => {
    const fullPath = path.join(dirPath, f);
    return !isDirectory(fullPath);
  });

  if (extension) {
    return files.filter((f) => f.endsWith(extension));
  }

  return files;
}
