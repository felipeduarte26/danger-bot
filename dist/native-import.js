"use strict";
/**
 * DANGER BOT - NATIVE IMPORT
 * ==========================
 * `import()` nativo do Node para o build em CommonJS.
 *
 * Com `module: CommonJS` o TypeScript troca `import(x)` por `require(x)`, que
 * não carrega pacotes só-ESM (`eld`, `dictionary-pt`) nem URLs `file://`
 * (plugins locais). Criada com `new Function`, a chamada escapa da transformação
 * e resolve os pacotes a partir deste módulo, como um `import()` comum.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.importModule = importModule;
// eslint-disable-next-line @typescript-eslint/no-implied-eval -- única forma de manter o import() nativo no build CommonJS
const nativeImport = new Function("specifier", "return import(specifier)");
/** `import()` nativo: pacotes ESM ou CommonJS e URLs `file://`. */
function importModule(specifier) {
  return nativeImport(specifier);
}
