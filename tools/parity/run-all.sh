#!/bin/sh
# uso: run-all.sh <rótulo> <projeto> <cenário> [plugins...]   (sem plugins: todos)
. "$(dirname "$0")/common.sh"
DIST=$1; PROJECT=$2; SCEN=$3; shift 3
mkdir -p "$P/out/$SCEN/$DIST"
if [ $# -eq 0 ]; then
  set -- $(node -e "console.log(require('$P/plugin-names.json').join(' '))")
fi
printf '%s\n' "$@" | xargs -P "${PARITY_JOBS:-4}" -n 1 "$TOOLS/one.sh" "$DIST" "$PROJECT" "$SCEN"
