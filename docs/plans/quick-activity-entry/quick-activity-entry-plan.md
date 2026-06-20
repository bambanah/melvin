# Quick Activity Entry

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
