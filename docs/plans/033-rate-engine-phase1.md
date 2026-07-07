# Plan 033: Rate engine phase 1 — catalogue as data, effective-dated (TRD-002 D1)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/lib/support-item-utils.ts prisma/schema.prisma docs/trd/trd-002-support-item-catalogue-and-rate-engine.md docs/plans/021-refresh-ndis-catalogue.md`
> Check plan 021's status in `docs/plans/README.md` first — if DONE, the JSON
> is named `ndis-support-catalogue.json` and a converter script exists at
> `scripts/generate-ndis-catalogue.ts` to build on.

## Status

- **Priority**: P2
- **Effort**: L (phase 1 of a multi-phase TRD; later phases get their own plans)
- **Risk**: MED — touches the code that names travel/ABT lines on every invoice
- **Depends on**: 021 (interim refresh; supplies the converter script), sequenced before 034 (readiness checks want engine warnings)
- **Category**: direction
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

`docs/trd/trd-002-support-item-catalogue-and-rate-engine.md` is the compliance floor for this product: today pricing knowledge is hand-typed from PDFs, there is **no public-holiday tier anywhere** (PH work under-bills by roughly $60/h per the TRD), rates are not effective-dated (the 1-Jul-2026 rollover happened two days before this plan was written), and custom rates validate against nothing. The full TRD is several plans of work. **Phase 1 (this plan)** builds the foundation everything else stands on: the official catalogue as an effective-dated database table (`SupportItemDef`), seeded from the checked-in 2026-27 XLSX, with the travel/ABT code lookups re-pointed at it. Phases 2–3 (holiday calendar + `resolveRate` engine + consumers) are follow-up plans written once this lands.

## Current state

- The spec: `docs/trd/trd-002-support-item-catalogue-and-rate-engine.md` — read fully. Phase-1-relevant decisions inlined:
  - **D1 table** (verbatim from the TRD):

```
SupportItemDef: supportItemNumber, name, registrationGroup, unit, quoteRequired,
priceNational / priceRemote / priceVeryRemote,
effectiveFrom, effectiveTo,            // from catalogue Start/End dates
allowsNF2F, allowsTravel, allowsCancellation,  // catalogue Y/N columns
catalogueVersion                        // e.g. "2026-27 v1.0"
```

- Seed with **2025-26 and 2026-27** rows minimum, so the 1-Jul rollover is testable immediately. Resolution rule: pick the row where `effectiveFrom ≤ serviceDate ≤ effectiveTo`.
- `getNonLabourTravelCode` / `getActivityBasedTransportCode` re-point at this table (keyed by registration group, as today) and the bundled JSON is deleted.
- Recorded answers: the user bills only 0125/0136 families; catalogue updates ship as versioned seed data (no runtime fetching — an in-app "new catalogue available" banner is enough, later).
- Catalogue sources in-repo: `docs/ndis/Clean - NDIS Support Catalogue - 2026-27 v1.0.xlsx`; the 2025-26 pricing PDF also sits there but a 2025-26 _catalogue XLSX_ may not — see STOP conditions.
- Current consumers to re-point: `src/lib/support-item-utils.ts` (all functions listed in plan 021's Current state; note `getSupportItemDefs` feeds a **client-side** autocomplete — moving it to a DB table means a tRPC query replaces the static import; find the UI consumers: `grep -rn "getSupportItemDefs\|getRegistrationGroups\|getSupportCategories" src`).
- **Browser-bundle constraint**: commit `ff0d3be` ("avoid pulling generated Prisma client runtime into the browser bundle") — reference data must reach the client through a tRPC query, never by importing server modules into components.
- Prisma workflow in this repo: schema at `prisma/schema.prisma`, migrations via `pnpm prisma:migrate`, seed via `pnpm prisma:seed` (see `prisma.config.ts` for wiring). `SupportItemDef` is reference data owned by no user — it has **no `ownerId`** and sits outside the `ownedDb` seam (`src/server/api/owned.ts`); reads can use `ctx.prisma` directly (matches the seam's documented exceptions).
- Domain vocabulary to use in names/comments (from `CONTEXT.md`): "Support Item", "Price Guide", "Price Limited Support", "Quotable Support".

## Commands you will need

| Purpose     | Command                               | Expected on success              |
| ----------- | ------------------------------------- | -------------------------------- |
| Migration   | `pnpm prisma:migrate`                 | migration created + applied      |
| Seed        | `pnpm prisma:seed`                    | exit 0, SupportItemDef populated |
| Typecheck   | `pnpm type-check`                     | exit 0                           |
| Unit tests  | `pnpm test:unit`                      | all pass                         |
| Integration | `pnpm db:up && pnpm test:integration` | all pass                         |
| E2E         | `pnpm test:e2e`                       | all pass                         |

## Scope

**In scope**:

- `prisma/schema.prisma` (add `SupportItemDef`), new migration
- Seed pipeline: extend `scripts/generate-ndis-catalogue.ts` (from plan 021) to emit seed rows with effective dates + catalogue version; prisma seed wiring
- `src/lib/support-item-utils.ts` → travel/ABT lookups become async DB queries (new home: keep the pure code-parsing in the lib; the queries live server-side — follow where callers are: `grep -rn "getNonLabourTravelCode\|getActivityBasedTransportCode" src`)
- A new `supportItemDef` (or extension of `support-item-router.ts`) tRPC query for the autocomplete surface
- The autocomplete UI consumers (mechanical swap from static import to tRPC query)
- Delete `src/lib/ndis-support-catalogue.json` once nothing imports it

**Out of scope** (later phases — do not start them):

- `resolveRate` engine, PH tier columns, `User.state`/holiday calendar, override validation, migration of existing user `SupportItem`s to catalogue references (TRD D2–D6).
- Any change to how invoices currently _price_ lines — phase 1 changes where **codes and reference data** come from, not rate math. Invoice totals must be byte-identical before/after (the PDF snapshot suite proves it).

## Git workflow

- Branch: `advisor/033-rate-engine-phase1`
- Commits per step; conventional, concise titles (e.g. `feat: add effective-dated SupportItemDef reference table`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Schema + migration

Add `SupportItemDef` per the TRD block above (map types: strings; `Decimal` for prices — match how `SupportItem` stores rates today, check `prisma/schema.prisma`; `DateTime @db.Date` for effective dates; `@@unique([supportItemNumber, effectiveFrom])`; index on `[registrationGroup, effectiveFrom]`).

**Verify**: `pnpm prisma:migrate` → applied; `pnpm type-check` → 0.

### Step 2: Seed from the catalogue XLSX(s)

Extend the plan-021 converter to emit `SupportItemDef` rows (all registration groups — storing everything costs nothing; _curating_ variant sets later only covers 0125/0136). Stamp `catalogueVersion` and effective dates from the workbook. Wire into `pnpm prisma:seed` (idempotent: upsert on the unique key).

**Verify**: `pnpm prisma:seed` → 0; `psql`-or-prisma count query shows rows for catalogueVersion "2026-27 v1.0"; spot-check one known 0125 item's national price against the XLSX.

### Step 3: Re-point the travel/ABT lookups

Make the lookup effective-dated and DB-backed: given `(supportItemCode, serviceDate)`, resolve registration group (keep the existing pure regex `getGroupFromCode`), query `SupportItemDef` for that group's "Provider travel - non-labour costs" / "Activity Based Transport" row effective at `serviceDate`. Thread `serviceDate` from the callers (they have the activity date — follow each call site found by grep). Keep function names; callers keep reading naturally.

**Verify**: `pnpm test:unit` → PDF text/snapshot tests pass **unchanged** (codes for current-date fixtures must be identical to the 2026-27 JSON's); `pnpm test:integration` → pass.

### Step 4: Autocomplete via tRPC

Add a query (input: optional registration-group filter; output: the def fields the UI shows) and swap the UI consumers off the static import. Respect the browser-bundle constraint (no prisma imports client-side — the existing routers are the pattern).

**Verify**: `pnpm test:e2e` → support-item creation flow (`e2e/support-items.test.ts`) green; `grep -rn "ndis-support-catalogue" src` → only the (now-deletable) JSON itself.

### Step 5: Delete the JSON

Remove the file and any residual references (including the plan-021 unit test that pinned the JSON lookups — replace it with an equivalent DB-backed integration test).

**Verify**: `grep -rn "ndis-support-catalogue" src scripts` → no matches; full suite green.

## Test plan

- Integration (new file, e.g. `src/server/api/test/support-item-def.integration.test.ts`): effective-date resolution — same item number returns the 2025-26 price for a 2026-06-30 service date and the 2026-27 price for 2026-07-01 (the TRD's rollover test); travel/ABT lookup returns the right code per registration group per date; unknown group / out-of-range date → the documented miss behavior (`undefined` today — pin it, and make sure a miss is _loud_ at the caller per plan 021's note).
- Existing PDF snapshot/text tests are the "no pricing behavior changed" gate — they must pass without regeneration.

## Done criteria

- [ ] `SupportItemDef` exists, seeded with ≥2 catalogue versions (or 1 + a STOP report, per below)
- [ ] Travel/ABT codes resolve from the DB, effective-dated; JSON deleted
- [ ] Autocomplete works from the tRPC query (e2e green)
- [ ] PDF snapshots unchanged (`git status` shows no `__pdf_snapshots__`/`__pdf_text__` churn)
- [ ] `pnpm type-check`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e` all exit 0
- [ ] `docs/plans/README.md` status row updated; follow-up phase-2 scope noted there

## STOP conditions

- No 2025-26 **catalogue XLSX** exists in `docs/ndis/` (only the pricing-arrangements PDF): seed 2026-27 alone, note in the index that the rollover test is pending the 2025-26 file, and report — do NOT hand-transcribe prices from the PDF.
- The XLSX lacks a column the TRD schema requires (e.g. NF2F/travel/cancellation Y/N flags) — report actual columns; drop only clearly-optional fields with a note.
- PDF snapshots change in Step 3 — codes drifted between JSON and XLSX for the fixture family; report the specific code diff (it may be a real 2026-27 change plan 021 already absorbed, or a converter bug).
- `serviceDate` threading forces signature changes beyond the direct call chain (>~6 files) — the coupling is bigger than planned; report.

## Maintenance notes

- Phase 2 (write next, as its own plan): PH tier columns + `User.state` + holiday table + `isHoliday(date, state)`. Phase 3: `resolveRate` per TRD D4 with warnings, consumers migrated, cross-client rate-bleed fix. The TRD's testing notes (table-driven variant×year tests, property tests) belong to phase 3.
- Annual catalogue update procedure after this plan: drop the new XLSX in `docs/ndis/`, extend the seed, `pnpm prisma:seed` in deploy — document in README when it stabilizes.
