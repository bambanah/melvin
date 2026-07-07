# Plan 028: Remove dead utility code and fix the dead guard in getHighestInvoiceNo

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/lib/generic-utils.ts src/lib/date-utils.ts src/lib/invoice-utils.ts src/lib/generic-utils.test.ts src/lib/invoice-utils.test.ts`
> Re-run each "zero usages" grep below before deleting anything — the greps
> are the ground truth, not this file.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (do not run concurrently with 019/022 — shared files)
- **Category**: tech-debt
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

Three pieces of dead or dead-ish code in the shared libs: a random-picker utility whose only caller is its own test (false coverage credit), a joke stub returning hardcoded `69`, and a null-guard in the invoice-number reducer that can never fire (`getNumber` returns `number | undefined`, never `null`) — meaning non-numeric invoice numbers are silently coerced to 0 in the "highest number" comparison instead of being skipped. Small stuff, but it's the shared utils: every reader pays the confusion tax.

## Current state

- `src/lib/generic-utils.ts:53-69` — `pickRandomFrom<T>(arr, avoid?)`. Callers: only `src/lib/generic-utils.test.ts` (verify: `grep -rn "pickRandomFrom" src --include='*.ts*' | grep -v test` → empty).
- `src/lib/date-utils.ts:40-42`:

```ts
export const getTotalInvoiceHours = () => {
	return 69;
};
```

Callers: none (verify: `grep -rn "getTotalInvoiceHours" src --include='*.ts*' | grep -v date-utils.ts` → empty).

- `src/lib/invoice-utils.ts:10-14` and `45-61`:

```ts
const getNumber = (invoiceNo: string): number | undefined => {
	const matches = invoiceNo.match(/\d+$/);
	return matches ? Number(matches[0]) : undefined;
};
...
const highest = invoiceNumbers.reduce((previous, current) => {
	if (getNumber(current) === null) return previous;   // ← never true

	return (getNumber(previous) || 0) > (getNumber(current) || 0)
		? previous
		: current;
});
```

Effect of the dead guard: a suffix-less entry (e.g. `"DRAFT"`) isn't skipped; it participates with value 0. In the common single-series case the numeric entries still win the comparison, so **behavior only differs when the list contains non-numeric entries that should be ignored as `previous` accumulator seeds** — write characterization tests before changing (see Test plan).

- Existing tests: `src/lib/invoice-utils.test.ts`, `src/lib/generic-utils.test.ts` — follow their style.
- The two divergent debounce idioms (`generic-utils.ts:43` fn-wrapper vs `invoice-list.tsx:102` `useDebounce` hook) were considered and **deliberately left alone** — they serve different shapes (event-handler wrapping vs derived-state). Do not consolidate them here.

## Commands you will need

| Purpose    | Command                                              | Expected on success |
| ---------- | ---------------------------------------------------- | ------------------- |
| Typecheck  | `pnpm type-check`                                    | exit 0              |
| Unit tests | `pnpm test:unit`                                     | all pass            |
| Targeted   | `pnpm exec vitest run src/lib/invoice-utils.test.ts` | all pass            |
| Lint       | `pnpm lint`                                          | exit 0              |

## Scope

**In scope**:

- `src/lib/generic-utils.ts`, `src/lib/generic-utils.test.ts` (delete `pickRandomFrom` + its tests)
- `src/lib/date-utils.ts` (delete `getTotalInvoiceHours`)
- `src/lib/invoice-utils.ts`, `src/lib/invoice-utils.test.ts` (guard fix + tests)

**Out of scope**:

- The debounce idioms (see above).
- `round`/`floorToCent`/`groupBy` — live, tested money math. Don't touch.
- Anything in plans 019/022's scope (they edit neighboring functions; sequence, don't parallelize).

## Git workflow

- Branch: `advisor/028-dead-code-cleanup`
- Commit: `refactor: remove dead utils and fix non-numeric guard in getHighestInvoiceNo`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Delete `pickRandomFrom` and `getTotalInvoiceHours`

Re-run both zero-usage greps first. Delete the functions and the `pickRandomFrom` test cases.

**Verify**: `pnpm type-check` → exit 0; `pnpm test:unit` → all pass.

### Step 2: Characterize, then fix, `getHighestInvoiceNo`

First add tests pinning current behavior for numeric-only inputs (see Test plan) and run them green **before** the change. Then replace the dead guard so non-numeric entries are genuinely skipped:

```ts
const highest = invoiceNumbers.reduce((previous, current) => {
	if (getNumber(current) === undefined) return previous;
	if (getNumber(previous) === undefined) return current;
	return (getNumber(previous) ?? 0) >= (getNumber(current) ?? 0)
		? previous
		: current;
});
```

(The `previous` check matters: with a non-numeric first element as the reduce seed, current code compares against 0; the fix hands the accumulator to the first numeric entry.)

**Verify**: `pnpm exec vitest run src/lib/invoice-utils.test.ts` → all pass, including the new cases.

## Test plan

In `src/lib/invoice-utils.test.ts`:

1. Characterization (must pass before AND after): `["INV-001","INV-003","INV-002"]` → `"INV-003"`; `getNextInvoiceNo` continues to produce `"INV-004"` shape with zero-padding preserved (e.g. `["A-08","A-09"]` → next `"A-10"`).
2. New behavior: `["DRAFT","INV-002"]` → `"INV-002"` (non-numeric skipped even as reduce seed); all-non-numeric `["DRAFT","FINAL"]` → `undefined`; empty → `undefined` (existing).

## Done criteria

- [ ] `grep -rn "pickRandomFrom\|getTotalInvoiceHours" src` → no matches
- [ ] `grep -n "=== null" src/lib/invoice-utils.ts` → no matches
- [ ] `pnpm type-check`, `pnpm test:unit`, `pnpm lint` all exit 0; new invoice-number tests pass
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

- Any zero-usage grep comes back non-empty — the function grew a caller since this plan was written; skip that deletion and note it.
- A characterization test fails **before** your change — the current-behavior assumption is wrong; report.

## Maintenance notes

- `getNextInvoiceNo`'s prefix handling (mixed prefixes in one list pick a single "highest" regardless of prefix) is a known limitation acceptable for the single-series product; if multi-series numbering ever arrives, revisit with a per-prefix grouping.
