# 011 — Back-to-Back Activities with Shared Transit

**Status**: DONE
**Depends on**: —

> Migrated 2026-07-02 from `docs/plans/back-to-back-transit/` (pre-numbering three-file format); plan, context, and tasks merged into this file. Shipped in `bf1f2b9` (feat: add back-to-back trips). Line numbers and the `0.85`/`0.43` default rates reflect the codebase at the time of writing — the rate defaults were later consolidated by plan 006, and `groupTransitRatePerKm` was removed from the schema in `3d7c5a9`.

**Last Updated**: 2026-06-19

## Problem

Providers visiting multiple clients in sequence have transit over-counted. Each activity stores round-trip transit from provider's home, but back-to-back visits should share transit:

- **Current**: Client A (10km) + Client B (10km) = 40km total (assumes two round trips)
- **Expected**: Home→A + A→B (manual) + B→Home ≈ 20km + inter-client

## Decisions

| Decision                | Choice                                             | Rationale                             |
| ----------------------- | -------------------------------------------------- | ------------------------------------- |
| Transit field semantics | One-way (`distanceToClient`, `travelTimeToClient`) | Clearer mental model, simpler math    |
| Model name              | `Trip` (internal), "back-to-back" (UI)             | Short for code, matches user language |
| Activity ordering       | Derived from `startTime`                           | No redundant `tripPosition` field     |
| Inter-client distance   | Manual entry, 2 fields per leg                     | Simple, accurate, no API costs        |
| Trip linking            | Suggest on same-day activities, user confirms      | Best UX balance                       |
| Duration cap            | 30 min per leg (NDIS MMM1-3 rule)                  | Hard cap with warning                 |
| Transit rate            | Customizable up to $0.99/km                        | User default + client override        |
| Overlap validation      | Enforce on activity create/update                  | Required for trip integrity           |
| Invoiced activities     | Allow trip modification, recalculate all           | Versioning is future feature          |

## Solution Overview

Introduce a **Trip** model that groups sequential same-day activities. Transit is allocated:

- First activity: `distanceToClient` (home → client)
- Middle activities: inter-client distance (manually entered)
- Last activity: inter-client distance + `distanceToClient` (return home)

Same pattern for travel time, capped at 30 min per leg.

## Implementation Phases

### Phase 1: Database Schema

- Rename `defaultTransitDistance` → `distanceToClient` (one-way)
- Rename `defaultTransitTime` → `travelTimeToClient` (one-way)
- Add `User.transitRatePerKm`, `User.groupTransitRatePerKm` (defaults, max 0.99)
- Add `Client.transitRatePerKm`, `Client.groupTransitRatePerKm` (optional overrides)
- Add `Trip` model with `date`, `ownerId`
- Add `Activity.tripId` (nullable FK)
- Migrate existing data: divide transit values by 2

### Phase 2: Validation

- Add activity overlap validation (same owner, same day, overlapping times)
- Enforce on activity create/update
- Return clear error: "This time overlaps with [Activity] at [Client]"

### Phase 3: Trip API

- `trip.create` — create trip with 2+ activities, validate times, collect inter-client values
- `trip.addActivity` — add activity, prompt for inter-client distance/time
- `trip.removeActivity` — remove activity, recalculate (trip survives if 2+ remain)
- `trip.update` — update inter-client values
- `trip.delete` — dissolve trip, restore full transit to all activities
- `trip.suggestForDate` — find linkable activities (same day, has times, not in trip)

### Phase 4: Transit Calculation

- `calculateTripTransit()` — allocate transit to activities based on position
- First: `distanceToClient`, `travelTimeToClient`
- Middle: inter-client values (manual)
- Last: inter-client + `distanceToClient`, inter-client + `travelTimeToClient`
- Cap each leg's duration at 30 min, warn if exceeded
- Recalculate on any trip modification

### Phase 5: UI - Trip Creation

- Trip builder modal with activity list (ordered by time)
- Inter-client inputs: distance (km) + time (min) per leg
- Pre-fill symmetric values (A→B fills B→A), show muted/italic
- Warn if gap > 2 hours between activities
- "Create Trip" button in calendar day modal

### Phase 6: UI - Trip Display & Editing

- Visual grouping in calendar day modal (connected card style)
- Activity form shows trip context ("Part of back-to-back with...")
- Post-save toast: "You have another activity today — link as back-to-back?"
- Edit mode: reorder (adjusts times), add/remove activities
- Warning when modifying trip with invoiced activities

## Success Criteria

1. Two linked activities have combined transit < individual totals
2. Reordering recalculates correctly
3. Removing from trip restores full round-trip transit
4. Deleting middle activity keeps trip intact, prompts for new inter-client
5. 30-min cap enforced with visible warning
6. Overlap validation prevents impossible schedules

---

## Context

**Last Updated**: 2026-06-19

### Key Files

#### Database

- `prisma/schema.prisma` — Activity model (lines 120-144), Client model (lines 77-98), User model (lines 47-75)
  - Activity has `transitDistance`, `transitDuration` (Decimal)
  - Client has `defaultTransitDistance`, `defaultTransitTime` (Decimal) — **to be renamed**
  - User has no transit rate fields — **to be added**

#### Transit Logic

- `src/lib/activity-utils.ts` — `getTotalCostOfActivities()` calculates cost including transit
  - Current distance rate: $0.85/km (non-group), $0.43/km (group) — **to be customizable**
  - Duration rate: hourly rate / 60 per minute
  - 30-min cap not currently enforced — **to be added**

#### Activity Forms

- `src/components/activities/activity-form.tsx` — Full activity form, auto-populates transit from client defaults
- `src/components/calendar/quick-add-form.tsx` — Quick add modal from calendar

#### Calendar

- `src/components/calendar/calendar-day-modal.tsx` — Day detail modal (add trip grouping here)
- `src/components/calendar/calendar-view.tsx` — Main calendar

#### API

- `src/server/api/routers/activity-router.ts` — Activity CRUD (add overlap validation here)
- `src/server/api/routers/client-router.ts` — Client CRUD

#### Invoices

- `src/components/invoices/invoice-activity-creation-form.tsx` — Group activity handling (separate concern)
- Invoice currently reads live from activities, no snapshots

### Schema Changes Required

```prisma
model Trip {
  id         String     @id @default(cuid())
  createdAt  DateTime   @default(now()) @map("created")
  updatedAt  DateTime   @default(now()) @updatedAt
  date       DateTime   @db.Date
  ownerId    String
  owner      User       @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  activities Activity[]

  @@index([ownerId])
  @@index([ownerId, date])
}

model InterClientLeg {
  id         String   @id @default(cuid())
  tripId     String
  trip       Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  fromActivityId String
  toActivityId   String
  distance   Decimal
  duration   Decimal

  @@index([tripId])
}

// Rename on Client:
// defaultTransitDistance → distanceToClient (one-way km)
// defaultTransitTime → travelTimeToClient (one-way minutes)

// Add to Client:
transitRatePerKm       Decimal?  // override, max 0.99
groupTransitRatePerKm  Decimal?  // override, max 0.99

// Add to User:
transitRatePerKm       Decimal  @default(0.85)  // max 0.99
groupTransitRatePerKm  Decimal  @default(0.43)  // max 0.99

// Add to Activity:
tripId  String?
trip    Trip?  @relation(fields: [tripId], references: [id], onDelete: SetNull)
```

### Transit Calculation Logic

```typescript
// For a trip with activities [A, B, C] ordered by startTime:
// A.transitDistance = A.client.distanceToClient (home → A)
// A.transitDuration = A.client.travelTimeToClient (capped at 30)

// B.transitDistance = interClientLeg(A→B).distance
// B.transitDuration = min(interClientLeg(A→B).duration, 30)

// C.transitDistance = interClientLeg(B→C).distance + C.client.distanceToClient
// C.transitDuration = min(interClientLeg(B→C).duration, 30) + min(C.client.travelTimeToClient, 30)

// Cost calculation:
// rate = client.transitRatePerKm ?? user.transitRatePerKm
// distanceCost = transitDistance * rate
// durationCost = transitDuration * (hourlyRate / 60)
```

### Data Migration

```sql
-- Rename fields (one-way semantics)
ALTER TABLE "Client" RENAME COLUMN "defaultTransitDistance" TO "distanceToClient";
ALTER TABLE "Client" RENAME COLUMN "defaultTransitTime" TO "travelTimeToClient";

-- Convert existing round-trip values to one-way
UPDATE "Client" SET "distanceToClient" = "distanceToClient" / 2 WHERE "distanceToClient" IS NOT NULL;
UPDATE "Client" SET "travelTimeToClient" = "travelTimeToClient" / 2 WHERE "travelTimeToClient" IS NOT NULL;

-- Existing activities already store per-activity transit, no change needed
-- (they represent what was actually billed, not derived from client defaults)
```

### Overlap Validation Logic

```typescript
// On activity create/update, check for overlaps:
// 1. Same ownerId
// 2. Same date
// 3. Time ranges overlap: NOT (newEnd <= existingStart OR newStart >= existingEnd)
// 4. Exclude the activity being updated (if editing)
// 5. Return error with conflicting activity details
```

### NDIS Rules Reference

- Travel time cap: 30 min per participant (MMM1-3 areas)
- Travel distance rate: up to $0.99/km
- Return journey: claimable from last participant only
- Multiple participants: travel can be apportioned (not implemented, using leg-based)

### Deferred Items

- Group activity proper linking (currently creates separate activities)
- Group transit division by participant count
- Invoice versioning/snapshots
- MMM4-5 area support (60-min cap)
- Persistent client-pair distance caching

---

## Tasks

**Last Updated**: 2026-06-19 (All core phases complete)

### Phase 1: Database Schema

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

### Phase 2: Overlap Validation

- [x] Create `src/lib/overlap-utils.ts`
  - [x] `checkActivityOverlap(activity, ownerId)` — returns conflicting activity or null
- [x] Update `activity-router.ts` create procedure — reject overlaps
- [x] Update `activity-router.ts` update procedure — reject overlaps (exclude self)
- [x] Return clear error message with conflicting activity details
- [ ] Add unit tests for overlap detection

### Phase 3: Trip API

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

### Phase 4: Transit Calculation

- [x] Create `src/lib/trip-utils.ts`
  - [x] `calculateTripTransit(trip)` — returns transit values for each activity
  - [x] `applyTripTransit(trip)` — updates all activities with calculated values (in trip router)
  - [x] `restoreStandaloneTransit(activity)` — restore full round-trip on trip removal (in trip router)
  - [x] `getEffectiveTransitRate(client, user)` — resolve rate with fallback
- [x] Update `activity-utils.ts` to use `getEffectiveTransitRate()`
- [x] Add 30-min duration cap with warning flag
- [ ] Add unit tests for transit calculation
- [ ] Add unit tests for rate resolution

### Phase 5: UI - Trip Creation

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

### Phase 6: UI - Trip Display

- [x] Update `calendar-day-modal.tsx` — trip group card (connected visual style)
- [x] Update `activity-form.tsx` — trip context display ("Part of back-to-back with...")
- [x] Add "Remove from back-to-back" action on activity
- [x] Show warning when viewing invoiced activity in a trip

### Phase 7: Trip Editing

- [x] Create `src/components/trips/trip-edit-modal.tsx` — edit mode modal
- [x] Update `calendar-day-modal.tsx` — "Edit Trip" button when trip exists
- [x] Handle remove activity — recalculate (via trip.removeActivity API)
- [x] Handle trip dissolution (via trip.removeActivity when <2 remain)
- [x] Handle delete trip — restore all activities to standalone
- [x] Warning when modifying trip with invoiced activities
- [x] Update inter-client values (via trip.update API)

### Phase 8: Settings UI

- [x] Add transit rate fields to user settings
  - [x] `transitRatePerKm` input (max 0.99)
  - [x] `groupTransitRatePerKm` input (max 0.99)
- [x] Add transit rate override fields to client form
  - [x] `transitRatePerKm` input (optional, max 0.99)
  - [x] `groupTransitRatePerKm` input (optional, max 0.99)
- [x] Update client form to use renamed fields (`distanceToClient`, `travelTimeToClient`)

### Verification

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

### Deferred (Future Tasks)

- [ ] Group activity linking and participant count tracking
- [ ] Group transit division by participant count
- [ ] Invoice versioning/snapshots
- [ ] MMM4-5 area support (60-min cap)
- [ ] Persistent client-pair distance caching
- [ ] Unit tests for overlap detection (see plan 005 for the characterization-test follow-up)
- [ ] Unit tests for transit calculation (absorbed by plan 005)
- [ ] Unit tests for rate resolution (absorbed by plans 005/006)
