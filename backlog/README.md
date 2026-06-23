# Backlog

A lightweight, file-based issue tracker for Chef Clyde — a Kanban board modeled as
folders, designed to be operated by Claude. Each work item is a markdown file ("card")
that moves across columns as it progresses.

This README is the human-facing overview. The operating rules Claude follows live in
[CLAUDE.md](CLAUDE.md).

## The board

| Column | Folder | Meaning |
|--------|--------|---------|
| Backlog | `board/1-backlog/` | Captured, not yet refined or scheduled |
| To Do | `board/2-todo/` | Refined and ready to pick up |
| In Progress | `board/3-in-progress/` | Actively being worked (PR not yet open) |
| Review | `board/4-review/` | Implementation done, PR open, awaiting merge |
| Done | `board/5-done/` | Merged and verified |

An item's status **is** the folder it lives in. Moving a card means `git mv`-ing the
file to the next column. Epics live in `epics/` and don't move — they group related
items and track their collective progress.

## Working the board

Ask Claude to:

- **"Create a backlog item for X"** — Claude copies [templates/item.md](templates/item.md),
  assigns the next `CC-<n>` id, and files it under Backlog or To Do.
- **"Work the next backlog item"** — Claude picks the highest-priority, unblocked card
  in To Do, moves it to In Progress, and implements it on a feature branch.
- **"What's on the board?"** — Claude summarizes each column.

Every code change still goes through the standard branch → commit → push → PR flow
defined in the repo-root [CLAUDE.md](../CLAUDE.md). The backlog tracks *what* and *why*;
the pull request delivers the *how*.

## Conventions

- **IDs:** `CC-<n>` for items, `CC-EPIC-<n>` for epics. Monotonic, never reused.
- **Priority:** `P1` (highest) through `P4` (lowest).
- **Dependencies:** an item lists blockers in `depends_on`; it can't start until those
  are Done.
- **History:** each card carries its own dated Activity Log, so its full story is
  readable from the file alone.

## Current contents

The board is seeded with the **Server Architecture Improvements** epic
([CC-EPIC-1](epics/CC-EPIC-1-server-architecture-improvements.md)) and its child items,
derived from the server architecture review.
