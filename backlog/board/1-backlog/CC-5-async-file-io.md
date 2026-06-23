---
id: CC-5
title: Convert DB file I/O from sync to async
type: story
epic: CC-EPIC-1
status: backlog
priority: P3
created: 2026-06-23
updated: 2026-06-23
depends_on: []
branch: null
pr: null
---

# CC-5 — Convert DB file I/O from sync to async

## Context

All DB reads/writes use `fs.readFileSync` / `fs.writeFileSync`, which block the Node event
loop on every request. That's tolerable for a single user but stalls under any concurrency.
The route handlers are already `async`, so migrating the DB layer to `fs/promises` is
largely mechanical and removes the blocking bottleneck.

## Acceptance Criteria

- [ ] DB modules use `fs/promises` (`async`/`await`) instead of `*Sync` calls.
- [ ] Callers `await` the DB functions; no behavior change for clients.
- [ ] Optional: note whether write contention needs file locking (e.g. `proper-lockfile`)
      and defer to a follow-up if not needed for single-user use.

## Implementation Notes

- Affected modules: `server/src/db/recipes.ts`, `schedules.ts`, `scheduleItems.ts`,
  `scheduleInstructions.ts`.
- Directory-ensure helpers (e.g. `getRecipesDir`) and soft-delete `renameSync` calls also
  move to async equivalents.

## Verification

- All existing endpoints behave identically (manual smoke test of recipes + schedules).
- `npm run lint` and `npm run build` pass.

## Activity Log

- 2026-06-23 — created (seeded from server architecture review)
