# TRD-002 — Support Item Catalogue & Rate Engine

**Status**: Proposed · **Priority**: P1 · **Depends on**: plans/004 (8pm boundary), plans/005 (characterization tests), plans/006 (travel-rate single source) · **Blocks**: TRD-003 (group limits), TRD-007 (cancellation rates), TRD-001 D6 (billing receipt)

## Problem

Melvin's pricing knowledge is typed in by hand from a PDF and then trusted forever:

- Support items are created by manually entering four codes + four rates; the in-app reference link is the 2024-25 price guide; the bundled autocomplete/code-mapping JSON (`ndis-support-catalogue-22-23.json`) is four price-guide generations old and silently drives the travel/ABT code lookups on every invoice.
- There is **no public-holiday tier** anywhere (schema, form, rate resolution) — PH work bills at weekend rates at best (~$60/h under-billed) and `isHoliday()` is display-only, current-year-only, and missing Easter and all state holidays.
- Rates are **not effective-dated**: NDIS limits changed on 1 Jul 2026 (two days ago); a July invoice covering June work needs both years' limits. Today the user would overwrite rates in place, corrupting historical invoices' regenerated PDFs.
- Custom per-client rates (`SupportItemRates`) validate against nothing, and `getRateForDay` picks the first rate row with the day populated — when callers pass rates for multiple clients (the invoice-list total path does), one client's negotiated rate can bleed into another's total.
- The code-suffix trap (`01-billing-requirements.md` §1) makes hand-typed codes an active hazard.

## Goals

1. A worker never types a support item code. They pick items from the official catalogue; day-variant codes, limits, and the associated travel/ABT/centre codes come with it.
2. One rate-resolution engine, effective-dated, that everything (activity cost, invoice totals, PDF, billing receipt) calls: `(activity, client, groupSize, date) → {code, unitPrice, quantity, warnings[]}`.
3. Public holidays resolved correctly per the user's state, for any service date.
4. Custom prices validated against the correct variant's limit at the service date.

## Non-goals

- Auto-updating the catalogue from ndis.gov.au at runtime. The catalogue ships as versioned seed data updated by a maintainer when NDIA publishes (roughly annually); an in-app "new catalogue available" banner is enough.
- Remote/very-remote price columns and MMM4-5 caps (store the data, don't build UI; national + MMM1-3 assumptions become explicit settings).
- Quotable/negotiated (non-listed) supports beyond what free-entry items already allow — keep manual item creation as an escape hatch, but validated.

## Design

### D1. Catalogue as data

New table `SupportItemDef` (read-only reference data, seeded from the official Support Catalogue XLSX — the same parse used for `docs/ndis/`):

```
supportItemNumber, name, registrationGroup, unit, quoteRequired,
priceNational / priceRemote / priceVeryRemote,
effectiveFrom, effectiveTo,               // from catalogue Start/End dates
allowsNF2F, allowsTravel, allowsCancellation,   // catalogue Y/N columns
catalogueVersion                          // e.g. "2026-27 v1.0"
```

Seed with (at minimum) 2025-26 and 2026-27 rows so the 1-Jul rollover is testable immediately. Multiple catalogue versions coexist; resolution picks the row where `effectiveFrom ≤ serviceDate ≤ effectiveTo`.

`getNonLabourTravelCode` / `getActivityBasedTransportCode` re-point at this table (keyed by registration group, like today) and the 22-23 JSON is deleted.

### D2. Variant groups

The catalogue is flat; Melvin's `SupportItem` concept ("the thing I bill this kind of work under") maps to a **variant set** — the five day/time codes of one item family. Ship curated variant-set definitions for the families that matter (0125 standard, 0136 standard, extendable), i.e. a small mapping table `{family, variant → supportItemNumber}` maintained with the seed. This is where the code-suffix trap is neutralized: the mapping is data reviewed once, not per-user typing.

**User flow**: "Add support item" → search catalogue by name/number → pick family → Melvin creates the `SupportItem` with all five variant codes populated and _no rates_ (rates come from the catalogue at resolution time unless overridden). Existing hand-entered items are matched to catalogue rows by code during a migration and flagged where they disagree.

### D3. Schema: `SupportItem` becomes a reference + overrides

- Add `publicHolidayCode` / `publicHolidayRate` columns (and to `SupportItemRates`) — the missing tier.
- Rates on `SupportItem`/`SupportItemRates` become **agreed-price overrides**; when null, the engine uses the catalogue limit for the service date. This makes the 1-Jul rollover automatic for anyone billing at the limit (the common case) — overrides are for negotiated below-limit prices.
- Overrides are validated on write _and_ on resolution (a rate written in June may exceed nothing until re-checked against… actually the limit only rises; still, validate at resolution and warn, since catalogue corrections can lower limits).

### D4. Rate resolution engine

Single pure module (deepen per `docs/plans/architecture-deepening` #1's philosophy):

```
resolveRate(input: {
  serviceDate, startTime, endTime,
  supportItem (variant set + overrides), clientRates?,
  groupSize?, state, mmmRegion
}): { code, unitPrice, quantityHours, variant, warnings: Warning[] }
```

Rules (from `01-billing-requirements.md` §2-4):

- Day classification: PH (state calendar) > Saturday > Sunday > weekday; midnight-to-midnight day attribution.
- Weekday time: daytime ends ≤20:00; evening otherwise; same-worker whole-support rule applies the higher variant to the full duration (single-worker product — always applies).
- Overnight spans: reject at capture (already blocked) — keep, but classify Sat-23:00→Sun-01:00 as invalid input with a clear message rather than mis-billing.
- Group: divide the variant limit by `groupSize` before applying overrides; a per-client override must be ≤ limit ÷ groupSize (warn + clamp at resolution, block at write).
- Warnings, not silent fallbacks: missing variant override where the catalogue has a higher limit ("billing weekday rate on a Saturday"), custom rate exceeding limit, no catalogue row for service date (too old/new).

Client rate scoping: resolution receives _only_ the rates for the activity's client — enforced by type (the engine takes `clientRates`, not a bag of `SupportItemRates[]` to search), killing the cross-client bleed.

### D5. Public holidays

- `User.state` setting (AU state/territory enum) + `User.mmmRegion` (default MMM1-3).
- Holiday calendar as generated data (national + state holidays incl. Easter-derived and substituted days) for a rolling window of years — `date-holidays` npm package or a generated static table checked into the repo (recommend the static table: auditable, no runtime dep, regenerated with the catalogue seed).
- `isHoliday(date, state)` replaces the current-year hack; calendar UI badge and rate engine share it.

### D6. Consumers

- `getRateForActivity` / `getTotalCostOfActivities` / `pdf-generation.ts` all become callers of the engine (plan 006 will have already unified the travel rate; this absorbs it).
- TRD-001's billing receipt renders `variant + unitPrice + warnings`.
- Invoice creation surfaces blocking warnings ("2 activities have rate warnings") before generating.

## Migration

1. Seed `SupportItemDef` + variant map + holiday table.
2. Match existing `SupportItem` codes against the catalogue; report mismatches (UI list: "couldn't verify these items").
3. Existing rates: keep as overrides where ≤ limit; flag where > limit (historical invoices unaffected — see TRD-006 for freezing).
4. Delete `ndis-support-catalogue-22-23.json` after re-pointing the code lookups.

## Testing notes

The heart of the validation strategy (`01-billing-requirements.md` §11 layer 2):

- Table-driven resolution tests: every (family × variant × year) exact code + limit from the seeded catalogue; boundaries 19:59/20:00/20:01, Fri→Sat midnight, PH-per-state (pick one interstate divergence, e.g. Melbourne Cup Day VIC-only), 30 Jun/1 Jul rollover on one invoice.
- Property: group limit ÷ N monotonic in N; override never raises effective price above limit.
- Migration dry-run test against a fixture DB snapshot with hand-entered items (correct, misspelled, and stale-rate cases).
- Golden invoice PDFs re-snapshotted (expect diffs at exactly the known-broken spots: PH activities, group rates).

## Open questions

- Does the worker bill anything outside 0125/0136 today? (Affects how many variant sets to curate in v1 — check production data before scoping.)
  - Answer: No
- When the agreed price _is_ the limit and the limit drops in a catalogue correction, should regenerated historical PDFs keep the historical agreed price? (TRD-006 resolves by freezing invoice lines; until then, resolution-at-service-date is correct.)
  - Answer: No
