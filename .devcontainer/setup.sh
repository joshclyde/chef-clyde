#!/usr/bin/env bash
# Runs once after the dev container is created (postCreateCommand).
# Installs dependencies and wires the container-only git guardrails.
set -euo pipefail

echo "==> Installing dependencies"
(cd /workspace/web && npm install)
(cd /workspace/server && npm install)

# Seed the container's test database from committed fixtures so data-backed pages
# work immediately. The container never sees production (DB_PATH=/workspace/database
# from containerEnv); we invoke the script directly rather than via `npm run db:seed`
# so it doesn't depend on a server/.env file existing yet. Idempotent: existing
# files are skipped.
echo "==> Seeding test database from fixtures"
(cd /workspace/server && DB_PATH="${DB_PATH:-/workspace/database}" TS_NODE_FILES=true node -r ts-node/register src/scripts/db-seed.ts)

echo "==> Configuring git (container-global only; does not touch the host repo config)"
# Trust the bind-mounted workspace regardless of UID mismatch.
git config --global --add safe.directory /workspace

# Activate the repo's tracked pre-push hook (blocks pushes to `main`).
# Set globally so it applies in this container without rewriting the
# bind-mounted .git/config that is shared with the host.
git config --global core.hooksPath /workspace/.devcontainer/git-hooks

# Route GitHub access through the repo-scoped token (set on the host as
# CHEF_CLYDE_GH_TOKEN -> exposed here as GH_TOKEN). insteadOf rewrites both
# the SSH and HTTPS remote forms to authenticated HTTPS, so `git push` works
# without mounting the host's SSH keys. gh picks up GH_TOKEN automatically.
if [ -n "${GH_TOKEN:-}" ]; then
  git config --global url."https://x-access-token:${GH_TOKEN}@github.com/".insteadOf "git@github.com:"
  git config --global url."https://x-access-token:${GH_TOKEN}@github.com/".insteadOf "https://github.com/"
  echo "==> GitHub token wired (repo-scoped)."
else
  echo "ERROR: GH_TOKEN is empty. Set CHEF_CLYDE_GH_TOKEN on the host and rebuild the container." >&2
  exit 1
fi

echo "==> Dev container setup complete."
