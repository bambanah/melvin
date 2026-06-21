# Architecture Deepening Tasks

**Created**: 2026-06-20  
**Last Updated**: 2026-06-20

## Phase 0: Prerequisites

- [ ] Add unit tests for `calculateTripTransit()` in `trip-utils.ts`
  - [ ] Test: single standalone activity
  - [ ] Test: first activity in trip (from home)
  - [ ] Test: middle activity in trip (inter-client only)
  - [ ] Test: last activity in trip (inter-client + return)
  - [ ] Test: inter-client defaults behavior
  - [ ] Test: edge cases (empty, single-activity trip)

## Phase 1: Bug Fix

- [ ] Fix PDF generation hard-coded rates
  - [ ] Pass calculated line items to PDF module instead of raw activities
  - [ ] Remove hard-coded `0.43` and `0.85` from `pdf-generation.ts`
  - [ ] Add test for PDF with custom transit rates

## Phase 2: Transit Calculation Module

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

## Phase 3: UI Consolidation

- [ ] Extract `InterClientLegEditor` component
  - [ ] Define interface: activities → inter-client values
  - [ ] Move `InterClientValues` type to shared location
  - [ ] Move `getGapWarning()` to component
  - [ ] Move `MAX_DURATION` constant to component
  - [ ] Move duration cap validation to component
  - [ ] Refactor `trip-builder-modal.tsx` to use component
  - [ ] Refactor `trip-edit-modal.tsx` to use component
  - [ ] Add tests for validation logic

## Phase 4: Form State (Deferred)

- [ ] Extract `ActivityRowState` module
  - [ ] Define interface: row CRUD + validation
  - [ ] Extract `validateRows()` logic
  - [ ] Extract row manipulation handlers
  - [ ] Extract transport item handlers
  - [ ] Add continuous validation (not just on submit)
  - [ ] Add tests for state transitions
  - [ ] Refactor `multi-activity-form.tsx` to use module

---

## Quick Wins (Can Do Anytime)

- [ ] Delete unused `getEffectiveTransitRate()` export
- [ ] Add `MAX_TRAVEL_TIME_MINUTES = 30` constant to shared location
- [ ] Document first-activity-from-home assumption in `calculateTripTransit()`
