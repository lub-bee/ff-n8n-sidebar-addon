#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
VERSION="$(python3 - <<'PY'
import json
from pathlib import Path
manifest = json.loads(Path("manifest.json").read_text())
print(manifest["version"])
PY
)"
ARCHIVE_NAME="n8n-sidebar-launcher-${VERSION}.zip"

mkdir -p "$DIST_DIR"
cd "$ROOT_DIR"
rm -f "$DIST_DIR/$ARCHIVE_NAME"

zip -r "$DIST_DIR/$ARCHIVE_NAME" \
  manifest.json \
  background.js \
  sidebar.html \
  sidebar.css \
  sidebar.js \
  options.html \
  options.css \
  options.js \
  assets

echo "Created $DIST_DIR/$ARCHIVE_NAME"
