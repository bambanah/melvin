# Plan 005: Characterization tests for trip transit allocation and activity cost math

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c48e1dd..HEAD -- src/lib/trip-utils.ts src/lib/activity-utils.ts src/lib/activity-utils.test.ts`
> If `trip-utils.ts` or `activity-utils.ts` changed since this plan was
> written (other than plan 004's one-line `>= 20` fix), compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: LOW (test-only change; no production code may be modified)
- **Depends on**: docs/plans/004-evening-rate-8pm-boundary.md (so tests lock in the corrected 8pm boundary, not the bug)
- **Category**: tests
- **Planned at**: commit `c48e1dd`, 2026-07-02

## Why this matters

`calculateTripTransit` in `src/lib/trip-utils.ts` allocates billable Provider Travel across the activities of a Trip (first leg from home, manual inter-client legs, return leg, 30-minute NDIS travel-time cap). It feeds the dollar amounts on invoices and has **zero tests at any layer** (no unit tests; no e2e touches trips). The transit-rate branches of `getTotalCostOfActivities` are similarly uncovered. Plan 006 changes that rate logic — these characterization tests must exist first so 006 has a safety net. **This is a test-only plan: if a test reveals what looks like a bug, record the current behavior with a comment and report it — do not change production code.**

## Current state

- `src/lib/trip-utils.ts` — pure functions, no I/O. Key behaviors to pin down (all verified against the code at `c48e1dd`):
  - `calculateTripTransit(activities, interClientLegs)` (line 41) returns `Map<activityId, { transitDistance, transitDuration, durationCapped }>`.
  - Activities are sorted by `startTime` first (`sortActivitiesByTime`, line 31; `null` startTimes sort last).
  - First activity: `transitDistance = client.distanceToClient ?? 0`; duration = `travelTimeToClient` capped at 30 (`MAX_TRANSIT_DURATION_MINUTES`, line 3), `durationCapped: true` when capped.
  - Middle/last activities: looked up from `legsMap` keyed `` `${fromId}->${toId}` `` (line 52) — a **missing leg yields distance/duration 0** (lines 73-85).
  - Last activity when `sorted.length > 1` (line 87): **adds** the return leg (`distanceToClient` again, plus `travelTimeToClient` capped at 30 independently of any cap already applied to its incoming leg — the two caps stack, so a last activity can have up to 60 minutes duration).
  - A single-activity input gets ONLY the first leg (the `isLast` block requires `length > 1`) — one-way, no return.
  - `getEffectiveTransitRate(client, user)` (line 118): `Number(client?.transitRatePerKm ?? user.transitRatePerKm)`. Currently **dead code** (no production caller) — plan 006 wires it in; test it now anyway.
- `src/lib/activity-utils.ts` — `getTotalCostOfActivities(activities, rateContext?)` (line 134). Branches to pin down:
  - Time-based: `duration * rate` when `startTime && endTime` (lines 144-147) — takes precedence over `itemDistance` even for KM-rate items (known quirk; characterize, don't fix).
  - `itemDistance * rate` otherwise (line 148-149).
  - Transit distance: `transitDistance * getTransitRate(activity, rateContext)` where `getTransitRate` (line 185) = `client.transitRatePerKm || rateContext?.userTransitRatePerKm || 0.99`.
  - Transit duration: `transitDuration * (rate / 60)` (lines 157-162).
  - Transport items (lines 164-176): `DISTANCE` type × (isGroup ? `0.49` : `0.99`); other types added at face value.
  - Every subtotal is rounded to 2dp via `round` from `generic-utils`, then the grand total rounded again.
- `src/lib/activity-utils.test.ts` — the existing test style to follow: plain vitest `test`/`expect`, fixtures built with `Prisma.Decimal` from `@/generated/client`, times via `dayjs.utc("1970-01-01T15:00").toDate()`, dates chosen as 2022-01-14 (Friday) / 15 (Sat) / 16 (Sun). See the `getActivity` helper at lines 12-44.
- Domain vocabulary to use in test names (from CONTEXT.md): "Trip", "Provider Travel", "Inter-Client Transit", "Travel Time Cap", "Activity Based Transport".

## Commands you will need

| Purpose      | Command                                           | Expected on success |
| ------------ | ------------------------------------------------- | ------------------- |
| Run new file | `pnpm exec vitest run src/lib/trip-utils.test.ts` | all pass            |
| Run all unit | `pnpm exec vitest run`                            | all pass            |
| Typecheck    | `pnpm type-check`                                 | exit 0              |
| Lint         | `pnpm lint`                                       | exit 0              |

(Do NOT run `pnpm test:unit` — watch mode, never exits.)

## Scope

**In scope** (the only files you should modify/create):

- `src/lib/trip-utils.test.ts` (create)
- `src/lib/activity-utils.test.ts` (extend)

**Out of scope** (do NOT touch):

- ANY production source file. If a characterized behavior looks wrong, add a `// NOTE: characterizes current behavior — see docs/plans/README.md` comment on the test and report it.
- `src/lib/pdf-generation.ts` — its math is exercised indirectly via `getTotalCostOfActivities`; direct PDF testing needs an extraction refactor that plan 006 handles.
- `src/lib/overlap-utils.ts` — needs a Prisma mock/DB harness; deferred (see docs/plans/README.md).

## Git workflow

- Branch: `advisor/005-money-math-tests`
- Commit message: `test: characterize trip transit and activity cost math`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `src/lib/trip-utils.test.ts`

Build a small fixture helper mirroring the `TripActivity` interface (import types from `@/lib/trip-utils`; use `new Prisma.Decimal(n)` for decimal fields, `dayjs.utc(...)` for times). Cover, as separate `test()` blocks:

1. Empty input → empty Map.
2. Single activity → first-leg only: distance = `distanceToClient`, duration = `travelTimeToClient`, NO return leg added.
3. Two activities with an inter-client leg: first gets home→client values; second gets leg values PLUS the return leg (distance = leg + own `distanceToClient`).
4. Three activities: middle activity gets exactly its incoming leg's values (no return component).
5. Missing inter-client leg → middle activity gets `{ transitDistance: 0, transitDuration: 0 }` (characterizes the silent-zero behavior; add the NOTE comment).
6. Travel Time Cap: `travelTimeToClient = 45` on the first activity → duration 30, `durationCapped: true`.
7. Cap stacking on the last activity: incoming leg duration 45 AND `travelTimeToClient = 45` → duration 60 (30 + 30), `durationCapped: true` (characterizes that caps apply per-leg).
8. Sorting: activities passed out of `startTime` order are allocated as if sorted; an activity with `null` startTime sorts last.
9. `getEffectiveTransitRate`: client override wins; falls back to user rate when client rate is null.
10. `Prisma.Decimal` inputs for `distanceToClient`/leg distances produce plain-number outputs (the functions call `Number(...)`).

**Verify**: `pnpm exec vitest run src/lib/trip-utils.test.ts` → all pass. If any expectation fails, re-derive the expected value from the code excerpts above; if the code genuinely disagrees with this plan's description, STOP.

### Step 2: Extend `src/lib/activity-utils.test.ts` for the cost branches

Add `test()` blocks (reuse/extend the existing fixture helpers):

1. Transit distance with a client rate: `client: { transitRatePerKm: new Prisma.Decimal(0.5) }`, `transitDistance = 10` → adds 5.00.
2. Transit distance with NO client but `rateContext: { userTransitRatePerKm: 0.85 }` → uses 0.85.
3. Transit distance with neither → uses the 0.99 default.
4. Transport items: DISTANCE item on a non-group activity → × 0.99; on a group activity → × 0.49; a PARKING/TOLL item → added at face value.
5. Quirk characterization: an activity with BOTH `startTime`/`endTime` AND `itemDistance` bills by time only (add the NOTE comment — this is finding #9's rateType quirk; plan 006's maintenance notes track it).

**Verify**: `pnpm exec vitest run src/lib/activity-utils.test.ts` → all pass.

### Step 3: Full verification

**Verify**: `pnpm exec vitest run` → all pass. `pnpm type-check` → exit 0. `pnpm lint` → exit 0. `pnpm format:check` → exit 0 (run `pnpm format:write` on touched files if needed).

## Test plan

This plan IS the test plan. Target: ≥10 new tests in `trip-utils.test.ts`, ≥5 new cost-branch tests in `activity-utils.test.ts`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `src/lib/trip-utils.test.ts` exists; `pnpm exec vitest run src/lib/trip-utils.test.ts` exits 0 with ≥10 tests
- [ ] `pnpm exec vitest run` exits 0
- [ ] `git diff --stat` shows ONLY the two test files changed
- [ ] `pnpm type-check`, `pnpm lint`, `pnpm format:check` exit 0
- [ ] Behaviors 5 and 7 (Step 1) and quirk 5 (Step 2) carry a NOTE comment marking them as characterization of current behavior
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 004 has not landed (check: `grep -n ">= 20" src/lib/activity-utils.ts` returns a match; if it still says `>= 19`, execute 004 first or report).
- The live code's behavior contradicts the "Current state" description (e.g. missing legs no longer yield 0) — the code drifted; the plan needs re-derivation, not guesswork.
- You feel compelled to change production code to make a test pass — that is out of scope by definition here.

## Maintenance notes

- Plan 006 will change `getTransitRate`'s group behavior and thread `rateContext` through real callers — tests 1-4 in Step 2 are exactly the net it needs; expect 006 to UPDATE some expectations deliberately (with justification), not delete them.
- The characterized quirks (silent-zero missing legs, stacked 30-min caps, time-over-distance precedence) are candidate bugs recorded in docs/plans/README.md — when any is fixed, flip its characterization test into a specification test.
- Router-level integration tests (a real test DB) remain the biggest gap; see docs/plans/README.md follow-ups.
