#!/usr/bin/env bash
# Install the language packs used by /api/execute into a running Piston server.
# Piston has no `ppman` CLI in the API image — packs install via its REST API.
# This is a thin wrapper around scripts/piston-install-langs.mjs (idempotent).
#
# Local docker (default): ./scripts/piston-install-langs.sh
# Remote (Fly proxy):     PISTON_URL=https://… PISTON_AUTH_TOKEN=… ./scripts/piston-install-langs.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$DIR/piston-install-langs.mjs"
