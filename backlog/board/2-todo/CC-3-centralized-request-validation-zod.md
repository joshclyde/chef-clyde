---
id: CC-3
title: Centralize request validation with Zod
type: story
epic: CC-EPIC-1
status: todo
priority: P2
created: 2026-06-23
updated: 2026-06-23
depends_on: []
branch: null
pr: null
---

# CC-3 — Centralize request validation with Zod

## Context

Request validation is scattered and hand-rolled across the route files — each handler
manually checks `typeof content !== "string"`, `Array.isArray(messages)`, date/time
patterns, etc. The logic is duplicated, inconsistent, and untyped after the check. Adopting
Zod gives a single source of truth per endpoint, typed `req.body`, and a foundation for
auto-generated OpenAPI docs (CC-4).

## Acceptance Criteria

- [ ] `zod` is added to `server/` dependencies.
- [ ] A reusable `validate(schema)` middleware parses `req.body` and forwards failures via
      `next(err)` (pairs with the CC-1 error handler) returning a 400 with field details.
- [ ] At least the `recipes` routes are migrated to Zod schemas as the reference pattern,
      with the remaining routes listed as follow-up (or migrated in the same PR).
- [ ] Handlers consume the typed, parsed body — no more inline `typeof` checks for
      migrated routes.

## Implementation Notes

- Reference the existing hand-rolled checks in
  [server/src/routes/recipes.ts](../../../server/src/routes/recipes.ts) (e.g. the `content`
  and `messages` guards) as the first schemas to replace.
- Co-locate schemas with their routes, or add `server/src/schemas/` — pick one and be
  consistent; CC-4 will import these schemas.
- Make the middleware generic over the Zod type so the parsed body is typed downstream.

## Verification

- Posting an invalid body returns a 400 with a structured error (via CC-1's handler).
- Posting a valid body still succeeds for all migrated routes.
- `npm run lint` and `npm run build` pass.

## Activity Log

- 2026-06-23 — created (seeded from server architecture review)
