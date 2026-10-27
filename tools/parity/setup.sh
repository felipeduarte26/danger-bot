#!/bin/sh
# uso: tools/parity/setup.sh [ref-base]   (padrão: HEAD)
# Prepara .parity/ (ou PARITY_DIR): clone do esfera-web, código de referência (ref-base),
# cenários (esfera inteiro, PRs reais, cópias reformatadas) e o baseline de todos os plugins.
# Variáveis: ESFERA (repositório do esfera-web), ESFERA_BRANCH (padrão production),
# PARITY_PRS (merge commits usados como pr1..pr6), PARITY_JOBS (processos em paralelo).
set -e
. "$(dirname "$0")/common.sh"
BASE_REF=${1:-HEAD}
ESFERA=${ESFERA:-$(cd "$REPO/../.." && pwd)/Diletta/esfera-web}
ESFERA_BRANCH=${ESFERA_BRANCH:-production}
PRS=${PARITY_PRS:-"930c3a63341bda3ff28c9007682b0c0fea82d0c9 416c380a05e644ccb71bb3c63d880755d6809674 9a5f9938590be0d642e776fd58cdfe5c59c7591c 0012578976859b3357549384680506796d9ce162 a22602d2781d1334dcdd5b93598f28df2790cd57 d1fba698f39e771fb98795bb94c20ca433d16a27"}

mkdir -p "$P/scenarios" "$P/out" "$P/projects"
ln -sfn "$REPO/node_modules" "$P/node_modules"

# Clone local do esfera (somente leitura no original)
if [ ! -d "$P/esfera" ]; then
  git clone -q --no-checkout "$ESFERA" "$P/esfera"
  git -C "$P/esfera" checkout -q "$ESFERA_BRANCH"
fi
ln -sfn "$REPO/node_modules" "$P/esfera/node_modules"
echo "esfera: $(git -C "$P/esfera" log --oneline -1)"

# Código de referência
rm -rf "$P/base-src" && mkdir -p "$P/base-src"
git -C "$REPO" archive "$BASE_REF" src | tar -x -C "$P/base-src" --strip-components=1
"$TOOLS/build.sh" base
node -e "console.log(JSON.stringify(require('$P/base-dist/index.js').allFlutterPlugins.map((p) => p.config.name)))" > "$P/plugin-names.json"

# Cenários: o esfera inteiro como criado/modificado (diff = arquivo inteiro) e as cópias reformatadas
git -C "$P/esfera" ls-files > "$P/files.txt"
P="$P" node -e '
const fs = require("fs");
const P = process.env.P;
const files = fs.readFileSync(P + "/files.txt", "utf8").split("\n").filter(Boolean);
const body = "## Descrição\n\nAjusta a tela de pedidos para carregar os dados em paralelo e corrige o cálculo do frete.\n\n## Como testar\n\n1. Abrir pedidos\n2. Conferir o frete";
const base = { prTitle: "feat(orders): carrega pedidos em paralelo", prBody: body, fullDiff: true };
fs.writeFileSync(P + "/scenarios/full-created.json", JSON.stringify({ ...base, created: files, modified: [], deleted: [] }));
fs.writeFileSync(P + "/scenarios/full-modified.json", JSON.stringify({ ...base, created: [], modified: files, deleted: [] }));
const keep = files.filter((f) => /^(lib|test)\//.test(f) || ["pubspec.yaml", "analysis_options.yaml"].includes(f));
for (const w of [40, 160]) fs.writeFileSync(P + "/scenarios/fmt" + w + ".json", JSON.stringify({ ...base, created: keep, modified: [], deleted: [] }));
'
rm -f "$P/files.txt"

# PRs reais (worktrees no clone) e o pr4 sem outros plugins ativos (para o changelog-checker)
i=1
for h in $PRS; do
  node "$TOOLS/make-git-scenario.cjs" "$P/esfera" "$h^1" "$h^2" "pr$i"
  i=$((i + 1))
done
P="$P" node -e 'const fs = require("fs"); const s = JSON.parse(fs.readFileSync(process.env.P + "/scenarios/pr4.json")); s.activePlugins = []; fs.writeFileSync(process.env.P + "/scenarios/pr4-solo.json", JSON.stringify(s));'

for w in 40 160; do
  D="$P/projects/fmt$w"
  rm -rf "$D" && mkdir -p "$D"
  (cd "$P/esfera" && tar -cf - lib test pubspec.yaml analysis_options.yaml .vscode) | tar -xf - -C "$D"
  ln -sfn "$REPO/node_modules" "$D/node_modules"
  (cd "$D" && dart format --page-width "$w" lib test >/dev/null 2>&1) || true
  echo "fmt$w pronto"
done

echo "baseline (todos os plugins, todos os cenários)..."
"$TOOLS/ab.sh" base
echo "pronto: $P"
