#!/bin/sh
# uso: tools/parity/build.sh <rótulo>
# Compila em .parity/<rótulo>-dist: "base" compila o código de referência (.parity/base-src);
# qualquer outro rótulo compila o src/ atual do repositório. Erros de tipo não impedem o build.
. "$(dirname "$0")/common.sh"
L=$1
[ -n "$L" ] || { echo "uso: build.sh <rótulo>"; exit 1; }
if [ "$L" = "base" ]; then SRC="$P/base-src"; else SRC="$REPO/src"; fi
cat > "$P/tsconfig.$L.json" <<JSON
{
  "extends": "$REPO/tsconfig.json",
  "compilerOptions": {
    "rootDir": "$SRC",
    "baseUrl": "$SRC",
    "outDir": "./$L-dist",
    "paths": { "@types": ["types"], "@plugins/*": ["plugins/*"] }
  },
  "include": ["$SRC/**/*.ts", "$REPO/danger-globals.d.ts"],
  "exclude": []
}
JSON
rm -rf "$P/$L-dist"
"$REPO/node_modules/.bin/tsc" -p "$P/tsconfig.$L.json" >/dev/null 2>&1
"$REPO/node_modules/.bin/tsc-alias" -p "$P/tsconfig.$L.json"
echo '{"type":"commonjs"}' > "$P/$L-dist/package.json"
test -f "$P/$L-dist/index.js" && echo "build $L ok" || echo "build $L FALHOU"
