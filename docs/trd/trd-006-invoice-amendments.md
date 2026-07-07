# TRD-006 — Invoice Amendments & Corrections

**Status**: Accepted with amended design — see ADR-0004 and plan 017 · **Priority**: P2 · **Depends on**: TRD-005 D3 (send = seal point) conceptually; implementable independently against `SENT` status · **Relates to**: TRD-002 (rate snapshots), finding #9 (payment matching)

> **Design amendment (2026-07-07)**: ADR-0004 supersedes D1/D2's mechanism.
> Amendments are **versions within one Invoice** (`InvoiceVersion` jsonb
> snapshots; INV-001 → INV-001a) — no `amendsInvoiceId` chain, no `AMENDED`
> status, no relational `InvoiceLine` table. D3 simplifies away (one invoice
> row carries payment state; `paidAt` is stamped onto the paid version before
> an amendment clears it). D4's guard rails, the migration approach, the
> testing notes, and the answered open questions carry forward unchanged.
> Implementation: docs/plans/017-invoice-versioning.md.

## Problem

"Sent" means nothing today. The `EDIT` link is always available; editing a SENT or PAID invoice silently mutates it, and re-downloading regenerates a **different PDF under the same invoice number** — the exact scenario that causes plan-manager reconciliation disputes. Worse, because PDF lines are computed from _live_ data (current rates, current client transit rate, current support-item codes), an old invoice's PDF can change without anyone editing the invoice at all — a rate update or a TRD-002 catalogue change would rewrite history.

Real corrections the worker needs: wrong times (over/under-billed), forgotten parking, wrong client on an activity, a plan manager bouncing a line, a rate typo discovered after sending.

## Goals

1. A sent invoice is **immutable**: its PDF renders byte-identically forever.
2. Corrections are a first-class flow producing a new versioned document that references the original.
3. The activity ledger stays truthful: amended activities keep one canonical record; the invoice history shows what was billed when.

## Non-goals

- Formal credit notes as separate accounting documents. For plan-/self-managed payers, a **replacement invoice** ("amends and supersedes INV-042") is the accepted practice and far simpler than credit-note double-entry. If an NDIA-managed payer ever appears, revisit.
- Editing paid invoices' amounts without amendment (explicitly removing today's "Revert to Created" free-for-all on PAID — reverting stays possible but lands in the amendment flow).
- Multi-currency, partial payments (payment logging exists; untouched).

## Design

### D1. Line snapshots (the immutability mechanism)

On transition to `SENT`, materialize the computed lines:

```prisma
model InvoiceLine {   // written once at send-time, never updated
  id; invoiceId
  description; supportItemCode; serviceDate
  quantity; unit;  unitPrice; total    // exactly what the PDF shows
  activityId String?                   // provenance, SetNull on activity delete
  kind LineKind // SUPPORT | TRAVEL_TIME | TRAVEL_KM | ABT | EXPENSE | CENTRE_CAPITAL | CANCELLATION
}
```

- PDF generation for `SENT`+ invoices renders **from lines**, not from live activities; for `CREATED` drafts it computes live (current behavior). One renderer, two data sources.
- This also fixes the silent-history-rewrite problem: TRD-002 rate changes can't touch sealed invoices.
- `updateStatus` to `SENT` becomes the sealing transaction (compute lines + set status). TRD-005's `invoice.send` calls it; manual "Mark as Sent" does the same.

### D2. The amendment flow

- On a `SENT`/`PAID` invoice, `EDIT` is replaced by **Amend**: creates a new draft invoice pre-populated with the original's activities, `invoiceNo` = original + version suffix (`Smith-042-2`; suffix scheme configurable with the existing `invoiceNumberPrefix` convention), and a back-reference:

```prisma
// on Invoice
amendsInvoiceId String?   // the superseded invoice
status          InvoiceStatus  // + AMENDED terminal state for the original
```

- The worker edits activities as normal (they're back in draft-land, warnings re-run), then sends. On send of the amendment: original → `AMENDED` (terminal; excluded from due/owing totals), amendment → `SENT`.
- The amendment PDF carries a header line: _"This invoice amends and supersedes INV-Smith-042."_ — the phrase plan managers need to reprocess without a phone call.
- Cancelling an amendment draft returns the original to `SENT` untouched.
- Chain: amendments can themselves be amended (`-3`, …); `amendsInvoiceId` forms the chain; only the head is ever payable.

### D3. Payments across amendments

- A payment logged against an `AMENDED` invoice migrates its association to the chain head (or is flagged if amounts diverge: "Paid $500 against INV-042; amended total is $460 — record $40 credit owing?" → note field, no accounting engine).
- Finding #9's amount-keyed matching should be fixed before or with this — matching must key on invoice number, which amendments make even more necessary.

### D4. Guard rails replacing today's affordances

- Activity edit for an activity on a sealed invoice → blocked with "part of sent invoice INV-042 — amend it?" (one tap into D2). Same for trip recalculations that would touch sealed activities (ADR-0003 allowed modifying invoiced trips — that ADR is **superseded** by sealing; flag the conflict in the ADR per domain-docs convention).
- `PAID → CREATED` revert button is removed; `PAID → SENT` (mis-click undo) stays.

## Migration

- Existing `SENT`/`PAID` invoices: seal them retroactively by computing lines with **current** data (best available — a one-time known inaccuracy, noted in the migration log; the alternative, leaving them live, perpetuates the bug class).

## Testing notes

- Byte-stability: seal an invoice, change every upstream input (rates, client transit rate, support item codes, activity times via direct DB write), re-render → identical PDF. This is the headline regression test.
- Amendment E2E: send → amend → edit activity → send amendment → original AMENDED + excluded from owing totals; PDF header references original; payment on original migrates to head.
- Chain: amend twice; assert only head payable; invoice list shows the chain sensibly (one logical row, expandable).
- Guard: editing sealed activity blocked in both UI and router (router-level test — ownership-scoping harness from docs/plans/003 is the right home).

## Open questions

- Version suffix format: `-2` vs `.1` vs `A` — worker preference; suffix must survive `getNextInvoiceNo`'s parsing.
  - Answer: Should end in "a", "b" etc.
- Should `AMENDED` originals stay in the default invoice list or live under the head's expansion only? (Recommend the latter.)
  - Answer: the latter
- Retroactive sealing: acceptable to seal PAID invoices with current-data lines, or should PAID be left unsealed and only guarded? (Recommend seal; PAID disputes are rare and the guard complexity of dual modes is worse.)
  - Answer: seal
