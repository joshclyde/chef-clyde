---
id: CC-7
title: Add request-id correlation middleware
type: task
epic: CC-EPIC-1
status: backlog
priority: P4
created: 2026-06-23
updated: 2026-06-23
depends_on: []
branch: null
pr: null
---

# CC-7 — Add request-id correlation middleware

## Context

There's no request tracing today, so logs from a single request can't be correlated —
which makes debugging AI-heavy flows (chat, schedule generation) harder. Attaching a unique
id to each request and including it in logs (and optionally the response) gives traceable,
correlatable logs.

## Acceptance Criteria

- [ ] Middleware assigns a UUID per request (honoring an inbound `X-Request-Id` if present).
- [ ] The id is attached to the request and included in server logs for that request.
- [ ] Optional: echo the id back as a response header.

## Implementation Notes

- Register early in [server/src/index.ts](../../../server/src/index.ts), before route mounts.
- `crypto.randomUUID()` is already used elsewhere (e.g. recipes route) — reuse it; no new
  dependency needed.

## Verification

- Logs for a request show its id; an inbound `X-Request-Id` is preserved.
- `npm run lint` and `npm run build` pass.

## Activity Log

- 2026-06-23 — created (seeded from server architecture review)
