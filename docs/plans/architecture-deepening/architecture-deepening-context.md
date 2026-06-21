# Architecture Deepening Context

**Created**: 2026-06-20  
**Last Updated**: 2026-06-20

## Key Files

### Transit Calculation

| File                                    | Lines   | Role                                                |
| --------------------------------------- | ------- | --------------------------------------------------- |
| `src/lib/trip-utils.ts`                 | 42-108  | `calculateTripTransit()` — core algorithm, untested |
| `src/lib/trip-utils.ts`                 | 121-130 | `getEffectiveTransitRate()` — dead code             |
| `src/lib/activity-utils.ts`             | -       | `getTransitRate()` — private, tested, used          |
| `src/server/api/routers/trip-router.ts` | 73-110  | Trip create mutation                                |
| `src/server/api/routers/trip-router.ts` | 157-188 | addActivity mutation                                |
| `src/server/api/routers/trip-router.ts` | 288-301 | removeActivity mutation                             |
| `src/server/api/routers/trip-router.ts` | 360-376 | Trip update mutation                                |

### Trip Builder UI

| File                                          | Lines | Role                |
| --------------------------------------------- | ----- | ------------------- |
| `src/components/trips/trip-builder-modal.tsx` | 452   | Trip creation modal |
| `src/components/trips/trip-edit-modal.tsx`    | 425   | Trip edit modal     |

### Multi-Activity Form

| File                                                | Lines | Role                |
| --------------------------------------------------- | ----- | ------------------- |
| `src/components/activities/multi-activity-form.tsx` | 500   | Activity entry form |

### PDF Generation

| File                        | Lines   | Role                   |
| --------------------------- | ------- | ---------------------- |
| `src/lib/pdf-generation.ts` | 134-135 | Hard-coded rates (bug) |

## Domain Context

From `CONTEXT.md`:

- **Activity** — A single service delivery to a Client
- **Trip** — A group of back-to-back Activities on the same day where transit is shared
- **Provider Travel** — Driving to and from clients, billed as NDIS non-labour costs
- **Inter-Client Transit** — Distance and travel time between two clients in a Trip, entered manually
- **Transit Rate** — Per-kilometre rate charged for Provider Travel

## Relevant ADRs

- **ADR-0001**: One-way transit semantics — `distanceToClient` is one-way, not round-trip
- **ADR-0002**: Manual inter-client transit entry — no API-based calculation
- **ADR-0003**: Allow trip modification after invoicing — recalculate all activities

## Current Test Coverage

- 411 lines of unit tests total
- ~28% coverage of lib utilities
- **Zero tests** for `calculateTripTransit()`
- No component tests
- No integration tests

## Architectural Smells Identified

1. **No seam** between transit calculation and persistence
2. **Duplicate logic** across trip builder modals (~850 lines shared)
3. **Scattered state mutations** in multi-activity form (7 handlers)
4. **Leaky seam** in PDF generation (hard-codes rates)
5. **No transaction safety** in trip mutations
6. **Dead code**: `getEffectiveTransitRate()` exported but never used
