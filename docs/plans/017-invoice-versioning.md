# Plan 017: Invoice versioning — sent invoices freeze an immutable version

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you
> they maintain the index.
>
> **Read first**: `docs/adr/0004-invoice-versions-freeze-rendered-output.md`
> (the design authority for this plan) and `CONTEXT.md` (Invoice Version,
> Draft, Amendment, Client). TRD-006 is the requirements source but its D1/D2
> mechanism (relational `InvoiceLine` rows, `amendsInvoiceId` chain, `AMENDED`
> status) is **superseded by ADR 0004**: one Invoice, many `InvoiceVersion`
> jsonb snapshots, no new status enum value.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED-HIGH (new invariants across five routers; a missed guard or a
  bad backfill silently re-admits the history-rewrite bug this plan kills)
- **Depends on**: docs/plans/007 (billable-lines seam + loader/renderer
  split — `send` persists what `billableLines` computes, and the version PDF
  renders through 007's pure `renderInvoicePdf`)
- **TRD**: TRD-006 (as amended by ADR 0004)
- **Category**: feature / architecture
- **Planned at**: 2026-07-07

## Why

A "sent" invoice is a status flag over live data: rate changes, support-item
edits, activity edits, trip recalcs, and even user bank-detail changes all
silently rewrite historic invoices' PDFs, and an amended invoice re-downloads
under the same number as the original. This plan makes sending freeze an
immutable **Invoice Version** (resolved lines + totals + header + provider
details as jsonb), locks sent/paid invoices behind an explicit **Amend**
action, renders clean PDFs only from versions (live renders are watermarked
DRAFT), and displays versions as INV-001, INV-001a, INV-001b.

## Current state

(Line numbers at `fb2ad5f`; plan 007 will shift `pdf-generation.ts` —
re-locate rather than trust offsets.)

- `prisma/schema.prisma:105` — `Invoice` holds only metadata + FK links;
  `:232` — `InvoiceStatus { CREATED, SENT, PAID }`. No version/snapshot
  storage anywhere.
- `src/server/api/routers/invoice-router.ts:349` — `updateStatus` is a
  generic bulk enum setter (any→any, nulls `sentAt`/`paidAt` on CREATED);
  `:288` `modify` and `:465` `delete` have **no status guards**. UI callers:
  `invoice-page.tsx:41`, `invoice-list.tsx:169`, `log-payment-dialog.tsx:45`.
- `src/lib/pdf-generation.ts` — renders from live Prisma reads (current
  rates, current client transit rate, current user bank details). After plan
  007 this is a thin loader + pure `renderInvoicePdf(data)` over
  `BillableLine[]`. Entry points: `src/server/api/routers/pdf-router.ts`
  (tRPC `forInvoice`) and `src/pages/api/invoices/generate-pdf/[id].ts`.
- Mutation surfaces that can change a sent invoice's live view (guard
  targets): `activity-router.ts` `add:179 / modify:240 / delete:313 /
bulkAdd:330` (modify/delete also cover ActivityTransportItem writes);
  `trip-router.ts` `create:58 / addActivity:122 / removeActivity:196 /
update:302 / delete:365` (all recalc transit on member activities);
  `support-item-router.ts` `delete:236` (schema cascades SupportItem →
  Activity); `client-router.ts` `delete:218` (schema cascades Client →
  Invoice).
- `src/lib/invoice-utils.ts:10` — `getNextInvoiceNo` parses trailing digits
  of stored `invoiceNo`. Version suffixes are display-only (stored
  `invoiceNo` never changes), so it is unaffected — verify, don't modify.
- Money queries recompute SENT invoices from live activities:
  `invoice-router.ts:143` `getTotalOwing`, `:386` `matchByPayment`.
- Ownership seam: `src/server/api/owned.ts` (`ctx.owned.<model>`), router
  test harness: `src/server/api/test/harness.ts` (plan 009).
- PDF golden-master harness: `src/lib/pdf-generation.text.test.ts` /
  `.render.test.ts`, fixtures in `src/lib/testing/invoice-fixtures.ts`.
- Repo conventions: tabs, double quotes, co-located `*.test.ts` vitest files.

## Commands you will need

| Purpose   | Command                                           | Expected on success        |
| --------- | ------------------------------------------------- | -------------------------- |
| Unit      | `pnpm exec vitest run`                            | all pass                   |
| Typecheck | `pnpm type-check`                                 | exit 0                     |
| Lint      | `pnpm lint`                                       | exit 0                     |
| E2E       | `pnpm db:up && pnpm prisma:push && pnpm test:e2e` | all pass (requires Docker) |

(Do NOT run `pnpm test:unit` — watch mode, never exits.)

## Scope

**In scope**: `prisma/schema.prisma` + migration; new
`src/schema/invoice-version-schema.ts`; new version/suffix utils (+ tests);
`invoice-router.ts`, `activity-router.ts`, `trip-router.ts`,
`client-router.ts`, `support-item-router.ts`, `owned.ts`, `pdf-router.ts`,
`src/pages/api/invoices/generate-pdf/[id].ts`; `pdf-generation.ts` (or its
007 successor) for draft watermark + version data source; invoice and client
UI components; backfill script; router/PDF/E2E tests.

**Out of scope**: payment modelling beyond `paidAt` stamping (partial
payments, credits — future); client archiving UX beyond the active flag;
invoice emailing (TRD-005); rate-engine internals (TRD-002); version
diffing UI (the `activityId` refs enable it later); PDF layout redesign.

## Git workflow

- Branch: `feat/017-invoice-versioning`
- Conventional commits, concise title only (repo convention)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Schema — `InvoiceVersion` + `Client.active`

In `prisma/schema.prisma`:

```prisma
model InvoiceVersion {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  invoiceId     String
  invoice       Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Restrict)
  versionNumber Int      // 1-based; display suffix derived from this
  sentAt        DateTime // freeze moment
  paidAt        DateTime? // stamped by markPaid; survives amendment
  total         Decimal  // denormalized for lists/owing queries
  content       Json     // full frozen document, Zod-validated (Step 2)

  @@unique([invoiceId, versionNumber])
  @@index([invoiceId])
}
```

Add `versions InvoiceVersion[]` to `Invoice`, and `active Boolean
@default(true)` to `Client`. `onDelete: Restrict` is deliberate (ADR 0004):
even a buggy guard cannot cascade-delete history.

**Verify**: `pnpm prisma migrate dev` succeeds; `pnpm type-check` exits 0.

### Step 2: Snapshot schema + version utils

1. `src/schema/invoice-version-schema.ts` — Zod schema for `content`:
   `schemaVersion: z.literal(1)`; `backfilled: z.boolean().optional()`;
   header (`invoiceNo`, `displayInvoiceNo`, `date`, `participantName`,
   `participantNumber?`, `billTo?`, `amendsDisplayInvoiceNo?` — set on
   versions ≥ 2); `provider` (`name?`, `abn?`, `bankName?`, `bsb?`,
   `accountNumber?` — frozen copies of what the PDF prints); `lines[]` —
   the `BillableLine` fields from plan 007 (`kind`, `description`,
   `supportItemCode`, `serviceDate`, `quantity`, `unit`, `unitPrice`,
   `total`, `activityId?`) **plus** `detailsText` (the printed Details
   column: time range/duration/km/expense label — frozen so re-renders
   can't drift); `total`. Every read of `content` parses through this
   schema.
2. Version display suffix: pure function (`invoice-utils.ts`) mapping
   ordinal → suffix: 1 → `""`, 2 → `"a"`, 3 → `"b"` … 27 → `"z"`,
   28 → `"aa"`. `displayInvoiceNo = invoiceNo + suffix`.
3. `buildInvoiceVersionContent(loadedInvoice)` — pure builder from plan
   007's loader output to the schema shape.

**Verify**: unit tests for suffix (incl. `z`→`aa` rollover) and for builder
output validating against the Zod schema for every PDF fixture.

### Step 3: Intent-named transitions replace `updateStatus`

In `invoice-router.ts` (delete `updateStatus` outright):

- `send({ ids })` — per id, in one transaction: assert owned; reject unless
  status `CREATED`; reject if zero activities ("invoice has no activities");
  load via 007's loader, build content, create `InvoiceVersion` with
  `versionNumber = existing count + 1`, `sentAt = now`, `total` from
  content; set invoice `status: SENT`, `sentAt`.
- `amend({ id })` — single id only; assert owned; reject unless `SENT` or
  `PAID`; set `status: CREATED`, clear invoice-level `sentAt`/`paidAt`
  (version rows keep theirs — the paid version's `paidAt` was stamped by
  `markPaid`).
- `markPaid({ ids })` — reject unless `SENT`; set invoice `status: PAID` +
  `paidAt`, and stamp `paidAt` on the latest version.
- `unmarkPaid({ ids })` — reject unless `PAID`; revert to `SENT`, clear
  `paidAt` on invoice **and** latest version (mis-logged payment; no
  version, no unlock).

Update the three UI callers (`invoice-page.tsx`, `invoice-list.tsx`,
`log-payment-dialog.tsx`) and `byId`/`list` to expose versions (number,
display number, `sentAt`, `paidAt`, `total`).

**Verify**: router-harness tests: send freezes v1 with correct content;
double-send rejected; empty-send rejected; amend from SENT and PAID; paid
version keeps `paidAt` after amend; unmarkPaid clears both; ownership
scoping (another user's ids → no-op/NOT_FOUND per harness conventions).

### Step 4: Locks — every mutation path to a sent invoice

Add to `owned.ts` a lock helper (e.g. `invoice.assertUnlocked(id)` and
`activity.assertNoneOnLockedInvoice(ids)` — locked ⇔ invoice status ≠
`CREATED`). Then:

- `invoice.modify` — reject when locked ("amend first"); `invoice.delete` —
  reject when any version exists (permanent once sent; draft invoices stay
  deletable).
- `activity-router` `modify`/`delete` — reject when the activity sits on a
  locked invoice (error names the invoice: "part of sent invoice INV-001 —
  amend it first"). `add`/`bulkAdd` — reject if an `invoiceId` input targets
  a locked invoice.
- `trip-router` `create`/`addActivity`/`removeActivity`/`update`/`delete` —
  reject when any activity whose transit would be recalculated is on a
  locked invoice (supersedes ADR 0003 there; activities on **draft**
  invoices keep ADR 0003's recalc-with-warning behaviour).
- `support-item-router.delete` — reject when any of its activities is on a
  locked invoice (the schema cascade would eat sent-invoice activities).
- `client-router.delete` — reject when the client has any invoice with a
  version ("deactivate instead").

**Verify**: harness tests per guard, plus one grep-style sweep: every
mutation in the five routers either asserts the lock or demonstrably cannot
touch a locked invoice's activities (document the audit in the PR/commit).

### Step 5: Client active/inactive

`client-router`: `update` accepts `active`; `list` defaults to active-only
with an opt-in to include inactive. UI: deactivate/reactivate on the client
page (deactivate offered where delete is blocked); client pickers
(invoice/activity forms) list active clients only; inactive clients render
with a badge and keep full invoice history.

**Verify**: harness tests for filtering; E2E: deactivate → client absent
from pickers, invoices still listed and downloadable.

### Step 6: PDF paths — clean renders only from versions

- `pdf-router.forInvoice` (and the raw `generate-pdf/[id].ts` route) gain
  optional `versionNumber`. Resolution: explicit version → render that
  version's stored content; no version + invoice locked → latest version;
  no version + draft → live render **with DRAFT watermark** (diagonal text
  overlay).
- `renderInvoicePdf` gains the second data source promised by 007/TRD-006:
  frozen `content.lines[].detailsText` etc. render without any live reads.
  Header prints `displayInvoiceNo`; versions ≥ 2 add the line
  _"This invoice amends and supersedes INV-001"_ (previous version's
  display number). Filename: `${displayInvoiceNo}.pdf`.

**Verify**: golden tests — new fixtures for (a) DRAFT watermark, (b) a v2
render with suffix + supersedes line; **headline byte-stability test**:
freeze a version, then mutate every upstream input via direct DB writes
(support-item rates, custom rates, client transit rate, user bank details,
activity times), re-render → text golden identical. Existing clean-render
goldens for locked fixtures must come from stored content, not live data.

### Step 7: Send/download UX

- Draft download button opens a choice: **Download draft** (watermarked) or
  **Send & download** (calls `send`, then downloads the frozen PDF /
  offers the share sheet).
- Invoice page for locked invoices: **Amend** (with confirmation dialog)
  replaces Edit; version history section lists all versions (display
  number, sentAt, total, paid/backfilled markers) each with a download
  action. Edit form route redirects to the invoice page when locked.
- Invoice list: bulk send retained; totals for locked invoices come from
  the latest version's `total`.

**Verify**: E2E journey — create → download draft (watermarked) → send &
download (clean INV-001) → amend (confirm) → edit an activity → send →
INV-001a with supersedes line; both versions downloadable; list shows one
row.

### Step 8: Money queries read frozen totals

`getTotalOwing` sums latest-version `total` for SENT invoices (drops the
live recompute + rate-context plumbing); `matchByPayment` keys on the same
frozen totals; invoice page/list/log-payment displays for locked invoices
use version totals (drafts keep live compute).

**Verify**: unit/harness tests: owing total unchanged by a post-send rate
edit; payment matching finds the frozen amount.

### Step 9: Backfill existing SENT/PAID invoices

One-off script (e.g. `prisma/scripts/backfill-invoice-versions.ts`, run via
`pnpm exec tsx`): for every SENT/PAID invoice with zero versions, build
content from **current** live data, set `backfilled: true` in content,
`versionNumber: 1`, `sentAt = invoice.sentAt ?? invoice.date`, copy
`paidAt`. Idempotent (skips invoices that have versions). Must run before
the frozen-total queries ship traffic — same deploy, migration then script.

**Verify**: integration test on the harness DB: seed sent invoices → run →
every SENT/PAID invoice has exactly v1, flagged backfilled; re-run is a
no-op; `getTotalOwing` matches pre-backfill values at time of backfill.

### Step 10: Full regression + docs

**Verify**: `pnpm exec vitest run`, `pnpm type-check`, `pnpm lint`,
`pnpm format:check` all exit 0; E2E suite passes. Update
`docs/plans/README.md` row and the TRD-006 header note (points to ADR 0004

- this plan).

## Test plan

- **Headline**: byte-stability golden (Step 6) — the regression that defines
  the feature.
- Router harness: transition guards (Step 3), lock guards (Step 4), scoping.
- Pure units: suffix derivation, content builder ↔ Zod schema, frozen-total
  queries.
- E2E: the Step 7 journey + client deactivation.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "updateStatus" src/server/api/routers/invoice-router.ts src/components` → no matches
- [ ] `grep -rn "InvoiceVersion" prisma/schema.prisma` shows `onDelete: Restrict`
- [ ] Byte-stability golden test exists and passes (mutate-upstream → identical render)
- [ ] Every clean PDF path reads stored content when the invoice is locked (no live-data render without watermark — demonstrated by Step 6 goldens)
- [ ] All guard tests from Steps 3–4 pass; `pnpm exec vitest run` exits 0
- [ ] Backfill script idempotency test passes
- [ ] `pnpm type-check`, `pnpm lint`, `pnpm format:check` exit 0
- [ ] `docs/plans/README.md` and TRD-006 header updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 007 has not landed (`src/lib/billing-lines.ts` missing) — this plan
  freezes 007's lines; building a second line-computation path is exactly
  the duplication 007 exists to kill.
- Plan 016 has landed and changed `BillableLine`'s shape — align the
  snapshot schema with the live shape and note the deviation.
- The golden harness shows any existing fixture's clean render changing
  content (not layout) when switching locked invoices to stored-content
  rendering — the freeze captured different numbers than the live path;
  find the divergence, do not regenerate.
- `getNextInvoiceNo` turns out to parse or generate suffixed numbers
  anywhere (it should never see one — suffixes are display-only).
- A mutation path to a locked invoice's content is found that Step 4's list
  doesn't cover — add the guard AND report the gap (the audit sweep missed
  it).

## Maintenance notes

- The Zod `schemaVersion` field is the snapshot's evolution mechanism: new
  fields → optional in the schema; breaking shape changes → bump the
  literal and branch in the renderer. Never rewrite stored content.
- Version rows are write-once: no update path should exist except the
  narrow `paidAt` stamping in `markPaid`/`unmarkPaid`/`amend`.
- TRD-005 (invoice emailing) attaches the PDF at send time — it must render
  from the version frozen in the same transaction, never from live data.
- Future diffing UI ("what changed in INV-001a") joins version lines on the
  frozen `activityId` refs — that's why they're stored.
