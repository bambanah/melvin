# Back-to-Back Transit - Tasks

**Last Updated**: 2026-06-19 (All core phases complete)

## Phase 1: Database Schema

- [x] Rename `Client.defaultTransitDistance` → `distanceToClient`
- [x] Rename `Client.defaultTransitTime` → `travelTimeToClient`
- [x] Add `Client.transitRatePerKm` (Decimal, nullable, max 0.99)
- [x] Add `Client.groupTransitRatePerKm` (Decimal, nullable, max 0.99)
- [x] Add `User.transitRatePerKm` (Decimal, default 0.85, max 0.99)
- [x] Add `User.groupTransitRatePerKm` (Decimal, default 0.43, max 0.99)
- [x] Add `Trip` model (id, date, ownerId)
- [x] Add `InterClientLeg` model (tripId, fromActivityId, toActivityId, distance, duration)
- [x] Add `Activity.tripId` (nullable FK to Trip)
- [x] Add Trip relation to User model
- [x] Create migration with data transform (divide existing transit values by 2)
- [x] Verify generated types

## Phase 2: Overlap Validation

- [x] Create `src/lib/overlap-utils.ts`
  - [x] `checkActivityOverlap(activity, ownerId)` — returns conflicting activity or null
- [x] Update `activity-router.ts` create procedure — reject overlaps
- [x] Update `activity-router.ts` update procedure — reject overlaps (exclude self)
- [x] Return clear error message with conflicting activity details
- [ ] Add unit tests for overlap detection

## Phase 3: Trip API

- [x] Create `src/server/api/routers/trip-router.ts`
  - [x] `trip.create` — create trip with 2+ activity IDs + inter-client values
  - [x] `trip.addActivity` — add activity to existing trip, collect inter-client values
  - [x] `trip.removeActivity` — remove activity, recalculate (dissolve if <2 remain)
  - [x] `trip.update` — update inter-client distance/duration values
  - [x] `trip.delete` — dissolve trip, restore full transit to all activities
  - [x] `trip.getByDate` — fetch trip for a specific date (if exists)
  - [x] `trip.suggestForDate` — find linkable activities (same day, has times, not in trip)
- [x] Add trip router to `src/server/api/root.ts`
- [x] Update `activity-router.ts` queries to include trip data

## Phase 4: Transit Calculation

- [x] Create `src/lib/trip-utils.ts`
  - [x] `calculateTripTransit(trip)` — returns transit values for each activity
  - [x] `applyTripTransit(trip)` — updates all activities with calculated values (in trip router)
  - [x] `restoreStandaloneTransit(activity)` — restore full round-trip on trip removal (in trip router)
  - [x] `getEffectiveTransitRate(client, user)` — resolve rate with fallback
- [x] Update `activity-utils.ts` to use `getEffectiveTransitRate()`
- [x] Add 30-min duration cap with warning flag
- [ ] Add unit tests for transit calculation
- [ ] Add unit tests for rate resolution

## Phase 5: UI - Trip Creation

- [x] Create `src/components/trips/trip-builder-modal.tsx`
  - [x] Activity list ordered by startTime
  - [x] Inter-client inputs per leg: distance (km) + time (min)
  - [x] Pre-fill symmetric values (A→B fills B→A)
  - [x] Visual indicator for pre-filled values (muted/italic)
  - [x] Warn if gap > 2 hours between activities
  - [x] Warn if any duration exceeds 30 min
  - [x] Total transit summary display
- [x] Update `calendar-day-modal.tsx` — "Create back-to-back" button (when 2+ eligible activities)
- [x] Update `quick-add-form.tsx` — post-save toast suggesting linking

## Phase 6: UI - Trip Display

- [x] Update `calendar-day-modal.tsx` — trip group card (connected visual style)
- [x] Update `activity-form.tsx` — trip context display ("Part of back-to-back with...")
- [x] Add "Remove from back-to-back" action on activity
- [x] Show warning when viewing invoiced activity in a trip

## Phase 7: Trip Editing

- [x] Create `src/components/trips/trip-edit-modal.tsx` — edit mode modal
- [x] Update `calendar-day-modal.tsx` — "Edit Trip" button when trip exists
- [x] Handle remove activity — recalculate (via trip.removeActivity API)
- [x] Handle trip dissolution (via trip.removeActivity when <2 remain)
- [x] Handle delete trip — restore all activities to standalone
- [x] Warning when modifying trip with invoiced activities
- [x] Update inter-client values (via trip.update API)

## Phase 8: Settings UI

- [x] Add transit rate fields to user settings
  - [x] `transitRatePerKm` input (max 0.99)
  - [x] `groupTransitRatePerKm` input (max 0.99)
- [x] Add transit rate override fields to client form
  - [x] `transitRatePerKm` input (optional, max 0.99)
  - [x] `groupTransitRatePerKm` input (optional, max 0.99)
- [x] Update client form to use renamed fields (`distanceToClient`, `travelTimeToClient`)

## Verification

- [ ] Test: Create two standalone activities, verify full transit each
- [ ] Test: Link into trip, verify first gets one-way, last gets one-way + inter-client
- [ ] Test: Add third activity, verify inter-client entry for both legs
- [ ] Test: Reorder activities, verify recalculation
- [ ] Test: Delete middle activity, verify prompt for new inter-client
- [ ] Test: Remove from trip, verify full transit restored
- [ ] Test: Enter duration > 30 min, verify warning and cap
- [ ] Test: Create overlapping activity, verify rejection
- [ ] Test: Same client twice in trip (A→B→A), verify symmetric pre-fill
- [ ] Test: Gap > 2 hours, verify warning but allow
- [ ] Test: Custom transit rate on client, verify it's used
- [ ] Test: Modify trip with invoiced activity, verify warning shown

## Deferred (Future Tasks)

- [ ] Group activity linking and participant count tracking
- [ ] Group transit division by participant count
- [ ] Invoice versioning/snapshots
- [ ] MMM4-5 area support (60-min cap)
- [ ] Persistent client-pair distance caching
- [ ] Unit tests for overlap detection
- [ ] Unit tests for transit calculation
- [ ] Unit tests for rate resolution
