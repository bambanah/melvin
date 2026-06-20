# Back-to-Back Activities with Shared Transit

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
