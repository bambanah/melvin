# Plan 007: One billable-lines interface for Activity billing; the PDF becomes a renderer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat f2f1154..HEAD -- src/lib/pdf-generation.ts src/lib/activity-utils.ts src/server/api/routers/pdf-router.ts "src/pages/api/invoices/generate-pdf/[id].ts" src/lib/testing`
> This plan was revised at `f2f1154` (2026-07-07). Plan 006 (revised the same
> day: `rateContext` threaded through the PDF and invoice-router aggregates,
> goldens regenerated at $0.85/km) is EXPECTED to have landed — that diff is
> fine and this plan assumes it. Any OTHER change to these files: compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M–L
- **Risk**: MED (restructures how invoice lines are computed; totals must not change beyond the cases documented below)
- **Depends on**: docs/plans/complete/001, docs/plans/complete/005, docs/plans/006
- **Category**: architecture
- **Planned at**: commit `0ae76ab`, 2026-07-02 (architecture review, revision 2). **Revised**: commit `f2f1154`, 2026-07-07.

## Revision note (2026-07-07)

Two things changed since original planning:

1. Commit `f8e5097` single-sourced the transit rate: `getTransitRate` is
   exported from `activity-utils.ts` and has a group branch
   (`isGroup` → `GROUP_TRANSIT_RATE` 0.43). The PDF line items already call
   it. Plan 006 (revised) now only threads `rateContext` + client includes.
2. The same commit added a **PDF golden-master harness**:
   `src/lib/pdf-generation.text.test.ts` (text goldens in
   `src/lib/__pdf_text__/`, via `toMatchFileSnapshot`),
   `src/lib/pdf-generation.render.test.ts` (PNG snapshots in
   `src/lib/__pdf_snapshots__/`, updated with `UPDATE_PDF_SNAPSHOTS=1`), and
   `src/lib/testing/invoice-fixtures.ts` (16 fixtures +
   `mockPrismaForFixtures` for `vi.mock("@/server/prisma", ...)`).

Consequences for this plan: the original Step 4 promise ("first-ever PDF
test without a database") is obsolete — the harness already exists and
becomes this plan's **primary regression net**: the refactor must keep every
golden master byte-identical. The loader/renderer split additionally lets
the golden tests call `renderInvoicePdf(fixtureData)` directly, dropping the
Prisma mock for most of them.

Also note **plan 016** (group activities up to 10 participants): it will
replace the group constants (0.43 transit / 0.49 ABT) and the hourly rate
lookup with group-size-apportioned math **inside** `billableLines`. Keep the
rate constants and `getTransitRate` usage encapsulated in the module so 016
is an internal change — that is the point of the seam.

## Why this matters

After plan 006, the two implementations of "what an Activity costs" agree on
rates but both stay alive: `pdf-generation.ts` builds line items as display
strings inline over Prisma queries, while `getTotalCostOfActivities`
(`activity-utils.ts:137`) computes the total separately. The line math is
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
it (its call sites unchanged); `pdf-generation.ts` splits into a thin
Prisma loader and a pure `renderInvoicePdf` that is tested directly against
the fixture suite and ready to accept TRD-006's snapshotted lines as its
second data source.

## Current state

(Line numbers at `f2f1154`; plan 006's revision will shift them slightly —
re-locate rather than trust offsets.)

- `src/lib/activity-utils.ts:137-186` — `getTotalCostOfActivities` computes,
  per activity: support time/distance cost, Provider Travel non-labour
  (`transitDistance × getTransitRate`), Provider Travel labour
  (`transitDuration × rate/60`), Activity Based Transport items
  (`DISTANCE × (isGroup ? 0.49 : 0.99)`, others at face value). Each subtotal
  `round`ed to 2dp. Returns only a number — the line structure is discarded.
- `src/lib/activity-utils.ts:188-201` — `getTransitRate` (exported): group →
  0.43, else client override → `rateContext.userTransitRatePerKm` → 0.99.
- `src/lib/pdf-generation.ts:78-200` — re-derives the same categories as
  string arrays (`activityStrings`), pushing one row per support line,
  Provider Travel labour line, Provider Travel non-labour line
  (`getNonLabourTravelCode`), and ABT lines (`getActivityBasedTransportCode`;
  DISTANCE items at the per-km rate, PARKING/TOLL/OTHER at face value with
  the type label in the Details column). Lines 202-227 sort rows by
  description and merge rows with equal descriptions by string concatenation.
  Line 232 computes the printed Total via `getTotalCostOfActivities` — a
  separate code path from the rows above.
- **Known divergence between the two implementations** (survives plan 006,
  which only unifies the per-km rate): the PDF's support line is gated on
  `supportItem.rateType` (`HOUR` → time math, `KM` → distance math,
  `pdf-generation.ts:88-105`), while `getTotalCostOfActivities` branches on
  `startTime && endTime` presence (`activity-utils.ts:147-153`). Plan 005
  characterized the time-over-distance precedence quirk
  (`activity-utils.test.ts` "Should bill by time rather than itemDistance
  when an activity has both"). This plan must pick ONE rule for the shared
  lines — see Step 1 decision. **No PDF fixture hits this quirk** (none has
  both a time span and `itemDistance` on a KM-rate item), so the goldens are
  unaffected by the decision; only that one unit test flips.
- Two PDF entry points call `generatePDF`: `src/server/api/routers/pdf-router.ts`
  (tRPC, consumed by `pdf-preview.tsx`) and
  `src/pages/api/invoices/generate-pdf/[id].ts` (raw route). Both pass
  `(invoiceId, ownerId)`.
- The 6 UI total call sites that plan 006 left without `rateContext`:
  `calendar-agenda.tsx:59,97`, `calendar-day-modal.tsx:138`,
  `log-payment-dialog.tsx:107`, `invoice-page.tsx:133`,
  `invoice-list.tsx:224`, `activity-list.tsx:136`.
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
- `src/lib/pdf-generation.text.test.ts`, `src/lib/pdf-generation.render.test.ts` (Step 4 only — point golden tests at the pure renderer)
- `src/server/api/routers/pdf-router.ts`, `src/pages/api/invoices/generate-pdf/[id].ts` (call the shared loader)
- The 6 UI call-site components listed above + a new `use-rate-context` hook (Step 6 only)

**Out of scope** (do NOT touch, even though they look related):

- Golden-master files (`src/lib/__pdf_text__/`, `src/lib/__pdf_snapshots__/`) — they must remain **byte-identical**; a change means the refactor changed behavior.
- `src/lib/testing/invoice-fixtures.ts` fixture VALUES (adding a re-export or helper for the renderer's input shape is fine).
- Persisting lines (`InvoiceLine` table, sealing, `AMENDED` status) — TRD-006.
- Rate resolution internals (`getRateForActivity`, holidays, catalogue) — TRD-002 replaces them behind this same seam later.
- Group-size apportioning (`GROUP_TRANSIT_RATE`, `0.49`, hourly ÷ N) — plan 016; keep the constants where the module encapsulates them.
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
ABT/EXPENSE). Per-km rates come from `getTransitRate` (group branch and all)
and the `isGroup ? 0.49 : 0.99` ABT constant — both end up encapsulated
inside this module or behind functions it calls, so plan 016 can swap them
for group-size math without touching callers.

**Decision (support-line gating)**: lines branch on `rateType` like the PDF
does (`HOUR` → time math, `KM` → `itemDistance` math), because the PDF is
the printed truth. This changes the total ONLY for the pathological fixture
plan 005 characterized (an activity with both a time span and
`itemDistance` under a KM-rate item — the unit test added in `054fdfb`).
Update that one characterization test to the new rule with a comment
referencing this plan; every other plan-005 expectation must pass unchanged.

**Verify**: `pnpm exec vitest run src/lib/billing-lines.test.ts` — new tests
cover: one line per category for a fully-loaded activity; group ABT at 0.49;
group TRAVEL_KM at 0.43 (via `getTransitRate`'s group branch); solo
TRAVEL_KM at the plan-006 effective rate (client → user → 0.99); EXPENSE at
face value; and the invariant
`sum(lines[].total) === getTotalCostOfActivities([activity], ctx)` for every
fixture (write this as a property-style loop over the fixtures).

### Step 2: Re-express `getTotalCostOfActivities` over lines

In `src/lib/activity-utils.ts`, the function body becomes: map activities →
`billableLines` → sum `total`s → `round(…, 2)`. Signature and export
unchanged; all call sites untouched.

**Verify**: `pnpm exec vitest run` → all plan-005 tests pass except the one
deliberately updated in Step 1. Golden masters pass unchanged.

### Step 3: PDF rows come from lines

In `src/lib/pdf-generation.ts`, replace the inline `activityStrings`
construction (lines 78-200) with: load activities → `billableLines` per
activity → format each `BillableLine` into the existing 5-column row shape
(description+code, date, count string, unit price string, total string).
Keep the existing sort/merge behavior (lines 202-227) but key it on
`kind + supportItemCode + description` instead of the formatted string.
Preserve the exact printed formats (time ranges, `formatDuration`, the
PARKING/TOLL/OTHER label + note in the Details column, `-` unit price for
EXPENSE) — the goldens will catch any drift. The printed Total becomes
`round(sum of all line totals, 2)` — the Total row now agrees with the rows
by construction; delete the separate `getTotalCostOfActivities` call at
line 232.

**Verify**: `pnpm type-check` → exit 0. `grep -n "getTotalCostOfActivities" src/lib/pdf-generation.ts` → no matches. `pnpm exec vitest run src/lib/pdf-generation.text.test.ts` → passes with NO golden updates.

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
4. Repoint the golden tests: `pdf-generation.text.test.ts` and
   `pdf-generation.render.test.ts` build the renderer's input directly from
   each fixture (fixtures are already shaped like the loader's output) and
   call `renderInvoicePdf` — no `vi.mock`. Keep ONE test that goes through
   `generatePDF` with `mockPrismaForFixtures` so the loader's query shape
   and ownership checks stay covered.

**Verify**: `grep -n "prisma" src/lib/pdf-generation.ts` (or the new file) →
Prisma appears only in the loader. `pnpm exec vitest run` → all golden
masters still byte-identical.

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
- The 16 golden masters are the regression net: byte-identical through
  Steps 2–4 (arithmetic moves, it does not change).
- Plan 005's unit suite: only the one documented characterization flips.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `src/lib/billing-lines.ts` + test exist; `pnpm exec vitest run` exits 0
- [ ] `grep -n "getTotalCostOfActivities" src/lib/pdf-generation.ts src/lib/invoice-pdf.ts 2>/dev/null` → no matches (PDF total comes from lines)
- [ ] Renderer has no Prisma import (grep per Step 4)
- [ ] `git status` shows NO changes under `src/lib/__pdf_text__/` or `src/lib/__pdf_snapshots__/`
- [ ] All 6 UI call sites pass a rate context (grep per Step 6)
- [ ] Exactly one plan-005 characterization test changed, with a comment citing this plan
- [ ] `pnpm type-check`, `pnpm lint`, `pnpm format:check` exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 006 (revised) has not landed: `grep -c "rateContext" src/lib/pdf-generation.ts` → 0. Its golden regeneration must come first — otherwise this plan's "goldens stay byte-identical" criterion is meaningless.
- Making the Step 1 gating decision changes any fixture total OTHER than the single characterized quirk — that means the two implementations disagreed somewhere this plan didn't predict; the new disagreement must be reported, not silently absorbed.
- Any golden master changes at any step — the refactor changed printed output; find the divergence instead of regenerating.
- The PDF row merge turns out to be load-bearing for a layout case the line-keyed merge can't reproduce (e.g. same code, different descriptions) — report with the example invoice shape.
- TRD-006 work has already started on an `InvoiceLine` Prisma model with a different shape — align the `BillableLine` type with the schema rather than this plan's sketch, and note the deviation.
- Plan 016 has already landed (`Activity.groupSize` exists / `GROUP_TRANSIT_RATE` gone) — fold its apportioning into `billableLines` as you build it, and note the deviation.

## Maintenance notes

- TRD-006 D1 implements sealing by persisting `BillableLine[]` at send-time
  and calling `renderInvoicePdf` with stored lines — the renderer must stay
  free of live-data reads for that to hold.
- TRD-002 D4's `resolveRate` engine replaces `getRateForActivity` +
  the transit/ABT constants _inside_ `billableLines`; callers are unaffected.
  That is the point of the seam.
- **Plan 016** swaps the group constants (0.43/0.49) and the hourly rate
  lookup for group-size-apportioned math inside `billableLines` — same seam.
- Reviewer: the diff should show arithmetic MOVING, not changing. Any
  changed constant or rounding call is a red flag.
