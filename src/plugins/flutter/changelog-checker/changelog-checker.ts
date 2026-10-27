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

import { DartPath, createPlugin, getDanger, isPluginActive, sendWarn, verboseLog } from "@types";

/** Arquivos de código-fonte que pedem changelog. */
const SOURCE_FILE = /\.(dart|ts|js|tsx|jsx)$/;
/** Arquivos de teste JS/TS. */
const JS_TEST_FILE = /\.(test|spec)\./;
/** Pastas da raiz do projeto que não pedem changelog. */
const IGNORED_ROOT_FOLDERS = ["docs", "test", "tests", "__tests__"];

export default createPlugin(
  {
    name: "changelog-checker",
    description: "Verifica se o CHANGELOG.md foi atualizado",
    enabled: true,
  },
  async () => {
    // Com o pr-validation ativo, a falha dele (CHANGELOG NÃO ATUALIZADO/ENCONTRADO)
    // já cobre este aviso: todo PR que este plugin avisaria, o pr-validation reprova.
    if (isPluginActive("pr-validation")) {
      verboseLog("[changelog-checker] ignorado: o pr-validation já verifica o changelog");
      return;
    }

    const { git } = getDanger();
    const allFiles = [...git.modified_files, ...git.created_files].map((f: string) =>
      DartPath.of(f)
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
      sendWarn(
        `**CHANGELOG não atualizado** — Este PR modifica ${significantChanges.length} arquivo(s) de código. Atualize o CHANGELOG.md com o resumo das mudanças.`
      );
    }
  }
);
