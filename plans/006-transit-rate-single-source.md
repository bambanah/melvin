# Plan 006: One source of truth for the Provider Travel per-km rate (PDF line items = invoice totals)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c48e1dd..HEAD -- src/lib/pdf-generation.ts src/lib/activity-utils.ts src/server/api/routers/invoice-router.ts`
> Plans 001 (generatePDF signature), 004 (`>= 20`), and 005 (tests) are
> EXPECTED to have landed — those diffs are fine. Any OTHER change to these
> files: compare the "Current state" excerpts against the live code before
> proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (changes visible invoice figures — that is the point, but review carefully)
- **Depends on**: plans/001-secure-pdf-endpoint.md, plans/005-money-math-characterization-tests.md
- **Category**: bug
- **Planned at**: commit `c48e1dd`, 2026-07-02

## Why this matters

The same invoice PDF computes Provider Travel (non-labour, per-km) **two different ways**: the line items use hardcoded rates (`isGroup ? 0.43 : 0.99` at `pdf-generation.ts:138`), while the printed Total uses `getTotalCostOfActivities`, whose transit rate is `client.transitRatePerKm || 0.99`. Consequences, all verified in code:

1. For group activities or clients with a custom rate, **the PDF's line items do not sum to its own Total**.
2. The user's configured rate (`User.transitRatePerKm`, default 0.85, editable in account settings — `prisma/schema.prisma:61`) is **never used anywhere**: `getTransitRate` only consults it via a `rateContext` parameter that no caller passes, and `getEffectiveTransitRate` (`trip-utils.ts:118`) has no production caller at all.
3. `invoice.matchByPayment` matches bank payments against totals computed with the wrong rate, so payment matching can fail for exactly the invoices whose PDFs showed a different amount.

After this plan: one function decides the Provider Travel per-km rate (client override → user rate → 0.99 NDIS max), and the PDF line items, PDF total, and invoice-router aggregates all use it.

## Current state

- Domain rules (CONTEXT.md, "Billable Driving"): _"Transit Rate: The per-kilometre rate charged for Provider Travel. Defaults to the User's configured rate (max $0.99/km per NDIS rules). Can be overridden per Client."_ Note: CONTEXT.md also mentions a `groupTransitRatePerKm` — that field **no longer exists** in the schema (removed in commit `3d7c5a9` "fix: remove invoice FY totals and group transit rate"). There is no configurable group transit rate; the PDF's `0.43` is an orphaned hardcode. **Decision taken by this plan**: group and individual activities use the same effective Provider Travel rate. Do not preserve the 0.43.
- **Activity Based Transport is a different thing and is already consistent** — `0.49` (group) / `0.99` at `pdf-generation.ts:157` matches `getTotalCostOfActivities` (`activity-utils.ts:165-168`). DO NOT change those.

- `src/lib/activity-utils.ts`:

```ts
// activity-utils.ts:51-55
interface TransitRateContext {
	userTransitRatePerKm?: number;
}

const DEFAULT_TRANSIT_RATE = 0.99;
```

```ts
// activity-utils.ts:152-155 (inside getTotalCostOfActivities)
if (activity.transitDistance) {
	const ratePerKm = getTransitRate(activity, rateContext);
	subTotal += round(Number(activity.transitDistance) * ratePerKm, 2);
}
```

```ts
// activity-utils.ts:185-194 (module-private)
function getTransitRate(
	activity: Activity,
	rateContext?: TransitRateContext
): number {
	return (
		Number(activity.client?.transitRatePerKm) ||
		rateContext?.userTransitRatePerKm ||
		DEFAULT_TRANSIT_RATE
	);
}
```

- `src/lib/pdf-generation.ts` (after plan 001, `generatePDF(invoiceId: string, ownerId: string)`):

```ts
// pdf-generation.ts:134-150 — the hardcoded line-item rate to replace
			// Provider Travel - Non Labour Costs
			if (activity.transitDistance) {
				// TODO: Handle groups other than 2 clients
				const isGroup = activity.supportItem.isGroup;
				const ratePerKm = isGroup ? 0.43 : 0.99;
				const travelTotal = ratePerKm * Number(activity.transitDistance);
```

and the total at line 228: `const totalCost = getTotalCostOfActivities(invoice.activities);`
Note: the invoice query inside `generatePDF` includes `client: true` (full client row), so `activity`-level access to the client rate must come via `invoice.client` — the activities in this query do NOT include their own `client` relation. Check the actual `include` shape when editing (all activities on an invoice belong to the invoice's single client, except group-created activities — see STOP conditions).

- `src/server/api/routers/invoice-router.ts` — the two aggregate call sites (after plan 003 these are owner-scoped):

```ts
// invoice-router.ts:156-160 (getTotalOwing)
const totalOwing = invoices.reduce(
	(total, invoice) => (total += getTotalCostOfActivities(invoice.activities)),
	0
);
```

```ts
// invoice-router.ts:395 (matchByPayment)
const total = getTotalCostOfActivities(invoice.activities);
```

Neither query currently selects the activity's `client` relation (their `include` is `activities: { include: { supportItem: true } }`), so today the client-override rate isn't even reachable there — totals silently use 0.99. This plan adds `client: { select: { transitRatePerKm: true } }` to those activity includes AND passes the user rate.

- UI components also call `getTotalCostOfActivities` with no `rateContext` (6 sites: `calendar-day-modal.tsx:138`, `calendar-agenda.tsx:59,97`, `invoice-page.tsx:130`, `invoice-list.tsx:217`, `log-payment-dialog.tsx:107`, `activity-list.tsx:136`). **Out of scope** — see Scope. After this plan they may display totals that differ from the PDF when the user has a non-default rate and the client has no override; that residual gap is recorded in Maintenance notes.

- Repo conventions: tabs, double quotes; unit-test style per `src/lib/activity-utils.test.ts`.

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

- `src/lib/activity-utils.ts` (export `getTransitRate`; no behavioral change to it)
- `src/lib/pdf-generation.ts` (fetch user rate; use `getTransitRate` for line items; pass `rateContext` to the total)
- `src/server/api/routers/invoice-router.ts` (`getTotalOwing` + `matchByPayment`: include client rate in the query, fetch user rate, pass `rateContext`)
- `src/lib/activity-utils.test.ts` and/or `src/lib/pdf-generation.test.ts` (tests)

**Out of scope** (do NOT touch, even though they look related):

- The 6 UI component call sites — threading the user rate to the client would need a user query per component; deferred (Maintenance notes).
- Activity Based Transport rates (`0.49`/`0.99`) — already consistent between PDF and totals.
- Provider Travel **Labour** costs (`pdf-generation.ts:117-132`, `activity-utils.ts:157-162`) — both already use the activity rate/60; consistent.
- The `rateType` time-vs-distance quirk characterized in plan 005 — separate finding.
- `trip-utils.ts` — you may CALL `getEffectiveTransitRate` if convenient, but prefer `getTransitRate` (activity-shaped); do not modify trip-utils.

## Git workflow

- Branch: `advisor/006-transit-rate-single-source`
- Commit message: `fix: use configured transit rate for provider travel in pdf and totals`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Export the rate function

In `src/lib/activity-utils.ts`, change `function getTransitRate(` to `export function getTransitRate(` and export the `TransitRateContext` interface. No logic changes.

**Verify**: `pnpm type-check` → exit 0; `pnpm exec vitest run` → all pass (plan 005's tests cover this function's precedence order).

### Step 2: Thread the owner's rate through `generatePDF`

In `src/lib/pdf-generation.ts`:

1. After the owner-scoped invoice lookup (plan 001), fetch the owner's rate once:

```ts
const owner = await prisma.user.findUnique({
	where: { id: ownerId },
	select: { transitRatePerKm: true }
});
const rateContext = {
	userTransitRatePerKm: Number(owner?.transitRatePerKm ?? 0.99)
};
```

2. Replace the hardcoded line-item rate (lines 137-139) with the shared function. The activity objects in this scope don't carry their own `client` relation, so pass the invoice's client rate explicitly:

```ts
const ratePerKm = getTransitRate(
	{
		...activity,
		client: { transitRatePerKm: invoice.client.transitRatePerKm }
	},
	rateContext
);
const travelTotal = round(ratePerKm * Number(activity.transitDistance), 2);
```

    (If `getTransitRate`'s `Activity` parameter type makes the spread awkward, adjust the call to construct only the fields it reads — `client.transitRatePerKm` — rather than widening types.) Also update the printed rate string on the line at `pdf-generation.ts:149` (`` `$${ratePerKm}/km` ``) to `` `$${ratePerKm.toFixed(2)}/km` `` so a rate like `0.9` prints as `0.90`.

3. Pass the context to the total at line 228: `getTotalCostOfActivities(invoice.activities, rateContext)` — and confirm the activities in that query include their `client` rate or inherit the invoice client's. **Important consistency check**: `getTotalCostOfActivities` reads `activity.client?.transitRatePerKm`. The invoice query's activities include (`supportItem`, `transportItems`) — NOT `client`. Add `client: { select: { transitRatePerKm: true } }` to the activities include in `generatePDF`'s invoice query so the total sees the same client rate the line items use.

**Verify**: `pnpm type-check` → exit 0. `grep -n "0.43" src/lib/pdf-generation.ts` → no matches.

### Step 3: Fix the invoice-router aggregates

In `src/server/api/routers/invoice-router.ts`, for BOTH `getTotalOwing` and `matchByPayment`:

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

### Step 4: Tests

1. In `src/lib/activity-utils.test.ts`, add: group activity with `transitDistance` and a client rate → transit is billed at the client rate (asserting the old 0.43/0.99 split is gone from totals is impossible here since totals never used 0.43 — the group-rate assertion belongs to the PDF side, next).
2. Create `src/lib/pdf-generation.test.ts` ONLY if you can do it without a database: `generatePDF` queries Prisma directly, so unit-testing it requires mocking `@/server/prisma` (vitest `vi.mock`). If that mock exceeds ~50 lines of setup, skip the file and note it — the arithmetic is already covered via `getTotalCostOfActivities` tests; the line-item/total agreement then rests on both paths calling `getTransitRate` (verifiable by grep, done criteria below).

**Verify**: `pnpm exec vitest run` → all pass, including plan 005's suite (its rate-precedence tests must still pass unchanged — this plan adds callers, it does not change `getTransitRate` behavior).

### Step 5: Full verification

**Verify**: `pnpm exec vitest run`, `pnpm type-check`, `pnpm lint`, `pnpm format:check` → all exit 0. If Docker available: e2e suite passes.

## Test plan

- Rate precedence (client → user → 0.99): already locked by plan 005; must still pass.
- New: group-activity transit billed at the effective rate, not a special group rate.
- New (optional, mock-permitting): PDF line-item sum equals PDF `totalCost` for a fixture invoice with a custom client rate.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "0.43" src/lib/pdf-generation.ts` → no matches
- [ ] `grep -n "getTransitRate" src/lib/pdf-generation.ts` → at least one match (line items use the shared function)
- [ ] `grep -c "rateContext" src/server/api/routers/invoice-router.ts` → at least 4 (two procedures × declare + pass)
- [ ] `pnpm exec vitest run` exits 0 (including all plan-005 characterization tests, unmodified except where this plan's Step 4 explicitly adds cases)
- [ ] `pnpm type-check`, `pnpm lint` exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plans 001 or 005 have not landed (`generatePDF` still takes one argument, or `src/lib/trip-utils.test.ts` doesn't exist).
- You find a configurable group transit rate somewhere in the live schema (would contradict this plan's "no group rate" decision — the operator must choose).
- Group-created activities on an invoice can belong to a DIFFERENT client than `invoice.client` (check how group activities are created — `invoice-router.ts` `generateNestedWriteForGroupActivities` sets `clientId: groupClientId`). If the invoice query's activities can carry a different client's rate than `invoice.client`, use the per-activity `client` relation everywhere instead of `invoice.client` and note the deviation. Do not guess silently.
- Any plan-005 characterization test needs its EXPECTED VALUE changed for a reason other than "group transit now uses the effective rate" — report before editing the test.

## Maintenance notes

- **Operator decision to confirm in review**: this plan removes the orphaned `0.43` group Provider Travel rate in favor of the unified effective rate, based on commit `3d7c5a9` having removed the configurable group rate. If a distinct group rate is actually required by NDIS rules, it must return as a schema field, not a hardcode. Historical PDFs printed with 0.43 differ from what re-generation will now produce.
- Residual known gap: the 6 UI call sites still show totals without the user rate (default 0.99 when no client override). Follow-up: expose the user's rate via existing user tRPC state and thread `rateContext` through those components.
- CONTEXT.md still mentions `groupTransitRatePerKm` (stale — field removed); update the doc when convenient.
- The `rateType` time-vs-distance precedence quirk (plan 005, Step 2, case 5) remains open.
