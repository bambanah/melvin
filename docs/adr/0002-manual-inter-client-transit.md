# ADR 0002: Manual Inter-Client Transit Entry

**Status**: Accepted  
**Date**: 2026-06-19

## Context

When activities are linked into a Trip, we need to know the distance and travel time between consecutive clients to calculate Provider Travel correctly. There are several ways to obtain this:

1. **API-based calculation** — Use a mapping service (Google Maps, etc.) to calculate driving distance/time between client addresses
2. **Manual entry** — Provider enters the distance and time for each leg
3. **Estimated from coordinates** — Calculate straight-line distance and estimate driving time

The choice affects accuracy, cost, complexity, and privacy.

## Decision

Use **manual entry** with two fields per leg (distance in km, time in minutes).

When creating or editing a Trip, the provider enters inter-client values for each leg. Pre-fill symmetric values (if A→B is entered, B→A shows the same value as a muted suggestion) but allow override since routes aren't always symmetric.

## Consequences

**Positive**:
- No API costs or rate limits
- No dependency on external services
- Provider enters what they actually drove, not what a routing algorithm predicted
- No need to store or transmit client addresses to third parties
- Works offline

**Negative**:
- Adds friction to trip creation (provider must know/look up distances)
- Potential for inaccurate entry (typos, guessing)
- No automatic updates if a client moves

**Mitigations**:
- Symmetric pre-fill reduces entry burden for round trips
- UI shows warnings for implausible values (e.g., 100km in 10 minutes)
