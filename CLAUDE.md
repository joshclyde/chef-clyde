# Chef Clyde

A web app (`web/`, React + Vite) backed by a Node/TypeScript API (`server/`).

## Completing work — always open a PR

When you finish any task that involves code changes:

1. Create a new branch (never commit directly to `main`).
2. Commit your changes to that branch.
3. Push the branch and open a pull request against `main` using `gh pr create`.
4. Return the PR URL so the user can review the changes on GitHub.

This applies to every task — bug fixes, new features, refactors, config changes, etc. Do not consider a task done until the PR is open.

## Running dev servers

Always start long-running dev servers through the **preview system** (`preview_start`)
using the named configurations in [.claude/launch.json](.claude/launch.json) — **never**
start a server from a `Bash` call (e.g. `npm run dev &`). A detached Bash process is
untracked: it won't appear in the Preview dropdown or the tasks pane, so the user can't
stop it from the UI and it can be orphaned.

Available configs:

- **`web`** — the Vite web app (port 5173). Proxies `/api` → `http://localhost:3001`.
- **`api-mock`** — the API server with AI mocked (`npm run dev:mock`, port 3001). Start
  this whenever the web app needs live data (e.g. the Chores or Recipes pages); without
  it those pages show "Failed to load" states.

Start each config you need with its own `preview_start` call so both servers show up as
stoppable entries in the Preview dropdown.

## Reaching clones by name (parallel clones)

Every clone uses the same ports (`5173`/`3001`). To run several at once without
collisions, a single shared reverse proxy ([infra/proxy/](infra/proxy/)) routes
`http://<clone-directory-name>.localhost` to the right clone — dev-container clones are
auto-discovered via Traefik labels; the native production clone (gengar) has a static
route. Start it once with `bash infra/proxy/sync-and-up.sh` (it also creates the shared
`chef-clyde-net` Docker network that dev containers join). The proxy runs from
`~/chef-clyde-data/proxy/`, outside every clone; `infra/proxy/` is the template. See
[infra/proxy/README.md](infra/proxy/README.md) and [README.md](README.md).

## Environments & data

The database is a directory of JSON files; its location is the single env var
`DB_PATH` (validated in [server/src/index.ts](server/src/index.ts), used by every
module in [server/src/db/](server/src/db/)). One knob selects the environment:

| Mode | Who | `DB_PATH` |
|------|-----|-----------|
| **Production** | The one clone you run for yourself (native) | `~/chef-clyde-data/production` (outside every clone) |
| **Test (native)** | Any other clone | `<that-clone>/database` (git-ignored), seeded from fixtures |
| **Test (container)** | The dev container | `/workspace/database` (set in devcontainer.json), seeded on create |

Production data lives **outside all clones**, so any number of clones develop in
parallel without collisions, and the dev container never touches it. `node
--env-file` does **not** expand `~`/variables — every path in a `.env` must be
absolute. See [README.md](README.md) for first-time setup and the one-time
production relocation.

Data scripts (run from `server/`):

- `npm run db:seed` — copy committed fixtures (`server/fixtures/`) into `DB_PATH`,
  skipping existing files (`-- --force` to overwrite). Refuses to run against the
  production directory.
- `npm run db:backup` — copy `DB_PATH` into a timestamped folder under
  `~/chef-clyde-data/backups/`. Run it from the production environment.

## Scripting

Project scripts are written in **TypeScript** (in [server/src/scripts/](server/src/scripts/),
run via `node -r ts-node/register`), not shell scripts. The bash files under
[.devcontainer/](.devcontainer/) (`setup.sh`, `init-firewall.sh`) are the exception —
they are container provisioning, not application scripts.

## Running in the dev container

This repo ships a hardened dev container ([.devcontainer/](.devcontainer/)) for running
Claude in an isolated, auto-accept-friendly environment. It runs Claude as a non-root
user inside Docker behind a default-deny egress firewall
([init-firewall.sh](.devcontainer/init-firewall.sh) allowlists only Anthropic, GitHub,
and npm; it also opens inbound `5173` so the shared proxy can reach the web server).
The container does **not** forward host ports — it joins the `chef-clyde-net` network
and is reached by name through the shared proxy (see "Reaching clones by name" above),
so **start the proxy before opening the container** and open
`http://<clone-name>.localhost` in the host browser. The preview workflow for starting
the servers themselves is unchanged.

Git is wired for normal work but **cannot push to `main`**, by design:

- A repo-scoped fine-grained PAT (host env `CHEF_CLYDE_GH_TOKEN` → container `GH_TOKEN`)
  authenticates pushes/PRs over HTTPS. The host's SSH keys are **never** mounted.
- The [pre-push hook](.devcontainer/git-hooks/pre-push) rejects pushes to `main`
  locally; a GitHub branch-protection ruleset on `main` enforces it server-side.

So Claude should branch, commit, push the branch, and open a PR — never push to `main`.
