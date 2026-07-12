# Plan 020: Make the group-mirror activity fan-out atomic with its invoice write

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/server/api/routers/invoice-router.ts src/server/api/test/invoice-group-creation.integration.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

A group activity (2–10 participants, `CONTEXT.md` "Group Activity") is stored as one mirrored `Activity` row per participant sharing a `groupSize`. When an invoice is created or modified with group rows in `activitiesToCreate`, the invoice + primary activities are persisted first, and the participant mirror rows are created in a **separate database round-trip with no transaction**. If the mirror write fails (participant validation, DB error, process crash between the two calls), the invoice and its group-primary activity persist with a `groupSize` but zero sibling participant rows — exactly the inconsistent state the `assertGroupRowsHaveParticipants` guard exists to prevent, and participants silently don't get billed.

## Current state

- `src/server/api/routers/invoice-router.ts` — everything lives here.
  - `create` (~line 443): `ctx.prisma.invoice.create(...)` at line 480 persists invoice + primary activities (nested `createMany`), then line 502 calls `createGroupMirrorActivities(ctx, inputInvoice, ctx.session.user.id)` — a second round-trip.
  - `modify` (~line 506): same two-phase shape — `ctx.prisma.invoice.update(...)` at line 542, then at lines 575-581:

```ts
if (client) {
	await createGroupMirrorActivities(ctx, inputInvoice, ctx.session.user.id);
}
```

- `createGroupMirrorActivities` (helper ending at line 256) validates participants via `ctx.owned.client.findMany` and then:

```ts
await ctx.prisma.activity.createMany(
	generateNestedWriteForGroupActivities(
		groupActivitiesToCreate,
		ownerId,
		clients
	)
);
```

It throws `TRPCError` (`BAD_REQUEST` primary-client-in-group at line ~227, `NOT_FOUND` missing group clients at line ~243) **after** the invoice write has already committed.

- Repo exemplar for transactions in this file: `transitionInvoices` (~line 264) runs per-invoice work inside `ctx.prisma.$transaction`-provided `tx: Prisma.TransactionClient`. Match that style.
- The helper takes `ctx` (for `ctx.owned` participant validation and `ctx.prisma` writes). `ctx.owned` reads do NOT need to move inside the transaction (they're validation lookups); only the **writes** must share the transaction.
- Existing tests: `src/server/api/test/invoice-group-creation.integration.test.ts` covers the happy path and guard behavior — read it before changing anything; it is the pattern for new tests.
- Note: if plan 018 landed first, `modify`'s `if (client)` wrapper may already be gone (client is then always non-null). Adapt mechanically.

## Commands you will need

| Purpose           | Command                                                                                                                      | Expected on success |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Typecheck         | `pnpm type-check`                                                                                                            | exit 0              |
| Unit tests        | `pnpm test:unit`                                                                                                             | all pass            |
| Integration tests | `pnpm db:up && pnpm test:integration`                                                                                        | all pass            |
| Targeted          | `pnpm exec vitest run --config vitest.integration.config.mts src/server/api/test/invoice-group-creation.integration.test.ts` | all pass            |
| Lint              | `pnpm lint`                                                                                                                  | exit 0              |

## Scope

**In scope**:

- `src/server/api/routers/invoice-router.ts`
- `src/server/api/test/invoice-group-creation.integration.test.ts`

**Out of scope**:

- `activity-router.ts` group handling (if any) — separate surface, separately tested.
- Changing the mirror data model or `generateNestedWriteForGroupActivities`.
- The "re-fan on every edit" question beyond the characterization test in Step 4 (see STOP conditions).

## Git workflow

- Branch: `advisor/020-transactional-mirror-fanout`
- Commit: `fix: create group mirror activities in the same transaction as the invoice`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Thread a transaction client through the fan-out

Change `createGroupMirrorActivities` to accept a `db: Prisma.TransactionClient` parameter (alongside `ctx`) and use it for the `activity.createMany` write. Keep the `ctx.owned` validation reads as-is (they can stay on the outer client — they're pre-checks, and `ownedDb` has no transactional variant).

**Verify**: `pnpm type-check` → exit 0.

### Step 2: Wrap `create`'s invoice write + fan-out in one `$transaction`

In `create`, wrap the `ctx.prisma.invoice.create(...)` and the `createGroupMirrorActivities(...)` call in `await ctx.prisma.$transaction(async (tx) => { ... })`, passing `tx` into the helper. Perform all pre-validation (`ctx.owned.client.findFirst` guard, `assertAll`, `assertNoneOnLockedInvoice`, `assertGroupRowsHaveParticipants`) **before** opening the transaction, exactly where it happens today.

**Verify**: `pnpm exec vitest run --config vitest.integration.config.mts src/server/api/test/invoice-group-creation.integration.test.ts` → all existing tests pass.

### Step 3: Same for `modify`

Wrap `ctx.prisma.invoice.update(...)` + the fan-out in one `$transaction` in `modify`.

**Verify**: same targeted test file → passes; `pnpm test:integration` → all pass.

### Step 4: Regression + characterization tests

Add the tests in "Test plan".

**Verify**: `pnpm test:integration` → all pass including new tests.

## Test plan

In `src/server/api/test/invoice-group-creation.integration.test.ts`, following its existing style (harness `createTestUser`/`callerFor`/`resetDb`):

1. **Atomicity regression (the bug)**: call `invoice.create` with `activitiesToCreate` containing a group row whose `groupClientIds` includes a nonexistent client id. Expect the call to throw `NOT_FOUND` **and** — the new assertion — `prisma.invoice.count()` for that user is 0 and `prisma.activity.count()` is 0. (Today the mirror validation happens before the invoice write for this particular failure; if that makes the test pass pre-change, instead force the failure _after_ the invoice write: e.g. use a mirror-write failure such as a participant id that passes the `findMany` check but violates a DB constraint, or temporarily verify atomicity by asserting both writes share a transaction. If you cannot construct a post-invoice-write failure with real inputs, write the test as the nonexistent-participant case anyway and note in your report that it guards the validation ordering, while the `$transaction` guards the rest.)
2. **Modify idempotence characterization**: create an invoice with one group row (N participants → expect N mirror rows + 1 primary). Then call `invoice.modify` re-sending the same payload shape the edit UI sends (read the test file / `invoice-form.tsx` to determine whether `activitiesToCreate` is re-sent on edit). Assert the resulting total activity count. If the count **doubles**, the re-fan duplication is real: mark the test with the observed (wrong) count, and report it — fixing the edit contract is a separate decision (see STOP conditions).

## Done criteria

- [x] `pnpm type-check` exits 0
- [x] `pnpm test:integration` exits 0; atomicity test exists and passes
- [x] In `invoice-router.ts`, no `createGroupMirrorActivities` call remains outside a `$transaction` (`grep -n "createGroupMirrorActivities" src/server/api/routers/invoice-router.ts` and inspect each call site)
- [x] `pnpm lint` exits 0
- [x] No files outside the in-scope list modified (`git status`)
- [x] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Step 4's characterization test shows `modify` duplicating mirror rows on resubmit. Do **not** improvise a dedupe strategy — deleting/diffing mirrors on edit touches the edit contract and ADR-0003/0004 locking rules; report the observed behavior and the payload the UI actually sends.
- Interactive-transaction timeouts appear (the fan-out does an `owned` read per group row inside the helper today — if moving reads inside the tx becomes necessary, that's a design change to flag, not improvise).
- The excerpts don't match the live code.

## Maintenance notes

- Any future write that must be consistent with the invoice row (e.g. TRD-005's send-and-email bookkeeping) should follow the same pattern: validate outside, then one `$transaction` for all writes.
- Reviewers: check that no code path calls `createGroupMirrorActivities` without a transaction client after this lands.
