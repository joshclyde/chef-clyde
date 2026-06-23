---
id: CC-8
title: Add pagination to list endpoints
type: story
epic: CC-EPIC-1
status: backlog
priority: P4
created: 2026-06-23
updated: 2026-06-23
depends_on: []
branch: null
pr: null
---

# CC-8 — Add pagination to list endpoints

## Context

`GET /api/recipes` and `GET /api/schedule-items` read every record into memory and return
them all. That's fine for small datasets but won't scale as data grows. Adding pagination
bounds the response size and memory use.

## Acceptance Criteria

- [ ] List endpoints accept pagination params (e.g. `limit` + `offset` or cursor).
- [ ] Responses include enough metadata to fetch the next page (total or next cursor).
- [ ] Default and maximum page sizes are enforced.
- [ ] The `web/` client consumes the paginated shape.

## Implementation Notes

- Affected routes: `server/src/routes/recipes.ts`, `server/src/routes/scheduleItems.ts`.
- Best done after CC-6 so pagination metadata fits the standard envelope, and validated via
  CC-3's Zod query schemas.

## Verification

- Listing with `limit`/`offset` returns the correct page and metadata.
- Affected `web/` pages still render the lists correctly.
- `npm run lint` and `npm run build` pass.

## Activity Log

- 2026-06-23 — created (seeded from server architecture review)
