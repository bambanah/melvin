# Plan 016: Group activities with up to 10 participants

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat f2f1154..HEAD -- src/lib/activity-utils.ts src/lib/pdf-generation.ts src/lib/billing-lines.ts src/schema src/server/api/routers/invoice-router.ts src/server/api/routers/activity-router.ts prisma/schema.prisma`
> Plans 006 (revised — `rateContext` threaded, goldens at $0.85/km) and 007
> (`billableLines` module, loader/renderer split) are EXPECTED to have
> landed — those diffs are fine. If 007 has NOT landed, see "Sequencing"
> below before proceeding. Any OTHER change: compare the "Current state"
> excerpts against the live code; on a mismatch, treat it as a STOP
> condition.

## Status

- **State**: DONE (2026-07-07)
- **Priority**: P2
- **Effort**: L
- **Risk**: MED–HIGH (schema + data migration; redefines what a group support item's stored rate MEANS; billing-visible cent changes documented below)
- **Depends on**: docs/plans/006 (hard — effective transit rate must be threaded), docs/plans/007 (recommended — puts all the line math this plan changes in one module)
- **Category**: feature
- **Planned at**: commit `f2f1154`, 2026-07-07

## Operator decisions (2026-07-07)

Confirmed with the operator; do not re-litigate these:

1. **Per-km rates apportion by group size.** Per-participant rate =
   `floorToCent(base ÷ N)`. For Provider Travel (transit) the base is the
   plan-006 effective rate (client override → user rate → 0.99); for
   Activity Based Transport DISTANCE items the base is 0.99.
2. **N = the number of participant clients selected at creation** (the
   primary client + 1–9 others; max 10 total). All billed participants are
   Melvin clients. N is stored on each created activity as
   `Activity.groupSize`.
3. **Hourly support rates scale too.** A group support item's stored rates
   are REDEFINED to hold the full per-session hourly rate; each participant
   is billed `floorToCent(rate ÷ N)`. The migration multiplies existing
   group items' stored rates ×2 so N=2 billing is unchanged (e.g. stored
   35.10 → 70.20; billed 70.20 ÷ 2 = 35.10). The operator accepts that NDIS
   published ratio price limits (1:2, 1:3, …) are not exact divisions —
   validating against the catalogue's ratio limits is OUT of scope.
4. **Rounding: floor to the cent** — the summed claim across participants
   never exceeds the base/cap. Billing-visible consequences at N=2:
   - ABT: 0.99 ÷ 2 → **$0.49/km (unchanged)**.
   - Transit on the 0.85 default user rate: 0.85 ÷ 2 → **$0.42/km**
     (today's hardcode is $0.43 — a deliberate −1c/km change; the old 0.43
     rounded up and 2 × 0.43 = 0.86 over-claimed an 0.85 base).
   - Hourly per-participant: unchanged (see 3).

## Why this matters

Group activities are hardwired to exactly 2 participants:

- `// TODO: Handle groups other than 2 clients` sits above
  `GROUP_TRANSIT_RATE = 0.43` in `activity-utils.ts`.
- The ABT group rate is a second 2-participant hardcode
  (`isGroup ? 0.49 : 0.99`) in two files.
- Both creation flows accept exactly one extra participant
  (`groupClientId: z.string()`), and the quick-entry form literally
  validates "Second participant is required".
- Nothing stores how many participants shared a session, so the maths could
  not scale even if the UI allowed it.

The operator runs groups larger than 2. After this plan: a group activity
records its participant count (2–10), every participant gets a mirrored
activity, and all three rate categories (hourly support, Provider Travel
per-km, ABT per-km) bill the apportioned `floorToCent(base ÷ N)` amount.

## Current state — where "exactly 2" lives

(At `f2f1154`. If plan 007 has landed, the rate math in items 1–3 lives in
`src/lib/billing-lines.ts` instead — re-locate before editing.)

1. `src/lib/activity-utils.ts:57-58` — `GROUP_TRANSIT_RATE = 0.43` + TODO;
   `getTransitRate` (`:188-201`) returns it for `isGroup` before the
   client → user → 0.99 precedence.
2. `src/lib/activity-utils.ts:168-171` — ABT `isGroup ? 0.49 : DEFAULT_ACTIVITY_TRANSPORT_RATE (0.99)`.
3. `src/lib/pdf-generation.ts:157-158` — the same ABT split, duplicated
   (plan 007 removes this duplication).
4. `src/lib/activity-utils.ts:72-133` — `getRateForActivity` resolves the
   hourly rate with no group awareness; the labour-travel line
   (`transitDuration × rate/60`) uses the same resolved rate.
5. `prisma/schema.prisma` — `Activity` has no group-size column;
   `SupportItem.isGroup Boolean?` is the only group marker. Migrations are
   managed with `prisma migrate dev` (`prisma/migrations/`).
6. `src/schema/invoice-schema.ts:12` — `groupClientId: z.string()` (single).
7. `src/server/api/routers/invoice-router.ts:64-86` —
   `generateNestedWriteForGroupActivities` creates ONE mirrored activity per
   group activity (`clientId: groupClientId`, transit from that client's
   `distanceToClient`); the create mutation (`:255-286`) validates the group
   clients and calls it.
8. `src/components/invoices/invoice-activity-creation-form.tsx` — a single
   `ClientSelect` bound to `groupClientId` (with `excludeClientId` for the
   primary client), shown when the chosen support item `isGroup`.
9. `src/components/activities/multi-activity-form.tsx` — `ActivityRowData`
   has a single `groupClientId`; validation error "Second participant is
   required"; on save pushes exactly one mirrored activity (no transport
   items) and calls `activity.bulkAdd`. `src/schema/activity-schema.ts`'s
   `activitySchema` (the bulkAdd input) has no group fields at all —
   the mirrored activity is just a second plain activity.
10. `CONTEXT.md` ("Billable Driving" → Transit Rate) still describes the
    removed `groupTransitRatePerKm` field — stale since `3d7c5a9`.
11. Fixtures/goldens (`src/lib/testing/invoice-fixtures.ts`): `transit-group`
    ($0.43/km), `transport-group-distance` ($0.49/km), `plan-managed-week`
    (group leg at 0.43/0.49, group hourly 35.10). The fixture group support
    item's rates are per-participant values — this plan's semantics change
    requires updating them to full-session values (×2) alongside the code.

## Sequencing

Do this plan AFTER 007 if at all possible: the apportioning then changes
exactly one module (`billing-lines.ts`) plus schema/router/UI, and the
golden masters verify the arithmetic end-to-end. If the operator directs you
to run before 007, the rate changes land in `activity-utils.ts` AND
`pdf-generation.ts` (both ABT sites) — note the deviation in your report.

## Commands you will need

| Purpose   | Command                                           | Expected on success        |
| --------- | ------------------------------------------------- | -------------------------- |
| Unit      | `pnpm exec vitest run`                            | all pass                   |
| Typecheck | `pnpm type-check`                                 | exit 0                     |
| Lint      | `pnpm lint`                                       | exit 0                     |
| Migration | `pnpm db:up && pnpm prisma:migrate`               | migration applies cleanly  |
| E2E       | `pnpm db:up && pnpm prisma:push && pnpm test:e2e` | all pass (requires Docker) |

(Do NOT run `pnpm test:unit` — watch mode, never exits.)

## Scope

**In scope**:

- `prisma/schema.prisma` + a new migration (`Activity.groupSize`, backfills)
- `src/lib/billing-lines.ts` (or `activity-utils.ts`/`pdf-generation.ts` pre-007) — apportioned rate math
- `src/lib/generic-utils.ts` — `floorToCent` helper (float-safe)
- `src/schema/invoice-schema.ts`, `src/schema/activity-schema.ts`
- `src/server/api/routers/invoice-router.ts` (group creation), `src/server/api/routers/activity-router.ts` (bulkAdd, if group fields flow through it)
- `src/components/invoices/invoice-activity-creation-form.tsx`, `src/components/activities/multi-activity-form.tsx`
- `src/lib/testing/invoice-fixtures.ts` (group item rates ×2, `groupSize` on group activities, one new N=3 fixture) + golden regeneration for the documented diffs
- Unit tests for the apportioning; `CONTEXT.md` group/transit definitions

**Out of scope**:

- Validating divided hourly rates against NDIS published ratio price limits (operator decision 3).
- Editing group membership after creation (mirrored activities stay independent rows; changing one activity's `groupSize` later does not update its siblings — record as a known limitation).
- A `GroupSession` entity linking mirrored activities — YAGNI until membership editing is needed.
- Trip transit allocation (`trip-utils.ts`) — plan 008. (Note: `bulkAdd` already sets `autoCreateTrip: false` when group activities are present.)
- Rate-resolution engine work — TRD-002.

## Git workflow

- Branch: `feat/016-group-size-apportioning`
- Conventional commits, e.g. `feat: support group activities with up to 10 participants`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Schema + migration

1. Add `groupSize Int?` to `Activity` in `prisma/schema.prisma` (null for
   non-group activities).
2. Create the migration with `pnpm prisma:migrate`, then append the data
   backfills to the generated SQL:
   - `UPDATE "Activity" SET "groupSize" = 2 WHERE "supportItemId" IN (SELECT id FROM "SupportItem" WHERE "isGroup" = true);`
   - Rate-semantics migration (operator decision 3): double the stored
     rates of group support items AND their client-specific overrides:
     `UPDATE "SupportItem" SET "weekdayRate" = "weekdayRate" * 2, "weeknightRate" = "weeknightRate" * 2, "saturdayRate" = "saturdayRate" * 2, "sundayRate" = "sundayRate" * 2 WHERE "isGroup" = true;`
     and the equivalent for `SupportItemRates` rows whose `supportItemId`
     is a group item. (Check exact table/column casing against earlier
     migrations in `prisma/migrations/`.)
3. Defensive read rule in code: an `isGroup` activity with `groupSize` null
   is treated as `groupSize = 2` (covers rows created between deploy and
   backfill, and any future data drift).

**Verify**: `pnpm db:up && pnpm prisma:migrate` applies cleanly;
`pnpm prisma:generate` + `pnpm type-check` → exit 0.

### Step 2: `floorToCent` and the apportioned rate math

1. In `src/lib/generic-utils.ts`, add a float-safe
   `floorToCent(value: number): number` — floor after neutralising float
   noise, e.g. `Math.floor(round(value * 100, 6)) / 100`. Pin it with unit
   tests: `floorToCent(0.99 / 2) === 0.49`, `floorToCent(0.85 / 2) === 0.42`,
   `floorToCent(70.2 / 2) === 35.1` (the classic `35.1 * 100 === 3509.99…`
   float trap), `floorToCent(0.99 / 3) === 0.33`,
   `floorToCent(0.99 / 10) === 0.09`.
2. In the billing module, define
   `groupSizeOf(activity) = activity.supportItem.isGroup ? activity.groupSize ?? 2 : 1`
   and apply it in all three categories:
   - **Hourly (SUPPORT + TRAVEL_TIME)**: the rate resolved by
     `getRateForActivity` becomes `floorToCent(rate / groupSizeOf(activity))`
     for group activities. Apply it ONCE to the resolved rate so the support
     line, the printed unit price, and the labour-travel `rate/60` all use
     the same per-participant figure.
   - **Transit (TRAVEL_KM)**: replace `getTransitRate`'s group branch:
     group → `floorToCent(effectiveRate / groupSize)` where `effectiveRate`
     is the existing client → user → 0.99 chain. Delete
     `GROUP_TRANSIT_RATE` and its TODO comment.
   - **ABT DISTANCE**: replace `isGroup ? 0.49 : 0.99` with
     `floorToCent(0.99 / groupSizeOf(activity))` (which is 0.99 itself for
     non-group). PARKING/TOLL/OTHER stay at face value — actual expenses,
     not per-km claims (whether to split expenses across participants is a
     future question; today the primary client carries them, keep that).
3. Add `groupSize` to the `Activity` interface(s) the billing module reads.

**Verify**: `pnpm exec vitest run` — new unit tests pass: N=2 hourly/ABT
unchanged against ×2'd fixture rates; N=2 transit now 0.42 on an 0.85 base;
N=3 and N=10 cases produce the pinned cents; non-group activities are
byte-for-byte unaffected.

### Step 3: Creation flows accept 1–9 extra participants

1. `src/schema/invoice-schema.ts`: `groupClientId: z.string()` →
   `groupClientIds: z.array(z.string()).max(9)` (empty array for non-group
   rows; require ≥1 when the support item is a group item — keep the
   refinement client-side if the schema can't see the item).
2. `src/server/api/routers/invoice-router.ts`: update
   `generateNestedWriteForGroupActivities` and the create mutation to fan
   out one mirrored activity per `groupClientId` (each with that client's
   `distanceToClient`/`travelTimeToClient` transit, as today) and stamp
   `groupSize = groupClientIds.length + 1` on the primary AND mirrored
   activities. Keep the existing validations (clients exist, owner-scoped)
   and add: ids distinct, primary client not among them, ≤9.
3. `src/schema/activity-schema.ts` + `activity-router.ts` bulkAdd: add
   optional `groupSize` (int, 2–10) so the quick-entry path can stamp it;
   reject `groupSize` on activities whose support item is not a group item.
4. `src/components/activities/multi-activity-form.tsx`: `groupClientId:
string` → `groupClientIds: string[]` with add/remove participant rows
   (each a `ClientSelect` excluding the primary and already-chosen clients,
   capped at 9); validation copy "Second participant is required" → "At
   least one other participant is required"; on save push one mirrored
   activity per selected client (still no transport items on mirrors) and
   set `groupSize` on all of them.
5. `src/components/invoices/invoice-activity-creation-form.tsx`: same
   multi-participant treatment for the `groupClientIds` field.

**Verify**: `pnpm type-check`, `pnpm lint` → exit 0. Manually: create a
3-participant group activity via the quick-entry form and via invoice
creation; confirm 3 activity rows exist, each with `groupSize = 3`.

### Step 4: Fixtures and golden masters

1. Update `src/lib/testing/invoice-fixtures.ts`: group support items get
   full-session rates (35.1 → 70.2 in `plan-managed-week`; the default
   group item mirrors whatever the solo item's rates are, ×1 — pick values
   so the ÷2 result is exact); group activities get `groupSize: 2`;
   non-group activities get `groupSize: null`.
2. Regenerate goldens (`pnpm exec vitest run -u`, and
   `UPDATE_PDF_SNAPSHOTS=1` for the render test). **Review every diff**:
   the ONLY permitted changes are group transit lines $0.43 → $0.42 (and
   dependent totals) in `transit-group` and `plan-managed-week`. Group
   hourly lines, group ABT lines ($0.49), and every solo fixture must be
   byte-identical.
3. Add one new fixture: a 3-participant group activity (`groupSize: 3`)
   with transit and a DISTANCE transport item — golden-master it. Expected
   per-participant rates for a 70.2 full rate and 0.85 user rate:
   hourly 23.40, transit 0.28 (floorToCent(0.85/3)), ABT 0.33.

**Verify**: `pnpm exec vitest run` → all pass; golden diff limited to the
documented lines plus the one new fixture's files.

### Step 5: Docs and full verification

1. Update `CONTEXT.md` "Billable Driving": delete the stale
   `groupTransitRatePerKm` sentence; document the new rule — group
   activities record a participant count (2–10) and bill each participant
   `floorToCent(rate ÷ N)` for hourly, Provider Travel per-km, and ABT
   per-km.
2. **Verify**: `pnpm exec vitest run`, `pnpm type-check`, `pnpm lint`,
   `pnpm format:check` → all exit 0. If Docker available: e2e passes.

## Test plan

- `floorToCent` pinned against the float traps and the N=2/3/10 tables above.
- N=2 equivalence: with ×2'd item rates, hourly and ABT cents are identical
  to pre-plan billing; transit changes by exactly −1c/km on an 0.85 base
  (documented decision 4).
- Golden masters: only the documented group transit lines move; the new N=3
  fixture pins the scaled maths end-to-end through the PDF.
- Router: create with 9 group clients succeeds (10 activities); 10 group
  clients rejected; duplicate or primary-among-group ids rejected.

## Done criteria

Machine-checkable. ALL must hold:

- [x] `grep -rn "GROUP_TRANSIT_RATE\|Handle groups other than 2" src/lib` → no matches
- [x] `grep -rn "0.49" src/lib --include="*.ts" | grep -v test | grep -v testing` → no matches (ABT group rate is computed, not hardcoded)
- [x] `grep -n "groupSize" prisma/schema.prisma` → one match on `Activity`; migration file includes both backfill UPDATEs
- [x] `grep -n "groupClientIds" src/schema/invoice-schema.ts` → array with `.max(9)`
- [x] New N=3 fixture + goldens exist; `pnpm exec vitest run` exits 0
- [x] Golden diffs for pre-existing fixtures touch only `transit-group` and `plan-managed-week` (the $0.43→$0.42 lines and totals)
- [x] `pnpm type-check`, `pnpm lint`, `pnpm format:check` exit 0
- [x] CONTEXT.md no longer mentions `groupTransitRatePerKm`
- [x] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 006 has not landed (`grep -c "rateContext" src/lib/pdf-generation.ts` → 0) — the transit base this plan divides doesn't exist yet.
- Any golden diff outside the documented set — the apportioning leaked into solo billing or changed group cents beyond decision 4.
- The production database is reachable from your environment and the rate ×2 migration would run against it — the operator must run/approve data migrations on real data themselves (existing group items' stored rates are per-participant; doubling them is semantic, not mechanical).
- `SupportItemRates` client overrides on group items turn out to be used with per-participant semantics somewhere this plan didn't find — the ×2 rule would double-bill; report the call site.
- Mirrored activities can already exist on the SAME invoice as the primary (rather than as pending activities for the other client) — the per-invoice totals math then needs review beyond this plan's scope.
- TRD-002's rate-resolution engine has started — apportioning may belong inside `resolveRate`; align rather than duplicate.

## Maintenance notes

- Splitting PARKING/TOLL/OTHER expenses across participants is deliberately
  unhandled (primary client carries them) — revisit if the operator asks.
- Group membership is immutable after creation; editing requires deleting
  and recreating the activities. A `GroupSession` entity is the natural
  next step if that becomes painful.
- TRD-002's `resolveRate` engine should absorb `floorToCent` apportioning
  when it lands, keeping `billableLines` callers unaffected.
