# ADR 0001: One-Way Transit Semantics

**Status**: Accepted  
**Date**: 2026-06-19

## Context

The system stores transit distance and duration for client visits. These fields (`defaultTransitDistance`, `defaultTransitTime` on Client) originally represented round-trip values — the total distance/time from provider's home to client and back.

We're adding back-to-back activity support, where sequential client visits share transit instead of each counting a full round trip. The transit calculation becomes:

- First activity: home → client
- Middle activities: client → client (manual entry)
- Last activity: client → client + client → home

With round-trip semantics, this required dividing by 2 to get one-way legs, making the math confusing and the stored values unintuitive ("20km" when the client is actually 10km away).

## Decision

Change transit fields to **one-way semantics**:

- Rename `defaultTransitDistance` → `distanceToClient` (km, one-way)
- Rename `defaultTransitTime` → `travelTimeToClient` (minutes, one-way)
- Migrate existing data by dividing values by 2

The field names now reflect what they store: the distance/time _to_ the client, not round-trip.

## Consequences

**Positive**:

- Mental model matches reality: "Sarah is 10km away" → store 10
- Trip calculation is straightforward: first leg = `distanceToClient`, return leg = `distanceToClient`
- Field names are self-documenting

**Negative**:

- Requires data migration (divide existing values by 2)
- Existing activities store per-activity transit (already calculated), not affected
- Any external integrations or reports assuming round-trip values need updating

**Migration**:

```sql
UPDATE "Client" SET "distanceToClient" = "distanceToClient" / 2 WHERE "distanceToClient" IS NOT NULL;
UPDATE "Client" SET "travelTimeToClient" = "travelTimeToClient" / 2 WHERE "travelTimeToClient" IS NOT NULL;
```
