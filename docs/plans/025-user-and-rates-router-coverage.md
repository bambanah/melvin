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
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (additive tests only)
- **Depends on**: 018 (its FK asserts change `addCustomRates` error behavior — land it first so these tests pin the final behavior)
- **Category**: tests
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

Two money-adjacent surfaces have zero test coverage of any kind:

1. **`user-router`** — `getBankDetails` feeds the payment details printed on every invoice PDF, and `reset` is the app's most destructive mutation (deletes all clients/invoices/activities/support items). Neither is exercised by any test.
2. **Custom client rates** (`supportItem.addCustomRates` / `updateCustomRate` / `getCustomRatesForClient`) — these persist the rates that `billing-lines.ts` bills against. The pure math is tested via fixtures; the write path that feeds it is not, so a regression (e.g. `supportItemRatesSchema.partial()` dropping a field on update) silently produces wrong invoice totals.

There is also a **latent bug to characterize**: `user.reset` deletes clients relying on cascade, but ADR-0004 made `InvoiceVersion → Invoice` `onDelete: Restrict` and forbids deleting anything that cascades into a version. For a user with any _sent_ invoice, `reset` should now fail mid-sequence (it runs five separate deletes with **no transaction**). A test must pin what actually happens; if it errors halfway, that's a partial-delete bug to report.

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

- `src/server/api/routers/support-item-router.ts` — `addCustomRates` (~113), `getCustomRatesForClient` (~138), `updateCustomRate` (~163, input `supportItemRatesSchema.partial()`).
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

- Fixing whatever the `reset`-with-versions characterization reveals — report it; the fix (transactional reset honoring the version-retention rule) is a product decision (does "reset" mean "delete sent invoices too"? ADR-0004 says versions are forever).
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
3. `reset` (clean case): user with clients/activities/support items but **no sent invoices** → all four owned tables empty for that user afterwards, profile fields nulled, _other user's_ rows untouched.
4. `reset` (characterization): user with a sent invoice (drive `invoice.send` per `invoice-locks.integration.test.ts` setup) → capture the actual outcome. If it throws (expected, FK `Restrict` from `InvoiceVersion`), assert the throw AND assert what was already deleted by the earlier `deleteMany` calls at that point — this documents the partial-delete state. Title the test so the bug is legible, e.g. `"reset with sent invoices fails partway (documents partial-delete bug — see plan 025 report)"`.

**Verify**: targeted vitest run → all pass.

### Step 2: `support-item-router.integration.test.ts`

Cases:

1. Create support item → `addCustomRates` for a client → `getCustomRatesForClient` returns it with the support-item description include.
2. `updateCustomRate` with a partial payload updates only the provided fields (assert an untouched field survives — this pins the `.partial()` semantics).
3. Ownership: user B cannot `updateCustomRate` user A's rate row (`NOT_FOUND`), and — post plan 018 — cannot `addCustomRates` against A's `supportItemId`.
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
- [ ] `docs/plans/README.md` status row updated — and if the reset characterization exposed the partial-delete failure, a note in the status row: `DONE (reset-with-versions bug confirmed — needs follow-up plan)`

## STOP conditions

- Plan 018 has not landed and you cannot express test 3 in Step 2 — either land 018 first or drop that single case and note it.
- The harness cannot produce a sent invoice without excessive fixture ceremony (>~40 lines) — check `invoice-locks.integration.test.ts` first; if it truly can't be reused, report instead of building a parallel fixture system.

## Maintenance notes

- If the reset characterization confirms the partial-delete bug, the follow-up fix should wrap reset in a `$transaction` and decide the ADR-0004 question (reset vs. version retention) explicitly — likely "reset refuses when sent invoices exist, with a clear message."
- When TRD-002 lands (plan 033), custom-rate writes gain limit validation; these tests will need the new expected errors.
