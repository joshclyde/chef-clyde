---
id: CC-1
title: Add global error-handling middleware
type: story
epic: CC-EPIC-1
status: todo
priority: P1
created: 2026-06-23
updated: 2026-06-23
depends_on: []
branch: null
pr: null
---

# CC-1 — Add global error-handling middleware

## Context

Every route handler currently does its own `try/catch` and `res.status(500).json(...)`,
and uncaught async errors fall through to Express's default handler, which returns an
HTML error page with no JSON body. This is inconsistent for clients and easy to forget in
new handlers. A single global error handler gives every route a uniform JSON error shape
and a guaranteed catch-all.

## Acceptance Criteria

- [ ] An error-handling middleware `(err, req, res, next)` is registered in
      `server/src/index.ts` **after** all route mounts.
- [ ] Unhandled errors return a consistent JSON body (e.g. `{ error: string }`) with an
      appropriate status code (default 500).
- [ ] The error is logged server-side (`console.error`) with enough detail to debug.
- [ ] At least one route is updated to `next(err)` / throw instead of an inline 500 to
      demonstrate the pattern.

## Implementation Notes

- Add the handler at the bottom of [server/src/index.ts](../../../server/src/index.ts),
  after the `app.use("/api/...")` mounts and before/around `app.listen`.
- Express 5 forwards rejected promises from async handlers to the error middleware
  automatically, so existing `async` routes benefit without rewrites.
- Keep the shape aligned with whatever CC-6 standardizes (coordinate if CC-6 lands first).

## Verification

- `npm run dev` (in `server/`) boots clean.
- Hitting a route that throws returns the JSON error body, not an HTML page.
- `npm run lint` and `npm run build` pass.

## Activity Log

- 2026-06-23 — created (seeded from server architecture review)
