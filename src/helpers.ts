/**
 * DANGER BOT - HELPER FUNCTIONS
 * ==============================
 *
 * Este arquivo contém funções auxiliares para facilitar a criação de plugins
 * para o Danger Bot. Todas as funções encapsulam chamadas ao Danger JS,
 * evitando conflitos com o sistema de remoção automática de imports.
 *
 * @module helpers
 * @category Core
 *
 * ## Categorias de Funções
 *
 * ### 🎯 Danger Core
 * - `getDanger()` - Acessa o objeto danger global
 *
 * ### 💬 Mensagens no PR
 * - `sendMessage()` - Envia mensagens informativas
 * - `sendWarn()` - Envia avisos (não falha o build)
 * - `sendFail()` - Envia erros (falha o build)
 * - `sendMarkdown()` - Envia markdown formatado
 * - `scheduleTask()` - Agenda tarefas assíncronas
 *
 * ### 📁 Filtros de Arquivos
 * - `getAllChangedFiles()` - Todos os arquivos modificados
 * - `getDartFiles()` - Arquivos .dart modificados
 * - `getDartFilesInDirectory()` - Arquivos .dart em diretório específico
 * - `getFilesMatching()` - Arquivos que correspondem a um padrão
 * - `getFilesByExtension()` - Arquivos por extensão
 * - `hasFilesMatching()` - Verifica se existe arquivo correspondente
 *
 * ### 🏗️ Clean Architecture
 * - `getDomainDartFiles()` - Arquivos da camada Domain
 * - `getDataDartFiles()` - Arquivos da camada Data
 * - `getPresentationDartFiles()` - Arquivos da camada Presentation
 * - `isInLayer()` - Verifica se arquivo está em camada específica
 *
 * ### 📖 Leitura de Conteúdo
 * - `getFileContent()` - Lê conteúdo de arquivo do git diff
 * - `fileContainsPattern()` - Verifica se arquivo contém padrão
 *
 * ### 📋 Informações do PR
 * - `getPRDescription()` - Descrição da Pull Request
 * - `getPRTitle()` - Título da Pull Request
 * - `getLinesChanged()` - Total de linhas alteradas
 *
 * @example
 * ```typescript
 * import { getDanger, sendMessage, getDartFiles } from "@felipeduarte26/danger-bot";
 *
 * const danger = getDanger();
 * const dartFiles = getDartFiles();
 *
 * if (dartFiles.length > 0) {
 *   sendMessage(`✅ ${dartFiles.length} arquivos Dart modificados`);
 * }
 * ```
 */

import type { DangerDSLType, GitDSL } from "danger";

const _sentMessages = new Set<string>();
let _ignoredFiles = new Set<string>();
let _verbose = false;

const MAX_SUMMARY_PER_TYPE = 3;
const _failSummary = new Map<string, { count: number; files: string[] }>();
const _warnSummary = new Map<string, { count: number; files: string[] }>();
let _summaryFlushed = false;

/**
 * Ativa ou desativa o modo verbose.
 * Chamado internamente pelo executeDangerBot ao carregar o danger-bot.yaml.
 */
export function setVerbose(enabled: boolean): void {
  _verbose = enabled;
}

/**
 * Retorna se o modo verbose está ativo.
 */
export function isVerbose(): boolean {
  return _verbose;
}

/**
 * Log condicional — só imprime quando verbose está ativo.
 */
export function verboseLog(...args: unknown[]): void {
  if (_verbose) console.log("[verbose]", ...args);
}

/**
 * Define os arquivos que devem ser ignorados por todos os plugins.
 * Chamado internamente pelo executeDangerBot ao carregar o danger-bot.yaml.
 */
export function setIgnoredFiles(files: string[]): void {
  _ignoredFiles = new Set(files);
  if (_ignoredFiles.size > 0) {
    console.log(`🚫 ${_ignoredFiles.size} arquivo(s) na lista de ignore`);
    if (_verbose) {
      for (const f of _ignoredFiles) {
        console.log(`   ├─ ${f}`);
      }
    }
  }
}

/**
 * Retorna os arquivos ignorados configurados.
 */
export function getIgnoredFiles(): Set<string> {
  return _ignoredFiles;
}

function dedupKey(type: string, msg: string, file?: string, line?: number): string {
  return `${type}::${file ?? ""}::${line ?? ""}::${msg}`;
}

function isDuplicate(type: string, msg: string, file?: string, line?: number): boolean {
  const key = dedupKey(type, msg, file, line);
  if (_sentMessages.has(key)) return true;
  _sentMessages.add(key);
  return false;
}

function isEmptyMessage(msg: string): boolean {
  return !msg || msg.trim().length === 0;
}

function extractTitle(msg: string): string {
  const firstLine = msg.trim().split("\n")[0].trim();
  return (
    firstLine
      .replace(/^#+\s*/, "")
      .replace(/[*`#]/g, "")
      .trim() || "Erro detectado"
  );
}

function ensureTrailingBreak(msg: string, file?: string, line?: number): string {
  if (!file || line === undefined) return msg;
  return msg.trimEnd() + "\n\n&#8203;";
}

/**
 * Interface estendida do GitDSL do Danger que inclui propriedades
 * disponíveis em runtime mas não tipadas oficialmente.
 *
 * A interface GitDSL do Danger não inclui `insertions` e `deletions`,
 * mas essas propriedades existem em runtime e são úteis para análise de código.
 *
 * Esta interface ESTENDE GitDSL para manter todas as propriedades oficiais
 * (base, head, fileMatch, diffForFile, etc.) e adiciona as propriedades extras.
 */
export interface ExtendedGitDSL extends GitDSL {
  /** Total de linhas adicionadas no PR (disponível em runtime, não tipado oficialmente) */
  insertions?: number;
  /** Total de linhas removidas no PR (disponível em runtime, não tipado oficialmente) */
  deletions?: number;
}

/**
 * Interface estendida do DangerDSLType com git tipado corretamente.
 *
 * Use este tipo ao invés de `DangerDSLType` para ter acesso a `insertions` e `deletions`.
 */
export interface ExtendedDangerDSLType extends DangerDSLType {
  git: ExtendedGitDSL;
}

// ============================================================================
// DANGER CORE
// ============================================================================

/**
 * Acessa o objeto danger que o Danger JS injeta globalmente
 *
 * O objeto danger contém todas as informações sobre o PR/MR, arquivos modificados,
 * commits, e outras informações relevantes do sistema de versionamento.
 *
 * @returns O objeto danger com todas as informações do contexto (tipado com ExtendedDangerDSLType)
 * @category Danger Core
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const danger = getDanger();
 *
 * // Acessar PR no GitHub (com autocomplete!)
 * const pr = danger.github?.pr;
 * console.log(`PR #${pr?.number}: ${pr?.title}`);
 *
 * // Acessar PR no Bitbucket (com autocomplete!)
 * const bbPR = danger.bitbucket_cloud?.pr;
 * console.log(`PR: ${bbPR?.title}`);
 *
 * // Acessar arquivos modificados (com autocomplete!)
 * const files = danger.git.modified_files;
 * console.log(`${files.length} arquivos modificados`);
 *
 * // Agora com IntelliSense completo! 🎉
 * // - danger.git.created_files
 * // - danger.git.modified_files
 * // - danger.git.deleted_files
 * // - danger.git.commits
 * // - danger.git.insertions ← TIPADO!
 * // - danger.git.deletions ← TIPADO!
 * // - danger.github.pr
 * // - danger.bitbucket_cloud.pr
 * // - etc...
 * ```
 */
export function getDanger(): ExtendedDangerDSLType {
  return (global as any).danger || (globalThis as any).danger;
}

// ============================================================================
// MENSAGENS NO PR
// ============================================================================

/**
 * Envia uma mensagem informativa no Pull Request
 *
 * Mensagens são exibidas como comentários informativos e não afetam o status
 * do build. Use para feedback positivo ou informações gerais.
 *
 * @param msg - Mensagem a ser enviada (suporta markdown)
 * @param file - Caminho do arquivo para comentário inline (opcional)
 * @param line - Número da linha para comentário inline (opcional)
 * @category Mensagens
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * // Mensagem geral
 * sendMessage("✅ Código está bem formatado!");
 *
 * // Mensagem em arquivo específico
 * sendMessage("💡 Boa prática implementada aqui!", "lib/user.dart", 42);
 *
 * // Mensagem com markdown
 * sendMessage("**Total**: 5 arquivos modificados\n- 3 arquivos Dart\n- 2 arquivos YAML");
 * ```
 */
export function sendMessage(msg: string, file?: string, line?: number): void {
  if (isEmptyMessage(msg)) return;
  if (isDuplicate("message", msg, file, line)) return;
  const formatted = ensureTrailingBreak(msg, file, line);
  const messageFn = (global as any).message || (globalThis as any).message;
  if (messageFn) {
    if (file && line !== undefined) {
      messageFn(formatted, file, line);
    } else {
      messageFn(formatted);
    }
  }
}

/**
 * Envia um aviso (warning) no Pull Request
 *
 * Avisos indicam problemas que devem ser revisados, mas não fazem o build falhar.
 * Use para questões não-críticas que merecem atenção.
 *
 * @param msg - Mensagem de aviso (suporta markdown)
 * @param file - Caminho do arquivo para comentário inline (opcional)
 * @param line - Número da linha para comentário inline (opcional)
 * @category Mensagens
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * // Aviso geral
 * sendWarn("⚠️ PR muito grande: 500 linhas alteradas");
 *
 * // Aviso em linha específica
 * sendWarn("⚠️ Considere usar const aqui", "lib/config.dart", 15);
 *
 * // Aviso com sugestão
 * sendWarn("⚠️ **Performance**: Evite operações custosas no build()\n\nSugestão: Mova para initState()");
 * ```
 */
export function sendWarn(msg: string, file?: string, line?: number): void {
  if (isEmptyMessage(msg)) return;
  if (isDuplicate("warn", msg, file, line)) return;
  const formatted = ensureTrailingBreak(msg, file, line);
  const warnFn = (global as any).warn || (globalThis as any).warn;
  if (warnFn) {
    if (file && line !== undefined) {
      const markdownFn = (global as any).markdown || (globalThis as any).markdown;
      if (markdownFn) {
        markdownFn(formatted, file, line);
      }
      const title = extractTitle(msg);
      trackWarnSummary(title, file);
    } else {
      warnFn(formatted);
    }
  }
}

/**
 * Envia uma mensagem de erro no Pull Request (falha o build)
 *
 * ⚠️ **ATENÇÃO**: Erros fazem o build falhar! Use apenas para problemas
 * críticos que precisam ser corrigidos antes do merge.
 *
 * @param msg - Mensagem de erro (suporta markdown)
 * @param file - Caminho do arquivo para comentário inline (opcional)
 * @param line - Número da linha para comentário inline (opcional)
 * @category Mensagens
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * // Erro crítico
 * sendFail("❌ Testes falhando: 3 de 10 testes falharam");
 *
 * // Erro em linha específica
 * sendFail("❌ API key hardcoded detectada!", "lib/config.dart", 8);
 *
 * // Erro com contexto
 * sendFail("❌ **Segurança**: Dados sensíveis sem criptografia\n\nUse flutter_secure_storage");
 * ```
 */
export function sendFail(msg: string, file?: string, line?: number): void {
  if (isEmptyMessage(msg)) return;
  if (isDuplicate("fail", msg, file, line)) return;
  const formatted = ensureTrailingBreak(msg, file, line);
  const failFn = (global as any).fail || (globalThis as any).fail;
  if (failFn) {
    if (file && line !== undefined) {
      const markdownFn = (global as any).markdown || (globalThis as any).markdown;
      if (markdownFn) {
        markdownFn(formatted, file, line);
      }
      const title = extractTitle(msg);
      trackSummary(title, file);
    } else {
      failFn(formatted);
    }
  }
}

function trackToMap(
  map: Map<string, { count: number; files: string[] }>,
  title: string,
  file: string
): void {
  const key = title.toUpperCase();
  const entry = map.get(key) ?? { count: 0, files: [] };
  entry.count++;
  if (entry.files.length < MAX_SUMMARY_PER_TYPE) {
    entry.files.push(file);
  }
  map.set(key, entry);
}

function trackSummary(title: string, file: string): void {
  trackToMap(_failSummary, title, file);
}

function trackWarnSummary(title: string, file: string): void {
  trackToMap(_warnSummary, title, file);
}

function flushMap(
  map: Map<string, { count: number; files: string[] }>,
  emitFn: (msg: string) => void
): void {
  for (const [title, { count, files }] of map) {
    if (count <= MAX_SUMMARY_PER_TYPE) {
      for (const f of files) {
        emitFn(`**${title}** — \`${f}\``);
      }
    } else {
      emitFn(`**${title}** — ${count} ocorrência(s)`);
    }
  }
}

/**
 * Envia os resumos agrupados de fails/warns na tabela principal.
 * Chamado automaticamente pelo executeDangerBot após todos os plugins.
 */
export function flushSummaries(): void {
  if (_summaryFlushed) return;
  _summaryFlushed = true;

  const failFn = (global as any).fail || (globalThis as any).fail;
  const warnFn = (global as any).warn || (globalThis as any).warn;

  if (failFn && _failSummary.size > 0) flushMap(_failSummary, failFn);
  if (warnFn && _warnSummary.size > 0) flushMap(_warnSummary, warnFn);
}

/**
 * Opções para mensagens formatadas no padrão Danger Bot.
 * Usado por sendFormattedFail e sendFormattedWarn.
 */
export interface FormattedMessageOptions {
  /** Título em CAPS (sem emoji). Ex: "BARREL FILE RECOMENDADO" */
  title: string;
  /** Descrição curta do problema (1-2 linhas, suporta **negrito**) */
  description: string;
  /** Bloco de código mostrando o problema — wrong (❌) e correct (✅) são formatados automaticamente */
  problem: {
    /** Código errado (será exibido com ❌) */
    wrong: string;
    /** Código correto (será exibido com ✅) */
    correct: string;
    /** Label customizado para o código errado (default: "Errado") */
    wrongLabel?: string;
    /** Label customizado para o código correto (default: "Correto") */
    correctLabel?: string;
    /** Linguagem do bloco de código (default: "dart") */
    language?: string;
  };
  /** Ação necessária para corrigir o problema */
  action: {
    /** Texto explicando o que fazer (opcional, aparece antes do bloco de código) */
    text?: string;
    /** Bloco de código com a correção */
    code: string;
    /** Linguagem do bloco de código (default: "dart") */
    language?: string;
  };
  /** Frase curta sobre o benefício da correção */
  objective: string;
  /** Link de referência */
  reference?: {
    text: string;
    url: string;
  };
  /** Arquivo onde o problema foi encontrado */
  file?: string;
  /** Linha do problema */
  line?: number;
}

function buildFormattedMessage(opts: FormattedMessageOptions): string {
  const lang = opts.problem.language ?? "dart";
  const actionLang = opts.action.language ?? "dart";
  const wrongLabel = opts.problem.wrongLabel ?? "Errado";
  const correctLabel = opts.problem.correctLabel ?? "Correto";
  const actionText = opts.action.text ? `${opts.action.text}\n\n` : "";
  const refLine = opts.reference ? `\n📖 [${opts.reference.text}](${opts.reference.url})` : "";

  return `${opts.title}

${opts.description}

### ⚠️ Problema Identificado

❌ **${wrongLabel}**

\`\`\`${lang}
${opts.problem.wrong}
\`\`\`

✅ **${correctLabel}**

\`\`\`${lang}
${opts.problem.correct}
\`\`\`

### 🎯 AÇÃO NECESSÁRIA

${actionText}\`\`\`${actionLang}
${opts.action.code}
\`\`\`

### 🚀 Objetivo

${opts.objective}${refLine}`;
}

/**
 * Envia um erro formatado no padrão Danger Bot.
 *
 * Monta automaticamente o layout com título, problema, ação e objetivo.
 * Alternativa estruturada ao sendFail com template literal.
 *
 * @category Mensagens
 * @since 2.1.0
 *
 * @example
 * ```typescript
 * sendFormattedFail({
 *   title: "BARREL FILE RECOMENDADO",
 *   description: "**3 imports** da mesma pasta `models/` poderiam usar um barrel file.",
 *   problem: {
 *     wrong: "import '...user_entity.dart';\nimport '...address_entity.dart';\nimport '...role_entity.dart';",
 *     correct: "import '...entities.dart';",
 *     wrongLabel: "Atual — 3 imports separados",
 *     correctLabel: "Com barrel file — 1 import",
 *   },
 *   action: {
 *     text: "Crie `entities.dart` na pasta `entities/`:",
 *     code: "export 'user_entity.dart';\nexport 'address_entity.dart';\nexport 'role_entity.dart';",
 *   },
 *   objective: "Simplificar **imports** e melhorar **organização**.",
 *   reference: {
 *     text: "Guia sobre Barrel Files",
 *     url: "https://medium.com/@ugamakelechi501/barrel-files-in-dart-and-flutter",
 *   },
 *   file: "lib/main.dart",
 *   line: 5,
 * });
 * ```
 */
export function sendFormattedFail(opts: FormattedMessageOptions): void {
  const msg = buildFormattedMessage(opts);
  sendFail(msg, opts.file, opts.line);
}

/**
 * Envia um aviso formatado no padrão Danger Bot.
 *
 * Monta automaticamente o layout com título, problema, ação e objetivo.
 * Alternativa estruturada ao sendWarn com template literal.
 *
 * @category Mensagens
 * @since 2.1.0
 *
 * @example
 * ```typescript
 * sendFormattedWarn({
 *   title: "USO DE PRINT DETECTADO",
 *   description: "Encontrado `print()` no código de produção.",
 *   problem: {
 *     wrong: "print('debug: $value');",
 *     correct: "logger.d('debug: $value');",
 *   },
 *   action: {
 *     code: "logger.d('debug: $value');",
 *   },
 *   objective: "Usar logger adequado para produção.",
 *   file: "lib/service.dart",
 *   line: 42,
 * });
 * ```
 */
export function sendFormattedWarn(opts: FormattedMessageOptions): void {
  const msg = buildFormattedMessage(opts);
  sendWarn(msg, opts.file, opts.line);
}

/**
 * Envia conteúdo markdown formatado no Pull Request
 *
 * Use para enviar tabelas, listas, ou conteúdo rico em formatação.
 * Ideal para relatórios e análises detalhadas.
 *
 * @param msg - Conteúdo em markdown
 * @param file - Caminho do arquivo para comentário inline (opcional)
 * @param line - Número da linha para comentário inline (opcional)
 * @category Mensagens
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * // Tabela com estatísticas
 * sendMarkdown(`
 * ## 📊 Análise de Código
 *
 * | Métrica | Valor |
 * |---------|-------|
 * | Arquivos | 15 |
 * | Linhas | +250 / -100 |
 * | Complexidade | Média |
 *
 * ✅ Tudo dentro dos padrões!
 * `);
 *
 * // Lista de arquivos
 * sendMarkdown(`
 * **Arquivos da camada Domain:**
 * - user_entity.dart
 * - user_repository.dart
 * - login_usecase.dart
 * `);
 * ```
 */
export function sendMarkdown(msg: string, file?: string, line?: number): void {
  if (isEmptyMessage(msg)) return;
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
 * Agenda uma tarefa assíncrona para ser executada pelo Danger
 *
 * Use quando precisar executar operações assíncronas como chamadas de API,
 * leitura de arquivos, ou execução de comandos shell.
 *
 * @param fn - Função assíncrona a ser executada
 * @category Mensagens
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * scheduleTask(async () => {
 *   // Executar flutter analyze
 *   const { execSync } = require('child_process');
 *   const output = execSync('flutter analyze').toString();
 *
 *   if (output.includes('error')) {
 *     sendFail('❌ Flutter analyze encontrou erros');
 *   }
 * });
 *
 * scheduleTask(async () => {
 *   // Verificar cobertura de testes
 *   const coverage = await fetchCodeCoverage();
 *   if (coverage < 80) {
 *     sendWarn(`⚠️ Cobertura baixa: ${coverage}%`);
 *   }
 * });
 * ```
 */
export function scheduleTask(fn: () => Promise<void>): void {
  const scheduleFn = (global as any).schedule || (globalThis as any).schedule;
  if (scheduleFn) scheduleFn(fn);
}

// ============================================================================
// FILTROS DE ARQUIVOS
// ============================================================================

/**
 * Retorna todos os arquivos modificados e criados no PR
 *
 * Esta é a função base para filtrar arquivos. Ela combina `modified_files`
 * e `created_files` do git, excluindo arquivos deletados.
 *
 * @returns Array com caminhos de todos os arquivos modificados ou criados
 * @category Filtros de Arquivos
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const files = getAllChangedFiles();
 * console.log(`${files.length} arquivos foram modificados ou criados`);
 *
 * files.forEach(file => {
 *   console.log(`- ${file}`);
 * });
 *
 * // Filtrar por tipo
 * const yamlFiles = files.filter(f => f.endsWith('.yaml'));
 * const testFiles = files.filter(f => f.includes('_test.'));
 * ```
 */
export function getAllChangedFiles(): string[] {
  const danger = getDanger();
  const allFiles = [...danger.git.modified_files, ...danger.git.created_files];

  if (_ignoredFiles.size === 0) {
    verboseLog(`📂 ${allFiles.length} arquivo(s) modificados/criados no PR`);
    return allFiles;
  }
  const filtered = allFiles.filter((f) => !_ignoredFiles.has(f));
  const ignoredCount = allFiles.length - filtered.length;
  if (ignoredCount > 0) {
    verboseLog(
      `📂 ${allFiles.length} arquivo(s) no PR, ${ignoredCount} ignorado(s), ${filtered.length} para análise`
    );
  }
  return filtered;
}

/**
 * Retorna todos os arquivos `.dart` modificados ou criados que existem no disco
 *
 * Combina os arquivos modificados (`modified_files`) e criados (`created_files`)
 * do contexto do Danger, filtrando apenas arquivos com extensão `.dart`.
 *
 *
 * Como utiliza import dinâmico de `fs`, esta função é assíncrona.
 *
 * @returns Promise com um array contendo os caminhos dos arquivos `.dart` existentes
 * @category Filtros de Arquivos
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const dartFiles = await getAllDartFiles();
 *
 * if (dartFiles.length === 0) {
 *   sendMessage("Nenhum arquivo Dart válido encontrado");
 *   return;
 * }
 *
 * sendMessage(`${dartFiles.length} arquivo(s) Dart encontrado(s) no PR`);
 *
 * dartFiles.forEach(file => {
 *   console.log(`- ${file}`);
 * });
 * ```
 */
export async function getDartFiles(): Promise<string[]> {
  const danger = getDanger();
  const { existsSync } = await import("fs");

  const dartFiles = [...danger.git.modified_files, ...danger.git.created_files].filter(
    (f: string) => f.endsWith(".dart") && !f.endsWith("_test.dart") && existsSync(f)
  );

  return dartFiles;
}

/**
 * Retorna arquivos `.dart` de um diretório específico
 *
 * Útil para filtrar arquivos de uma camada ou módulo específico do projeto.
 *
 * @param directory - Caminho do diretório (ex: '/domain/', '/data/', '/presentation/')
 * @returns Array com caminhos dos arquivos .dart no diretório
 * @category Filtros de Arquivos
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * // Arquivos da camada de domínio
 * const domainFiles = getDartFilesInDirectory('/domain/');
 *
 * // Arquivos de um módulo específico
 * const userFiles = getDartFilesInDirectory('/features/user/');
 *
 * // Verificar se houve mudanças em área crítica
 * const authFiles = getDartFilesInDirectory('/core/auth/');
 * if (authFiles.length > 0) {
 *   sendWarn("⚠️ Mudanças em área de autenticação detectadas");
 * }
 * ```
 */
export async function getDartFilesInDirectory(directory: string): Promise<string[]> {
  const data = await getDartFiles();
  return data.filter((f: string) => f.includes(directory));
}

/**
 * Retorna arquivos que correspondem a um padrão RegExp
 *
 * Permite filtros personalizados e complexos usando expressões regulares.
 *
 * @param pattern - Padrão RegExp para buscar
 * @returns Array com caminhos dos arquivos que correspondem ao padrão
 * @category Filtros de Arquivos
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * // Arquivos de configuração
 * const configFiles = getFilesMatching(/\.(yaml|json|env)$/);
 *
 * // Arquivos de teste
 * const testFiles = getFilesMatching(/_test\.dart$/);
 *
 * // Arquivos de modelos
 * const modelFiles = getFilesMatching(/\/models\/.*\.dart$/);
 *
 * // Arquivos de múltiplas extensões
 * const assetFiles = getFilesMatching(/\.(png|jpg|svg|webp)$/);
 *
 * // Verificar se há mudanças em arquivos críticos
 * const criticalFiles = getFilesMatching(/\/(main|app|config)\.dart$/);
 * if (criticalFiles.length > 0) {
 *   sendMessage("⚠️ Arquivos críticos modificados, requer revisão cuidadosa");
 * }
 * ```
 */
export function getFilesMatching(pattern: RegExp): string[] {
  return getAllChangedFiles().filter((f: string) => pattern.test(f));
}

// ============================================================================
// CLEAN ARCHITECTURE HELPERS
// ============================================================================

/**
 * Retorna arquivos `.dart` da camada Domain (Clean Architecture)
 *
 * A camada Domain contém entities, failures, repositories e use cases.
 * Atalho para `getDartFilesInDirectory('/domain/')`.
 *
 * @returns Array com caminhos dos arquivos .dart da camada Domain
 * @category Clean Architecture
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const domainFiles = getDomainDartFiles();
 *
 * if (domainFiles.length > 0) {
 *   sendMessage(`🏗️ ${domainFiles.length} arquivos da camada Domain modificados`);
 *
 *   // Verificar se tem entities
 *   const entities = domainFiles.filter(f => f.includes('/entities/'));
 *   const usecases = domainFiles.filter(f => f.includes('/usecases/'));
 *
 *   console.log(`Entities: ${entities.length}, UseCases: ${usecases.length}`);
 * }
 * ```
 */
export async function getDomainDartFiles(): Promise<string[]> {
  const data = await getDartFilesInDirectory("/domain/");
  return data;
}

/**
 * Retorna arquivos `.dart` da camada Data (Clean Architecture)
 *
 * A camada Data contém datasources, models e implementações de repositories.
 * Atalho para `getDartFilesInDirectory('/data/')`.
 *
 * @returns Array com caminhos dos arquivos .dart da camada Data
 * @category Clean Architecture
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const dataFiles = getDataDartFiles();
 *
 * if (dataFiles.length > 0) {
 *   // Verificar se mudanças incluem datasources
 *   const datasources = dataFiles.filter(f => f.includes('/datasources/'));
 *   const models = dataFiles.filter(f => f.includes('/models/'));
 *
 *   if (datasources.length > 0) {
 *     sendWarn("⚠️ Datasources modificados - verificar chamadas de API");
 *   }
 * }
 * ```
 */
export async function getDataDartFiles(): Promise<string[]> {
  return await getDartFilesInDirectory("/data/");
}

/**
 * Retorna arquivos `.dart` da camada Presentation (Clean Architecture)
 *
 * A camada Presentation contém pages, widgets, viewmodels e states.
 * Atalho para `getDartFilesInDirectory('/presentation/')`.
 *
 * @returns Array com caminhos dos arquivos .dart da camada Presentation
 * @category Clean Architecture
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const presentationFiles = getPresentationDartFiles();
 *
 * if (presentationFiles.length > 0) {
 *   // Verificar se tem testes de UI
 *   const hasTests = getAllChangedFiles().some(f =>
 *     f.includes('presentation') && f.includes('_test.dart')
 *   );
 *
 *   if (!hasTests && presentationFiles.length > 5) {
 *     sendWarn("⚠️ Muitas mudanças na UI sem testes");
 *   }
 * }
 * ```
 */
export async function getPresentationDartFiles(): Promise<string[]> {
  return await getDartFilesInDirectory("/presentation/");
}

/**
 * Verifica se um arquivo pertence a uma camada específica da Clean Architecture
 *
 * Útil para validar se arquivos estão na camada correta ou para detectar
 * violações de arquitetura.
 *
 * @param file - Caminho do arquivo
 * @param layer - Nome da camada ('domain', 'data', 'presentation')
 * @returns `true` se o arquivo está na camada especificada
 * @category Clean Architecture
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const files = getDartFiles();
 *
 * files.forEach(file => {
 *   if (isInLayer(file, 'domain')) {
 *     console.log(`${file} está na camada Domain`);
 *   }
 *
 *   // Verificar violação: ViewModel não pode estar em Domain
 *   if (isInLayer(file, 'domain') && file.includes('viewmodel')) {
 *     sendFail(`❌ ViewModel encontrado na camada Domain: ${file}`);
 *   }
 * });
 *
 * // Verificar imports incorretos entre camadas
 * const domainFiles = files.filter(f => isInLayer(f, 'domain'));
 * for (const file of domainFiles) {
 *   const content = await getFileContent(file);
 *   if (content?.includes("import 'package:") && content.includes('/data/')) {
 *     sendFail(`❌ Domain importando Data: ${file}`);
 *   }
 * }
 * ```
 */
export function isInLayer(file: string, layer: "domain" | "data" | "presentation"): boolean {
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
    return content.chunks.map((c: any) => c.content).join("\n");
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
  return danger.github?.pr?.body || danger.bitbucket_cloud?.pr?.description || "";
}

/**
 * Get PR title
 * Retorna o título da Pull Request
 *
 * @returns PR title or empty string
 */
export function getPRTitle(): string {
  const danger = getDanger();
  return danger.github?.pr?.title || danger.bitbucket_cloud?.pr?.title || "";
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
