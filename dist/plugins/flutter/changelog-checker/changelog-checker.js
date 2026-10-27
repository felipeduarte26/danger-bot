"use strict";
/**
 * 📄 CHANGELOG CHECKER PLUGIN
 * ==========================
 * Verifica se o CHANGELOG foi atualizado quando necessário.
 * Quando o pr-validation está ativo, não roda: ele já reprova o PR pelo mesmo motivo.
 *
 * Conta como "atualizado" qualquer arquivo com `changelog` no caminho (sem diferenciar
 * maiúsculas). Pedem changelog só os arquivos de código (.dart, .ts, .js, .tsx, .jsx),
 * exceto testes JS/TS (`x.test.ts`, `x.spec.js`) e as pastas docs/, test/, tests/ e
 * __tests__/ da raiz.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const _types_1 = require("../../../types.js");
/** Arquivos de código-fonte que pedem changelog. */
const SOURCE_FILE = /\.(dart|ts|js|tsx|jsx)$/;
/** Arquivos de teste JS/TS. */
const JS_TEST_FILE = /\.(test|spec)\./;
/** Pastas da raiz do projeto que não pedem changelog. */
const IGNORED_ROOT_FOLDERS = ["docs", "test", "tests", "__tests__"];
exports.default = (0, _types_1.createPlugin)(
  {
    name: "changelog-checker",
    description: "Verifica se o CHANGELOG.md foi atualizado",
    enabled: true,
  },
  async () => {
    // Com o pr-validation ativo, a falha dele (CHANGELOG NÃO ATUALIZADO/ENCONTRADO)
    // já cobre este aviso: todo PR que este plugin avisaria, o pr-validation reprova.
    if ((0, _types_1.isPluginActive)("pr-validation")) {
      (0, _types_1.verboseLog)(
        "[changelog-checker] ignorado: o pr-validation já verifica o changelog"
      );
      return;
    }
    const { git } = (0, _types_1.getDanger)();
    const allFiles = [...git.modified_files, ...git.created_files].map((f) =>
      _types_1.DartPath.of(f)
    );
    const changelogModified = allFiles.some((file) =>
      file.path.toLowerCase().includes("changelog")
    );
    // Arquivos de código que requerem atualização do CHANGELOG
    const significantChanges = allFiles.filter(
      (file) =>
        SOURCE_FILE.test(file.path) &&
        !JS_TEST_FILE.test(file.path) &&
        !IGNORED_ROOT_FOLDERS.includes(file.segments[0])
    );
    if (significantChanges.length > 0 && !changelogModified) {
      (0, _types_1.sendWarn)(
        `**CHANGELOG não atualizado** — Este PR modifica ${significantChanges.length} arquivo(s) de código. Atualize o CHANGELOG.md com o resumo das mudanças.`
      );
    }
  }
);
