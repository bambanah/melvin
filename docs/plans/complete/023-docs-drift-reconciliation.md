# Plan 023: Reconcile TRD/plan docs with shipped code

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- docs/trd/ docs/plans/ 013-architecture-deepening.md CONTEXT.md`
> If any in-scope file changed since this plan was written, re-verify each
> drift item below against the live docs before proceeding.

## Status

- **Status**: DONE
- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (docs only)
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

The TRD suite is the roadmap agents and the maintainer plan from. Several statuses and cross-references predate recently shipped work (plans 012, 016, 017 / ADR-0004), so the docs now claim undone work is pending, point at a file that moved, and instruct future implementers to "resolve" conflicts that are already resolved. Left alone, this causes re-planning of done work.

## Current state (each drift item, verified 2026-07-07)

1. `docs/trd/README.md` "Known conflicts to resolve during implementation" (lines ~42-45):
   - Says ADR-0003 "is superseded by TRD-006's sealing model — update the ADR when TRD-006 lands." **TRD-006 landed** as plan 017; `docs/adr/0003-modifiable-invoiced-trips.md` already carries `Status: Superseded by ADR-0004 …` and `docs/adr/0004-invoice-versions-freeze-rendered-output.md` exists (Accepted 2026-07-07). The bullet is stale.
   - Says `CONTEXT.md` "still mentions `groupTransitRatePerKm`". It no longer does (`grep -n groupTransitRatePerKm CONTEXT.md` → no matches). Stale. (The suggested glossary additions — Cancellation, NF2F, Due Bundle — remain un-added; keep that part as a live item or fold into TRD-005/007 notes.)
   - References `docs/plans/013-architecture-deepening.md` — the file actually sits at the **repo root** (`013-architecture-deepening.md`), and `docs/plans/README.md` lists 013 as `Rejected … (superseded by 005–008)`.
   - Says the stale catalogue JSON "is deleted by TRD-002" and mentions `price-guide-24-25.pdf` — fine to keep, but if plan 021 (catalogue refresh) has landed by the time you execute, the filename it cites changed to `ndis-support-catalogue.json`.
2. `docs/trd/trd-003-group-activities-and-apportionment.md:3` — `**Status**: Proposed`, but plan 016 shipped group activities up to 10 participants (commit `c850501`). Also its Depends-on mentions "reconciling the group-form WIP in the working tree" — no such WIP exists anymore.
3. `docs/trd/trd-001-capture-first-activity-entry.md:3` — `Status: Proposed`; plan 012 shipped the quick-entry form which TRD-001 itself acknowledges in its Problem section ("shipped, `multi-activity-form.tsx`"). Status should reflect partial delivery.
4. `docs/trd/trd-006-invoice-amendments.md` — check its status line; plan 017 + ADR-0004 delivered it. Should be marked Delivered (with pointers to plan 017 and ADR-0004).
5. Root-level `013-architecture-deepening.md` — misplaced. `docs/plans/README.md` treats 013 as a rejected plan; TRD README treats it as a live design reference for TRD-002/004.

## Commands you will need

| Purpose    | Command                                                                      | Expected on success                                              |
| ---------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Format     | `pnpm format:check`                                                          | exit 0 (run `pnpm format:write` on the changed docs if it fails) |
| Link check | `grep -rn "013-architecture-deepening" docs/ CLAUDE.md CONTEXT.md README.md` | every hit points at the file's final location                    |

## Scope

**In scope**:

- `docs/trd/README.md`
- `docs/trd/trd-001-capture-first-activity-entry.md`, `trd-003-group-activities-and-apportionment.md`, `trd-006-invoice-amendments.md` (status lines + stale cross-refs only)
- `013-architecture-deepening.md` (move to `docs/plans/013-architecture-deepening.md`)
- `docs/plans/README.md` (only if the 013 note needs its path updated)

**Out of scope**:

- Rewriting TRD content, adding the new glossary terms to `CONTEXT.md` (belongs with TRD-005/007 implementation), changing ADRs (already correct).
- TRD-002/004/005/007 status lines — still genuinely proposed; leave them.

## Git workflow

- Branch: `advisor/023-docs-drift`
- Commit: `docs: reconcile TRD statuses and references with shipped plans 012/016/017`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Move plan 013 into `docs/plans/`

`git mv 013-architecture-deepening.md docs/plans/013-architecture-deepening.md`. If the file lacks a status marker, add a one-line note at the top: `> Status: REJECTED as a standalone plan (superseded by plans 005–008); retained as a design reference for TRD-002/004 engine seams.`

**Verify**: `ls docs/plans/013-architecture-deepening.md` → exists; `ls 013-architecture-deepening.md` → gone.

### Step 2: Update `docs/trd/README.md`

In "Known conflicts": delete the ADR-0003 bullet (replace with a one-liner noting it was resolved by ADR-0004 / plan 017, so readers know it was considered); delete the `groupTransitRatePerKm` claim but keep the glossary-additions reminder; confirm the 013 link now resolves; update the catalogue filename if plan 021 landed. Also scan the TRD table rows for any "status" claims that contradict items 2–4 below and fix in the same pass.

**Verify**: `grep -n "groupTransitRatePerKm" docs/trd/README.md` → no matches; the 013 link matches the new path.

### Step 3: Update TRD status lines

- TRD-003: `**Status**: Partially delivered (plan 016 — group activities & apportionment shipped; rate-engine-dependent items remain) …` and remove the "group-form WIP in the working tree" dependency clause.
- TRD-001: `**Status**: Partially delivered (plan 012 — quick entry form shipped; capture-reliability goals remain)`.
- TRD-006: `**Status**: Delivered (plan 017, ADR-0004)`.

Keep each TRD's Priority/Depends/Blocks intact otherwise.

**Verify**: `grep -n "Status" docs/trd/trd-001*.md docs/trd/trd-003*.md docs/trd/trd-006*.md` → shows the updated lines.

### Step 4: Format

**Verify**: `pnpm format:check` → exit 0.

## Test plan

Docs-only; the greps above are the tests.

## Done criteria

- [x] `013-architecture-deepening.md` no longer at repo root; link from `docs/trd/README.md` resolves
- [x] `grep -rn "groupTransitRatePerKm" docs/ CONTEXT.md` → no matches in `CONTEXT.md` itself (historical mentions remain in completed plan docs and the TRD README's resolved-conflict note, which is expected)
- [x] TRD-001/003 marked partially delivered; TRD-006 marked delivered
- [x] `pnpm format:check` exits 0 (for in-scope files; two pre-existing unrelated warnings remain: `.claude/settings.local.json`, `.claude/skills/manage-plans/SKILL.md`)
- [x] No files outside the in-scope list modified (`git status`)
- [x] `docs/plans/README.md` status row updated

## STOP conditions

- A drift item's premise no longer holds when you check it (someone fixed it since 2026-07-07) — skip that item and note it, don't force a change.
- You find TRD-006 was only _partially_ delivered by plan 017 (compare its Design section against `invoice-router.ts` `send`/`amend` before writing "Delivered"; if anything material is missing, mark it partially delivered and list what remains).

## Maintenance notes

- The `manage-plans` skill owns plan lifecycle; future plan-completion commits should update TRD statuses in the same change to prevent this drift recurring. Suggest adding that as a step in the skill's completion checklist (out of scope here).
