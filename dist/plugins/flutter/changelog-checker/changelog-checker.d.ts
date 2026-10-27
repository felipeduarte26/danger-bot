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
declare const _default: import("../../../types.js").DangerPlugin;
export default _default;
