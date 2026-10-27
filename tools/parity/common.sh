# Caminhos comuns dos scripts de paridade (incluído pelos outros .sh).
REPO=$(cd "$(dirname "$0")/../.." && pwd)
TOOLS="$REPO/tools/parity"
P=${PARITY_DIR:-$REPO/.parity}
