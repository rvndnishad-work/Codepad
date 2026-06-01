#!/usr/bin/env bash
# Install the language packs used by /api/execute into the running Piston
# container (see docker-compose.piston.yml). Idempotent — re-running only
# installs what's missing.
#
# Usage: ./scripts/piston-install-langs.sh [container-name]
set -euo pipefail

CONTAINER="${1:-codepad-piston}"

# Piston package names. "gcc" provides C/C++; "node" provides JavaScript.
LANGS=(python node typescript go java gcc rust)

echo "Installing language packs into '$CONTAINER'..."
for lang in "${LANGS[@]}"; do
  echo ">> $lang"
  docker exec "$CONTAINER" ppman install "$lang" || {
    echo "   (failed or already installed: $lang)"
  }
done

echo
echo "Installed runtimes:"
docker exec "$CONTAINER" ppman list || true
