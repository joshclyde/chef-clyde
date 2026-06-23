---
id: CC-9
title: Reorganize server into feature folders
type: chore
epic: CC-EPIC-1
status: backlog
priority: P4
created: 2026-06-23
updated: 2026-06-23
depends_on: []
branch: null
pr: null
---

# CC-9 — Reorganize server into feature folders

## Context

The server is organized by technical layer (`routes/`, `db/`, `services/`, `types/`), so
the code for one feature (e.g. recipes) is spread across four directories. Co-locating each
feature's route, persistence, types, and service under a `features/<name>/` folder improves
discoverability and makes each feature easier to reason about and change in isolation.

## Acceptance Criteria

- [ ] A feature-folder structure is agreed (e.g. `server/src/features/recipes/` containing
      its route, db, types, and service files).
- [ ] At least one feature (recipes) is migrated as the reference; remaining features listed
      as follow-up.
- [ ] Imports are updated; the app builds and runs unchanged.

## Implementation Notes

- This is a pure refactor (no behavior change) — best done **after** the higher-value items
  land to avoid churn/merge conflicts with CC-1…CC-6.
- Candidate first feature: recipes — `routes/recipes.ts`, `db/recipes.ts`,
  `types/recipe.ts`, `services/recipeExtractor.ts`.

## Verification

- `npm run dev` boots and all recipe endpoints behave identically.
- `npm run lint` and `npm run build` pass.

## Activity Log

- 2026-06-23 — created (seeded from server architecture review)
