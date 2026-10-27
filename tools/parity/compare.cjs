// Compara as saídas de dois rótulos num cenário (mensagens, arquivo, linha, erros, comandos).
// uso: node compare.cjs <cenário> [rótuloA=base] [rótuloB=new] [--only p1,p2] [--detail plugin|all]
const fs = require("fs"), path = require("path");
const { P } = require("./paths.cjs");
const args = process.argv.slice(2);
const flags = new Set(["--only", "--detail"]);
const positional = args.filter((x, i) => !x.startsWith("--") && !flags.has(args[i - 1]));
const [scen, a = "base", b = "new"] = positional;
const detail = args.includes("--detail") ? args[args.indexOf("--detail") + 1] : null;
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const dirA = path.join(P, "out", scen, a), dirB = path.join(P, "out", scen, b);
const key = (e) => `${e.type}|${e.file}|${e.line}|${e.message}`;
let identical = 0;
const rows = [];
for (const f of fs.readdirSync(dirA).filter((f) => f.endsWith(".json")).sort()) {
  const name = f.replace(".json", "");
  if (only && !only.includes(name)) continue;
  if (!fs.existsSync(path.join(dirB, f))) continue;
  const ra = JSON.parse(fs.readFileSync(path.join(dirA, f))), rb = JSON.parse(fs.readFileSync(path.join(dirB, f)));
  const ka = ra.events.map(key), kb = rb.events.map(key);
  const same = JSON.stringify(ka) === JSON.stringify(kb) && ra.error === rb.error && JSON.stringify(ra.commands) === JSON.stringify(rb.commands);
  if (same) { identical++; continue; }
  const count = (arr) => arr.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
  const ca = count(ka), cb = count(kb);
  const onlyA = [], onlyB = [];
  for (const [k, n] of ca) for (let i = 0; i < n - (cb.get(k) || 0); i++) onlyA.push(k);
  for (const [k, n] of cb) for (let i = 0; i < n - (ca.get(k) || 0); i++) onlyB.push(k);
  const orderOnly = onlyA.length === 0 && onlyB.length === 0;
  rows.push(`${name.padEnd(32)} -${onlyA.length} +${onlyB.length}${orderOnly ? " (só ordem)" : ""}${ra.error !== rb.error ? ` erro: ${ra.error} -> ${rb.error}` : ""}${JSON.stringify(ra.commands) !== JSON.stringify(rb.commands) ? " (comandos diferentes)" : ""}`);
  if (detail === name || detail === "all") {
    const show = (k) => { const [t, file, line, ...m] = k.split("|"); return `${t} ${file}:${line} ${m.join("|").split("\n").slice(0, 3).join(" ⏎ ").slice(0, 300)}`; };
    for (const k of onlyA.slice(0, 15)) console.log(`  - ${show(k)}`);
    for (const k of onlyB.slice(0, 15)) console.log(`  + ${show(k)}`);
    if (JSON.stringify(ra.commands) !== JSON.stringify(rb.commands)) {
      const sa = new Set(ra.commands || []), sb = new Set(rb.commands || []);
      for (const c of (ra.commands || []).filter((c) => !sb.has(c)).slice(0, 5)) console.log(`  - cmd ${c.slice(0, 300)}`);
      for (const c of (rb.commands || []).filter((c) => !sa.has(c)).slice(0, 5)) console.log(`  + cmd ${c.slice(0, 300)}`);
    }
  }
}
console.log(`${scen}: ${identical} idênticos`);
for (const r of rows) console.log(r);
