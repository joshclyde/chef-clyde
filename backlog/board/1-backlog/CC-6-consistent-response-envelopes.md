---
id: CC-6
title: Standardize API response envelopes
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

# CC-6 — Standardize API response envelopes

## Context

Response shapes are inconsistent across endpoints: some return `{ recipe, usage }`, others
`{ recipes }`, others `{ success: true }`, others bare objects. This makes the client
handle each endpoint specially and complicates generated docs. A single convention for
success and error envelopes makes the API predictable and improves the OpenAPI output from
CC-4.

## Acceptance Criteria

- [ ] A documented convention is chosen (e.g. `{ data, usage? }` for success,
      `{ error: string }` for failure) and written down (in this item or the server README).
- [ ] Endpoints are migrated to the convention, or a deliberate, documented exception list
      is kept.
- [ ] The web client is updated to match any changed shapes.

## Implementation Notes

- Coordinate with CC-1 (error shape) and CC-4 (docs) so the envelope is consistent across
  validation errors, thrown errors, and success bodies.
- This touches the `web/` client too — grep for the response fields the UI reads before
  changing shapes.

## Verification

- Affected pages in `web/` still load and render correctly.
- `npm run lint` and `npm run build` pass in both `server/` and `web/`.

## Activity Log

- 2026-06-23 — created (seeded from server architecture review)
