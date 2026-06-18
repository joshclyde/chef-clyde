#!/usr/bin/env bash
# Deploy and (re)start the shared Chef Clyde reverse proxy.
#
# The proxy is host-level infrastructure shared by every clone, so it lives
# OUTSIDE all clones at ~/chef-clyde-data/proxy/ (mirroring how production data
# lives outside clones). This script copies the template here into that location
# and starts it. Editing infra/proxy/ in a clone does nothing until you run this.
#
# Run it once before opening dev containers (it creates the shared network they
# join), and again whenever you intend to redeploy the proxy config.
set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="${CHEF_CLYDE_PROXY_DIR:-$HOME/chef-clyde-data/proxy}"
NETWORK="chef-clyde-net"

echo "==> Syncing proxy template -> $DEST_DIR"
mkdir -p "$DEST_DIR"
# Copy the proxy files (compose, static config, dynamic routes). -R keeps the
# dynamic/ subdir. We deliberately overwrite so the deployed copy matches the
# template you just synced.
cp -R "$SRC_DIR/docker-compose.yml" "$SRC_DIR/traefik.yml" "$SRC_DIR/dynamic" "$DEST_DIR/"

echo "==> Ensuring shared network '$NETWORK' exists"
docker network create "$NETWORK" 2>/dev/null || true

echo "==> Starting proxy"
(cd "$DEST_DIR" && docker compose up -d)

echo "==> Proxy up. Open clones at http://<clone-name>.localhost (dashboard: http://localhost:8080)."
