#!/usr/bin/env bash
# Builds the frontend, embeds it into the Go backend, and produces a single
# self-contained `webconsole` binary that serves the API, static ROM/cover/save
# assets and the SPA from one origin.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
EMBED_DIR="$ROOT/backend/internal/web/dist"

echo "==> Building frontend"
cd "$ROOT/frontend"
if [ -f package-lock.json ]; then npm ci; else npm install; fi
npm run build

echo "==> Embedding frontend into backend ($EMBED_DIR)"
rm -rf "$EMBED_DIR"
mkdir -p "$EMBED_DIR"
cp -r "$ROOT/frontend/dist/." "$EMBED_DIR/"

echo "==> Building backend single binary"
cd "$ROOT/backend"
go build -o webconsole ./cmd/webconsole

echo "==> Done: backend/webconsole"
