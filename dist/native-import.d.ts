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
/** `import()` nativo: pacotes ESM ou CommonJS e URLs `file://`. */
export declare function importModule(specifier: string): Promise<any>;
