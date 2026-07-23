# Plan 037: Activity detail page → billing breakdown + trip summary

> **Executor instructions**: Follow this plan step by step. Read the linked
> `CONTEXT.md` terms and ADR 0005 before starting. Run every verification
> command before moving on. If a STOP condition occurs, stop and report. When
> done, update this plan's status row in `docs/plans/README.md`.

## Status

- **Status**: DONE
- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (read-only page + one additive `byId` fetch; no schema change, no billing-logic change)
- **Depends on**: — (soft: 036 is framework-frozen on `main`; land small or coordinate)
- **TRD**: —
- **ADR**: [0005](../adr/0005-activity-detail-shows-live-rates.md)
- **Planned at**: 2026-07-24

## Why

Today the activity detail page (`src/components/activities/activity-page.tsx`) is a strict subset of the activity list row - it shows support-item _description_, date, time/distance, client, and an invoice link, but omits the total the list already shows. The operator's own words: _"I only ever go through it to get to edit; it doesn't tell me the transport or support item code or total amount."_

The page's unique, missing job is a per-activity **billing breakdown** - expanding the Activity into its Billing Lines, which is visible nowhere else for a **Pending Activity** (the invoice shows it only once invoiced). See `CONTEXT.md` (Billing Line, Provider Travel, Activity Based Transport, Group Activity, Trip, Leg, Transit Segment) for the vocabulary.

## Current state

- **Page component**: `src/components/activities/activity-page.tsx` - renders heading + date + time/distance + client + invoice link + edit/delete menu. This is what we replace.
- **Route**: `src/pages/dashboard/activities/[id]/index.tsx` (dynamic-imports the component; no change expected).
- **Data**: `activity.byId` in `src/server/api/routers/activity-router.ts` uses `defaultActivitySelect` (line ~14), which loads `supportItem`, `client`, `invoice {invoiceNo,id}`, `transportItems`, `transitDistance/Duration`, `itemDistance`, and `trip {id,date}` - but **not** the trip's sibling legs.
- **Costing (reuse, do not reimplement)**: `src/lib/billing-lines.ts`
  - `billableLines(activity, rateContext, { forDisplay: true })` → `BillableLine[]` (`kind`, `description`, `supportItemCode`, `quantity`, `unit`, `unitPrice`, `total`, `transportType`, `note`). This is the single costing path (same as PDF/invoice) - use it with `forDisplay: true` so a legacy reversed-time row degrades to 0 instead of throwing.
  - `lineDetailsText(...)`, `lineUnitPriceSuffix(...)` for per-line rendering.
  - `groupSizeOf(activity)`, `getRateForActivity(activity)`, `apportion(...)` for the group split display.
- **Trip helpers (reuse)**: `src/lib/trip-utils.ts` - `sortActivitiesByTime(...)` (order legs), `calculateTripTransit(...)` (per-leg position + transit segments), `MAX_TRANSIT_DURATION_MINUTES` (= 30, the Travel Time Cap).
- **Rate context**: `src/components/shared/use-rate-context.ts` (`useRateContext()`), as consumed today by `activity-list.tsx`.
- **List total for parity check**: `getTotalCostOfActivities([activity], rateContext, { forDisplay: true })` in `src/lib/activity-utils.ts`.

## Scope

**In scope**:

- `src/server/api/routers/activity-router.ts` - extend `activity.byId` (only) to also load the trip's sibling legs (each: `id`, `client {name}`, `startTime`, `endTime`, `supportItem {description}`, `transitDistance`, `transitDuration`, `itemDistance`). Do **not** change `defaultActivitySelect` (keeps list/forInvoice payloads lean); add a `byId`-specific select or a follow-on trip include.
- `src/components/activities/activity-page.tsx` - rebuild as the breakdown page.
- Optional small presentational subcomponents under `src/components/activities/` (e.g. `activity-breakdown.tsx`, `activity-trip-summary.tsx`) if the component grows past readability.
- Unit tests for any new pure helper (e.g. mapping `BillableLine[]` → grouped display rows); e2e touch-up if an existing activity-detail e2e asserts the old layout.

**Out of scope**:

- Any change to billing math, `billableLines`, or the invoice/PDF path.
- Reading frozen Invoice Version numbers (ADR 0005: detail page is always live).
- A dedicated Trip detail page / trip navigation beyond leg→leg links to existing activity pages.
- Per-leg dollar breakdowns in the trip summary.
- Schema/migration changes.

## Tasks

- [x] **1. Extend `activity.byId`** to include the trip's sibling legs (see Scope for fields). Leave `defaultActivitySelect` untouched. Verify the other `byId` fields still resolve.
- [x] **2. Header + metadata block**: support item **code + description**, date, time-span or distance, client link, and prominent **invoice status** - "Pending" when uninvoiced, else the invoice number with its Sent/Paid state (link to the invoice). Keep the existing edit/delete dropdown and delete flow.
- [x] **3. Billing breakdown (centerpiece)**: render `billableLines(activity, rateContext, {forDisplay:true})` as priced rows, one per applicable `LineKind` (SUPPORT, TRAVEL_TIME, TRAVEL_KM, ABT, EXPENSE), using `lineDetailsText` / `lineUnitPriceSuffix`. Show a clear **total** and confirm it equals `getTotalCostOfActivities([activity], …)`. Non-applicable kinds don't render.
- [x] **4. Group apportionment**: when `groupSizeOf(activity) > 1`, show a "Group of N" marker and, on apportioned lines, the split (e.g. `$240.00 ÷ 4 = $60.00`) using the pre-apportion rate from `getRateForActivity` and the apportioned figure.
- [x] **5. Travel Time Cap note**: when a Provider Travel labour figure was capped at `MAX_TRANSIT_DURATION_MINUTES`, annotate that line ("capped at 30 min").
- [x] **6. Live-rates caveat**: for an invoiced activity, show "reflects current rates - see invoice for billed amount" near the total, gated on invoice status (ADR 0005).
- [x] **7. Trip summary** (only when `activity.tripId`): ordered list of all legs via `sortActivitiesByTime`, this leg highlighted; each leg shows client + time + position (from home / inter-client / return) using `calculateTripTransit`; show the Transit Segment between legs; other legs link to their own activity page. **One** trip-transit total line. **No** per-leg dollars.
- [x] **8. Tests**: unit-test any new pure mapping helper; update/confirm e2e for the activity detail route.

## STOP conditions

- The breakdown total does not equal `getTotalCostOfActivities([activity], …)` for the same activity → stop; the page must not present a second costing path (see `CONTEXT.md` Billing Line).
- Extending `byId` would require widening `defaultActivitySelect` (and thus list payloads) → stop and reconsider the query shape.

## Commands

| Purpose    | Command           | Expected |
| ---------- | ----------------- | -------- |
| Typecheck  | `pnpm type-check` | exit 0   |
| Unit tests | `pnpm test:unit`  | all pass |
| E2E        | `pnpm test:e2e`   | all pass |

## Verification

Load a pending single activity, a pending group activity, an invoiced activity, and an activity that is a leg of a multi-leg trip. Confirm: code + description shown; breakdown rows match the invoice/PDF for the invoiced one; group split renders; cap note appears when transit was capped; live-rates caveat appears only when invoiced; trip summary lists all legs with positions/transit and links, no per-leg dollars; displayed total equals the list total.

## Git workflow

- Branch: `advisor/037-activity-breakdown`
- Do NOT push or open a PR unless the operator instructed it.
