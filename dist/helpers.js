"use strict";
/**
 * DANGER HELPERS
 * ==============
 * Funções helper que encapsulam as chamadas ao Danger JS
 * Isso evita conflitos com o sistema de remoção de imports do Danger
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDanger = getDanger;
exports.sendMessage = sendMessage;
exports.sendWarn = sendWarn;
exports.sendFail = sendFail;
exports.sendMarkdown = sendMarkdown;
exports.scheduleTask = scheduleTask;
exports.getAllChangedFiles = getAllChangedFiles;
exports.getDartFiles = getDartFiles;
exports.getDartFilesInDirectory = getDartFilesInDirectory;
exports.getFilesMatching = getFilesMatching;
exports.getDomainDartFiles = getDomainDartFiles;
exports.getDataDartFiles = getDataDartFiles;
exports.getPresentationDartFiles = getPresentationDartFiles;
exports.isInLayer = isInLayer;
exports.getFileContent = getFileContent;
exports.fileContainsPattern = fileContainsPattern;
exports.getFilesByExtension = getFilesByExtension;
exports.hasFilesMatching = hasFilesMatching;
exports.getPRDescription = getPRDescription;
exports.getPRTitle = getPRTitle;
exports.getLinesChanged = getLinesChanged;
/**
 * Get the danger object
 * Acessa o objeto danger que o Danger JS injeta globalmente
 */
function getDanger() {
    return global.danger || globalThis.danger;
}
/**
 * Send a message to the PR
 * Envia uma mensagem no PR
 *
 * @param msg - Mensagem a ser enviada
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
function sendMessage(msg, file, line) {
    const messageFn = global.message || globalThis.message;
    if (messageFn) {
        if (file && line !== undefined) {
            messageFn(msg, file, line);
        }
        else {
            messageFn(msg);
        }
    }
}
/**
 * Send a warning to the PR
 * Envia um warning no PR
 *
 * @param msg - Mensagem de warning
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
function sendWarn(msg, file, line) {
    const warnFn = global.warn || globalThis.warn;
    if (warnFn) {
        if (file && line !== undefined) {
            warnFn(msg, file, line);
        }
        else {
            warnFn(msg);
        }
    }
}
/**
 * Send a fail message to the PR (fails the build)
 * Envia um fail no PR (falha o build)
 *
 * @param msg - Mensagem de erro
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
function sendFail(msg, file, line) {
    const failFn = global.fail || globalThis.fail;
    if (failFn) {
        if (file && line !== undefined) {
            failFn(msg, file, line);
        }
        else {
            failFn(msg);
        }
    }
}
/**
 * Send markdown to the PR
 * Envia markdown no PR
 *
 * @param msg - Conteúdo markdown
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
function sendMarkdown(msg, file, line) {
    const markdownFn = global.markdown || globalThis.markdown;
    if (markdownFn) {
        if (file && line !== undefined) {
            markdownFn(msg, file, line);
        }
        else {
            markdownFn(msg);
        }
    }
}
/**
 * Schedule an async task
 * Agenda uma tarefa assíncrona
 */
function scheduleTask(fn) {
    const scheduleFn = global.schedule || globalThis.schedule;
    if (scheduleFn)
        scheduleFn(fn);
}
// ============================================================================
// FILE FILTERING HELPERS
// ============================================================================
/**
 * Get all modified and created files from git
 * Retorna todos os arquivos modificados e criados
 *
 * @returns Array of file paths
 */
function getAllChangedFiles() {
    const danger = getDanger();
    return [...danger.git.modified_files, ...danger.git.created_files];
}
/**
 * Get all Dart files that were modified or created
 * Retorna todos os arquivos .dart modificados ou criados
 *
 * @returns Array of .dart file paths
 */
function getDartFiles() {
    return getAllChangedFiles().filter((f) => f.endsWith('.dart'));
}
/**
 * Get Dart files in a specific directory
 * Retorna arquivos .dart de um diretório específico
 *
 * @param directory - Directory path (e.g., '/domain/', '/data/')
 * @returns Array of .dart file paths in the directory
 */
function getDartFilesInDirectory(directory) {
    return getDartFiles().filter((f) => f.includes(directory));
}
/**
 * Get files matching a pattern
 * Retorna arquivos que correspondem a um padrão
 *
 * @param pattern - RegExp pattern to match
 * @returns Array of matching file paths
 */
function getFilesMatching(pattern) {
    return getAllChangedFiles().filter((f) => pattern.test(f));
}
/**
 * Get Dart files in Domain layer
 * Retorna arquivos .dart da camada Domain
 */
function getDomainDartFiles() {
    return getDartFilesInDirectory('/domain/');
}
/**
 * Get Dart files in Data layer
 * Retorna arquivos .dart da camada Data
 */
function getDataDartFiles() {
    return getDartFilesInDirectory('/data/');
}
/**
 * Get Dart files in Presentation layer
 * Retorna arquivos .dart da camada Presentation
 */
function getPresentationDartFiles() {
    return getDartFilesInDirectory('/presentation/');
}
/**
 * Check if file is in specific Clean Architecture layer
 * Verifica se arquivo está em camada específica da Clean Architecture
 *
 * @param file - File path
 * @param layer - Layer name ('domain', 'data', 'presentation')
 * @returns True if file is in the specified layer
 */
function isInLayer(file, layer) {
    return file.includes(`/${layer}/`);
}
/**
 * Read file content from git diff
 * Lê o conteúdo de um arquivo do diff do git
 *
 * @param file - File path
 * @returns File content as string, or null if not available
 */
async function getFileContent(file) {
    try {
        const danger = getDanger();
        const content = await danger.git.structuredDiffForFile(file);
        if (!content)
            return null;
        return content.chunks.map((c) => c.content).join('\n');
    }
    catch (e) {
        return null;
    }
}
/**
 * Check if file content matches a pattern
 * Verifica se o conteúdo do arquivo corresponde a um padrão
 *
 * @param file - File path
 * @param pattern - RegExp pattern to match
 * @returns True if pattern matches, false otherwise
 */
async function fileContainsPattern(file, pattern) {
    const content = await getFileContent(file);
    return content ? pattern.test(content) : false;
}
/**
 * Get files by extension
 * Retorna arquivos com extensão específica
 *
 * @param extension - File extension (e.g., '.dart', '.yaml', '.md')
 * @returns Array of file paths with the extension
 */
function getFilesByExtension(extension) {
    return getAllChangedFiles().filter((f) => f.endsWith(extension));
}
/**
 * Check if any files match a pattern
 * Verifica se algum arquivo corresponde a um padrão
 *
 * @param pattern - RegExp pattern to match
 * @returns True if at least one file matches
 */
function hasFilesMatching(pattern) {
    return getAllChangedFiles().some((f) => pattern.test(f));
}
/**
 * Get PR description
 * Retorna a descrição da Pull Request
 *
 * @returns PR description or empty string
 */
function getPRDescription() {
    const danger = getDanger();
    return danger.github?.pr?.body || danger.bitbucket_cloud?.pr?.description || '';
}
/**
 * Get PR title
 * Retorna o título da Pull Request
 *
 * @returns PR title or empty string
 */
function getPRTitle() {
    const danger = getDanger();
    return danger.github?.pr?.title || danger.bitbucket_cloud?.pr?.title || '';
}
/**
 * Get lines changed (insertions + deletions)
 * Retorna total de linhas alteradas
 *
 * @returns Number of lines changed
 */
function getLinesChanged() {
    const danger = getDanger();
    return (danger.git.insertions || 0) + (danger.git.deletions || 0);
}
