# ADR 0004: Invoice Versions Freeze Rendered Output at Send Time

**Status**: Accepted
**Date**: 2026-07-07
**Supersedes**: ADR 0003 (for activities on sent/paid invoices)

## Context

Invoices held only metadata and FK links to live activities; the PDF was recomputed from current rates, support items, and user bank details on every download. Any later change silently rewrote historic invoices, and an amended invoice was indistinguishable from the original.

## Decision

Sending an invoice freezes an **Invoice Version**: the _resolved output_ — line items (description, code, date, details, unit price, line total), totals, and every header field the PDF prints (participant details, bill-to, provider ABN/bank details) — stored as a Zod-validated `jsonb` document (with `schemaVersion`) on an `InvoiceVersion` row, plus queryable columns (`versionNumber`, `sentAt`, `total`). Versions are displayed as INV-001, INV-001a, INV-001b (suffix derived from the version ordinal; the stored `invoiceNo` never changes).

A clean PDF can only be rendered from a version; live-data renders carry a DRAFT watermark. Sent/paid invoices — including their activities, transport items, and trips touching those activities — are locked against mutation; the explicit Amend action unlocks them, and re-sending freezes the next version. Invoices with a version can never be deleted, and neither can anything whose delete would cascade into them (clients get an active/inactive flag instead; `InvoiceVersion` FK is `onDelete: Restrict`). Existing sent/paid invoices are backfilled with a v1 from current data, flagged `backfilled`.

## Considered options

- **Store PDF bytes** — byte-exact downloads, but opaque (no display/diffing) and needs blob storage. Content-exactness is what NDIS invoicing requires; layout drift is cosmetic.
- **Freeze inputs (copied activities + rates), recompute on download** — rendering-logic changes (rounding, grouping, travel codes) would still retroactively alter historic numbers.
- **Superseding invoice records or credit notes** — ceremony misfitting a solo provider; the provider's mental model is "the same invoice, corrected".

## Consequences

- Rendering-pipeline bug fixes do not retroactively change sent invoices' numbers — deliberate.
- `getTotalOwing` / payment matching read frozen totals for sent invoices instead of recomputing.
- ADR 0003's allow-recalc-with-warning now applies only to activities on draft invoices; trip edits touching a locked invoice's activities are rejected with an "amend first" error.
- `paidAt` is stamped onto the paid version before an amendment clears the invoice-level field, preserving what was paid.
