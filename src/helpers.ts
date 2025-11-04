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
export function getDanger(): any {
  return (global as any).danger || (globalThis as any).danger;
}

/**
 * Send a message to the PR
 * Envia uma mensagem no PR
 * 
 * @param msg - Mensagem a ser enviada
 * @param file - Arquivo específico (opcional)
 * @param line - Linha específica (opcional)
 */
export function sendMessage(msg: string, file?: string, line?: number): void {
  const messageFn = (global as any).message || (globalThis as any).message;
  if (messageFn) {
    if (file && line !== undefined) {
      messageFn(msg, file, line);
    } else {
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
export function sendWarn(msg: string, file?: string, line?: number): void {
  const warnFn = (global as any).warn || (globalThis as any).warn;
  if (warnFn) {
    if (file && line !== undefined) {
      warnFn(msg, file, line);
    } else {
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
export function sendFail(msg: string, file?: string, line?: number): void {
  const failFn = (global as any).fail || (globalThis as any).fail;
  if (failFn) {
    if (file && line !== undefined) {
      failFn(msg, file, line);
    } else {
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
export function sendMarkdown(msg: string, file?: string, line?: number): void {
  const markdownFn = (global as any).markdown || (globalThis as any).markdown;
  if (markdownFn) {
    if (file && line !== undefined) {
      markdownFn(msg, file, line);
    } else {
      markdownFn(msg);
    }
  }
}

/**
 * Schedule an async task
 * Agenda uma tarefa assíncrona
 */
export function scheduleTask(fn: () => Promise<void>): void {
  const scheduleFn = (global as any).schedule || (globalThis as any).schedule;
  if (scheduleFn) scheduleFn(fn);
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
export function getAllChangedFiles(): string[] {
  const danger = getDanger();
  return [...danger.git.modified_files, ...danger.git.created_files];
}

/**
 * Get all Dart files that were modified or created
 * Retorna todos os arquivos .dart modificados ou criados
 * 
 * @returns Array of .dart file paths
 */
export function getDartFiles(): string[] {
  return getAllChangedFiles().filter((f: string) => f.endsWith('.dart'));
}

/**
 * Get Dart files in a specific directory
 * Retorna arquivos .dart de um diretório específico
 * 
 * @param directory - Directory path (e.g., '/domain/', '/data/')
 * @returns Array of .dart file paths in the directory
 */
export function getDartFilesInDirectory(directory: string): string[] {
  return getDartFiles().filter((f: string) => f.includes(directory));
}

/**
 * Get files matching a pattern
 * Retorna arquivos que correspondem a um padrão
 * 
 * @param pattern - RegExp pattern to match
 * @returns Array of matching file paths
 */
export function getFilesMatching(pattern: RegExp): string[] {
  return getAllChangedFiles().filter((f: string) => pattern.test(f));
}

/**
 * Get Dart files in Domain layer
 * Retorna arquivos .dart da camada Domain
 */
export function getDomainDartFiles(): string[] {
  return getDartFilesInDirectory('/domain/');
}

/**
 * Get Dart files in Data layer
 * Retorna arquivos .dart da camada Data
 */
export function getDataDartFiles(): string[] {
  return getDartFilesInDirectory('/data/');
}

/**
 * Get Dart files in Presentation layer
 * Retorna arquivos .dart da camada Presentation
 */
export function getPresentationDartFiles(): string[] {
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
export function isInLayer(file: string, layer: 'domain' | 'data' | 'presentation'): boolean {
  return file.includes(`/${layer}/`);
}

/**
 * Read file content from git diff
 * Lê o conteúdo de um arquivo do diff do git
 * 
 * @param file - File path
 * @returns File content as string, or null if not available
 */
export async function getFileContent(file: string): Promise<string | null> {
  try {
    const danger = getDanger();
    const content = await danger.git.structuredDiffForFile(file);
    if (!content) return null;
    return content.chunks.map((c: any) => c.content).join('\n');
  } catch (e) {
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
export async function fileContainsPattern(file: string, pattern: RegExp): Promise<boolean> {
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
export function getFilesByExtension(extension: string): string[] {
  return getAllChangedFiles().filter((f: string) => f.endsWith(extension));
}

/**
 * Check if any files match a pattern
 * Verifica se algum arquivo corresponde a um padrão
 * 
 * @param pattern - RegExp pattern to match
 * @returns True if at least one file matches
 */
export function hasFilesMatching(pattern: RegExp): boolean {
  return getAllChangedFiles().some((f: string) => pattern.test(f));
}

/**
 * Get PR description
 * Retorna a descrição da Pull Request
 * 
 * @returns PR description or empty string
 */
export function getPRDescription(): string {
  const danger = getDanger();
  return danger.github?.pr?.body || danger.bitbucket_cloud?.pr?.description || '';
}

/**
 * Get PR title
 * Retorna o título da Pull Request
 * 
 * @returns PR title or empty string
 */
export function getPRTitle(): string {
  const danger = getDanger();
  return danger.github?.pr?.title || danger.bitbucket_cloud?.pr?.title || '';
}

/**
 * Get lines changed (insertions + deletions)
 * Retorna total de linhas alteradas
 * 
 * @returns Number of lines changed
 */
export function getLinesChanged(): number {
  const danger = getDanger();
  return (danger.git.insertions || 0) + (danger.git.deletions || 0);
}
