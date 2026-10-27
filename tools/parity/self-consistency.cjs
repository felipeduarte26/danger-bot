// A mesma versão de um plugin no esfera em 80, 40 e 160 colunas (dart format): os achados (arquivo +
// título + 1ª linha, sem número de linha) têm de ser os mesmos. Só compara lib/ e test/ (o que as cópias têm).
// uso: node self-consistency.cjs <rótulo> <plugin>
const fs = require("fs"), path = require("path");
const { P } = require("./paths.cjs");
const [label, plugin] = process.argv.slice(2);
const inFmt = (file) => /^(lib|test)\//.test(file);
const read = (scen) => {
  const r = JSON.parse(fs.readFileSync(path.join(P, "out", scen, label, plugin + ".json")));
  return new Set(
    r.events
      .filter((e) => e.file && inFmt(e.file))
      .map((e) => `${e.type} ${e.file} ${e.message.split("\n").filter(Boolean).slice(0, 2).join(" | ").replace(/\d+ ocorrência/g, "N ocorrência")}`)
  );
};
const base = read("full-created");
for (const scen of ["fmt40", "fmt160"]) {
  const other = read(scen);
  const onlyBase = [...base].filter((x) => !other.has(x)), onlyOther = [...other].filter((x) => !base.has(x));
  console.log(`${plugin} [${label}] 80 col × ${scen}: ${onlyBase.length} só em 80, ${onlyOther.length} só em ${scen}`);
  for (const x of onlyBase.slice(0, 5)) console.log("   80: " + x.slice(0, 230));
  for (const x of onlyOther.slice(0, 5)) console.log(`   ${scen}: ` + x.slice(0, 230));
}
