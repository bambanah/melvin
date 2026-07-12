# Melvin TRDs — Activity Capture → Compliant Invoice

**Written**: 2026-07-02, against commit `c48e1dd` + working-tree WIP (group activity form). Produced from a PM/architect UX analysis of the capture-to-invoice flow; the driving problem: _entering an activity in Melvin loses to jotting it in a phone note_.

## Reading order

| Doc                                                        | What it is                                                                                                                                                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [00-ux-analysis.md](./00-ux-analysis.md)                   | The diagnosis: flow-by-flow friction analysis, target UX principles, TRD map. Read first.                                                                                                                              |
| [01-billing-requirements.md](./01-billing-requirements.md) | NDIS billing rules & gotchas for the two focus items (`04_104_0125_6_1`, `04_102_0136_6_1`) + travel/ABT/cancellation/NF2F, and the layered validation strategy for testing. The compliance reference every TRD cites. |

## The TRDs

| TRD                                                        | Title                                                                                                                               | Priority | Depends on                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------- |
| [001](./trd-001-capture-first-activity-entry.md)           | Capture-first activity entry (drafts, offline outbox, PWA, complete quick form, billing receipt)                                    | P1       | docs/plans/001-006                              |
| [002](./trd-002-support-item-catalogue-and-rate-engine.md) | Support item catalogue & rate engine (official catalogue as data, effective-dated limits, public holidays, custom-price validation) | P1       | docs/plans/004-006                              |
| [003](./trd-003-group-activities-and-apportionment.md)     | Group activities & apportionment (GroupSession, limit ÷ N, transport apportionment, attendance, centre capital)                     | P1       | TRD-002; reconcile group-form WIP + finding #7  |
| [004](./trd-004-provider-travel-and-trips.md)              | Provider travel & trips UX (bulkAdd transit gap, remembered client-pair legs, travel-time completeness, one trip editor)            | P2       | docs/plans/005-006; pairs with findings #8, #12 |
| [005](./trd-005-invoice-bundling-and-cadence.md)           | Invoice bundling & cadence (per-client cadence, due queue, one-action send with attachment, readiness checks)                       | P2       | TRD-001, TRD-002                                |
| [006](./trd-006-invoice-amendments.md)                     | Invoice amendments (line snapshots at send, immutable sent invoices, amend-and-supersede flow)                                      | P2       | standalone; pairs with finding #9               |
| [007](./trd-007-cancellations-and-nf2f.md)                 | Cancellations & NF2F claims (Activity.kind, no-show billing, NF2F entries)                                                          | P3       | TRD-002, TRD-003                                |

## Assumptions binding all TRDs

- **User model**: one solo sole-trader support worker, phone-first capture, desktop for admin. Payers: plan-managed and self-managed (no NDIA-portal bulk claiming).
- **Baseline**: the six security/correctness plans in `docs/plans/` (PDF auth, secret rotation, ownership scoping, 8pm boundary, characterization tests, travel-rate single source) land **before** TRD work begins.
- **Scope guard**: national prices, MMM1-3 defaults (state + region become settings in TRD-002); programs of support out of scope; the two focus support-item families first, architecture open to more.

## Suggested sequencing

```
docs/plans/001-006 ──► TRD-001 ──► TRD-005
              └─► TRD-002 ──► TRD-003 ──► TRD-007
                          └─► TRD-004      TRD-006 (anytime after docs/plans/)
```

TRD-001 and TRD-002 are independent of each other and can run in parallel. TRD-006's line-snapshot work is self-contained and a good early pick if invoice trust is urgent.

## Known conflicts to resolve during implementation

- **ADR-0003** (modifiable invoiced trips) was superseded by TRD-006's sealing model — resolved: TRD-006 landed as plan 017, and `docs/adr/0003-modifiable-invoiced-trips.md` now carries `Status: Superseded by ADR-0004`.
- TRD-003 removes the `groupTransitRatePerKm` concept entirely; the glossary additions (Group Session, Cancellation, NF2F, Sealed Invoice, Due Bundle) still aren't folded into `CONTEXT.md` — keep as a live item for TRD-005/007 implementation.
- Plan 013's (`docs/plans/013-architecture-deepening.md`) transit-module proposal is _how_ to build TRD-002/004's engine seams — it complements, not conflicts.
- `ndis-support-catalogue.json` (refreshed to 2026-27 by plan 021, the interim fix) and the stale `price-guide-24-25.pdf` reference are deleted by TRD-002.
