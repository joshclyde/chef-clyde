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
    ├── 3-in-progress/  ← actively being worked (the WIP column)
    ├── 4-review/       ← implementation done, PR open, awaiting review/merge
    └── 5-done/         ← merged and verified
```

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
status: todo                   # backlog | todo | in-progress | review | done
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
   `depends_on` items are all already in `board/5-done/`. Break ties by lowest id.
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

1. `git mv` the file from `board/2-todo/` → `board/3-in-progress/`.
2. Set `status: in-progress`, bump `updated:`, and append an Activity Log line.
3. Create the feature branch for the actual code change and record it in `branch:`.
   Use a name like `cc-7-openapi-docs`.
4. Enforce WIP limit: there should normally be **at most one** item in
   `board/3-in-progress/`. If one is already there, finish or park it first.

### 4. Completing an item

When the implementation is done:

1. Commit the code changes, push the branch, and open a PR **per the repo-root
   [CLAUDE.md](../CLAUDE.md) rules** (branch → commit → push → `gh pr create`). The
   backlog never replaces that PR workflow; it sits on top of it.
2. Record the PR URL in `pr:` and `git mv` the file to `board/4-review/` with
   `status: review`.
3. Append an Activity Log entry noting the PR.
4. Only after the PR is merged **and** the change is verified does the item move to
   `board/5-done/` with `status: done`. If you cannot confirm the merge, leave it in
   `4-review/` and tell the user it's awaiting merge.

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
- **Defer to the repo PR workflow** for anything that touches code. This board tracks
  *what* and *why*; the PR delivers the *how*.
