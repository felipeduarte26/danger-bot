#!/bin/sh
# uso: one.sh <rótulo> <projeto> <cenário> <plugin>
. "$(dirname "$0")/common.sh"
OUT="$P/out/$3/$1"
node "$TOOLS/run-plugin.cjs" "$P/$1-dist" "$2" "$P/scenarios/$3.json" "$4" "$OUT/$4.json" 2>"$OUT/$4.stderr" || echo "ERRO $1 $3 $4"
