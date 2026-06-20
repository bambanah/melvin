# Back-to-Back Transit - Context

**Last Updated**: 2026-06-19

## Key Files

### Database

- `prisma/schema.prisma` — Activity model (lines 120-144), Client model (lines 77-98), User model (lines 47-75)
  - Activity has `transitDistance`, `transitDuration` (Decimal)
  - Client has `defaultTransitDistance`, `defaultTransitTime` (Decimal) — **to be renamed**
  - User has no transit rate fields — **to be added**

### Transit Logic

- `src/lib/activity-utils.ts` — `getTotalCostOfActivities()` calculates cost including transit
  - Current distance rate: $0.85/km (non-group), $0.43/km (group) — **to be customizable**
  - Duration rate: hourly rate / 60 per minute
  - 30-min cap not currently enforced — **to be added**

### Activity Forms

- `src/components/activities/activity-form.tsx` — Full activity form, auto-populates transit from client defaults
- `src/components/calendar/quick-add-form.tsx` — Quick add modal from calendar

### Calendar

- `src/components/calendar/calendar-day-modal.tsx` — Day detail modal (add trip grouping here)
- `src/components/calendar/calendar-view.tsx` — Main calendar

### API

- `src/server/api/routers/activity-router.ts` — Activity CRUD (add overlap validation here)
- `src/server/api/routers/client-router.ts` — Client CRUD

### Invoices

- `src/components/invoices/invoice-activity-creation-form.tsx` — Group activity handling (separate concern)
- Invoice currently reads live from activities, no snapshots

## Schema Changes Required

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

## Transit Calculation Logic

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

## Data Migration

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

## Overlap Validation Logic

```typescript
// On activity create/update, check for overlaps:
// 1. Same ownerId
// 2. Same date
// 3. Time ranges overlap: NOT (newEnd <= existingStart OR newStart >= existingEnd)
// 4. Exclude the activity being updated (if editing)
// 5. Return error with conflicting activity details
```

## NDIS Rules Reference

- Travel time cap: 30 min per participant (MMM1-3 areas)
- Travel distance rate: up to $0.99/km
- Return journey: claimable from last participant only
- Multiple participants: travel can be apportioned (not implemented, using leg-based)

## Deferred Items

- Group activity proper linking (currently creates separate activities)
- Group transit division by participant count
- Invoice versioning/snapshots
- MMM4-5 area support (60-min cap)
- Persistent client-pair distance caching
