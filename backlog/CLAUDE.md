# Backlog — AI-Driven Jira Workflow

This directory is **Chef Clyde's backlog**: a lightweight, file-based issue tracker
designed for Claude to operate. It models a Kanban board as a set of folders, where each
work item is a markdown file ("card") that moves between columns as work progresses.

**You (Claude) are the primary operator of this board.** When the user asks you to work
on the backlog — pick up an item, create one, check status — follow the workflow below
exactly. Treat this file as the source of truth for *how* the board works.

## Layout

```
backlog/
├── CLAUDE.md            ← this file (the workflow)
├── README.md           ← human-facing overview
├── templates/
│   ├── item.md         ← copy this to create a new story/task/bug
│   └── epic.md         ← copy this to create a new epic
├── epics/              ← epics (long-lived groupings; they do not move across columns)
└── board/              ← the Kanban board; items live in exactly ONE column
    ├── 1-backlog/      ← captured, not yet refined or scheduled
    ├── 2-todo/         ← refined and ready to be picked up
    ├── 3-in-progress/  ← actively being worked on a feature branch (WIP)
    └── 4-done/         ← merged to main
```

There is intentionally **no Review column**: an item awaiting merge is simply an open PR.
The PR that completes an item moves the card into `4-done/` itself (see step 4 below), so
merging on GitHub lands the code and the Done card together. GitHub's open-PR list is your
review queue.

An item's **status is its location**: the column folder it sits in. Moving a card =
`git mv`-ing the file from one column folder to the next. Keep the `status:` frontmatter
field in sync with the folder name as a redundant, greppable label.

## Item identity & frontmatter

Every item file is named `CC-<number>-<kebab-title>.md`. Epics use `CC-EPIC-<number>-...`.
`CC` = Chef Clyde. The number is a monotonic counter — never reused, even after deletion.

Required frontmatter:

```yaml
---
id: CC-7                       # unique, immutable
title: Add OpenAPI docs        # short imperative summary
type: story                    # story | task | bug | chore
epic: CC-EPIC-1                # parent epic id, or null
status: todo                   # backlog | todo | in-progress | done
priority: P2                   # P1 (highest) … P4 (lowest)
created: 2026-06-23            # YYYY-MM-DD
updated: 2026-06-23            # YYYY-MM-DD, bump on every transition
depends_on: [CC-3]             # ids that must be done first, or []
branch: null                   # feature branch name, set when work starts
pr: null                       # PR URL, set when the PR is opened
---
```

The body follows the `templates/item.md` structure (Context, Acceptance Criteria,
Implementation Notes, Activity Log).

## The workflow

### 1. Finding the next item to work on

When asked to "work the backlog" or "pick up the next item":

1. Look in `board/2-todo/`. Choose the highest-priority item (P1 before P4) whose
   `depends_on` items are all already in `board/4-done/`. Break ties by lowest id.
2. If `2-todo/` is empty, tell the user the board is clear and ask whether to refine
   something from `1-backlog/`.
3. Never silently pick a `1-backlog/` item — those are unrefined. Refine first (move to
   `2-todo/` with filled-in acceptance criteria) only if the user confirms.

### 2. Creating a new item

1. Copy `templates/item.md` (or `templates/epic.md`).
2. Assign the next free `CC-<n>` by scanning every existing id across the whole
   `backlog/` tree and adding 1 to the max.
3. Fill in all frontmatter and the Context + Acceptance Criteria sections.
4. Place it in `board/1-backlog/` (unrefined) or `board/2-todo/` (ready) as appropriate.
5. Add the first Activity Log entry: `YYYY-MM-DD — created`.

### 3. Starting work on an item

1. Create the feature branch for the code change **first** and record it in `branch:` —
   use a name like `cc-7-openapi-docs`. Every move below happens on that branch, so the
   card travels with the work (the board on `main` only changes when a PR merges).
2. `git mv` the card from `board/2-todo/` → `board/3-in-progress/`, set
   `status: in-progress`, bump `updated:`, and append an Activity Log line.
3. Enforce the WIP limit: normally **at most one** item is in progress at a time. If a
   branch is already mid-flight, finish or park it first.

### 4. Completing an item

The PR carries the card to Done in the **same branch** — opening the PR *is* the
completion step, and merging it publishes Done to `main`:

1. On the feature branch, `git mv` the card from `board/3-in-progress/` → `board/4-done/`,
   set `status: done`, bump `updated:`, tick the item's checkbox in its epic, and append
   an Activity Log entry.
2. Commit **both** the code change and the card move together, push, and open a PR **per
   the repo-root [CLAUDE.md](../CLAUDE.md) rules** (branch → commit → push →
   `gh pr create`). Record the PR URL in `pr:`. The backlog never replaces that PR
   workflow; it rides on top of it.
3. That's the end of the board work. Merging the PR on GitHub lands the code **and** the
   Done card on `main` in one action — there is **no post-merge board step**.

Notes:

- **"In review" is not a board column — it's an open PR.** The awaiting-merge queue is
  GitHub's open-PR list, not a folder.
- Marking the card done before the merge is safe: if the PR is closed without merging, the
  branch is discarded and `main`'s board is untouched, so the optimistic "done" never
  leaks.
- "Done" therefore means exactly **merged to `main`**.

### 5. Updating an epic

When an item under an epic changes column, update the epic's checklist (in
`epics/CC-EPIC-<n>-*.md`) so the child item's checkbox reflects its current state.

## Rules of thumb

- **One column per item.** A card is never in two folders. Use `git mv`, not copy.
- **Keep `status:` and folder in sync.** They are redundant on purpose — the folder is
  authoritative; the field makes the board greppable.
- **Always log activity.** Every transition appends a dated line to the item's Activity
  Log so the history is auditable from the file alone.
- **Respect dependencies.** Do not start an item whose `depends_on` is unmet.
- **Done means merged.** A card reaches `4-done/` inside the PR that completes it; merging
  that PR is what publishes Done to `main`. There is no separate post-merge step.
- **Defer to the repo PR workflow** for anything that touches code. This board tracks
  *what* and *why*; the PR delivers the *how*.
