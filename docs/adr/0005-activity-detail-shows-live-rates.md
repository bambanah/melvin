# ADR 0005: Activity Detail Page Shows Live Rates, Not Frozen Version Numbers

**Status**: Accepted
**Date**: 2026-07-24
**Relates to**: ADR 0004 (Invoice Versions freeze rendered output)

## Context

The activity detail page is being extended into a per-activity billing breakdown that expands an Activity into its Billing Lines via `billableLines()` - the single costing path. For an invoiced Activity this raises a conflict with ADR 0004: an Invoice Version freezes the resolved output at send time, and `getTotalOwing` / payment matching read those frozen totals, precisely so later rate or catalogue edits cannot move a settled amount. A breakdown page that recomputes `billableLines()` live could therefore display per-line figures that differ from what the linked Invoice actually billed.

Reconstructing the frozen per-Activity lines from an Invoice Version is possible but awkward: versions freeze at the invoice grain, Backfilled Versions are best-effort recomputes rather than true freezes, and the invoice page already exists to show the frozen truth.

## Decision

The activity detail page always computes its breakdown **live** from current rates via `billableLines()`, for both Pending and invoiced Activities. It never reads from the Invoice Version.

For an invoiced Activity, the page frames its numbers as current rates and points to the linked Invoice as the source of truth for the amount actually billed (a "reflects current rates - see invoice for billed amount" caveat, gated on the Activity's invoice status). The Invoice page and Invoice Version remain the only authority on frozen, billed figures.

## Considered options

- **Frozen-from-version when invoiced** - the page would never disagree with the invoice, but requires reconstructing per-Activity lines from the invoice-grain version document, degrades for Backfilled Versions, and duplicates what the invoice page already shows.
- **Hide the breakdown once invoiced** - avoids the mismatch entirely but discards the page's value for reviewing historic work and is inconsistent with Pending Activities.

## Consequences

- The unique value of the page - previewing what an Activity _will_ bill - is inherently a live, Pending-Activity concern, which this decision serves directly.
- An invoiced Activity's displayed lines can legitimately differ from the frozen Invoice Version after a later rate/catalogue edit. This is expected, not a bug; the caveat and invoice link exist to explain it.
- There is still exactly one costing path (`billableLines()`); this ADR only governs _which inputs_ (live vs frozen) the detail page feeds it, consistent with ADR 0003's live-recalc-for-drafts stance.
