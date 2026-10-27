// Resumo das saídas de um rótulo num cenário. uso: node summary.cjs <cenário> <rótulo>
const fs = require("fs"), path = require("path");
const { P } = require("./paths.cjs");
const d = path.join(P, "out", process.argv[2], process.argv[3]);
for (const f of fs.readdirSync(d).filter((f) => f.endsWith(".json")).sort()) {
  const r = JSON.parse(fs.readFileSync(path.join(d, f)));
  const c = {};
  for (const e of r.events) c[e.type] = (c[e.type] || 0) + 1;
  console.log(f.replace(".json", "").padEnd(32), String(r.ms).padStart(7) + "ms", JSON.stringify(c),
    r.error ? "ERR " + r.error.slice(0, 90) : "", r.commands && r.commands.length ? "cmds:" + r.commands.length : "");
}
