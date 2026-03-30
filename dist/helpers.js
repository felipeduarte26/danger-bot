"use strict";
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
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setVerbose = setVerbose;
exports.isVerbose = isVerbose;
exports.verboseLog = verboseLog;
exports.setIgnoredFiles = setIgnoredFiles;
exports.getIgnoredFiles = getIgnoredFiles;
exports.getDanger = getDanger;
exports.sendMessage = sendMessage;
exports.sendWarn = sendWarn;
exports.sendFail = sendFail;
exports.flushSummaries = flushSummaries;
exports.sendFormattedFail = sendFormattedFail;
exports.sendFormattedWarn = sendFormattedWarn;
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
const _sentMessages = new Set();
let _ignoredFiles = new Set();
let _verbose = false;
const MAX_SUMMARY_PER_TYPE = 3;
const _failSummary = new Map();
const _warnSummary = new Map();
let _summaryFlushed = false;
/**
 * Ativa ou desativa o modo verbose.
 * Chamado internamente pelo executeDangerBot ao carregar o danger-bot.yaml.
 */
function setVerbose(enabled) {
  _verbose = enabled;
}
/**
 * Retorna se o modo verbose está ativo.
 */
function isVerbose() {
  return _verbose;
}
/**
 * Log condicional — só imprime quando verbose está ativo.
 */
function verboseLog(...args) {
  if (_verbose) console.log("[verbose]", ...args);
}
/**
 * Define os arquivos que devem ser ignorados por todos os plugins.
 * Chamado internamente pelo executeDangerBot ao carregar o danger-bot.yaml.
 */
function setIgnoredFiles(files) {
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
function getIgnoredFiles() {
  return _ignoredFiles;
}
function dedupKey(type, msg, file, line) {
  return `${type}::${file ?? ""}::${line ?? ""}::${msg}`;
}
function isDuplicate(type, msg, file, line) {
  const key = dedupKey(type, msg, file, line);
  if (_sentMessages.has(key)) return true;
  _sentMessages.add(key);
  return false;
}
function isEmptyMessage(msg) {
  return !msg || msg.trim().length === 0;
}
function extractTitle(msg) {
  const firstLine = msg.trim().split("\n")[0].trim();
  return (
    firstLine
      .replace(/^#+\s*/, "")
      .replace(/[*`#]/g, "")
      .trim() || "Erro detectado"
  );
}
function ensureTrailingBreak(msg, file, line) {
  if (!file || line === undefined) return msg;
  return msg.trimEnd() + "\n\n&#8203;";
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
function getDanger() {
  return global.danger || globalThis.danger;
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
function sendMessage(msg, file, line) {
  if (isEmptyMessage(msg)) return;
  if (isDuplicate("message", msg, file, line)) return;
  const formatted = ensureTrailingBreak(msg, file, line);
  const messageFn = global.message || globalThis.message;
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
function sendWarn(msg, file, line) {
  if (isEmptyMessage(msg)) return;
  if (isDuplicate("warn", msg, file, line)) return;
  const formatted = ensureTrailingBreak(msg, file, line);
  const warnFn = global.warn || globalThis.warn;
  if (warnFn) {
    if (file && line !== undefined) {
      warnFn(formatted, file, line);
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
function sendFail(msg, file, line) {
  if (isEmptyMessage(msg)) return;
  if (isDuplicate("fail", msg, file, line)) return;
  const formatted = ensureTrailingBreak(msg, file, line);
  const failFn = global.fail || globalThis.fail;
  if (failFn) {
    if (file && line !== undefined) {
      failFn(formatted, file, line);
      const title = extractTitle(msg);
      trackSummary(title, file);
    } else {
      failFn(formatted);
    }
  }
}
function trackToMap(map, title, file) {
  const key = title.toUpperCase();
  const entry = map.get(key) ?? { count: 0, files: [] };
  entry.count++;
  if (entry.files.length < MAX_SUMMARY_PER_TYPE) {
    entry.files.push(file);
  }
  map.set(key, entry);
}
function trackSummary(title, file) {
  trackToMap(_failSummary, title, file);
}
function trackWarnSummary(title, file) {
  trackToMap(_warnSummary, title, file);
}
function flushMap(map, emitFn) {
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
function flushSummaries() {
  if (_summaryFlushed) return;
  _summaryFlushed = true;
  const failFn = global.fail || globalThis.fail;
  const warnFn = global.warn || globalThis.warn;
  if (failFn && _failSummary.size > 0) flushMap(_failSummary, failFn);
  if (warnFn && _warnSummary.size > 0) flushMap(_warnSummary, warnFn);
}
function buildFormattedMessage(opts) {
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
function sendFormattedFail(opts) {
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
function sendFormattedWarn(opts) {
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
function sendMarkdown(msg, file, line) {
  if (isEmptyMessage(msg)) return;
  const markdownFn = global.markdown || globalThis.markdown;
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
function scheduleTask(fn) {
  const scheduleFn = global.schedule || globalThis.schedule;
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
function getAllChangedFiles() {
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
async function getDartFiles() {
  const danger = getDanger();
  const { existsSync } = await Promise.resolve().then(() => __importStar(require("fs")));
  const dartFiles = [...danger.git.modified_files, ...danger.git.created_files].filter(
    (f) => f.endsWith(".dart") && !f.endsWith("_test.dart") && existsSync(f)
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
async function getDartFilesInDirectory(directory) {
  const data = await getDartFiles();
  return data.filter((f) => f.includes(directory));
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
function getFilesMatching(pattern) {
  return getAllChangedFiles().filter((f) => pattern.test(f));
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
async function getDomainDartFiles() {
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
async function getDataDartFiles() {
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
async function getPresentationDartFiles() {
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
    if (!content) return null;
    return content.chunks.map((c) => c.content).join("\n");
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
  return danger.github?.pr?.body || danger.bitbucket_cloud?.pr?.description || "";
}
/**
 * Get PR title
 * Retorna o título da Pull Request
 *
 * @returns PR title or empty string
 */
function getPRTitle() {
  const danger = getDanger();
  return danger.github?.pr?.title || danger.bitbucket_cloud?.pr?.title || "";
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
