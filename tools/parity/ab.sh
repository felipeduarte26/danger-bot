#!/bin/sh
# uso: ab.sh <rótulo> [plugins...] — roda os plugins (todos, sem argumentos) em todos os cenários
. "$(dirname "$0")/common.sh"
D=$1; shift
"$TOOLS/run-all.sh" "$D" "$P/esfera" full-created "$@"
"$TOOLS/run-all.sh" "$D" "$P/esfera" full-modified "$@"
for n in 1 2 3 4 5 6; do "$TOOLS/run-all.sh" "$D" "$P/projects/pr$n" "pr$n" "$@"; done
"$TOOLS/run-all.sh" "$D" "$P/projects/pr4" pr4-solo "$@"
"$TOOLS/run-all.sh" "$D" "$P/projects/fmt40" fmt40 "$@"
"$TOOLS/run-all.sh" "$D" "$P/projects/fmt160" fmt160 "$@"
