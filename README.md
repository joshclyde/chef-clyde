# chef-clyde

A web app (`web/`, React + Vite) backed by a Node/TypeScript API (`server/`). Data
is stored as JSON files in a directory pointed at by the `DB_PATH` env var.

## Environments

There is one production dataset and any number of disposable test datasets,
selected by `DB_PATH`:

| Mode | `DB_PATH` | Data |
|------|-----------|------|
| **Production** | `~/chef-clyde-data/production` (outside every clone) | Your real data, backed up |
| **Test** | `<this-clone>/database` (git-ignored) | Seeded from `server/fixtures/` |

Keeping production **outside** any clone is what unblocks parallel development:
every clone reads its own `server/.env`, so multiple clones (and the dev container)
can run against independent test data while the single production clone is untouched.

> `node --env-file` does **not** expand `~` or variables — use absolute paths in `.env`.

## Local setup (per clone)

```bash
cd server
cp .env.example .env        # then edit it
npm install
npm run db:seed             # populate this clone's test database from fixtures
```

Set `DB_PATH` in `server/.env` to an absolute path inside the clone, e.g.
`/Users/you/repos/chef-clyde-2/database`. Then run the dev servers (see
[CLAUDE.md](CLAUDE.md) for the preview workflow, or `npm run dev:mock` in `server/`
and `npm run dev` in `web/`).

## One-time production relocation

Production data originally lived inside a single clone. Move it out once so every
clone can coexist and backups read a stable path:

```bash
mkdir -p ~/chef-clyde-data/production
cp -R /Users/joshclyde/repos/chef-clyde/database/* ~/chef-clyde-data/production/
```

Then, in the clone you run for yourself, set in `server/.env`:

```
DB_PATH=/Users/joshclyde/chef-clyde-data/production
```

Verify the app loads against the new location, then delete the old in-clone
`database/*` data. Every other clone keeps `DB_PATH=<clone>/database` + `db:seed`.

## Data scripts (run from `server/`)

- **Seed a test DB:** `npm run db:seed` — copies `server/fixtures/` into `DB_PATH`,
  skipping files that already exist. `npm run db:seed -- --force` overwrites them
  (clean reset); `npm run db:seed -- /path/to/db` targets an explicit directory.
  It **refuses** to run against the production directory.
- **Back up production:** `npm run db:backup` — copies `DB_PATH` into
  `~/chef-clyde-data/backups/<UTC-timestamp>/`. Run it from the production
  environment. `BACKUP_DIR=/path npm run db:backup` changes the destination. This
  replaces the manual daily copy and can be wired to a launchd/cron job.

## Dev container

The dev container ([.devcontainer/](.devcontainer/)) sets `DB_PATH=/workspace/database`
and seeds it from fixtures on create — it never sees production. See
[CLAUDE.md](CLAUDE.md) for the container and git workflow details.
