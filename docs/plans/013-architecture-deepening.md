# 013 — Architecture Deepening

**Status**: REJECTED — superseded by executable plans: #6 → plan 005, #4 → plans 006/007, #1/#5 → plan 008, #2 → plan 008 Step 3. #3 (multi-activity form state) remains open here; it overlaps TRD-001's quick-form rebuild (`docs/trd/trd-001-capture-first-activity-entry.md`).
**Depends on**: —

> Migrated 2026-07-02 from `docs/plans/architecture-deepening/` (pre-numbering three-file format); plan, context, and tasks merged into this file. Rate figures below (`0.43`/`0.85`) are stale; see plan 006.

**Created**: 2026-06-20
**Last Updated**: 2026-07-02

## Overview

This document captures architectural friction points in the Melvin codebase and proposes **deepening opportunities** — refactors that turn shallow modules into deep ones, improving testability and maintainability.

### Vocabulary

- **Module** — anything with an interface and an implementation
- **Interface** — everything a caller must know to use the module
- **Depth** — leverage at the interface: a lot of behaviour behind a small interface
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place
- **Locality** — change, bugs, knowledge concentrated in one place
- **Deletion test** — imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.

---

## Deepening Opportunities

### 1. Transit Calculation Module

**Priority**: High
**Files**: `src/lib/trip-utils.ts`, `src/server/api/routers/trip-router.ts`, `src/lib/activity-utils.ts`

#### Problem

Transit calculation has no proper interface. The core algorithm (`calculateTripTransit`) is a pure function, but the **seam** between "what transit values should be" and "persisting those values" doesn't exist.

Each trip mutation (create, addActivity, removeActivity, update) repeats the same calculate-then-persist pattern inline:

- `trip-router.ts:73-110` (create)
- `trip-router.ts:157-188` (addActivity)
- `trip-router.ts:288-301` (removeActivity)
- `trip-router.ts:360-376` (update)

The standalone activity fallback (client distance × 2) is buried in `removeActivity` with no documentation.

There are also **three separate rate-selection implementations**:

1. Private `getTransitRate()` in `activity-utils.ts` (tested, used)
2. Exported but **unused** `getEffectiveTransitRate()` in `trip-utils.ts` (dead code)
3. Hard-coded `0.43` and `0.85` in `pdf-generation.ts` (ignores user config)

#### Solution

Extract a `TripTransit` module with a clean interface: given a trip shape, return the transit allocations. The router becomes a thin adapter that calls the module and persists results. Rate selection gets one implementation behind a seam.

#### Benefits

- **Locality**: Transit calculation changes stay in one place, not scattered across 4 router procedures
- **Leverage**: Callers get correct transit without knowing about first-leg rules, return-leg rules, inter-client defaults, or rate fallback chains
- **Testability**: The interface _is_ the test surface — test the module, not the router

---

### 2. Trip Builder UI

**Priority**: Medium
**Files**: `src/components/trips/trip-builder-modal.tsx` (452 lines), `src/components/trips/trip-edit-modal.tsx` (425 lines)

#### Problem

Two modals implement nearly identical logic for inter-client leg editing:

- Same `InterClientValues` interface defined in both
- Same `getGapWarning()` function duplicated
- Same `MAX_DURATION = 30` magic number in both
- Same duration cap validation duplicated

The **deletion test** shows these are shallow: deleting either would just move ~400 lines to the other.

#### Solution

Extract an `InterClientLegEditor` module — a component that owns the inter-client distance/time inputs, validation, and warnings. Both modals become thin adapters around this deeper module.

#### Benefits

- **Locality**: Inter-client validation rules live in one place
- **Leverage**: The interface is "here are the activities, give me the inter-client values" — callers don't re-implement gap warnings or duration caps
- **Testability**: Can test the leg editor's validation logic independently

---

### 3. Multi-Activity Form State

**Priority**: Medium
**Files**: `src/components/activities/multi-activity-form.tsx` (500 lines)

#### Problem

Form state mutations are scattered across 7 handlers:

- `validateRows()`
- `handleSubmit()`
- `updateRow()`
- `addRow()`
- `removeRow()`
- `addTransportItem()`
- `updateTransportItem()`
- `removeTransportItem()`

Validation happens only at mutation time, not during editing. The **interface** (what callers must know) is nearly as complex as the implementation — there's no leverage. Adding a new field requires touching multiple handlers.

#### Solution

Extract an `ActivityRowState` module that owns row CRUD, validation, and transport items. The form becomes a view over this state module. Validation runs continuously (not just on submit).

#### Benefits

- **Locality**: Row manipulation logic concentrates in the state module
- **Leverage**: Form component gets "add row, remove row, validate" without knowing internal state shape
- **Testability**: State transitions become testable without rendering

---

### 4. PDF Generation Rate Bug

**Priority**: High (bug)
**Files**: `src/lib/pdf-generation.ts:134-135`

#### Problem

PDF generation hard-codes transit rates (`0.43`, `0.85`) instead of using actual user/client rates. The module reaches across its seam to grab activity data but then ignores the rate configuration.

This is a **bug**: PDFs show wrong amounts for customized rates.

This is also an architectural smell: the seam leaks.

#### Solution

PDF generation receives fully-calculated line items — it shouldn't know about rate selection. The adapter prepares the data; the PDF module renders it.

#### Benefits

- **Locality**: Rate logic stays in the transit/billing module, not duplicated in PDF
- **Leverage**: PDF module interface becomes "render these line items" — simple, stateless
- **Testability**: Can test PDF layout without mocking rate configuration

---

### 5. Trip Mutation Transactions

**Priority**: Medium
**Files**: `src/server/api/routers/trip-router.ts`

#### Problem

Trip mutations make N separate database calls without transaction wrapping. A crash mid-loop leaves inconsistent data. The seam between "calculate new state" and "persist atomically" doesn't exist.

#### Solution

Wrap trip mutations in Prisma transactions. The calculation module returns the full set of changes; a single transaction applies them.

#### Benefits

- **Locality**: Database consistency handled at the seam, not hoped-for across scattered calls
- **Testability**: Can test calculation without database; can test persistence atomicity separately

---

### 6. Core Algorithm Test Coverage

**Priority**: High (prerequisite)
**Files**: `src/lib/trip-utils.ts:42-108`

#### Problem

The core transit calculation algorithm — `calculateTripTransit()` — which determines billable revenue, has **zero test coverage**. The function is already well-structured (pure, takes inputs, returns outputs), but it's not tested.

This blocks safe refactoring of all other opportunities.

#### Solution

Add unit tests covering:

- Single activity (standalone)
- First activity in trip (travels from home)
- Middle activity in trip (inter-client transit only)
- Last activity in trip (inter-client + return to home)
- Inter-client defaults
- Edge cases (empty trip, one activity trip)

#### Benefits

Foundation for all other refactoring. Tests document the current behavior before changing it.

---

## Recommended Sequencing

1. **#6 Core Algorithm Tests** — prerequisite for safe refactoring
2. **#4 PDF Generation Bug** — actual bug, high value fix
3. **#1 Transit Calculation Module** — highest architectural leverage
4. **#5 Trip Mutation Transactions** — pairs naturally with #1
5. **#2 Trip Builder UI** — moderate effort, clear win
6. **#3 Multi-Activity Form State** — largest effort, can defer

---

## ADR Considerations

None of these opportunities contradict existing ADRs:

- ADR-0001 (one-way transit semantics) — respected
- ADR-0002 (manual inter-client entry) — respected
- ADR-0003 (modifiable invoiced trips) — respected

---

## Context

**Created**: 2026-06-20
**Last Updated**: 2026-06-20

### Key Files

#### Transit Calculation

| File                                    | Lines   | Role                                                |
| --------------------------------------- | ------- | --------------------------------------------------- |
| `src/lib/trip-utils.ts`                 | 42-108  | `calculateTripTransit()` — core algorithm, untested |
| `src/lib/trip-utils.ts`                 | 121-130 | `getEffectiveTransitRate()` — dead code             |
| `src/lib/activity-utils.ts`             | -       | `getTransitRate()` — private, tested, used          |
| `src/server/api/routers/trip-router.ts` | 73-110  | Trip create mutation                                |
| `src/server/api/routers/trip-router.ts` | 157-188 | addActivity mutation                                |
| `src/server/api/routers/trip-router.ts` | 288-301 | removeActivity mutation                             |
| `src/server/api/routers/trip-router.ts` | 360-376 | Trip update mutation                                |

#### Trip Builder UI

| File                                          | Lines | Role                |
| --------------------------------------------- | ----- | ------------------- |
| `src/components/trips/trip-builder-modal.tsx` | 452   | Trip creation modal |
| `src/components/trips/trip-edit-modal.tsx`    | 425   | Trip edit modal     |

#### Multi-Activity Form

| File                                                | Lines | Role                |
| --------------------------------------------------- | ----- | ------------------- |
| `src/components/activities/multi-activity-form.tsx` | 500   | Activity entry form |

#### PDF Generation

| File                        | Lines   | Role                   |
| --------------------------- | ------- | ---------------------- |
| `src/lib/pdf-generation.ts` | 134-135 | Hard-coded rates (bug) |

### Domain Context

From `CONTEXT.md`:

- **Activity** — A single service delivery to a Client
- **Trip** — A group of back-to-back Activities on the same day where transit is shared
- **Provider Travel** — Driving to and from clients, billed as NDIS non-labour costs
- **Inter-Client Transit** — Distance and travel time between two clients in a Trip, entered manually
- **Transit Rate** — Per-kilometre rate charged for Provider Travel

### Relevant ADRs

- **ADR-0001**: One-way transit semantics — `distanceToClient` is one-way, not round-trip
- **ADR-0002**: Manual inter-client transit entry — no API-based calculation
- **ADR-0003**: Allow trip modification after invoicing — recalculate all activities

### Current Test Coverage

- 411 lines of unit tests total
- ~28% coverage of lib utilities
- **Zero tests** for `calculateTripTransit()`
- No component tests
- No integration tests

### Architectural Smells Identified

1. **No seam** between transit calculation and persistence
2. **Duplicate logic** across trip builder modals (~850 lines shared)
3. **Scattered state mutations** in multi-activity form (7 handlers)
4. **Leaky seam** in PDF generation (hard-codes rates)
5. **No transaction safety** in trip mutations
6. **Dead code**: `getEffectiveTransitRate()` exported but never used

---

## Tasks

**Created**: 2026-06-20
**Last Updated**: 2026-06-20

(Left as written; the unstarted items are now tracked by plans 005–008 as noted in the status header.)

### Phase 0: Prerequisites

- [ ] Add unit tests for `calculateTripTransit()` in `trip-utils.ts`
  - [ ] Test: single standalone activity
  - [ ] Test: first activity in trip (from home)
  - [ ] Test: middle activity in trip (inter-client only)
  - [ ] Test: last activity in trip (inter-client + return)
  - [ ] Test: inter-client defaults behavior
  - [ ] Test: edge cases (empty, single-activity trip)

### Phase 1: Bug Fix

- [ ] Fix PDF generation hard-coded rates
  - [ ] Pass calculated line items to PDF module instead of raw activities
  - [ ] Remove hard-coded `0.43` and `0.85` from `pdf-generation.ts`
  - [ ] Add test for PDF with custom transit rates

### Phase 2: Transit Calculation Module

- [ ] Extract transit calculation seam
  - [ ] Define interface: trip shape → transit allocations
  - [ ] Consolidate rate selection to single implementation
  - [ ] Remove dead `getEffectiveTransitRate()` from `trip-utils.ts`
  - [ ] Refactor trip-router create to use module
  - [ ] Refactor trip-router addActivity to use module
  - [ ] Refactor trip-router removeActivity to use module
  - [ ] Refactor trip-router update to use module
  - [ ] Document standalone activity fallback (client distance × 2)

- [ ] Add transaction safety to trip mutations
  - [ ] Wrap create in Prisma transaction
  - [ ] Wrap addActivity in Prisma transaction
  - [ ] Wrap removeActivity in Prisma transaction
  - [ ] Wrap update in Prisma transaction

### Phase 3: UI Consolidation

- [ ] Extract `InterClientLegEditor` component
  - [ ] Define interface: activities → inter-client values
  - [ ] Move `InterClientValues` type to shared location
  - [ ] Move `getGapWarning()` to component
  - [ ] Move `MAX_DURATION` constant to component
  - [ ] Move duration cap validation to component
  - [ ] Refactor `trip-builder-modal.tsx` to use component
  - [ ] Refactor `trip-edit-modal.tsx` to use component
  - [ ] Add tests for validation logic

### Phase 4: Form State (Deferred)

- [ ] Extract `ActivityRowState` module
  - [ ] Define interface: row CRUD + validation
  - [ ] Extract `validateRows()` logic
  - [ ] Extract row manipulation handlers
  - [ ] Extract transport item handlers
  - [ ] Add continuous validation (not just on submit)
  - [ ] Add tests for state transitions
  - [ ] Refactor `multi-activity-form.tsx` to use module

---

### Quick Wins (Can Do Anytime)

- [ ] Delete unused `getEffectiveTransitRate()` export
- [ ] Add `MAX_TRAVEL_TIME_MINUTES = 30` constant to shared location
- [ ] Document first-activity-from-home assumption in `calculateTripTransit()`
