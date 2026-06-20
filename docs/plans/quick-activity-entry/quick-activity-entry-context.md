# Quick Activity Entry — Context

Last Updated: 2026-06-20

## Key Files

### Data Model

- `prisma/schema.prisma` — Activity, Trip, Client, User models
- `docs/adr/0001-one-way-transit-semantics.md` — Transit field semantics

### Existing Forms

- `src/components/activities/activity-form.tsx` — Full activity form
- `src/components/calendar/quick-add-form.tsx` — Current quick-add (single activity)
- `src/components/calendar/calendar-day-modal.tsx` — Calendar day modal that hosts quick-add

### NDIS Reference

- `docs/ndis/provider-travel.md` — Provider Travel rules (transit to/from client)
- `docs/ndis/activity-based-transport.md` — Activity Based Transport rules (driving during activity)

### API

- `src/server/api/routers/activity-router.ts` — Activity CRUD
- `src/server/api/routers/trip-router.ts` — Trip management

## Domain Decisions

### Two Types of Billable Driving

| Concept                | NDIS Term                | When                 | Stored As                                    |
| ---------------------- | ------------------------ | -------------------- | -------------------------------------------- |
| Getting to/from client | Provider Travel          | Before/after service | `transitDistance` on Activity (auto-derived) |
| Driving with client    | Activity Based Transport | During service       | `ActivityTransportItem` (user-entered)       |

Both are billed as non-labour costs at ~$0.99/km but under different NDIS line items.

### Transit is Automatic

Provider Travel (transit) is derived, not entered:

- Single activity: client's `distanceToClient` × 2 (round trip)
- Trip (back-to-back): first leg + inter-client legs + return leg, apportioned per ADR-0001

### Activity Based Transport is Manual

User enters km driven during the activity. Multiple drives are summed into a single DISTANCE item. Parking/tolls are separate items with dollar amounts.

### Trips Auto-Created

When activities on the same day are contiguous (Activity 1 ends at 13:50, Activity 2 starts at 13:50), a Trip is automatically created linking them.

## Open Questions

None — design is complete.
