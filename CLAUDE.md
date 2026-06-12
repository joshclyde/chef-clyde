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
