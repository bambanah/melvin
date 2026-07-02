# TRD-005 — Invoice Bundling & Cadence

**Status**: Proposed · **Priority**: P2 · **Depends on**: TRD-001 (activities reliably in-system), TRD-002 (warnings feed readiness checks) · **Relates to**: TRD-006 (post-send lifecycle)

## Problem

Invoicing is a memory game. The worker must remember that Client A gets invoiced immediately after each session, B weekly, C fortnightly; must notice unbilled activities are piling up; then drive a 6-step manual flow (create → client → date → tick activities → download PDF → separate mailto with **no attachment** → mark as sent). Nothing in the product knows about cadence at all — the requirement is invoices at differing frequencies per client (immediately, weekly, fortnightly, …).

## Goals

1. Each client has a billing cadence; Melvin computes what's due and drafts it.
2. "Ready to invoice" is a visible queue, not a memory.
3. Sending is one action: generate → email with PDF attached → mark sent.
4. Pre-send readiness checks catch billing warnings before the plan manager does.

## Non-goals

- Fully unattended auto-send. The worker always confirms a send (invoices are outward-facing money documents; a solo operator wants the glance). Auto-_drafting_ is fine.
- Payment collection/reconciliation changes (payment matching bugs are finding #9; not this TRD).
- NDIA bulk-upload CSV for agency-managed participants — payer mix is plan-/self-managed (confirmed); revisit if that changes.

## Design

### D1. Cadence on the client

```prisma
// on Client
billingCadence  BillingCadence @default(MANUAL)  // IMMEDIATE | WEEKLY | FORTNIGHTLY | MONTHLY | MANUAL
cadenceAnchor   DateTime?      // start of the current period (for fortnightly alignment)
```

- `IMMEDIATE`: an activity save for this client offers/creates a draft invoice for that day's activities.
- Periodic: a period closes at local end-of-day on the boundary; activities in the closed period become due.
- `MANUAL`: current behavior, default — nothing changes until the user opts a client in.

### D2. The due queue

- Server-derived (no stored queue): for each client, unassigned activities in closed periods ⇒ a **due bundle** `(client, period, activities[], total, warnings)`.
- Dashboard gets a "Ready to invoice" card listing due bundles ("Jane · fortnight ending Sun · 5 activities · $612.40 · ⚠ 1 warning"), one tap → pre-filled draft (client, activities ticked, next invoice number, date = today). The existing invoice form is reused, arrived-at fully populated.
- Aging nudge: any unassigned activity older than its client's period (or 30 days for MANUAL) shows a counter on the dashboard card. No push notifications in v1 — the worker opens the app daily to capture anyway (per TRD-001; the dashboard _is_ the surface).

### D3. One-action send

- `Invoice → Send`: generates the PDF server-side, emails it to `client.invoiceEmail` (which exists but is currently only a bare `mailto:`), CCs the user, sets `SENT` + `sentAt` on success. Provider email via Resend/Nodemailer + a `User.fromEmail` (or the login email) — pick per deploy environment; secret handling per plans/002 conventions.
- Failure leaves status untouched with a visible error; "Download PDF" remains for manual sending (some plan managers want portal uploads).
- Send is the seal point for TRD-006 (immutability begins at `SENT`).

### D4. Readiness checks

Before generate/send, run and display:

- rate warnings from the engine (TRD-002: missing variant, over-limit custom rate, missing catalogue row),
- travel completeness (TRD-004: distance without duration),
- structural checks (activity with no support item resolution; the invoice-total invariant from `01-billing-requirements.md` §11.6).
  Warnings don't block (self-managed clients can be lenient); each is one tap from its fix surface.

## API changes

- `client` router: cadence fields on the existing update path.
- New `invoice.due` query (the derived queue) and `invoice.send` mutation (generate + email + status transition, idempotent — re-send re-emails the same sealed document).
- `invoice.create` accepts a `bundle` reference so drafts from the queue skip re-selection.

## Testing notes

- Period math unit tests: fortnight anchoring across DST and month ends; IMMEDIATE same-day grouping; a client switching cadence mid-period (activities fall into the _new_ schedule's next close, never dropped or double-bundled — property: every unassigned activity appears in exactly one future bundle).
- `invoice.send` failure-mode tests: SMTP failure → status unchanged; double-tap → one email (idempotency).
- E2E: capture activity for IMMEDIATE client → draft offered → send → status SENT with sentAt; fortnightly client shows nothing until boundary passes (clock-controlled test).
- Email snapshot: attachment present, filename = invoiceNo.pdf, GST-free line in body/PDF (billing doc §10).

## Open questions

- Period boundary alignment for WEEKLY (ISO Monday? client-specific weekday?) — recommend anchor-date-derived like fortnightly, avoiding a special case.
  - Answer: ISO Monday
- Should IMMEDIATE auto-_create_ the draft (visible in list) or only offer via post-save toast? Recommend auto-create: drafts are cheap and visible.
  - Answer: Auto-create
- Multiple periods due at once after a lapse (returning from holiday): one bundle per period or merged? Recommend merged into one invoice with per-date lines — matches how the PDF already groups.
  - Answer: Merged
