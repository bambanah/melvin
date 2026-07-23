# TRD-004 — Provider Travel & Trips UX

**Status**: Proposed · **Priority**: P2 · **Depends on**: #427 (travel-rate single source), #426 (characterization tests); coordinates with finding #8 (trip mutation robustness) and #12 (duplicate trip modals)

## Problem

The transit _math_ mostly exists (one-way `distanceToClient`, Trip legs, 30-min cap, ADRs 0001-0003). The friction is at capture and in claims completeness:

- Auto-created trips from contiguous quick-form rows **don't get transit calculated** (`bulkAdd` skips it — finding #8), so the headline feature "transit fills itself in" silently half-works.
- Inter-client distances are entered in a separate ~850-line-duplicated modal _after_ capture, and Melvin never remembers that John→Jane is 12 km — the worker re-enters it every week.
- Provider-travel **labour time** is billed only when `transitDuration` is populated, which depends on `travelTimeToClient` being set per client and survives trip recalculation — there's no visibility when it's missing (unclaimed revenue: up to 30 min × rate per leg).
- The travel-time-claimable ↔ km-claimable linkage (`01-billing-requirements.md` §5: km only claimable where time is claimable) isn't represented.
- MMM region is implicitly MMM1-3; the cap constant is buried.

## Goals

1. A contiguous multi-activity save produces a trip with **complete, correct transit** with at most one confirmation prompt.
2. Known client-pair distances are remembered and prefilled.
3. Missing travel-time data is surfaced as unclaimed revenue, not silently skipped.
4. One trip editor component.

## Non-goals

- Map/API distance lookup (rejected in back-to-back plan: "no API costs" — a solo user knows their distances).
- Apportioning a multi-client run's travel across participants per the strict PAPL model — the per-leg allocation is a settled, documented simplification (ADR-0001/0002). Group-session venue travel apportionment is TRD-003's, different case.
- MMM4-5/6-7 support beyond making the region an explicit setting (TRD-002 D5 adds the setting; this consumes it).

## Design

### D1. Close the capture gap

`activity.bulkAdd` with `autoCreateTrip` runs the full trip pipeline (create trip → resolve legs → `calculateTripTransit` → persist) in one transaction. Leg resolution per D2; anything unresolvable defers to a **post-save prompt** (one dialog: "12 km / 15 min from John to Jane?") rather than a separate trip-builder session. This work overlaps finding #8 — implement together.

### D2. Remembered legs — `ClientPairDistance`

```prisma
model ClientPairDistance { fromClientId; toClientId; distance; duration; updatedAt; ownerId }
```

- Written whenever an inter-client leg is confirmed (trip create/edit); read to prefill the next occurrence of the same ordered pair (fall back to reversed pair, shown as prefill-suggestion styling like the existing symmetric prefill).
- With a remembered pair, the post-save prompt becomes a toast-level confirm ("Used 12 km John→Jane from last time · Edit"), meeting the ≤1-prompt goal.

### D3. Travel-time completeness

- Client form: `travelTimeToClient` gets equal billing with distance (same row, both prompted when either is set).
- Billing receipt (TRD-001 D6) includes the travel line; when distance exists but duration doesn't, show the warning chip: "Travel time not set for John — labour travel not billed."
- Invoice creation surfaces the same as a pre-generate warning (with TRD-005's readiness checks).
- Rule linkage: when a leg's claimable time is zero (missing) the km stays claimable _only if_ the time was merely uncapped-but-unknown vs. disallowed — practically: warn, don't block; the compliance edge (time disallowed ⇒ km disallowed) applies to disallowed items, which the two focus items never are.

### D4. Cap & region

- 30-min cap moves off a constant onto `User.mmmRegion` (TRD-002 D5): MMM1-3 → 30, MMM4-5 → 60. Cap warnings already exist; they pick up the setting.

### D5. One trip editor

- Merge `trip-builder-modal` / `trip-edit-modal` (finding #12) into one component in the same pass — D1-D3 all touch this surface; doing the dedup first makes the rest cheaper. UI behavior per the existing back-to-back plan (ordering by time, symmetric prefill, gap warning).

## Testing notes

- Characterization first (#426 covers trip transit; extend for `bulkAdd`-created trips).
- Unit: leg resolution order (remembered pair → reversed pair → prompt); cap by region; first/middle/last allocation unchanged (regression on ADR-0001 semantics).
- E2E: quick-form 3 contiguous activities with one known and one unknown pair → single prompt for the unknown → trip complete; invoice shows travel labour + non-labour lines per leg owner.
- Golden invoice: fixture trip reproducing the PAPL single-participant worked example ($41.67 time + $46.80 km on $50/h, 25 min + 60 km legs — `provider-travel.md`).

## Open questions

- Should `distanceToClient` also auto-learn (activity saved with a manual transit override → offer to update the client record)? Cheap win; confirm desired.
  - Answer: Yes, suggest after the fact to not block entry
- Retire `Client.travelTimeToClient` naming drift (`defaultTransitTime` column mapping) while touching this area, or leave to a cleanup pass?
  - Answer: No
