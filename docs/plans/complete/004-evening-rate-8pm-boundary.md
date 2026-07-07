# Plan 004: Start the weeknight (evening) rate at 8pm, not 7pm

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c48e1dd..HEAD -- src/lib/activity-utils.ts src/lib/activity-utils.test.ts`
> If either file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c48e1dd`, 2026-07-02

## Why this matters

`getRateForActivity` switches a weekday activity to the higher weeknight rate when it ends at or after **19:00**, but the NDIS evening rate begins at **8pm (20:00)** — which is also what the code's own comments say ("after 8pm", "Weekday before 8pm") and what the unit tests assert (they only test 20:00 and 20:10). Any weekday activity ending between 19:00 and 19:59 is billed at the weeknight rate: systematic over-billing on real invoices. This function feeds invoice totals AND the PDF line items, so the fix corrects money output everywhere at once.

## Current state

- `src/lib/activity-utils.ts` — `getRateForActivity` (exported, line 69). The defective branch:

```ts
// src/lib/activity-utils.ts:104-110
	if (
		activity.endTime &&
		dayjs.utc(activity.endTime).hour() >= 19 &&
		activity.supportItem.weeknightCode?.length &&
		activity.supportItem.weeknightRate
	) {
		// Day is a weekday and it's after 8pm
```

- `src/lib/activity-utils.test.ts` — existing tests use a `baseActivity` fixture (lines 46-64) with named rates (weekday=1, weeknight=2, saturday=3, sunday=4) and assert via tuples, e.g.:

```ts
// src/lib/activity-utils.test.ts:72-78
// After 8pm - weeknight
activity.endTime = dayjs.utc("1970-01-01T20:10").toDate();
expect(getRateForActivity(activity)).toEqual(["weeknight", 2]);

// At 8pm - weeknight
activity.endTime = dayjs.utc("1970-01-01T20:00").toDate();
expect(getRateForActivity(activity)).toEqual(["weeknight", 2]);
```

- Times are stored/compared in UTC via `dayjs.utc` throughout (both the utility and its tests); match that.
- Domain vocabulary (CONTEXT.md): rate categories are weekday / weeknight / saturday / sunday on a Support Item.

## Commands you will need

| Purpose   | Command                                               | Expected on success |
| --------- | ----------------------------------------------------- | ------------------- |
| Unit      | `pnpm exec vitest run src/lib/activity-utils.test.ts` | all pass            |
| Typecheck | `pnpm type-check`                                     | exit 0              |
| Lint      | `pnpm lint`                                           | exit 0              |

(Do NOT run `pnpm test:unit` — watch mode, never exits.)

## Scope

**In scope** (the only files you should modify):

- `src/lib/activity-utils.ts` (one comparison + one comment)
- `src/lib/activity-utils.test.ts` (new boundary cases)

**Out of scope** (do NOT touch, even though they look related):

- The decision to key the evening rate off `endTime` alone (an activity 18:00→20:00 bills entirely at weeknight rate). That is existing, possibly intended behavior — changing it is a product decision, not part of this fix.
- Transit-rate logic in the same file (`getTransitRate`, hardcoded 0.99/0.49) — plan 006.
- `src/lib/pdf-generation.ts` — consumes `getRateForActivity`; no change needed.

## Git workflow

- Branch: `advisor/004-evening-rate-8pm`
- Commit message: `fix: start weeknight rate at 8pm instead of 7pm`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the failing boundary tests first

In `src/lib/activity-utils.test.ts`, extend the existing "Should return correct rates" test (or add a sibling `test(...)`) using the same fixture style:

```ts
// 7:30pm weekday - still weekday rate (weeknight starts at 8pm)
activity.date = new Date("2022-01-14");
activity.endTime = dayjs.utc("1970-01-01T19:30").toDate();
expect(getRateForActivity(activity)).toEqual(["weekday", 1]);

// 7:59pm weekday - still weekday rate
activity.endTime = dayjs.utc("1970-01-01T19:59").toDate();
expect(getRateForActivity(activity)).toEqual(["weekday", 1]);
```

Note: if you extend the existing test, it mutates `activity.date` to Saturday/Sunday partway through — reset `activity.date = new Date("2022-01-14")` (a Friday) before these assertions, as shown.

**Verify**: `pnpm exec vitest run src/lib/activity-utils.test.ts` → the two new assertions FAIL (they get `["weeknight", 2]`), everything else passes. If they pass, the code already changed — STOP.

### Step 2: Fix the comparison

In `src/lib/activity-utils.ts:106`, change `>= 19` to `>= 20`. Update the comment on line 110 from "it's after 8pm" to "it's 8pm or later" (the comparison is inclusive of 20:00).

**Verify**: `pnpm exec vitest run src/lib/activity-utils.test.ts` → ALL pass, including the two new cases and the pre-existing 20:00 boundary case.

### Step 3: Full verification

**Verify**: `pnpm exec vitest run` → all suites pass. `pnpm type-check` → exit 0. `pnpm lint` → exit 0.

## Test plan

Covered by Step 1: weekday 19:30 and 19:59 → weekday rate (the regression this plan fixes); 20:00 and 20:10 → weeknight rate (already tested). Pattern: `src/lib/activity-utils.test.ts`'s existing fixture-and-tuple style.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n ">= 20" src/lib/activity-utils.ts` → one match in `getRateForActivity`; `grep -n ">= 19" src/lib/activity-utils.ts` → no matches
- [ ] `pnpm exec vitest run` exits 0 with the two new boundary assertions present
- [ ] `pnpm type-check` and `pnpm lint` exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The comparison at `activity-utils.ts:106` is no longer `>= 19` (already fixed or refactored).
- The new tests fail for any reason OTHER than receiving `["weeknight", 2]` — that indicates a different behavior than this plan assumes.
- You find evidence (a comment, doc, or NDIS reference in the repo) that 7pm was intentional — surface it instead of changing the code.

## Maintenance notes

- Historical invoices generated with the 7pm boundary may have over-billed weekday 19:00–19:59 activities; whether to re-issue any is the operator's call — flag it in your completion report.
- If evening-rate logic is ever keyed off start/end spans rather than `endTime` alone, these boundary tests must be extended, not deleted.
