# Plan 006: One source of truth for the Provider Travel per-km rate (PDF line items = invoice totals)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat f2f1154..HEAD -- src/lib/pdf-generation.ts src/lib/activity-utils.ts src/server/api/routers/invoice-router.ts src/lib/testing/invoice-fixtures.ts`
> This plan was revised at `f2f1154` (2026-07-07) and its excerpts match that
> commit. ANY diff in these files since then: compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it
> as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S–M (shrunk from M — commit `f8e5097` already extracted and single-sourced the rate function)
- **Risk**: MED (changes visible invoice figures — that is the point, but review carefully)
- **Depends on**: docs/plans/complete/001-secure-pdf-endpoint.md, docs/plans/complete/005-money-math-characterization-tests.md (both DONE)
- **Category**: bug
- **Planned at**: commit `c48e1dd`, 2026-07-02. **Revised**: commit `f2f1154`, 2026-07-07.

## Revision note (2026-07-07)

Commit `f8e5097` ("test: implement invoice test harness") did part of this
plan's work and reversed one of its decisions:

- `getTransitRate` is now **exported** from `activity-utils.ts` (original
  Step 1 — done) and gained a group branch: `isGroup` activities return
  `GROUP_TRANSIT_RATE` (0.43) before the client → user → 0.99 precedence.
- The PDF's hardcoded `isGroup ? 0.43 : 0.99` line-item rate was replaced
  with a `getTransitRate(activity)` call. Line items and the printed Total
  now share one rate function, so the original headline bug (group invoices
  whose line items didn't sum to their own Total — quirk Q1) is **fixed**.
- **Decision reversed**: the original plan said "do not preserve the 0.43".
  The group rate is now intentional product behavior, single-sourced in
  `getTransitRate`. KEEP the group branch. Plan 016 replaces the constant
  with effective-rate ÷ group-size (up to 10 participants).
- A PDF golden-master test harness now exists (see Current state). Use it —
  the original Step 4's "only if mockable" hedging is obsolete.

**What remains for this plan**: no caller passes `rateContext`, and the
PDF/aggregate queries don't include the activity's client rate. So:

1. `User.transitRatePerKm` (default 0.85, editable in account settings) is
   still never used anywhere.
2. Client-specific `transitRatePerKm` overrides never reach the PDF line
   items, the PDF Total, `getTotalOwing`, or `matchByPayment` — all of them
   silently fall through to the 0.99 default for non-group activities.
3. `invoice.matchByPayment` therefore still matches bank payments against
   totals computed at the wrong rate for clients with a custom rate.

After this plan: the PDF line items, PDF Total, and invoice-router
aggregates all resolve the non-group Provider Travel rate as
client override → user rate → 0.99, via the already-shared `getTransitRate`.

## Current state

(Excerpts at `f2f1154`.)

- `src/lib/activity-utils.ts:51-58`:

```ts
interface TransitRateContext {
	userTransitRatePerKm?: number;
}

const DEFAULT_TRANSIT_RATE = 0.99;

// TODO: Handle groups other than 2 clients
const GROUP_TRANSIT_RATE = 0.43;
```

- `src/lib/activity-utils.ts:188-201` — exported, group branch first:

```ts
export function getTransitRate(
	activity: Activity,
	rateContext?: TransitRateContext
): number {
	if (activity.supportItem.isGroup) {
		return GROUP_TRANSIT_RATE;
	}

	return (
		Number(activity.client?.transitRatePerKm) ||
		rateContext?.userTransitRatePerKm ||
		DEFAULT_TRANSIT_RATE
	);
}
```

- `src/lib/pdf-generation.ts:137-152` — line items already call the shared
  function, but with no `rateContext`, and the invoice query's activities
  include (`supportItem`, `transportItems`) does NOT include `client`, so
  non-group activities always resolve 0.99:

```ts
// Provider Travel - Non Labour Costs
if (activity.transitDistance) {
	const ratePerKm = getTransitRate(activity);
	const travelTotal = ratePerKm * Number(activity.transitDistance);
	...
	`$${ratePerKm}/km\n`,   // line 150 — unformatted; 0.9 would print "$0.9/km"
```

- `src/lib/pdf-generation.ts:232` — `const totalCost = getTotalCostOfActivities(invoice.activities);` (no `rateContext`; same missing `client` include).
- `src/server/api/routers/invoice-router.ts` — the two aggregate call sites
  (owner-scoped since plan 003), both with `activities: { include: { supportItem: true } }`-shaped queries that lack the client rate and pass no context:

```ts
// invoice-router.ts:157-160 (getTotalOwing)
const totalOwing = invoices.reduce(
	(total, invoice) => (total += getTotalCostOfActivities(invoice.activities)),
	0
);
```

```ts
// invoice-router.ts:446 (matchByPayment)
const total = getTotalCostOfActivities(invoice.activities);
```

- **PDF golden-master harness** (new since original planning):
  - `src/lib/testing/invoice-fixtures.ts` — 16 hand-authored fixtures shaped
    exactly like `generatePDF`'s Prisma reads, plus `mockPrismaForFixtures`
    for `vi.mock("@/server/prisma", ...)`. The fixture user's
    `transitRatePerKm` is **0.85**.
  - `src/lib/pdf-generation.text.test.ts` — extracts PDF text and asserts
    against `src/lib/__pdf_text__/*.txt` via `toMatchFileSnapshot` (update
    with `pnpm exec vitest run -u`), plus targeted inline assertions.
  - `src/lib/pdf-generation.render.test.ts` — PNG snapshots in
    `src/lib/__pdf_snapshots__/` (update with `UPDATE_PDF_SNAPSHOTS=1`).
- **Expected golden-master impact of this plan**: fixtures whose non-group
  activities have `transitDistance` currently print `$0.99/km`; once the
  user rate (0.85) is threaded they will print `$0.85/km` and their Totals
  drop accordingly. Affected fixtures: `transit-solo`, `kitchen-sink`,
  `plan-managed-week` (its two solo travel legs; its group leg stays
  $0.43/km). `transit-group` and `transport-group-distance` must NOT change.
- Activity Based Transport (`0.49` group / `0.99`) is a different thing,
  consistent between PDF and totals — DO NOT change it (plan 016 makes it
  ÷ group-size).
- UI components also call `getTotalCostOfActivities` with no `rateContext`
  (6 sites: `calendar-agenda.tsx:59,97`, `calendar-day-modal.tsx:138`,
  `log-payment-dialog.tsx:107`, `invoice-page.tsx:133`,
  `invoice-list.tsx:224`, `activity-list.tsx:136`). **Out of scope** — plan
  007 Step 6 closes this gap.
- Repo conventions: tabs, double quotes; unit-test style per
  `src/lib/activity-utils.test.ts`.

## Commands you will need

| Purpose   | Command                                           | Expected on success        |
| --------- | ------------------------------------------------- | -------------------------- |
| Unit      | `pnpm exec vitest run`                            | all pass                   |
| Typecheck | `pnpm type-check`                                 | exit 0                     |
| Lint      | `pnpm lint`                                       | exit 0                     |
| E2E       | `pnpm db:up && pnpm prisma:push && pnpm test:e2e` | all pass (requires Docker) |

(Do NOT run `pnpm test:unit` — watch mode, never exits.)

## Scope

**In scope** (the only files you should modify):

- `src/lib/pdf-generation.ts` (fetch user rate; pass `rateContext`; include client rate; format printed rate)
- `src/server/api/routers/invoice-router.ts` (`getTotalOwing` + `matchByPayment`: include client rate in the query, fetch user rate, pass `rateContext`)
- `src/lib/activity-utils.test.ts` (rate-precedence additions if needed)
- `src/lib/pdf-generation.text.test.ts` inline expectations + `src/lib/__pdf_text__/*.txt` + `src/lib/__pdf_snapshots__/*.png` (deliberate golden regeneration ONLY for the documented $0.99→$0.85 diffs)

**Out of scope** (do NOT touch, even though they look related):

- `src/lib/activity-utils.ts` — `getTransitRate` is already exported with the
  behavior this plan needs; the group branch stays (plan 016's job).
- The 6 UI component call sites — plan 007 Step 6.
- Activity Based Transport rates (`0.49`/`0.99`) — plan 016.
- Provider Travel **Labour** costs — both paths already use the activity rate/60; consistent.
- The `rateType` time-vs-distance quirk characterized in plan 005 — plan 007 Step 1 decides it.
- `trip-utils.ts` / `src/lib/testing/invoice-fixtures.ts` (fixture VALUES must not change — only goldens regenerate).

## Git workflow

- Branch: `advisor/006-transit-rate-single-source`
- Commit message: `fix: use configured transit rate for provider travel in pdf and totals`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the landed prerequisite work

`getTransitRate` must already be exported with the group branch (Current
state excerpt). Nothing to change in `activity-utils.ts`.

**Verify**: `grep -n "export function getTransitRate" src/lib/activity-utils.ts` → one match; `pnpm exec vitest run` → all pass.

### Step 2: Thread the owner's rate through `generatePDF`

In `src/lib/pdf-generation.ts`:

1. After the owner-scoped invoice lookup, fetch the owner's rate once:

```ts
const owner = await prisma.user.findUnique({
	where: { id: ownerId },
	select: { transitRatePerKm: true }
});
const rateContext = {
	userTransitRatePerKm: Number(owner?.transitRatePerKm ?? 0.99)
};
```

(Note: `generatePDF` already runs a full `prisma.user.findUnique` near the
end for the payment footer — you may instead hoist that single query above
the line-item loop and reuse it, keeping one user read total.)

2. Add the client rate to the activities include in the invoice query:
   `client: { select: { transitRatePerKm: true } }` — group-created
   activities can belong to a different client than `invoice.client`, so use
   the per-activity relation, not `invoice.client`.
3. Pass the context at the line-item call: `getTransitRate(activity, rateContext)`.
4. Pass it to the Total: `getTotalCostOfActivities(invoice.activities, rateContext)`.
5. Format the printed rate at line 150: `` `$${ratePerKm.toFixed(2)}/km` `` so a rate like `0.9` prints as `0.90`.

**Verify**: `pnpm type-check` → exit 0.

### Step 3: Fix the invoice-router aggregates

In `src/server/api/routers/invoice-router.ts`, for BOTH `getTotalOwing` and
`matchByPayment`:

1. Add the client rate to the activity include: `activities: { include: { supportItem: true, client: { select: { transitRatePerKm: true } } } }`.
2. Fetch the caller's rate once per procedure:

```ts
const user = await ctx.prisma.user.findUnique({
	where: { id: ctx.session.user.id },
	select: { transitRatePerKm: true }
});
const rateContext = {
	userTransitRatePerKm: Number(user?.transitRatePerKm ?? 0.99)
};
```

3. Pass it: `getTotalCostOfActivities(invoice.activities, rateContext)`.

**Verify**: `pnpm type-check` → exit 0. `pnpm lint` → exit 0.

### Step 4: Tests and golden-master regeneration

1. In `src/lib/activity-utils.test.ts`, confirm/extend coverage: group
   activity with `transitDistance` and a client override still bills at
   `GROUP_TRANSIT_RATE` (the group branch beats the override — current,
   intentional behavior until plan 016).
2. Run `pnpm exec vitest run` and inspect the text-test failures. Update the
   inline expectations in `pdf-generation.text.test.ts` where they encode
   the $0.99/km rate for the affected fixtures, then regenerate goldens:
   `pnpm exec vitest run -u` and (if the render test fails)
   `UPDATE_PDF_SNAPSHOTS=1 pnpm exec vitest run src/lib/pdf-generation.render.test.ts`.
3. **Review the golden diffs line by line**: only `$0.99/km` non-labour
   travel lines becoming `$0.85/km` (and the arithmetic that follows —
   travel line totals and invoice Totals) may change. Group lines
   (`$0.43/km`), ABT lines (`$0.49`/`$0.99` per-km transport), labour
   travel lines, and support lines must be byte-identical.

**Verify**: `pnpm exec vitest run` → all pass, including plan 005's suite
(rate-precedence tests unchanged — this plan adds callers, it does not
change `getTransitRate` behavior).

### Step 5: Full verification

**Verify**: `pnpm exec vitest run`, `pnpm type-check`, `pnpm lint`, `pnpm format:check` → all exit 0. If Docker available: e2e suite passes.

## Test plan

- Rate precedence (client → user → 0.99): already locked by plan 005; must still pass.
- Group branch beats client override: locked (until plan 016 redefines it).
- Golden masters: the ONLY diffs are the documented $0.99→$0.85 lines and dependent totals in `transit-solo`, `kitchen-sink`, `plan-managed-week`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -c "rateContext" src/lib/pdf-generation.ts` → at least 2 (declared + passed to line items and total)
- [ ] `grep -c "rateContext" src/server/api/routers/invoice-router.ts` → at least 4 (two procedures × declare + pass)
- [ ] `grep -n "transitRatePerKm" src/lib/pdf-generation.ts src/server/api/routers/invoice-router.ts` → client rate included in the activity queries
- [ ] `git diff --stat` on `src/lib/__pdf_text__/` touches only `transit-solo`, `kitchen-sink`, `plan-managed-week`
- [ ] `pnpm exec vitest run` exits 0 (including all plan-005 characterization tests, unmodified)
- [ ] `pnpm type-check`, `pnpm lint` exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows changes to the four watched files since `f2f1154` that contradict the Current state excerpts.
- Plan 016 has already landed (`getTransitRate` consults a group size, or `GROUP_TRANSIT_RATE` is gone) — this plan's group expectations are then stale; reconcile with 016 before proceeding.
- Regenerating goldens changes any group transit line ($0.43/km), any ABT line, or any fixture other than the three documented ones.
- Group-created activities on an invoice carry a client whose `transitRatePerKm` differs from `invoice.client`'s AND the line items and Total disagree after your change — the per-activity `client` relation must be used consistently in both paths; report if the query shapes make that impossible.
- Any plan-005 characterization test needs its EXPECTED VALUE changed — report before editing the test.

## Maintenance notes

- The group Provider Travel rate (0.43) and group ABT rate (0.49) remain
  2-participant hardcodes; **plan 016** replaces both with
  floor(effective-rate ÷ group-size) and adds `Activity.groupSize`.
- Residual known gap: the 6 UI call sites still show totals without the user
  rate — **plan 007 Step 6** closes it.
- CONTEXT.md ("Billable Driving" → Transit Rate) still mentions the removed
  `groupTransitRatePerKm` field — plan 016 updates the doc with the new
  group-size semantics.
- The `rateType` time-vs-distance precedence quirk (plan 005, Step 2, case 5)
  remains open — plan 007 Step 1 decides it.
