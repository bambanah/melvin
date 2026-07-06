# Plan 001: Require authentication and invoice ownership on all PDF generation paths

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c48e1dd..HEAD -- src/pages/api/invoices/generate-pdf/ src/lib/pdf-generation.ts src/server/api/routers/pdf-router.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c48e1dd`, 2026-07-02

## Why this matters

The invoice PDF endpoint `/api/invoices/generate-pdf/[id]` has **no authentication at all**: any unauthenticated request that supplies an invoice ID receives the full invoice PDF. The PDF contains NDIS participant PII (name, participant number, bill-to) and the provider's bank details (name, ABN, bank name, BSB, account number). Separately, the authenticated tRPC procedure `pdf.forInvoice` never checks that the requested invoice belongs to the caller. Both paths funnel into `generatePDF()`, which looks the invoice up by ID only. After this plan, every PDF request requires a valid session AND the invoice must belong to that session's user.

## Current state

- `src/pages/api/invoices/generate-pdf/[id].ts` — plain Next.js API route (NOT tRPC); no session check anywhere. Also has a bug: after sending the 404 it does not `return`, so execution continues.

```ts
// src/pages/api/invoices/generate-pdf/[id].ts:4-12
const request = async (request: NextApiRequest, response: NextApiResponse) => {
	if (request.method === "GET") {
		const { id, base64 } = request.query;

		const { pdfString, fileName } = await generatePDF(String(id));

		if (!pdfString) {
			response.status(404).send("Can't find PDF");
		}
```

- `src/lib/pdf-generation.ts` — `generatePDF(invoiceId)` queries by ID only:

```ts
// src/lib/pdf-generation.ts:21-31
const generatePDF = async (invoiceId: string) => {
	const client = await prisma.invoice
		.findUnique({
			where: { id: invoiceId }
		})
		.client({ select: { id: true } });

	if (!client) return { pdfString: "", fileName: null };

	const invoice = await prisma.invoice.findFirst({
		where: { id: invoiceId },
```

- `src/server/api/routers/pdf-router.ts:14-17` — `forInvoice` is an `authedProcedure` (session required) but passes `input.invoiceId` straight to `generatePDF` with no ownership check. Its handler signature is `.query(async ({ input }) => {` — note `ctx` is not currently destructured.
- `src/server/auth.ts:48-56` — exports `getServerAuthSession({ req, res })`, the standard way this repo resolves a session in a pages-router API route. The session shape includes `session.user.id` (typed in the same file's `declare module "next-auth"` block).
- Prisma `Invoice` model has both `ownerId` and `clientId` scalar fields (the invoice router selects `clientId: true` at `src/server/api/routers/invoice-router.ts:172`).
- Repo conventions: tabs for indentation, no semicolons omitted (semicolons used), double quotes, `TRPCError({ code: "NOT_FOUND" })` for missing records in tRPC procedures.

## Commands you will need

| Purpose   | Command                | Expected on success |
| --------- | ---------------------- | ------------------- |
| Typecheck | `pnpm type-check`      | exit 0              |
| Lint      | `pnpm lint`            | exit 0              |
| Format    | `pnpm format:check`    | exit 0              |
| Unit      | `pnpm exec vitest run` | all pass            |

(Do NOT run `pnpm test:unit` — it starts vitest in watch mode and never exits. Use `pnpm exec vitest run`.)

## Scope

**In scope** (the only files you should modify):

- `src/pages/api/invoices/generate-pdf/[id].ts`
- `src/lib/pdf-generation.ts` (signature + the two `where` clauses only — do not restructure the PDF drawing code)
- `src/server/api/routers/pdf-router.ts`

**Out of scope** (do NOT touch, even though they look related):

- The pricing/rate math inside `pdf-generation.ts` (hardcoded `0.43`/`0.99` rates) — that is plan 006.
- Merging `generatePDF`'s two queries into one (performance) — separate concern, not this plan.
- `src/components/invoices/pdf-preview.tsx` — it calls `pdf.forInvoice` via tRPC and needs no change.

## Git workflow

- Branch: `advisor/001-secure-pdf-endpoint`
- Conventional commits (matches repo history, e.g. `fix: use correct code for activity based transport`): use `fix: require auth and ownership for invoice PDFs`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Scope `generatePDF` by owner

In `src/lib/pdf-generation.ts`, change the signature to `generatePDF(invoiceId: string, ownerId: string)`. Replace the first query (lines 22-26) with a lookup that is owner-scoped and fetches the client id via the scalar:

```ts
const invoiceRecord = await prisma.invoice.findFirst({
	where: { id: invoiceId, ownerId },
	select: { clientId: true }
});

if (!invoiceRecord?.clientId) return { pdfString: "", fileName: null };
```

Use `invoiceRecord.clientId` where the old code used `client.id` (the `supportItemRates: { where: { clientId: client.id } }` filter at line 38). Add `ownerId` to the second query's `where` (line 31): `where: { id: invoiceId, ownerId }`.

**Verify**: `pnpm type-check` → fails with errors ONLY at the two call sites (`pdf-router.ts`, `generate-pdf/[id].ts`) complaining about the missing second argument. That confirms the signature change propagated.

### Step 2: Pass the session user through `pdf.forInvoice`

In `src/server/api/routers/pdf-router.ts`, change the handler to destructure `ctx` (`.query(async ({ input, ctx }) => {`) and call `generatePDF(invoiceId, ctx.session.user.id)`. `authedProcedure` guarantees `ctx.session.user` exists (see `src/server/api/trpc.ts:26-36`).

**Verify**: `pnpm type-check` → the only remaining error is in `generate-pdf/[id].ts`.

### Step 3: Authenticate the raw API route

In `src/pages/api/invoices/generate-pdf/[id].ts`:

1. Import `getServerAuthSession` from `@/server/auth`.
2. At the top of the GET branch, resolve the session; if `!session?.user`, respond `401` and return:

```ts
const session = await getServerAuthSession({ req: request, res: response });
if (!session?.user) {
	return response.status(401).send("Unauthorized");
}
```

3. Call `generatePDF(String(id), session.user.id)`.
4. Fix the missing early return: `if (!pdfString) { return response.status(404).send("Can't find PDF"); }`.

**Verify**: `pnpm type-check` → exit 0. `pnpm lint` → exit 0.

### Step 4: Full verification pass

**Verify**: `pnpm exec vitest run` → all existing unit tests pass (this plan touches no tested module, so any failure means an accidental edit). `pnpm format:check` → exit 0 (run `pnpm format:write` on the touched files if not).

## Test plan

There is no existing harness for API-route or tRPC tests (routers are untested — a known gap tracked separately), so this plan's gate is compile-level plus the grep-based done criteria below. If the Playwright stack is available (Docker running), a regression pass is: `pnpm db:up && pnpm prisma:push && pnpm test:e2e` → existing e2e suite passes (it exercises invoice flows through an authenticated session, so a broken PDF path would surface).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm type-check` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm exec vitest run` exits 0
- [ ] `grep -n "ownerId" src/lib/pdf-generation.ts` shows both queries scoped (at least 2 matches)
- [ ] `grep -n "getServerAuthSession" "src/pages/api/invoices/generate-pdf/[id].ts"` returns a match
- [ ] `grep -n "ctx.session.user.id" src/server/api/routers/pdf-router.ts` returns a match
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift since `c48e1dd`).
- The `Invoice` model turns out not to have a `clientId` scalar usable in a `select` (check `prisma/schema.prisma` if the Step 1 query fails to typecheck).
- Any other caller of `generatePDF` exists beyond the two listed (search: `grep -rn "generatePDF" src/`) — the plan only accounts for those two.

## Maintenance notes

- Plan 006 (transit-rate consolidation) modifies `generatePDF` internals; it assumes this plan's `(invoiceId, ownerId)` signature has already landed.
- Reviewer: confirm the 401 is returned before any DB work, and that the 404 branch now returns.
- Deferred: rate-limiting on the route, and collapsing `generatePDF`'s two queries into one (perf finding, low priority).
