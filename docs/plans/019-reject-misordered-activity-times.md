# Plan 019: Reject mis-ordered and midnight-crossing activity times instead of silently mis-billing

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/lib/date-utils.ts src/schema/activity-schema.ts src/lib/date-utils.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

Activity start/end times are stored as date-less Postgres `time` columns (`prisma/schema.prisma:147-148`). `getDuration` computes billed hours with `Math.abs(diff)`, so an entry whose end time precedes its start time — a 23:00→01:00 overnight shift, or a simple start/end swap typo — silently bills the _complement_: a 2-hour overnight shift bills as 22 hours. This flows directly into invoice SUPPORT-line quantities and totals. The product decision is already recorded in `docs/trd/trd-002-support-item-catalogue-and-rate-engine.md` (D4): **"Overnight spans: reject at capture … classify Sat-23:00→Sun-01:00 as invalid input with a clear message rather than mis-billing."** The server currently enforces nothing; this plan adds the schema-level rejection and removes the masking `Math.abs`.

## Current state

- `src/lib/date-utils.ts:11-19` — the buggy helper:

```ts
export function getDuration(startTime: Date, endTime: Date): number {
	const startDate = dayjs(startTime);
	const endDate = dayjs(endTime);

	const diffInMinutes = Math.abs(startDate.diff(endDate, "minutes"));
	const diffInHours = diffInMinutes / 60;

	return diffInHours;
}
```

- `src/lib/billing-lines.ts` (~line 238-248) — the SUPPORT line's quantity/total is `getDuration(startTime, endTime)`, so this is money math.
- `src/schema/activity-schema.ts:21-38` — `activitySchema` takes `startTime`/`endTime` as `"HH:mm"` strings and has one refine (times XOR itemDistance) but **no ordering check**:

```ts
export const activitySchema = z
	.object({
		...
		startTime: z.string().min(1, "Start time is required"),
		endTime: z.string().min(1, "End time is required"),
		...
	})
	.partial({ startTime: true, endTime: true, itemDistance: true })
	.refine(
		(data) => (!!data.startTime && !!data.endTime) || !!data.itemDistance
	);
```

- All activity write paths (`activity.add`, `activity.modify`, any `bulkAdd`, and `invoice.create/modify`'s `activitiesToCreate`) validate through `activitySchema`, so one schema refine covers the server surface. Confirm this claim by grepping `activitySchema` usages before starting.
- Client-side, forms use `zodResolver(activitySchema)` (e.g. `src/components/activities/activity-form.tsx`), so they inherit the new message for free. `multi-activity-form.tsx` has its own `validateTimeRange` (`src/components/forms/time-range-input.tsx:123`) — do not modify it; it is the client-side fast path and stays as-is.
- Times are fixed-format `"HH:mm"` strings in the schema; lexicographic string comparison is a correct ordering test for that format.

## Commands you will need

| Purpose           | Command                                           | Expected on success |
| ----------------- | ------------------------------------------------- | ------------------- |
| Typecheck         | `pnpm type-check`                                 | exit 0              |
| Unit tests        | `pnpm test:unit`                                  | all pass            |
| Targeted tests    | `pnpm exec vitest run src/lib/date-utils.test.ts` | all pass            |
| Integration tests | `pnpm db:up && pnpm test:integration`             | all pass            |
| Lint              | `pnpm lint`                                       | exit 0              |

## Scope

**In scope**:

- `src/schema/activity-schema.ts`
- `src/lib/date-utils.ts`
- `src/lib/date-utils.test.ts`
- `src/server/api/test/` — one new integration test case (any suitable existing file, e.g. a new small `activity-times.integration.test.ts`)

**Out of scope**:

- `src/components/forms/time-range-input.tsx` / `multi-activity-form.tsx` — client validation already exists; UI polish is not this plan.
- Supporting genuine overnight shifts (+24h math) — explicitly rejected by TRD-002 D4. Do not implement it.
- `billing-lines.ts` — no change needed once `getDuration` is fixed.

## Git workflow

- Branch: `advisor/019-reject-misordered-times`
- Commit: `fix: reject end-before-start activity times at the schema and in getDuration`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the ordering refine to `activitySchema`

In `src/schema/activity-schema.ts`, chain a second `.refine` after the existing one:

```ts
.refine(
	(data) =>
		!data.startTime || !data.endTime || data.startTime < data.endTime,
	{
		message:
			"End time must be after start time — activities can't cross midnight",
		path: ["endTime"]
	}
)
```

**Verify**: `pnpm type-check` → exit 0. `pnpm test:unit` → all pass (if any unit test feeds a reversed range through the schema on purpose, see STOP conditions).

### Step 2: Remove the masking `Math.abs` from `getDuration`

In `src/lib/date-utils.ts`, change `getDuration` to compute `endDate.diff(startDate, "minutes")` (correct sign, no `Math.abs`) and throw a descriptive `Error` when the result is negative (e.g. `` `getDuration: endTime ${…} precedes startTime ${…}` ``). New rows can't reach this after Step 1; the throw is a tripwire for pre-existing bad rows rather than a silent wrong invoice.

**Verify**: `pnpm exec vitest run src/lib/date-utils.test.ts` → existing tests pass (they only use ordered times).

### Step 3: Tests

Add the cases in "Test plan".

**Verify**: `pnpm test:unit` → all pass. `pnpm db:up && pnpm test:integration` → all pass.

## Test plan

- `src/lib/date-utils.test.ts` (follow its existing style):
  - ordered times → exact hours (e.g. 09:00→11:30 = 2.5);
  - equal times → 0;
  - reversed times → throws (regression for the 23:00→01:00 = 22h bug).
- Schema-level unit test (put next to other schema/consumer tests or in `date-utils.test.ts`'s sibling pattern — a new `src/schema/activity-schema.test.ts` is fine): `activitySchema.safeParse` rejects `startTime: "23:00", endTime: "01:00"` with the midnight message; accepts `"09:00"→"17:00"`; still accepts the distance-only shape (no times, `itemDistance` set).
- Integration test: `activity.add` with `startTime: "23:00", endTime: "01:00"` → rejected with a Zod/BAD_REQUEST error; no row created. Model on `src/server/api/test/ownership.integration.test.ts` (harness: `createTestUser`, `callerFor`, `resetDb`).

## Done criteria

- [ ] `pnpm type-check` exits 0
- [ ] `pnpm test:unit` exits 0, including new schema + duration tests
- [ ] `pnpm test:integration` exits 0, including the rejected-overnight-entry test
- [ ] `grep -n "Math.abs" src/lib/date-utils.ts` returns no matches
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Any existing test or fixture _intentionally_ creates an activity with `endTime <= startTime` (that would mean overnight data exists in expected behavior, contradicting TRD-002 D4 — needs a product decision).
- `activitySchema` turns out not to guard some server write path (e.g. a procedure with its own ad-hoc time schema) — report the site instead of patching it ad hoc.
- The e2e suite (`pnpm test:e2e`) fails on a time-entry flow after Step 1 — the UI may be sending a shape the refine mishandles.

## Maintenance notes

- If genuine overnight shifts are ever needed, the change is a product decision recorded against TRD-002 D4: day-attribution rules (which day's rate applies to which portion) must be designed first — do not just relax the refine.
- Pre-existing DB rows with reversed times (if any) will now throw at PDF/total computation instead of silently mis-billing. That is intended; a data-fix query can be run if the tripwire ever fires.
