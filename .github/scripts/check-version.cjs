// Confere se a versão do package.json está igual nos lugares que o roteiro de release
// manda atualizar (CLAUDE.md, "Fechar uma versão"). Uso: node .github/scripts/check-version.cjs
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const { version } = JSON.parse(read("package.json"));

const expected = [
  ["README.md", `badge/version-${version}-blue`, "o badge de versão"],
  ["docs/CLI.md", `Version:     ${version}`, "a saída do `info`"],
  ["docs/INSTALACAO.md", `danger-bot@${version}`, "a saída do `npm list`"],
  ["CHANGELOG.md", `## [${version}] - `, `a seção ## [${version}]`],
  ["CHANGELOG.md", `[${version}]: `, `o link [${version}] no fim`],
];

const missing = expected.filter(([file, text]) => !read(file).includes(text));
for (const [file, , what] of missing) {
  console.log(
    `::error file=${file}::${file} não tem ${what} da versão ${version} do package.json.`
  );
}
if (missing.length > 0) process.exit(1);
console.log(`Versão ${version} consistente em ${expected.length} lugares.`);
