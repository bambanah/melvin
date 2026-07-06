# 012 — Quick Activity Entry

**Status**: DONE
**Depends on**: 011 (builds on the Trip model and one-way transit semantics)

> Migrated 2026-07-02 from `docs/plans/quick-activity-entry/` (pre-numbering three-file format); plan, context, and tasks merged into this file. Shipped in `9583afa` (feat: multi activity form). The quick form is slated for a rebuild under `docs/trd/trd-001-capture-first-activity-entry.md`.

## Problem

Providers want to log activities immediately after finishing work with minimal friction. Currently they jot shorthand into a notes app:

```
John:
20/6 9:30 - 1:50
25km 12km

Jane:
20/6 1:50 - 3:30
12km
```

The existing activity form requires too many taps and fields for this use case.

## Solution

A streamlined multi-activity entry form optimized for speed.

### Data Model Changes

**New: `ActivityTransportItem`**

Tracks Activity Based Transport (driving done during the activity with the client).

```prisma
model ActivityTransportItem {
  id         String   @id @default(cuid())
  activityId String
  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  type       ActivityTransportType
  amount     Decimal  // km for DISTANCE, dollars for PARKING/TOLL/OTHER
  note       String?

  @@index([activityId])
}

enum ActivityTransportType {
  DISTANCE
  PARKING
  TOLL
  OTHER
}
```

**Existing fields remain:**

- `transitDistance` / `transitDuration` on Activity — Provider Travel (to/from client), auto-derived from client data and Trip structure

### Form Design

**Layout:**

```
Date: [20/6/2026    📅]

┌─ Activity 1 ────────────────────────┐
│ [Recent clients as chips         ]  │
│ [Type to search...               ]  │
│ [9:30-1:50      ]  [25 12    ] km  │
│                        + parking    │
└─────────────────────────────────────┘

┌─ Activity 2 ────────────────────────┐
│ [Recent clients as chips         ]  │
│ [Type to search...               ]  │
│ [1:50-3:30      ]  [12       ] km  │
│                        + parking    │
└─────────────────────────────────────┘

            [+ Add activity]

                    [Save all]
```

**Fields per activity row:**
| Field | Input | Notes |
|-------|-------|-------|
| Client | Recent chips + type-ahead search | Recent clients shown as tappable chips |
| Time | Single text field | Format: `HH:MM-HH:MM`, e.g. `9:30-1:50` |
| Transport km | Summing text field | Space-separated values summed: `25 12` → 37 km |
| Parking/tolls | Expandable section | Hidden by default, tap "+ parking" to reveal |
| Support item | Expandable "Advanced" | Uses `defaultSupportItemId`, hidden unless overriding |

**Behaviors:**

- Date defaults to today
- Support item uses user's default
- Transit (Provider Travel) auto-derived from client's `distanceToClient` and Trip structure
- Auto-creates Trip when activities are contiguous (end time = next start time)
- After save: toast "3 activities saved · Linked as trip", return to previous view

**Entry points:**

- Global "+" button (FAB on mobile, nav button on desktop) → today's date
- Calendar day click → that date

### Validation

| Scenario               | Behavior                    |
| ---------------------- | --------------------------- |
| Missing client or time | Inline error, block save    |
| Overlapping times      | Warning, allow save         |
| End time before start  | Error (no overnight shifts) |
| Empty rows             | Silently ignore             |

## Out of Scope

- Free-text parsing of shorthand
- Offline/PWA support
- Bulk import from notes

---

## Context

Last Updated: 2026-06-20

### Key Files

#### Data Model

- `prisma/schema.prisma` — Activity, Trip, Client, User models
- `docs/adr/0001-one-way-transit-semantics.md` — Transit field semantics

#### Existing Forms

- `src/components/activities/activity-form.tsx` — Full activity form
- `src/components/calendar/quick-add-form.tsx` — Current quick-add (single activity)
- `src/components/calendar/calendar-day-modal.tsx` — Calendar day modal that hosts quick-add

#### NDIS Reference

- `docs/ndis/provider-travel.md` — Provider Travel rules (transit to/from client)
- `docs/ndis/activity-based-transport.md` — Activity Based Transport rules (driving during activity)

#### API

- `src/server/api/routers/activity-router.ts` — Activity CRUD
- `src/server/api/routers/trip-router.ts` — Trip management

### Domain Decisions

#### Two Types of Billable Driving

| Concept                | NDIS Term                | When                 | Stored As                                    |
| ---------------------- | ------------------------ | -------------------- | -------------------------------------------- |
| Getting to/from client | Provider Travel          | Before/after service | `transitDistance` on Activity (auto-derived) |
| Driving with client    | Activity Based Transport | During service       | `ActivityTransportItem` (user-entered)       |

Both are billed as non-labour costs at ~$0.99/km but under different NDIS line items.

#### Transit is Automatic

Provider Travel (transit) is derived, not entered:

- Single activity: client's `distanceToClient` × 2 (round trip)
- Trip (back-to-back): first leg + inter-client legs + return leg, apportioned per ADR-0001

#### Activity Based Transport is Manual

User enters km driven during the activity. Multiple drives are summed into a single DISTANCE item. Parking/tolls are separate items with dollar amounts.

#### Trips Auto-Created

When activities on the same day are contiguous (Activity 1 ends at 13:50, Activity 2 starts at 13:50), a Trip is automatically created linking them.

### Open Questions

None — design is complete.

---

## Tasks

Last Updated: 2026-06-20

### Data Model

- [x] Add `ActivityTransportItem` model to schema
- [x] Add `ActivityTransportType` enum (DISTANCE, PARKING, TOLL, OTHER)
- [x] Add relation from Activity to ActivityTransportItem
- [x] Create and run migration

### API

- [x] Add `activityTransport` router (or extend activity router)
  - [x] Create transport items when creating activity
  - [x] Update transport items when modifying activity
  - [x] Delete transport items with activity (cascade)
- [x] Update `activity.add` to accept transport items
- [x] Update `activity.modify` to accept transport items
- [x] Update activity queries to include transport items
- [x] Add `activity.bulkAdd` for multi-activity form

### Components

#### Multi-Activity Form

- [x] Create `src/components/activities/multi-activity-form.tsx`
- [x] Date picker at top (default today)
- [x] Activity row component with:
  - [x] Client selector (recent chips + type-ahead)
  - [x] Time range input (single field, parse `HH:MM-HH:MM`)
  - [x] Transport km input (summing field)
  - [x] Expandable parking/tolls section
  - [x] Expandable advanced section (support item)
- [x] Add/remove activity rows
- [x] Form validation
  - [x] Required: client, time range
  - [x] Error: end before start
  - [ ] Warning: overlapping times (deferred)
  - [x] Ignore: empty rows
- [x] Save all activities in single transaction
- [x] Auto-create Trip when contiguous

#### Client Selector

- [x] Create `src/components/forms/client-quick-select.tsx`
- [x] Show recent clients as tappable chips
- [x] Type-ahead search below
- [x] Track recent clients (localStorage or user preference)

#### Time Range Input

- [x] Create `src/components/forms/time-range-input.tsx`
- [x] Parse `HH:MM-HH:MM` format (lenient with spaces)
- [x] Validate start < end
- [x] Return { startTime, endTime }

#### Summing Distance Input

- [x] Create `src/components/forms/summing-distance-input.tsx`
- [x] Parse space-separated numbers
- [x] Show computed total after blur
- [x] Accept optional `km` suffix

### Entry Points

- [x] Add global "+" FAB (mobile) / nav button (desktop)
- [x] Route to multi-activity form with today's date
- [x] Update calendar day modal to use multi-activity form
- [x] Pass selected date to form

### Post-Save

- [x] Success toast with activity count and trip status
- [x] Navigate back to previous view

### Invoice Integration

- [x] Update activity cost calculation to include ActivityTransportItem
- [x] Update invoice PDF generation to show transport items
- [x] DISTANCE items: show as "Activity Based Transport: X km × $0.99"
- [x] PARKING/TOLL items: show type and amount (e.g., "Parking: $5.00")
- [x] Use correct NDIS line items (04_799_0104_6_1)
