# Plan 007: One billable-lines interface for Activity billing; the PDF becomes a renderer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0ae76ab..HEAD -- src/lib/pdf-generation.ts src/lib/activity-utils.ts src/server/api/routers/pdf-router.ts "src/pages/api/invoices/generate-pdf/[id].ts"`
> Plans 001 (generatePDF signature + ownership), 004 (`>= 20`), 005 (tests),
> and 006 (transit rate via `getTransitRate`, `rateContext` threaded) are
> EXPECTED to have landed — those diffs are fine and this plan assumes them.
> Any OTHER change to these files: compare the "Current state" excerpts
> against the live code before proceeding; on a mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P2
- **Effort**: M–L
- **Risk**: MED (restructures how invoice lines are computed; totals must not change beyond the cases documented below)
- **Depends on**: plans/001, plans/005, plans/006
- **Category**: architecture
- **Planned at**: commit `0ae76ab`, 2026-07-02 (architecture review, revision 2)

## Why this matters

After plan 006, the two implementations of "what an Activity costs" agree on
rates but both stay alive: `pdf-generation.ts` builds line items as display
strings inline over Prisma queries, while `getTotalCostOfActivities`
(`activity-utils.ts:134`) computes the total separately. The line math is
authored twice, and plan 006's own maintenance notes record its residual gap
(6 UI totals still can't see the user's Transit Rate).

Three accepted TRDs then need a structured lines interface that doesn't
exist:

- **TRD-002 D6** makes activity cost / invoice totals / PDF all callers of
  the rate-resolution engine — they need one seam to sit behind.
- **TRD-005 D3** attaches the rendered PDF to an email send.
- **TRD-006 D1** snapshots "exactly what the PDF shows" into `InvoiceLine`
  rows at send-time and demands **one renderer, two data sources** (live
  lines for drafts, snapshotted lines for sealed invoices).

After this plan: `billableLines(activity, rateContext)` is the single
implementation of line math; `getTotalCostOfActivities` is a thin sum over
it (its 9 call sites unchanged); `pdf-generation.ts` splits into a thin
Prisma loader and a pure `renderInvoicePdf` that is testable with fixtures
and ready to accept TRD-006's snapshotted lines as its second data source.

## Current state

(Line numbers at `0ae76ab`, i.e. before plans 001/006 touch these files —
re-locate rather than trust offsets.)

- `src/lib/activity-utils.ts:134-183` — `getTotalCostOfActivities` computes,
  per activity: support time/distance cost, Provider Travel non-labour
  (`transitDistance × getTransitRate`), Provider Travel labour
  (`transitDuration × rate/60`), Activity Based Transport items
  (`DISTANCE × (isGroup ? 0.49 : 0.99)`, others at face value). Each subtotal
  `round`ed to 2dp. Returns only a number — the line structure is discarded.
- `src/lib/pdf-generation.ts:77-196` — re-derives the same categories as
  string arrays (`activityStrings`), pushing one row per support line,
  Provider Travel labour line, Provider Travel non-labour line
  (`getNonLabourTravelCode`), and ABT line (`getActivityBasedTransportCode`).
  Lines 198-223 sort rows by description and merge rows with equal
  descriptions by string concatenation. Line 228 computes the printed Total
  via `getTotalCostOfActivities` — a separate code path from the rows above.
- **Known divergence between the two implementations** (survives plan 006,
  which only unifies the per-km rate): the PDF's support line is gated on
  `supportItem.rateType` (`HOUR` → time math, `KM` → distance math,
  `pdf-generation.ts:85-102`), while `getTotalCostOfActivities` branches on
  `startTime && endTime` presence (`activity-utils.ts:144-150`). Plan 005
  characterized the time-over-distance precedence quirk. This plan must pick
  ONE rule for the shared lines — see Step 1 decision.
- Two PDF entry points call `generatePDF`: `src/server/api/routers/pdf-router.ts`
  (tRPC, consumed by `pdf-preview.tsx`) and
  `src/pages/api/invoices/generate-pdf/[id].ts` (raw route). After plan 001
  both pass `(invoiceId, ownerId)`.
- The 6 UI total call sites that plan 006 left without `rateContext`:
  `calendar-agenda.tsx:59,97`, `calendar-day-modal.tsx:138`,
  `log-payment-dialog.tsx:107`, `invoice-page.tsx:130`,
  `invoice-list.tsx:217`, `activity-list.tsx:136`.
- `user.fetch` (`src/server/api/routers/user-router.ts:21`) already returns
  the session user — the natural source for the user's `transitRatePerKm` in
  components.
- TRD-006 D1's target line shape (this plan computes it live; TRD-006 later
  persists it):

```
kind LineKind        // SUPPORT | TRAVEL_TIME | TRAVEL_KM | ABT | EXPENSE
description; supportItemCode; serviceDate
quantity; unit; unitPrice; total
activityId
```

- Repo conventions: tabs, double quotes, co-located `*.test.ts` vitest files.

## Commands you will need

| Purpose   | Command                                           | Expected on success        |
| --------- | ------------------------------------------------- | -------------------------- |
| Unit      | `pnpm exec vitest run`                            | all pass                   |
| Typecheck | `pnpm type-check`                                 | exit 0                     |
| Lint      | `pnpm lint`                                       | exit 0                     |
| E2E       | `pnpm db:up && pnpm prisma:push && pnpm test:e2e` | all pass (requires Docker) |

(Do NOT run `pnpm test:unit` — watch mode, never exits. Use `pnpm exec vitest run`.)

## Scope

**In scope** (the only files you should modify/create):

- `src/lib/billing-lines.ts` (create — the deep module) + `src/lib/billing-lines.test.ts`
- `src/lib/activity-utils.ts` (re-express `getTotalCostOfActivities` over lines; no interface change)
- `src/lib/pdf-generation.ts` (split loader/renderer; rows come from lines)
- `src/server/api/routers/pdf-router.ts`, `src/pages/api/invoices/generate-pdf/[id].ts` (call the shared loader)
- The 6 UI call-site components listed above (Step 6 only — thread the user rate)

**Out of scope** (do NOT touch, even though they look related):

- Persisting lines (`InvoiceLine` table, sealing, `AMENDED` status) — TRD-006.
- Rate resolution internals (`getRateForActivity`, holidays, catalogue) — TRD-002 replaces them behind this same seam later.
- Trip transit allocation (`trip-utils.ts`, `trip-router.ts`) — plan 008.
- Invoice email sending — TRD-005.

## Git workflow

- Branch: `arch/007-billable-lines`
- Conventional commits, e.g. `refactor: compute invoice lines through one billable-lines module`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Define the module and its interface

Create `src/lib/billing-lines.ts` exporting:

```ts
export type LineKind =
	| "SUPPORT"
	| "TRAVEL_TIME"
	| "TRAVEL_KM"
	| "ABT"
	| "EXPENSE";

export interface BillableLine {
	kind: LineKind;
	description: string;
	supportItemCode: string;
	serviceDate: Date;
	quantity: number; // hours, km, or 1 for EXPENSE
	unit: "HOUR" | "KM" | "EACH";
	unitPrice: number; // 0-decimal-safe number; EXPENSE lines: unitPrice = amount
	total: number; // round(quantity * unitPrice, 2), or face value for EXPENSE
	activityId?: string;
}

export function billableLines(activity, rateContext?): BillableLine[];
```

Move the per-category math out of `getTotalCostOfActivities` (it is the
canonical arithmetic — plan 005's tests pin it) and take the codes from the
PDF path (`getRateForActivity` tuple for SUPPORT/TRAVEL_TIME,
`getNonLabourTravelCode` for TRAVEL_KM, `getActivityBasedTransportCode` for
ABT/EXPENSE).

**Decision (support-line gating)**: lines branch on `rateType` like the PDF
does (`HOUR` → time math, `KM` → `itemDistance` math), because the PDF is
the printed truth. This changes the total ONLY for the pathological fixture
plan 005 characterized (an activity with both a time span and
`itemDistance` under a KM-rate item). Update that one characterization test
to the new rule with a comment referencing this plan; every other plan-005
expectation must pass unchanged.

**Verify**: `pnpm exec vitest run src/lib/billing-lines.test.ts` — new tests
cover: one line per category for a fully-loaded activity; group ABT at 0.49;
TRAVEL_KM at the plan-006 effective rate; EXPENSE at face value; and the
invariant `sum(lines[].total) === getTotalCostOfActivities([activity], ctx)`
for every fixture (write this as a property-style loop over the fixtures).

### Step 2: Re-express `getTotalCostOfActivities` over lines

In `src/lib/activity-utils.ts`, the function body becomes: map activities →
`billableLines` → sum `total`s → `round(…, 2)`. Signature and export
unchanged; all 9 call sites untouched.

**Verify**: `pnpm exec vitest run` → all plan-005 tests pass except the one
deliberately updated in Step 1.

### Step 3: PDF rows come from lines

In `src/lib/pdf-generation.ts`, replace the inline `activityStrings`
construction (lines 77-196) with: load activities → `billableLines` per
activity → format each `BillableLine` into the existing 5-column row shape
(description+code, date, count string, unit price string, total string).
Keep the existing sort/merge behavior (lines 198-223) but key it on
`kind + supportItemCode + description` instead of the formatted string.
The printed Total becomes `round(sum of all line totals, 2)` — the Total row
now agrees with the rows by construction; delete the separate
`getTotalCostOfActivities` call at line 228.

**Verify**: `pnpm type-check` → exit 0. `grep -n "getTotalCostOfActivities" src/lib/pdf-generation.ts` → no matches.

### Step 4: Split loader and renderer

Still in `src/lib/pdf-generation.ts` (or a sibling `invoice-pdf.ts` if
cleaner):

1. `loadInvoiceForPdf(invoiceId, ownerId)` — the Prisma queries (invoice +
   client + activities + user), returning a plain data object including the
   computed `BillableLine[]`.
2. `renderInvoicePdf(data)` — pure: takes that object, returns
   `{ pdfString, fileName }`. No Prisma import.
3. `generatePDF(invoiceId, ownerId)` stays as the composed export so the two
   entry points don't change behavior; both `pdf-router.ts` and the raw API
   route keep calling it.

**Verify**: `grep -n "prisma" src/lib/pdf-generation.ts` (or the new file) →
Prisma appears only in the loader. Add a fixture test
`renderInvoicePdf` returns a non-empty `pdfString` and the expected
`fileName` for a hand-built data object — no database, no mocks.

### Step 5: Full regression pass

**Verify**: `pnpm exec vitest run`, `pnpm type-check`, `pnpm lint`,
`pnpm format:check` → all exit 0. If Docker available:
`pnpm db:up && pnpm prisma:push && pnpm test:e2e` → passes. Manually
generate one PDF (`pnpm dev`, open an invoice) and confirm the rows and
Total look unchanged for a non-group invoice.

### Step 6: Close plan 006's residual UI gap

Add a small hook (e.g. `src/components/shared/use-rate-context.ts`) that
reads `trpc.user.fetch.useQuery()` and returns
`{ userTransitRatePerKm: Number(user?.transitRatePerKm ?? 0.99) }` (undefined
while loading). Pass it as the second argument at the 6 call sites listed in
Current state. `user.fetch` is already cached by react-query, so this adds no
new network chatter.

**Verify**: `grep -rn "getTotalCostOfActivities(" src/components | grep -v rateContext` → no matches (every component call site passes the context).

## Test plan

- Step 1's invariant test (lines sum ≡ total) is the heart: it makes
  "PDF Total = sum of PDF rows" a property, not a hope.
- Renderer fixture test (Step 4) — first-ever PDF test without a database.
- Plan 005's suite is the regression net; only the one documented
  characterization flips.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `src/lib/billing-lines.ts` + test exist; `pnpm exec vitest run` exits 0
- [ ] `grep -n "getTotalCostOfActivities" src/lib/pdf-generation.ts src/lib/invoice-pdf.ts 2>/dev/null` → no matches (PDF total comes from lines)
- [ ] Renderer has no Prisma import (grep per Step 4)
- [ ] All 6 UI call sites pass a rate context (grep per Step 6)
- [ ] Exactly one plan-005 characterization test changed, with a comment citing this plan
- [ ] `pnpm type-check`, `pnpm lint`, `pnpm format:check` exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plans 001/005/006 have not landed (`generatePDF` takes one argument, `src/lib/trip-utils.test.ts` missing, or `0.43` still present in `pdf-generation.ts`).
- Making the Step 1 gating decision changes any fixture total OTHER than the single characterized quirk — that means the two implementations disagreed somewhere this plan didn't predict; the new disagreement must be reported, not silently absorbed.
- The PDF row merge (lines 198-223) turns out to be load-bearing for a layout case the line-keyed merge can't reproduce (e.g. same code, different descriptions) — report with the example invoice shape.
- TRD-006 work has already started on an `InvoiceLine` Prisma model with a different shape — align the `BillableLine` type with the schema rather than this plan's sketch, and note the deviation.

## Maintenance notes

- TRD-006 D1 implements sealing by persisting `BillableLine[]` at send-time
  and calling `renderInvoicePdf` with stored lines — the renderer must stay
  free of live-data reads for that to hold.
- TRD-002 D4's `resolveRate` engine replaces `getRateForActivity` +
  the transit/ABT constants _inside_ `billableLines`; callers are unaffected.
  That is the point of the seam.
- Reviewer: the diff should show arithmetic MOVING, not changing. Any
  changed constant or rounding call is a red flag.
