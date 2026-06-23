---
id: CC-4
title: Generate OpenAPI docs from Zod schemas
type: story
epic: CC-EPIC-1
status: todo
priority: P2
created: 2026-06-23
updated: 2026-06-23
depends_on: [CC-3]
branch: null
pr: null
---

# CC-4 — Generate OpenAPI docs from Zod schemas

## Context

The API has no documentation today. Of the surveyed approaches —
`swagger-jsdoc` (comment-based, drifts from code), `tsoa` (decorator rewrite of all
routes), spec-first `express-openapi-validator` (hand-maintained spec) — generating the
OpenAPI spec **from the Zod schemas** added in CC-3 is the best fit: one definition drives
both runtime validation and living docs, with minimal restructuring.

## Acceptance Criteria

- [ ] `@asteasolutions/zod-to-openapi` (or equivalent) and `swagger-ui-express` are added.
- [ ] The Zod request/response schemas register into an OpenAPI document generated at
      startup.
- [ ] Swagger UI is served at `/api/docs` and lists the documented endpoints.
- [ ] The raw spec is available as JSON (e.g. `/api/openapi.json`).
- [ ] Docs stay in sync because they derive from the same schemas used for validation.

## Implementation Notes

- Build on CC-3's schemas — extend them with `.openapi(...)` metadata rather than defining
  shapes twice.
- Mount the docs router in [server/src/index.ts](../../../server/src/index.ts) alongside
  the existing `/api/*` mounts.
- Start with the `recipes` endpoints (the CC-3 reference) and expand coverage as more
  routes adopt Zod.

## Verification

- `npm run dev`, open `/api/docs` — Swagger UI renders the documented endpoints.
- `/api/openapi.json` returns a valid OpenAPI document.
- `npm run lint` and `npm run build` pass.

## Activity Log

- 2026-06-23 — created (seeded from server architecture review); blocked on CC-3
