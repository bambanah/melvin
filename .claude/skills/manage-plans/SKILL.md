---
name: manage-plans
description: Lifecycle management for plans and TRDs. Use to create, start, track, and complete implementation plans.
---

# Plan Lifecycle

```
idea/problem → [TRD if complex] → plan (TODO) → IN PROGRESS → DONE
```

## Commands

### `new [--from-trd TRD-NNN]`

Create a plan. Get next number from `ls docs/plans/ docs/plans/complete/`. Write to `docs/plans/NNN-title.md`.

**Minimal template** (bug fixes, small features):

```markdown
# Plan NNN: Title

**Status**: TODO | **Depends on**: — | **TRD**: —

## Why

One paragraph.

## Tasks

- [ ] Step 1
- [ ] Step 2

## Verification

How to confirm done.
```

**Add sections as complexity warrants, for example:**

- `## Current State` — code excerpts, file paths (when touching existing code)
- `## Scope` — in-scope files, out-of-scope (when boundaries matter)
- `## STOP Conditions` — when to halt and escalate (risky changes)
- `## Commands` — verification commands with expected output (unfamiliar areas)
- `## Drift Check` — git diff to detect upstream changes (long-lived plans)

Add row to `docs/plans/README.md` table.

### `trd`

Create TRD in `docs/trd/`. Get next number from existing files. Format: `trd-NNN-title.md`. Add to `docs/trd/README.md`.

### `start NNN`

1. Update plan header: `**Status**: IN PROGRESS`
2. Update README.md table row

### `task NNN`

Check off completed tasks in the plan's Tasks section. Report remaining.

### `done NNN`

1. Update header: `**Status**: DONE`
2. `git mv docs/plans/NNN-*.md docs/plans/complete/`
3. Update README.md row status

### `list`

Show table from `docs/plans/README.md` filtered to non-DONE.

## Rules

- Numbers are permanent and never reused (even for REJECTED plans)
- REJECTED/BLOCKED plans stay in `docs/plans/` (they're active signals)
- Only DONE plans move to `complete/`
- Plans cite TRDs by ID (`TRD-NNN`), TRDs cite plans by number
- When a citation path 404s, check `complete/` before failing

## When to create a TRD first

Create a TRD when:

- Multiple stakeholders need to agree on requirements
- The problem space needs exploration before implementation
- You're building toward a spec others will reference

Skip the TRD when:

- The fix is obvious (bug, security issue, small feature)
- You discovered it during implementation and just need to track the work
