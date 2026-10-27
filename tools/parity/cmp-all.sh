#!/bin/sh
# uso: cmp-all.sh <rótulo> [--only p1,p2] [--detail plugin|all]   (compara base × rótulo em todos os cenários)
. "$(dirname "$0")/common.sh"
L=$1; shift
for s in full-created full-modified pr1 pr2 pr3 pr4 pr5 pr6 pr4-solo fmt40 fmt160; do
  node "$TOOLS/compare.cjs" "$s" base "$L" "$@"
done
