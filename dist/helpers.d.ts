/**
 * DANGER HELPERS
 * ==============
 * Funções helper que encapsulam as chamadas ao Danger JS
 * Isso evita conflitos com o sistema de remoção de imports do Danger
 */
/**
 * Get the danger object
 * Acessa o objeto danger que o Danger JS injeta globalmente
 */
export declare function getDanger(): any;
/**
 * Send a message to the PR
 * Envia uma mensagem no PR
 *
 * @param msg - Mensagem a ser enviada
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
export declare function sendMessage(msg: string, file?: string, line?: number): void;
/**
 * Send a warning to the PR
 * Envia um warning no PR
 *
 * @param msg - Mensagem de warning
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
export declare function sendWarn(msg: string, file?: string, line?: number): void;
/**
 * Send a fail message to the PR (fails the build)
 * Envia um fail no PR (falha o build)
 *
 * @param msg - Mensagem de erro
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
export declare function sendFail(msg: string, file?: string, line?: number): void;
/**
 * Send markdown to the PR
 * Envia markdown no PR
 *
 * @param msg - Conteúdo markdown
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
export declare function sendMarkdown(msg: string, file?: string, line?: number): void;
/**
 * Schedule an async task
 * Agenda uma tarefa assíncrona
 */
export declare function scheduleTask(fn: () => Promise<void>): void;
/**
 * Get all modified and created files from git
 * Retorna todos os arquivos modificados e criados
 *
 * @returns Array of file paths
 */
export declare function getAllChangedFiles(): string[];
/**
 * Get all Dart files that were modified or created
 * Retorna todos os arquivos .dart modificados ou criados
 *
 * @returns Array of .dart file paths
 */
export declare function getDartFiles(): string[];
/**
 * Get Dart files in a specific directory
 * Retorna arquivos .dart de um diretório específico
 *
 * @param directory - Directory path (e.g., '/domain/', '/data/')
 * @returns Array of .dart file paths in the directory
 */
export declare function getDartFilesInDirectory(directory: string): string[];
/**
 * Get files matching a pattern
 * Retorna arquivos que correspondem a um padrão
 *
 * @param pattern - RegExp pattern to match
 * @returns Array of matching file paths
 */
export declare function getFilesMatching(pattern: RegExp): string[];
/**
 * Get Dart files in Domain layer
 * Retorna arquivos .dart da camada Domain
 */
export declare function getDomainDartFiles(): string[];
/**
 * Get Dart files in Data layer
 * Retorna arquivos .dart da camada Data
 */
export declare function getDataDartFiles(): string[];
/**
 * Get Dart files in Presentation layer
 * Retorna arquivos .dart da camada Presentation
 */
export declare function getPresentationDartFiles(): string[];
/**
 * Check if file is in specific Clean Architecture layer
 * Verifica se arquivo está em camada específica da Clean Architecture
 *
 * @param file - File path
 * @param layer - Layer name ('domain', 'data', 'presentation')
 * @returns True if file is in the specified layer
 */
export declare function isInLayer(file: string, layer: 'domain' | 'data' | 'presentation'): boolean;
/**
 * Read file content from git diff
 * Lê o conteúdo de um arquivo do diff do git
 *
 * @param file - File path
 * @returns File content as string, or null if not available
 */
export declare function getFileContent(file: string): Promise<string | null>;
/**
 * Check if file content matches a pattern
 * Verifica se o conteúdo do arquivo corresponde a um padrão
 *
 * @param file - File path
 * @param pattern - RegExp pattern to match
 * @returns True if pattern matches, false otherwise
 */
export declare function fileContainsPattern(file: string, pattern: RegExp): Promise<boolean>;
/**
 * Get files by extension
 * Retorna arquivos com extensão específica
 *
 * @param extension - File extension (e.g., '.dart', '.yaml', '.md')
 * @returns Array of file paths with the extension
 */
export declare function getFilesByExtension(extension: string): string[];
/**
 * Check if any files match a pattern
 * Verifica se algum arquivo corresponde a um padrão
 *
 * @param pattern - RegExp pattern to match
 * @returns True if at least one file matches
 */
export declare function hasFilesMatching(pattern: RegExp): boolean;
/**
 * Get PR description
 * Retorna a descrição da Pull Request
 *
 * @returns PR description or empty string
 */
export declare function getPRDescription(): string;
/**
 * Get PR title
 * Retorna o título da Pull Request
 *
 * @returns PR title or empty string
 */
export declare function getPRTitle(): string;
/**
 * Get lines changed (insertions + deletions)
 * Retorna total de linhas alteradas
 *
 * @returns Number of lines changed
 */
export declare function getLinesChanged(): number;
