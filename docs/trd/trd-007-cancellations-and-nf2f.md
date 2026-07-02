# TRD-007 — Short-Notice Cancellations & Non-Face-to-Face Claims

**Status**: Proposed · **Priority**: P3 (revenue add, not a fix) · **Depends on**: TRD-002 (rate engine + catalogue claim-type flags), TRD-003 D4 (group attendance) · **Feeds**: TRD-001 D4's capture hooks

## Problem

Two legitimately billable event types have no representation, so they either leak revenue or live in the phone note:

- **No-show / late cancellation**: <7 days' notice or participant absent — claimable **up to 100%** of the agreed fee on the same support item ("Cancellation" claim type). A no-show today is either not entered (lost income) or entered as a normal activity (compliance misstatement — plan managers can see the difference matters on audit).
- **Non-face-to-face work**: participant-specific enabling work (progress reports, session prep specific to the participant) is claimable on both focus items. Currently unrepresentable; either unbilled or smuggled into session times.

Rules detail: `01-billing-requirements.md` §7-8.

## Goals

1. A no-show is captured in ≤ the taps of a normal activity and bills correctly (same item/rate, cancellation-labelled line).
2. NF2F time is capturable against a client and bills on the right item with an NF2F-labelled line.
3. Both are visibly distinct in calendar, activity lists, and invoice PDFs.

## Non-goals

- Enforcing the "provider couldn't find alternative billable work" condition — that's a human judgment; the UI states the condition, the worker confirms once per cancellation.
- Tracking notice periods/cancellation timestamps to _prove_ <7 days — capture an optional note; the service agreement governs.
- 2-business-day cancellation variant (non-DSW supports) — not used by these items.
- Waived-fee tracking (a waived cancellation is simply not entered).

## Design

### D1. Activity kind

```prisma
// on Activity
kind ActivityKind @default(DELIVERED)  // DELIVERED | CANCELLED | NF2F
cancellationNote String?
```

One enum beats parallel models: cancellations and NF2F flow through existing invoicing, lists, and (for CANCELLED) trip membership untouched.

- **CANCELLED**: keeps its scheduled times (the fee basis), client, support item. Rate engine resolves exactly as if delivered (variant by the scheduled time — a cancelled Saturday session bills the Saturday rate). Invoice line renders with `kind: CANCELLATION` (TRD-006 line model): "Short Notice Cancellation — <item description>", same code, same unit price.
  - **No provider travel / ABT / transport items** on a cancelled activity (no face-to-face delivery ⇒ travel not claimable). If the no-show was discovered en route mid-trip, the trip keeps the cancelled activity as a _waypoint_ for leg allocation (the driving to the next client still happened) but the cancelled activity itself claims no travel — allocate its inbound leg to the next activity in the trip (TRD-004's leg resolution handles it as a pass-through node).
- **NF2F**: client + support item + duration (times optional — allow bare duration entry, e.g. "45 min report writing"); no transit, no transport items, never in a trip. Line label "Non-Face-to-Face Support — <description/note>", same code and rate resolution (time-of-day variant from when the work was done; default weekday daytime when only a duration is given).

### D2. Capture UX (fills TRD-001 D4's placeholder)

- Quick-form row gets a kind selector as a third chip alongside Group: default Delivered; "No-show" and "NF2F" states restyle the row (no-show hides km/parking; NF2F swaps time-range for duration-or-times and hides km/parking).
- First no-show per client shows the one-time condition confirm: "Less than 7 days' notice or no-show, cancellation terms are in your service agreement, and you couldn't fill the time — bill up to 100%?" with an editable percentage (default 100%). Percentage stores as a rate override on that activity (`agreedFeePortion Decimal @default(1)`), applied by the rate engine after limit resolution.
- Group sessions: TRD-003 D4's attendance toggle sets `kind = CANCELLED` on that member's activity; divisor unchanged (the group rule).

### D3. Visibility

- Calendar/agenda chips: distinct styling + icon for cancelled (struck-through time) and NF2F.
- Dashboard/period summaries count them separately ("14h delivered · 2h cancelled · 1.5h NF2F") — the NDIA monitors unusual cancellation volumes; the worker should see their own pattern before the NDIA does.
- PDF: labelled lines as above; readiness checks (TRD-005 D4) flag an invoice that is _majority_ cancellations as a heads-up, not a block.

## API changes

- `activity.add/bulkAdd/modify` accept `kind`, `cancellationNote`, `agreedFeePortion`; validation matrix per kind (CANCELLED forbids transport items; NF2F forbids transit + trip membership).
- Overlap validation: CANCELLED activities don't block overlapping real activities (the whole point is the time was freed — but warn, since billing both a cancellation and replacement work for the same slot violates the alternative-work condition). NF2F never participates in overlap checks.

## Testing notes

- Rate parity: cancelled Saturday group session member bills identically to an attended one except the line label (golden-file pair).
- The overlap nuance above: cancellation + new booking same slot → warning surfaced, both saveable; invoice readiness repeats the warning.
- Trip pass-through: 3-activity trip, middle one no-show → legs re-allocate to the third activity, cancelled one has zero transit, trip total km unchanged.
- NF2F duration-only entry resolves weekday-daytime variant and appears with no travel lines.
- `agreedFeePortion` 50% cancellation renders quantity × (rate × 0.5)? No — render full unit price with halved quantity? Neither: render agreed unit price = resolved × portion, full duration (matches "up to 100% of the agreed fee" semantics and keeps quantity truthful). Test pins this rendering.

## Open questions

- Does the worker want cancellation percentage at all, or is it always 100%/waived (never entered)? If always-100%, drop `agreedFeePortion` and the picker.
  - Answer: Always 100%
- Should NF2F require times rather than bare duration for audit comfort? (Recommend allowing bare duration; the PAPL doesn't require times for NF2F.)
  - Answer: Bare duration
