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
/**
 * Ativa ou desativa o modo verbose.
 * Chamado internamente pelo executeDangerBot ao carregar o danger-bot.yaml.
 */
export declare function setVerbose(enabled: boolean): void;
/**
 * Retorna se o modo verbose está ativo.
 */
export declare function isVerbose(): boolean;
/**
 * Log condicional — só imprime quando verbose está ativo.
 */
export declare function verboseLog(...args: unknown[]): void;
/**
 * Define os arquivos que devem ser ignorados por todos os plugins.
 * Chamado internamente pelo executeDangerBot ao carregar o danger-bot.yaml.
 */
export declare function setIgnoredFiles(files: string[]): void;
/**
 * Retorna os arquivos ignorados configurados.
 */
export declare function getIgnoredFiles(): Set<string>;
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
export declare function getDanger(): ExtendedDangerDSLType;
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
export declare function sendMessage(msg: string, file?: string, line?: number): void;
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
export declare function sendWarn(msg: string, file?: string, line?: number): void;
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
export declare function sendFail(msg: string, file?: string, line?: number): void;
/**
 * Envia os resumos agrupados de fails/warns na tabela principal.
 * Chamado automaticamente pelo executeDangerBot após todos os plugins.
 */
export declare function flushSummaries(): void;
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
export declare function sendFormattedFail(opts: FormattedMessageOptions): void;
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
export declare function sendFormattedWarn(opts: FormattedMessageOptions): void;
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
export declare function sendMarkdown(msg: string, file?: string, line?: number): void;
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
export declare function scheduleTask(fn: () => Promise<void>): void;
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
export declare function getAllChangedFiles(): string[];
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
export declare function getDartFiles(): Promise<string[]>;
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
export declare function getDartFilesInDirectory(directory: string): Promise<string[]>;
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
export declare function getFilesMatching(pattern: RegExp): string[];
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
export declare function getDomainDartFiles(): Promise<string[]>;
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
export declare function getDataDartFiles(): Promise<string[]>;
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
export declare function getPresentationDartFiles(): Promise<string[]>;
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
export declare function isInLayer(file: string, layer: "domain" | "data" | "presentation"): boolean;
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
