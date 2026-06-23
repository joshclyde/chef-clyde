---
id: CC-EPIC-1
title: Server Architecture Improvements
type: epic
status: open
created: 2026-06-23
updated: 2026-06-23
---

# CC-EPIC-1 — Server Architecture Improvements

## Goal

Harden and modernize the `server/` Express + TypeScript API based on an architecture
review. Today the server works but has no global error handling, scattered ad-hoc request
validation, ad-hoc env-var access, blocking synchronous file I/O, inconsistent response
shapes, and no API documentation. This epic groups the incremental work to address those
gaps and add living, generated OpenAPI docs.

## Scope / Child Items

Checkbox reflects each child item's board state (checked once it reaches Done):

- [ ] CC-1 — Add global error-handling middleware *(P1)*
- [ ] CC-2 — Centralize configuration in a validated config module *(P2)*
- [ ] CC-3 — Centralize request validation with Zod *(P2)*
- [ ] CC-4 — Generate OpenAPI docs from Zod schemas *(P2, depends on CC-3)*
- [ ] CC-5 — Convert DB file I/O from sync to async *(P3)*
- [ ] CC-6 — Standardize API response envelopes *(P3)*
- [ ] CC-7 — Add request-id correlation middleware *(P4)*
- [ ] CC-8 — Add pagination to list endpoints *(P4)*
- [ ] CC-9 — Reorganize server into feature folders *(P4)*

## Notes

Recommended sequencing: **CC-1 → CC-2 → CC-3 → CC-4** first — these are independent,
high-value wins (CC-1 and CC-2 are quick; CC-3 and CC-4 share the Zod schemas and are the
biggest DX improvement). CC-5/CC-6 are quality follow-ups. CC-7/CC-8/CC-9 are
nice-to-haves and can stay in Backlog until prioritized.

Source of this epic: the server architecture review captured in the original planning
session. The full reasoning lives in the individual item Context sections.
