# Plan 025: Integration coverage for user-router and the custom-rate write path

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/server/api/routers/user-router.ts src/server/api/routers/support-item-router.ts src/server/api/test/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Note: as of this revision (2026-07-13),
> `support-item-router.ts` and `ownership.integration.test.ts` have already
> diverged — expected, since plan 018 landed. The "Current state" excerpts
> below are updated to match; a further mismatch beyond what's shown here is
> still a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (additive tests only)
- **Depends on**: 018 — **landed** (`e17977c`, `cc3fa6b`); its FK asserts changed `addCustomRates`/`updateCustomRate` error behavior and it added its own ownership test (see Step 2 Case 3 note below)
- **Category**: tests
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

Two money-adjacent surfaces have zero test coverage of any kind:

1. **`user-router`** — `getBankDetails` feeds the payment details printed on every invoice PDF, and `reset` is the app's most destructive mutation (deletes all clients/invoices/activities/support items). Neither is exercised by any test.
2. **Custom client rates** (`supportItem.addCustomRates` / `updateCustomRate` / `getCustomRatesForClient`) — these persist the rates that `billing-lines.ts` bills against. The pure math is tested via fixtures; the write path that feeds it is not, so a regression (e.g. `supportItemRatesSchema.partial()` dropping a field on update) silently produces wrong invoice totals.

There is also a **latent behavior to characterize**: `user.reset` deletes clients relying on cascade, but ADR-0004 made `InvoiceVersion → Invoice` `onDelete: Restrict` and forbids deleting anything that cascades into a version. For a user with any _sent_ invoice, `client.deleteMany` — the very first of `reset`'s five calls — cascades into `Invoice`, which hits the `Restrict` on `InvoiceVersion` and throws. **Confirmed empirically** (spike run against `melvin_test`, 2026-07-13): this is a single atomic Postgres `DELETE` statement, so the whole statement rolls back — nothing is deleted, not even an unrelated clean client swept into the same owner-scoped `deleteMany`, and the four calls after it (including the profile-field nulling) never run. This is **not** a partial-delete/data-loss bug — it's a safe atomic no-op — but it does leak a raw Prisma `Foreign key constraint violated` error to the caller instead of a clear message. A test must pin this exact behavior.

## Current state

- `src/server/api/routers/user-router.ts` (117 lines, full excerpt of the risky part):

```ts
reset: authedProcedure.mutation(async ({ ctx }) => {
	const userId = ctx.session.user.id;
	...
	// Deleting client will cascade delete invoices and activities
	await ctx.prisma.client.deleteMany({ where: { ownerId: userId } });
	await ctx.prisma.invoice.deleteMany({ where: { ownerId: userId } });
	await ctx.prisma.activity.deleteMany({ where: { ownerId: userId } });
	await ctx.prisma.supportItem.deleteMany({ where: { ownerId: userId } });
	await ctx.prisma.user.update({
		where: { id: userId },
		data: { abn: null, name: null, bankName: null, bankNumber: null, bsb: null }
	});
})
```

Other procedures: `fetch` (selects id/name/email/abn/bank fields/defaults/transitRatePerKm), `getBankDetails` (name/abn/bankNumber/bankName/bsb), `update` (spreads `userSchema` into `user.update` keyed by session id).

- `src/server/api/routers/support-item-router.ts` — `addCustomRates` (~113, now asserts `ctx.owned.supportItem.assert(supportItemId)` and, if `clientId` given, `ctx.owned.client.assert(clientId)`), `getCustomRatesForClient` (~143), `updateCustomRate` (~168, input `supportItemRatesSchema.partial()`, now asserts `ctx.owned.supportItemRates.assert(id)` and, if `supportItemId` given in the partial payload, `ctx.owned.supportItem.assert(supportItemId)`).
- Test harness: `src/server/api/test/harness.ts` — `createTestUser()`, `callerFor(user)` (a tRPC caller with a fake session), `resetDb()`. Pattern exemplar: `src/server/api/test/ownership.integration.test.ts`.
- Integration config: `vitest.integration.config.mts` picks up `src/**/*.integration.test.ts`; requires Docker db (`pnpm db:up`) and `.env` with `DATABASE_URL`; `global-setup.ts` creates a `melvin_test` database.
- How invoices become "sent" in tests: see `src/server/api/test/invoice-locks.integration.test.ts` — it drives `invoice.send` to create versions; reuse its setup steps for the reset-with-versions case.

## Commands you will need

| Purpose     | Command                                                                                                              | Expected on success |
| ----------- | -------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Typecheck   | `pnpm type-check`                                                                                                    | exit 0              |
| Integration | `pnpm db:up && pnpm test:integration`                                                                                | all pass            |
| Targeted    | `pnpm exec vitest run --config vitest.integration.config.mts src/server/api/routers/user-router.integration.test.ts` | all pass            |
| Lint        | `pnpm lint`                                                                                                          | exit 0              |

## Scope

**In scope** (create only — no production code changes):

- `src/server/api/routers/user-router.integration.test.ts` (create)
- `src/server/api/routers/support-item-router.integration.test.ts` (create)

**Out of scope**:

- Fixing the raw-Prisma-error UX that the `reset`-with-versions characterization reveals — report it; the fix (catch the FK violation, return a clear `TRPCError`) is a small follow-up plan, not part of this one. No transaction wrapping is needed — `reset` is already atomic on the failing statement.
- `pdf-router`, `trip-router` coverage — thin wrappers / already covered by `trip-lifecycle.integration.test.ts`.

## Git workflow

- Branch: `advisor/025-router-coverage`
- Commit: `test: add integration coverage for user router and custom rates`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: `user-router.integration.test.ts`

Model file structure on `client-router.integration.test.ts` (same directory). Cases:

1. `update` → `fetch` round-trip: set name/abn/bank fields via `userSchema` shape, read back, exact match.
2. `getBankDetails` returns exactly `{ name, abn, bankNumber, bankName, bsb }` for the session user — and _another user's_ details are never returned (two-user setup).
3. `reset` (clean case): user with clients/activities/support items **and one unsent (CREATED-status) invoice**, no sent invoices → all four owned tables empty for that user afterwards, profile fields nulled, _other user's_ rows untouched. Include the unsent invoice deliberately — it's what actually exercises the invoice-delete path in this case; without it the Invoice-table assertion is vacuous.
4. `reset` (atomic no-op characterization): two clients for one user — one with a sent invoice (drive `invoice.send` per `invoice-locks.integration.test.ts` setup), one clean (with its own activity/support item) — → `reset` throws, AND assert **nothing was deleted**: both clients, the invoice, all activities, all support items still exist, and the user's profile fields are unchanged. The second client proves this is an all-or-nothing failure on the very first `deleteMany`, not a partial delete. Title the test so the behavior is legible, e.g. `"reset atomically no-ops when a sent invoice exists (fails on the first deleteMany, nothing is deleted — see plan 025 report)"`.

**Verify**: targeted vitest run → all pass.

### Step 2: `support-item-router.integration.test.ts`

Cases:

1. Create support item → `addCustomRates` for a client → `getCustomRatesForClient` returns it with the support-item description include.
2. `updateCustomRate` with a partial payload updates only the provided fields (assert an untouched field survives — this pins the `.partial()` semantics).
3. Ownership: user B cannot `updateCustomRate` user A's rate row (`NOT_FOUND`). (The `addCustomRates`-against-A's-`supportItemId` case already exists in `ownership.integration.test.ts` as `"supportItem.addCustomRates rejects another user's supportItemId and creates no rate row"` — added when plan 018 landed. Don't duplicate it here.)
4. End-to-end rate effect: build the minimal invoice/activity fixture such that an invoice total reflects the client's custom rate rather than the item's default rate. Look at `src/server/api/test/invoice-group-creation.integration.test.ts` for how activities+invoices are composed in tests; assert via `invoice.send`'s version total or the totals query — whichever existing tests use.

**Verify**: targeted vitest run → all pass; then `pnpm test:integration` (whole suite) → all pass.

## Test plan

The steps above _are_ the test plan. Naming/style: `test("...", async () => {...})` with `beforeEach(resetDb)`, per `ownership.integration.test.ts`.

## Done criteria

- [ ] Both new test files exist; `pnpm test:integration` exits 0
- [ ] `user.reset` has both a clean-case test and the sent-invoice characterization test
- [ ] The custom-rate → invoice-total case exists and passes
- [ ] `pnpm type-check` and `pnpm lint` exit 0
- [ ] No production code modified (`git status` shows only the two new test files + plans README)
- [ ] `docs/plans/README.md` status row updated, with a note: `DONE (reset atomically no-ops on sent invoices — safe, but leaks a raw Prisma error; needs a small follow-up to return a clear TRPCError)`

## STOP conditions

- ~~Plan 018 has not landed and you cannot express test 3 in Step 2~~ — resolved: 018 landed at `e17977c`/`cc3fa6b`.
- The harness cannot produce a sent invoice without excessive fixture ceremony (>~40 lines) — check `invoice-locks.integration.test.ts` first; if it truly can't be reused, report instead of building a parallel fixture system. (Confirmed reusable: `setupSentInvoice()` there is ~45 lines end-to-end.)

## Maintenance notes

- The reset characterization confirms `reset` is already atomic (a single Postgres `DELETE` statement rolls back whole on the `InvoiceVersion` `Restrict` violation) — wrapping it in a `$transaction` would add nothing. The follow-up fix is UX-only: catch the FK violation and return a clear `TRPCError` (e.g. "Can't reset: you have sent invoices") instead of the raw Prisma error. Still worth a small tracked follow-up plan since a raw Prisma stack trace shouldn't reach a caller.
- When TRD-002 lands (plan 033), custom-rate writes gain limit validation; these tests will need the new expected errors.
