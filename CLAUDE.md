# Chef Clyde

A web app (`web/`, React + Vite) backed by a Node/TypeScript API (`server/`).

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

## Running in the dev container

This repo ships a hardened dev container ([.devcontainer/](.devcontainer/)) for running
Claude in an isolated, auto-accept-friendly environment. It runs Claude as a non-root
user inside Docker behind a default-deny egress firewall
([init-firewall.sh](.devcontainer/init-firewall.sh) allowlists only Anthropic, GitHub,
and npm). Ports **5173** and **3001** are forwarded, so the preview workflow above is
unchanged — open `localhost:5173` in the host browser as usual.

Git is wired for normal work but **cannot push to `main`**, by design:

- A repo-scoped fine-grained PAT (host env `CHEF_CLYDE_GH_TOKEN` → container `GH_TOKEN`)
  authenticates pushes/PRs over HTTPS. The host's SSH keys are **never** mounted.
- The [pre-push hook](.devcontainer/git-hooks/pre-push) rejects pushes to `main`
  locally; a GitHub branch-protection ruleset on `main` enforces it server-side.

So Claude should branch, commit, push the branch, and open a PR — never push to `main`.
