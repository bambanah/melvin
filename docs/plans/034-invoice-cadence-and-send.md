# Plan 034: Invoice cadence, due queue, and one-action email send (TRD-005 D1–D3)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/server/api/routers/invoice-router.ts src/server/api/routers/client-router.ts prisma/schema.prisma docs/trd/trd-005-invoice-bundling-and-cadence.md`
> If the `send` procedure moved or changed materially, re-read it before Step 4.

## Status

- **Priority**: P3 (behind 033; readiness checks arrive with the rate engine)
- **Effort**: L
- **Risk**: MED — `send` becomes outward-facing (emails a client); idempotency and failure modes matter
- **Depends on**: 020 (transactional invoice writes), soft dependency on 033 (D4 readiness checks are deferred until the engine exists)
- **Category**: direction
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

Per `docs/trd/trd-005-invoice-bundling-and-cadence.md`, invoicing is a memory game: the worker must remember each client's billing rhythm, notice the unbilled pile growing, and drive a 6-step manual flow ending in a `mailto:` with **no attachment**. The product knows nothing about cadence. This plan implements the TRD's D1–D3: cadence on the client, a derived "ready to invoice" queue, and a one-action send that generates the sealed PDF, emails it with attachment, and marks SENT. D4 (readiness checks) is deferred to the rate engine's phases. Revenue-timeliness for a solo operator, and it removes the flow where a sent invoice never actually reached anyone.

## Current state

- The spec: `docs/trd/trd-005-invoice-bundling-and-cadence.md` — read fully. Decisions inlined (including answered open questions):
  - **D1**: `Client.billingCadence BillingCadence @default(MANUAL)` (`IMMEDIATE | WEEKLY | FORTNIGHTLY | MONTHLY | MANUAL`) + `Client.cadenceAnchor DateTime?`. WEEKLY aligns **ISO Monday** (answered). IMMEDIATE **auto-creates** the draft (answered). Multiple overdue periods **merge into one invoice** with per-date lines (answered).
  - **D2**: due queue is **server-derived, no stored queue**: per client, unassigned activities in closed periods ⇒ due bundle `(client, period, activities[], total, warnings)`. Dashboard card + aging nudge (>1 period, or 30 days for MANUAL). No push notifications in v1.
  - **D3**: `Invoice → Send` generates the PDF server-side, emails to `client.invoiceEmail`, CCs the user, sets SENT+sentAt on success; failure leaves status untouched with a visible error; idempotent (re-send re-emails the same sealed document); "Download PDF" stays.
  - Non-goals: unattended auto-send, payment reconciliation (plan 022's territory), NDIA bulk upload.
- What already exists (plan 017 / ADR-0004 — build on it, don't duplicate):
  - `invoice.send` (`src/server/api/routers/invoice-router.ts:587+`) already: asserts CREATED status, loads data via `loadInvoiceForPdf`, freezes an `InvoiceVersion` inside a per-invoice transaction (`transitionInvoices` scaffolding at line ~264), sets SENT. **Email is the missing piece.**
  - A sealed version renders to PDF via `renderInvoiceVersionPdf(content)` in `src/lib/pdf-generation.ts` (~line 366) returning `{ pdfString /* base64 */, fileName }` — the exact bytes to attach.
  - `docs/adr/0004-invoice-versions-freeze-rendered-output.md`: a clean PDF only from a version; re-send after amendment freezes the next version. "Re-send re-emails the same sealed document" = render the **latest version**, not live data.
- Email infra: `nodemailer@9` is already a dependency (used by NextAuth email provider — see `src/server/auth.ts` and the `EMAIL_SERVER`/`EMAIL_FROM` env vars in `src/env/`). Reuse that transport configuration; do not add a new provider or dependency.
- `Client` model (`prisma/schema.prisma:81-104`): has `invoiceEmail`-ish field — verify its exact name (`grep -n "mail" prisma/schema.prisma`); TRD says it exists but is only used for a bare `mailto:`.
- Vocabulary (use in names/UI copy): TRD calls the queue entries **due bundles**; CONTEXT.md glossary gains "Due Bundle" when this lands (add it — TRD README's known-conflicts note asks for exactly that).
- Period math has no existing helper — new pure module, unit-tested (this is where most of the subtle bugs live; see Test plan).

## Commands you will need

| Purpose     | Command                               | Expected on success |
| ----------- | ------------------------------------- | ------------------- |
| Migration   | `pnpm prisma:migrate`                 | applied             |
| Typecheck   | `pnpm type-check`                     | exit 0              |
| Unit        | `pnpm test:unit`                      | all pass            |
| Integration | `pnpm db:up && pnpm test:integration` | all pass            |
| E2E         | `pnpm test:e2e`                       | all pass            |

## Scope

**In scope**:

- `prisma/schema.prisma` — `BillingCadence` enum + two `Client` columns (+ migration)
- `src/schema/client-schema.ts` + `client-router.ts` update path (cadence fields)
- `src/lib/billing-periods.ts` (create — pure period math: period-of(date, cadence, anchor), closed-period enumeration, ISO-Monday weekly)
- `invoice.due` query (new, invoice-router) — the derived due-bundle list
- `invoice.send` — extend with email dispatch (attachment from the just-frozen version)
- IMMEDIATE-cadence hook where activities are created (locate: activity `add`/`bulkAdd` and invoice-embedded creation — auto-create/attach a same-day draft per the answered question)
- Dashboard "Ready to invoice" card + send-flow UI states (`src/pages/dashboard/`, `src/components/invoices/`)
- Tests per Test plan

**Out of scope**:

- D4 readiness checks (needs plan 033's engine warnings) — leave a `warnings: []` placeholder in the bundle shape.
- Push notifications, auto-send, payment matching, amend flow changes.
- Changing the version-freezing logic itself — email wraps around it.

## Git workflow

- Branch: `advisor/034-cadence-and-send`
- Commit per step, conventional concise titles.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Schema + client settings

Enum + columns per D1; expose in `client-schema.ts`/`client-router.ts` update; client form UI gains the cadence select (match existing form conventions — RHF + zodResolver, see `client-form.tsx`).

**Verify**: `pnpm prisma:migrate` → applied; `pnpm test:integration` → client router tests green.

### Step 2: Pure period math

`src/lib/billing-periods.ts`: given (cadence, anchor, today) → the closed periods and current period; ISO-Monday weekly; fortnight from anchor; calendar monthly; MANUAL/IMMEDIATE → no periods. All `dayjs` via the repo's central import if plan 026 landed (check), else match `date-utils.ts` style.

**Verify**: unit tests (Test plan §1) → pass.

### Step 3: `invoice.due` query

For the session user: clients with cadence ≠ MANUAL (plus the 30-day MANUAL aging rule), their invoice-unassigned activities (`invoiceId == null` — verify the actual relation shape in `prisma/schema.prisma`) grouped into due bundles; merged across overdue periods per the answered question. Return `(client, periodEnd, activityIds, total, warnings: [])`. Totals: reuse whatever the invoice list uses for uninvoiced totals (`grep -rn "getTotalCost" src/lib` — the billable-lines module is the single authority per plan 007).

**Verify**: integration tests (Test plan §2) → pass.

### Step 4: Email on send

Inside `send`'s per-invoice flow, **after** the version freeze commits (transaction from `transitionInvoices`) but as part of the same user action: render the frozen version via `renderInvoiceVersionPdf`, send via the NextAuth-configured nodemailer transport (`EMAIL_SERVER`/`EMAIL_FROM`) to the client's invoice email, CC the user, attach `{ filename: fileName, content: pdfString, encoding: "base64" }`.

Failure semantics (TRD D3, decide-and-encode): email failure after the version froze must NOT leave the worker thinking it sent. Since the version freeze is meaningful on its own (ADR-0004), the pragmatic contract: freeze + SENT commit first; if the email then fails, surface a per-invoice error in the response (`{ emailed: false, error }`) and the UI shows "Sent (email failed — download and send manually)". Re-invoking send on a SENT invoice currently throws `amendFirst` — add an explicit `invoice.resendEmail` mutation (latest version → same email path) rather than overloading `send`; that also gives the TRD's idempotent re-send. Clients with no invoice email: `send` succeeds as today with `emailed: false, error: "no invoice email on client"`.

**Verify**: integration tests with a stubbed transport (Test plan §3) → pass; `pnpm test:e2e` → existing send flow still green.

### Step 5: IMMEDIATE hook + dashboard card

- IMMEDIATE: after activity creation for such a client, auto-create (or attach to) that day's draft invoice for that client — inside the same transaction if the write already has one (plan 020's shape), else follow-up write with the same validation the invoice router applies.
- Dashboard: "Ready to invoice" card listing due bundles (`"Jane · fortnight ending Sun · 5 activities · $612.40"`), tap → invoice form pre-filled (client, ticked activities, next invoice number via existing `getNextInvoiceNo`, date=today). Reuse the existing invoice form — arrived-at fully populated, per TRD.

**Verify**: e2e — new scenario per Test plan §4.

## Test plan

1. **Unit — period math** (the TRD's own list): fortnight anchoring across month ends; a client switching cadence mid-period (activities land in the new schedule's next close — property: every unassigned activity appears in exactly one future bundle, never dropped or doubled); ISO-Monday weekly boundaries; DST-transition weeks (AU: first Sunday of April/October).
2. **Integration — due query**: activities across two closed fortnights merge to one bundle; assigned activities excluded; MANUAL client appears only via the 30-day aging rule; cross-tenant isolation (user B's activities never in A's bundles — follow `ownership.integration.test.ts`).
3. **Integration — send email**: stub/inject the transport (design the send path to take the transport as a dependency for tests); SMTP failure → invoice still SENT+versioned but response carries `emailed: false` and the error; success → exactly one message with one PDF attachment named `<displayInvoiceNo>.pdf`; `resendEmail` on a twice-versioned invoice attaches the **latest** version; double-tap send → second call rejects with `amendFirst` (existing behavior preserved).
4. **E2E**: set a client IMMEDIATE → create activity → draft exists; dashboard shows the bundle for a fortnightly client with a closed period (seed with a past anchor); send → status SENT (email path stubbed or env-gated off in e2e — do not send real mail from tests; check how e2e env is configured in `playwright.config.ts` before deciding, and document the choice).

## Done criteria

- [ ] Cadence settable per client; `invoice.due` returns correct merged bundles (integration-proven)
- [ ] Send attaches the sealed-version PDF and emails it; failure modes per Step 4 contract, all integration-tested with a stubbed transport
- [ ] IMMEDIATE auto-creates same-day drafts (e2e-proven)
- [ ] Dashboard card lists due bundles and deep-links to the pre-filled form (e2e-proven)
- [ ] `CONTEXT.md` gains the "Due Bundle" glossary entry
- [ ] `pnpm type-check`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e` all exit 0
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

- The client model has no invoice-email field after all (grep in Current state) — adding one is in scope, but if email data doesn't exist for real clients the send UX needs a product decision on the empty state beyond the `emailed: false` contract; report.
- The NextAuth email transport config turns out to be unusable outside the auth flow (e.g. provider-specific from-address restrictions) — report; choosing a new email provider is an operator decision (secrets involved).
- Send-time transaction + SMTP call interact badly (email inside a DB transaction is forbidden — if you find yourself needing that, the Step 4 ordering contract is being violated; re-read it and report if it genuinely can't hold).
- Period math meets a case the TRD didn't decide (e.g. cadenceAnchor in the future) — pick the conservative behavior (no bundles), test it, and flag it in the report.

## Maintenance notes

- When plan 033's phases deliver engine warnings, populate `warnings` in the bundle and the pre-send display (TRD D4) — the shape is already there.
- The transport-as-dependency seam from Step 4 is also what a future provider swap (Resend etc.) uses.
- TRD-007 (cancellations/NF2F) adds activity kinds that must flow into bundles untouched — the due query groups by client/period only, so it should be inert, but reviewers of TRD-007 work should re-run §2's property test.
