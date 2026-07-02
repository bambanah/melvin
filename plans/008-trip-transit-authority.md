# Plan 008: Make the Trip transit module the only transit authority

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0ae76ab..HEAD -- src/lib/trip-utils.ts src/server/api/routers/trip-router.ts src/components/trips/`
> Plan 005 (trip-utils characterization tests) is EXPECTED to have landed and
> is REQUIRED. Any other change to these files: compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it
> as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M–L
- **Risk**: MED (touches transit persistence; plan 005's tests plus one new behavior decision below)
- **Depends on**: plans/005
- **Absorbs**: plans/README findings #8 (trip mutation robustness) and #12 (duplicate trip modals); `docs/plans/architecture-deepening/` opportunities #1, #2, #5, #6
- **Category**: architecture
- **Planned at**: commit `0ae76ab`, 2026-07-02 (architecture review, revision 2)

## Why this matters

Provider Travel allocation is re-derived in four places. `calculateTripTransit`
(`trip-utils.ts:41`) is the canonical pure function (tested after plan 005),
but the trip router copy-pastes its calculate-then-persist write-back loop
four times without a transaction, inlines the standalone "home→client→home =
×2" restore three times, and both trip modals keep private copies of the
summary math and the 30-minute Travel Time Cap constant. Understanding "what
happens to transit when I remove an Activity from a Trip" requires reading
all of it.

TRD-004 builds directly on this surface: D1 (bulkAdd runs the full trip
pipeline), D4 (cap becomes region-based — one line if the cap lives in one
place), D5 (merge the modals — this plan does it). Every copy that survives
multiplies TRD-004's cost.

After this plan: `trip-utils` owns allocation, the cap, and the standalone
restore; the router applies one returned change-set inside one
`$transaction` per mutation; one trip editor component renders the same
values the server will write.

## Current state

(All line numbers at `0ae76ab`.)

- `src/lib/trip-utils.ts` — `calculateTripTransit(activities, legs)` returns
  `Map<activityId, TransitValues>`; `MAX_TRANSIT_DURATION_MINUTES = 30`
  (line 3); dead `getEffectiveTransitRate` (line 118, superseded by plan 006's
  exported `getTransitRate`).
- `src/server/api/routers/trip-router.ts` — five mutations:
  - Write-back loop (`transit.get(id)` → `activity.update`) copy-pasted at
    `98-109` (create), `175-186` (addActivity), `289-300` (removeActivity),
    `364-375` (update). No `$transaction` anywhere — a crash mid-loop leaves
    a Trip half-updated.
  - Standalone ×2 restore inlined at `239-250` (dissolve), `269-280`
    (removeActivity), `403-415` (delete):
    `distanceToClient * 2` / `travelTimeToClient * 2` — **uncapped**.
  - Dead guard: `tripActivitySelect` (lines 13-34) does not select `tripId`,
    so the "already in a trip" check at `61-70` casts to
    `{ tripId?: string }` and always sees `undefined` — the CONFLICT can
    never fire (finding #8). Integrity currently rests on `addActivity`'s
    `tripId: null` filter and the schema.
- `src/components/trips/trip-builder-modal.tsx` (452 lines) and
  `trip-edit-modal.tsx` (425 lines) — near-identical: `InterClientValues`
  interface (builder:31 / edit:39), `MAX_DURATION = 30` (builder:39 /
  edit:46), `getGapWarning` (builder:132), and a `transitSummary` useMemo
  (builder:157-207, edit:130-161) that re-implements first/middle/last
  allocation with per-leg capping.
- **Behavioral divergence to resolve**: the modals cap the standalone
  comparison per leg (`Math.min(travelTimeToClient, 30) * 2`,
  builder:194) but the router's restore writes `travelTimeToClient * 2`
  uncapped. A client 45 minutes away restores to 90 claimable minutes —
  above the NDIS Travel Time Cap on both legs. The deep module must pick the
  capped rule (matches `calculateTripTransit`'s per-leg semantics and the
  cap's meaning in CONTEXT.md); this is a deliberate behavior change to the
  router path.
- ADRs 0001 (one-way semantics), 0002 (manual legs), 0003 (recalculate on
  modify) all stand; this plan concentrates them, it does not reopen them.
- Repo conventions: tabs, double quotes, `TRPCError({ code: "NOT_FOUND" })`.

## Commands you will need

| Purpose   | Command                                           | Expected on success        |
| --------- | ------------------------------------------------- | -------------------------- |
| Unit      | `pnpm exec vitest run`                            | all pass                   |
| Typecheck | `pnpm type-check`                                 | exit 0                     |
| Lint      | `pnpm lint`                                       | exit 0                     |
| E2E       | `pnpm db:up && pnpm prisma:push && pnpm test:e2e` | all pass (requires Docker) |

(Do NOT run `pnpm test:unit` — watch mode, never exits.)

## Scope

**In scope** (the only files you should modify/create):

- `src/lib/trip-utils.ts` + `src/lib/trip-utils.test.ts`
- `src/server/api/routers/trip-router.ts`
- `src/components/trips/` (merge the two modals; new shared module/component files here are fine)

**Out of scope** (do NOT touch, even though they look related):

- `activity.bulkAdd`'s missing trip pipeline — TRD-004 D1 (it will call the interface this plan builds).
- Remembered client-pair legs (`ClientPairDistance`) — TRD-004 D2.
- Region-based cap values — TRD-004 D4 (this plan keeps 30 but leaves it a parameter).
- Rate math (`getTransitRate`, `billableLines`) — plans 006/007.
- Deleting `getEffectiveTransitRate` IS in scope (dead after plan 006) — remove it and its plan-005 test.

## Git workflow

- Branch: `arch/008-trip-transit-authority`
- Conventional commits, e.g. `refactor: single authority for trip transit allocation`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Deepen `trip-utils`

Add to `src/lib/trip-utils.ts`:

```ts
export function standaloneTransit(
	client: {
		distanceToClient: Prisma.Decimal | null;
		travelTimeToClient: Prisma.Decimal | null;
	} | null
): TransitValues;
// distance = distanceToClient * 2
// duration = min(travelTimeToClient, MAX_TRANSIT_DURATION_MINUTES) * 2  ← capped per leg
// durationCapped = travelTimeToClient > cap

export interface TransitUpdate {
	activityId: string;
	transitDistance: number;
	transitDuration: number;
}

export function tripTransitUpdates(
	activities: TripActivity[],
	legs: InterClientLeg[]
): TransitUpdate[];
// = calculateTripTransit flattened into the exact write list the router applies

export function standaloneTransitUpdates(
	activities: TripActivity[]
): TransitUpdate[];
// = standaloneTransit per activity, for dissolve/delete paths
```

Make `MAX_TRANSIT_DURATION_MINUTES` an exported constant (single
declaration; the modals import it in Step 3). Delete
`getEffectiveTransitRate` and its test. Tests first: extend
`trip-utils.test.ts` with `standaloneTransit` cases (uncapped input, capped
input at 45 → 60 total, null client → zeros) and an assertion that
`tripTransitUpdates` agrees with `calculateTripTransit` for a 3-activity
fixture.

**Verify**: `pnpm exec vitest run src/lib/trip-utils.test.ts` → all pass.

### Step 2: The router applies change-sets in transactions

In `trip-router.ts`, per mutation:

- Compute `TransitUpdate[]` via the Step 1 functions.
- Apply every write for the mutation (trip create/delete, leg
  create/deleteMany, activity `tripId` changes, transit updates) inside ONE
  `ctx.prisma.$transaction(async (tx) => { … })`, replacing the four loops
  and three inline ×2 blocks with a single shared
  `for (const u of updates) await tx.activity.update(…)` helper local to the
  file.
- Fix the dead guard: add `tripId: true` to `tripActivitySelect` and make the
  check at `61-70` a plain `activities.some((a) => a.tripId)` — no cast.

**Verify**: `pnpm type-check` → exit 0.
`grep -c "transitDistance: values.transitDistance" src/server/api/routers/trip-router.ts` → 0 (loops replaced).
`grep -c "\* 2" src/server/api/routers/trip-router.ts` → 0 (restore logic moved to trip-utils).
`grep -c "\$transaction" src/server/api/routers/trip-router.ts` → ≥5 (one per mutation).

### Step 3: One trip editor

Merge `trip-builder-modal.tsx` and `trip-edit-modal.tsx` (finding #12,
~850 duplicated lines) into one component (e.g. `trip-editor-modal.tsx`)
with a `mode: "create" | "edit"` (or presence-of-trip) prop:

- `InterClientValues`, `getGapWarning`, and the leg-input state live once.
- The summary is DERIVED from the deep module: build `TripActivity[]` from
  the selected activities, call `calculateTripTransit` +
  `standaloneTransit`, and render totals/savings from the result. Delete
  both `transitSummary` useMemos and both local `MAX_DURATION` constants
  (import the exported one for the "will be capped" hint only).
- Callers (`grep -rn "TripBuilderModal\|TripEditModal" src/` to find them)
  switch to the merged component; delete the two old files.

**Verify**: `grep -rn "MAX_DURATION = 30" src/components` → no matches.
`pnpm type-check`, `pnpm lint` → exit 0.

### Step 4: Full regression pass

**Verify**: `pnpm exec vitest run` → all pass. If Docker available: e2e
passes. Manual smoke (`pnpm dev`): build a trip from 3 activities, check the
summary matches the persisted per-activity transit shown afterwards; remove
the middle activity; delete the trip and confirm activities restore to
capped ×2 values.

## Test plan

- Step 1 unit tests are the specification for the new surface; plan 005's
  suite guards `calculateTripTransit` itself.
- The capped-restore behavior change gets an explicit test
  (`travelTimeToClient = 45` → standalone duration 60, not 90).
- Router-level lifecycle tests (create → modify → dissolve under two users)
  belong to plan 009's harness — add them there once it exists; note it in
  your completion report.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] Step 2's three greps hold (no inline loops, no `* 2`, ≥5 transactions)
- [ ] `grep -rn "getEffectiveTransitRate" src/` → no matches
- [ ] One trip editor component; both old modal files deleted
- [ ] `MAX_TRANSIT_DURATION_MINUTES` declared exactly once in `src/`
- [ ] `pnpm exec vitest run`, `pnpm type-check`, `pnpm lint`, `pnpm format:check` exit 0
- [ ] E2E passes (or explicitly reported as not run — no Docker)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 005 has not landed (`src/lib/trip-utils.test.ts` missing).
- Plan 003 has touched `trip-router.ts` in a way the excerpts don't show (it
  shouldn't — trip-router is out of plan 003's scope — but verify).
- The uncapped-restore behavior turns out to be asserted anywhere (a test, a
  TRD, or invoice fixtures) — the cap decision needs the operator, not you.
- The two modals differ somewhere this plan calls "near-identical" in a way
  that changes user-visible behavior (diff them first: the edit modal
  pre-fills from existing legs) — reconcile deliberately and list every
  intentional difference in the commit message.
- TRD-004 implementation has already started on the same files.

## Maintenance notes

- TRD-004 D1 should implement `bulkAdd`'s trip pipeline as: create trip →
  resolve legs → `tripTransitUpdates` → apply in the same transaction — the
  interface this plan leaves behind. D4's region cap becomes a parameter of
  the two allocation functions.
- TRD-006's sealing guard ("trip recalculations must not touch sealed
  activities") lands as ONE check where the change-set is applied, instead
  of four — flag ADR-0003 as superseded when that happens.
- Reviewer: the transit numbers written by the router must be byte-identical
  to revision-1 behavior EXCEPT the documented capped-restore change.
