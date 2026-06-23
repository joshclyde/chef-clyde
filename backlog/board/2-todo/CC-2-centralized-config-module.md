---
id: CC-2
title: Centralize configuration in a validated config module
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

# CC-2 — Centralize configuration in a validated config module

## Context

Environment variables are read ad-hoc throughout the codebase (`process.env.DB_PATH`,
`process.env.MOCK_AI`, `process.env.INSTANCE_NAME`, `process.env.PORT`). There's no single
place that documents which vars exist or validates them, and only `DB_PATH` is checked at
startup. A central config module surfaces every knob in one typed object and fails fast at
boot if something required is missing.

## Acceptance Criteria

- [ ] A new `server/src/config.ts` reads, validates, and exports all env vars as a typed
      object.
- [ ] Missing required vars (e.g. `DB_PATH`) throw at startup with a clear message.
- [ ] Call sites stop reading `process.env.*` directly and import from `config` instead.
- [ ] Optional vars have documented defaults (`PORT` → 3001, `MOCK_AI` → false, etc.).

## Implementation Notes

- Move the existing `DB_PATH` guard out of [server/src/index.ts](../../../server/src/index.ts)
  into `config.ts`; import config first so validation runs at boot.
- Known call sites to migrate: `index.ts`, `server/src/services/chat.ts`,
  `server/src/services/schedule.ts`, and the DB modules under `server/src/db/`.
- Keep it dependency-free (plain TS) unless Zod is already added by CC-3, in which case a
  small Zod schema for env is a nice option.

## Verification

- `npm run dev` and `npm run dev:mock` both boot; unset `DB_PATH` produces a clear error.
- `grep -rn "process.env" server/src` shows only `config.ts` reading env.
- `npm run lint` and `npm run build` pass.

## Activity Log

- 2026-06-23 — created (seeded from server architecture review)
