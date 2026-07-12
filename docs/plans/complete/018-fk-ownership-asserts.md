# Plan 018: Assert ownership of foreign-key references before persisting them

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/server/api/routers/invoice-router.ts src/server/api/routers/activity-router.ts src/server/api/routers/support-item-router.ts src/server/api/owned.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

The `ownedDb` seam (`src/server/api/owned.ts`) scopes _row access_ by `ownerId`, but several mutations persist **foreign-key references** (`clientId`, `supportItemId`) taken from request input without asserting the referenced row is owned by the caller. A user who knows (or guesses) another user's client/support-item cuid can point their own invoice, activity, or custom-rate row at it. Because the PDF pipeline follows `invoice.client` and per-activity relations, rendering such an invoice would read and print the _other user's_ participant name, participant number, and bill-to details — a cross-tenant data disclosure. `invoice.create` already guards this correctly; the other write sites simply omit the check.

## Current state

- `src/server/api/routers/invoice-router.ts` — `create` (line ~443) has the correct guard; `modify` (line ~506) does not.
- `src/server/api/routers/activity-router.ts` — `add` (~line 210) and `modify` (~line 282) spread schema input (which includes `clientId` and `supportItemId`) straight into Prisma writes.
- `src/server/api/routers/support-item-router.ts` — `addCustomRates` (~line 113) spreads input including `supportItemId` and optional `clientId`.
- `src/server/api/owned.ts` — the scoping seam; provides per-model `assert(id)` helpers that throw `NOT_FOUND` when the row isn't owned.
- `src/schema/activity-schema.ts:24-25` — `activitySchema` includes `supportItemId: z.string()` and `clientId: z.string().min(1, ...)`, so both FKs flow from client input.

The exemplar — `invoice.create` at `invoice-router.ts:452-461` — is the pattern to replicate:

```ts
const client = await ctx.owned.client.findFirst({
	where: { id: inputInvoice.clientId }
});

if (!client) {
	throw new TRPCError({
		code: "NOT_FOUND",
		message: "Can't find that client"
	});
}
```

The defect in `invoice.modify` at `invoice-router.ts:519-521` — same lookup, **no null check**, and `clientId` is then written unconditionally at line 549:

```ts
const client = await ctx.owned.client.findFirst({
	where: { id: inputInvoice.clientId }
});
// ... no `if (!client) throw` — later code only uses `client` truthiness to
// decide whether to fan out group activities, but still writes:
//   clientId: inputInvoice.clientId
```

The defect in `activity.add` at `activity-router.ts:210-217` (and the near-identical `modify` at ~282-291):

```ts
const activity = await ctx.prisma.activity.create({
	data: {
		...activityData, // includes clientId + supportItemId from input
		startTime,
		endTime,
		...
		ownerId: ctx.session.user.id,
```

The defect in `supportItem.addCustomRates` at `support-item-router.ts:121-127`:

```ts
.mutation(async ({ ctx, input }) => {
	const customRates = await ctx.prisma.supportItemRates.create({
		data: {
			...input.supportItemRates, // includes supportItemId (+ optional clientId)
			ownerId: ctx.session.user.id
		}
	});
```

The available assert helpers in `src/server/api/owned.ts` (use these, don't roll new queries): `ctx.owned.client.assert(id)`, `ctx.owned.supportItem.assert(id)`, `ctx.owned.activity.assert(id)` — each does `findFirst({ where: { id, ownerId } })` and throws `TRPCError NOT_FOUND` if missing.

Repo convention (comment block at `owned.ts:4-15`): raw `ctx.prisma.*` writes are allowed only for `create` with `ownerId` set in data, nested writes under an asserted parent, or an `update`/`delete` immediately after a `ctx.owned.<model>.assert(id)`. The FK asserts you are adding extend this same pattern — assert first, then the raw write is safe.

## Commands you will need

| Purpose           | Command                               | Expected on success                                     |
| ----------------- | ------------------------------------- | ------------------------------------------------------- |
| Install           | `pnpm install`                        | exit 0                                                  |
| Typecheck         | `pnpm type-check`                     | exit 0, no errors                                       |
| Unit tests        | `pnpm test:unit`                      | all pass (107+ tests)                                   |
| Integration tests | `pnpm db:up && pnpm test:integration` | all pass (requires Docker + `.env` with `DATABASE_URL`) |
| Lint              | `pnpm lint`                           | exit 0                                                  |

## Scope

**In scope** (the only files you should modify):

- `src/server/api/routers/invoice-router.ts`
- `src/server/api/routers/activity-router.ts`
- `src/server/api/routers/support-item-router.ts`
- `src/server/api/test/ownership.integration.test.ts` (add tests)

**Out of scope** (do NOT touch, even though they look related):

- `src/server/api/owned.ts` — the existing assert helpers are sufficient; do not add new methods.
- `client-router.ts`, `trip-router.ts`, `user-router.ts` — audited; their FK writes are already scoped or not user-controlled.
- Any Zod schema — validation of ID _format_ is not this plan.

## Git workflow

- Branch: `advisor/018-fk-ownership-asserts`
- Conventional commit, concise title only (repo rule): e.g. `fix: assert ownership of clientId/supportItemId before persisting`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Make `invoice.modify` reject an unowned/unknown client

In `invoice-router.ts` `modify`, after the `ctx.owned.client.findFirst` lookup (~line 519), add the same null-guard `create` has (throw `TRPCError` `NOT_FOUND`, message "Can't find that client"). Then simplify: the later `if (client)` guards around `assertGroupRowsHaveParticipants` (~line 535) and `createGroupMirrorActivities` (~line 575) become unconditional (client is now guaranteed), and the ternary `inputInvoice.activitiesToCreate && client ? ... : undefined` (~line 556) loses its `&& client`/`client` dependence on nullability. Keep behavior otherwise identical.

**Verify**: `pnpm type-check` → exit 0.

### Step 2: Assert FK ownership in `activity.add` and `activity.modify`

In `activity-router.ts`, in both `add` and `modify`, before the Prisma write add:

```ts
await ctx.owned.client.assert(activityData.clientId);
await ctx.owned.supportItem.assert(activityData.supportItemId);
```

In `modify`, place these next to the existing `await ctx.owned.activity.assert(input.id)` (~line 272). Check whether the router has other procedures writing `clientId`/`supportItemId` from input (e.g. a `bulkAdd`) — if so, apply the same asserts there.

**Verify**: `pnpm type-check` → exit 0.

### Step 3: Assert FK ownership in `supportItem.addCustomRates`

In `support-item-router.ts` `addCustomRates`, before the create:

```ts
await ctx.owned.supportItem.assert(input.supportItemRates.supportItemId);
if (input.supportItemRates.clientId) {
	await ctx.owned.client.assert(input.supportItemRates.clientId);
}
```

Also check `updateCustomRate` (~line 163): it already asserts the rate row itself; if its partial input can carry `supportItemId`/`clientId`, assert those too when present.

**Verify**: `pnpm type-check` → exit 0.

### Step 4: Integration tests

Add to `src/server/api/test/ownership.integration.test.ts`, following its existing two-users pattern (see "Test plan").

**Verify**: `pnpm db:up && pnpm test:integration` → all pass, including the new tests.

## Test plan

New tests in `src/server/api/test/ownership.integration.test.ts`, modeled on the existing `"invoice.send rejects a cross-tenant invoice"` test (uses `createTestUser`, `callerFor`, `resetDb` from `./harness`):

1. `invoice.modify` with another user's `clientId` → throws `NOT_FOUND`; the invoice's original `clientId` is unchanged.
2. `activity.add` with another user's `clientId` (own `supportItemId`) → throws `NOT_FOUND`; no activity row created.
3. `activity.add` with another user's `supportItemId` (own `clientId`) → throws `NOT_FOUND`.
4. `supportItem.addCustomRates` with another user's `supportItemId` → throws `NOT_FOUND`; no `SupportItemRates` row created.

Verification: `pnpm test:integration` → all pass; the four new tests appear in output.

## Done criteria

Machine-checkable. ALL must hold:

- [x] `pnpm type-check` exits 0
- [x] `pnpm test:unit` exits 0
- [x] `pnpm test:integration` exits 0; the 4 new cross-tenant-FK tests exist and pass (6 landed: the review pass added two more for `invoice.create`/`invoice.modify` supportItemId checks)
- [x] `pnpm lint` exits 0
- [x] No files outside the in-scope list are modified (`git status`)
- [x] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts above don't match the live code (drift since `4b83de4`).
- An existing integration or e2e test _depends_ on `invoice.modify` accepting a null client lookup (i.e. Step 1 breaks a test that isn't about cross-tenant access) — that would mean the tolerance is load-bearing and needs a product decision.
- You find additional unguarded FK write sites beyond the ones listed (report them; don't silently expand scope).

## Maintenance notes

- Any future procedure that persists a `clientId`/`supportItemId`/`activityId` from input must assert ownership first — reviewers should check this on every new mutation. The reviewer-sweep grep at `owned.ts:13-15` verifies raw-call discipline but does NOT catch missing FK asserts; that remains a review-time check.
- Plan 025 adds broader integration coverage for the custom-rates path; these tests complement, not duplicate, it.
- A fifth unguarded FK write site — `invoice.create`/`invoice.modify` persisting `activitiesToCreate[].supportItemId` without an ownership check — surfaced during the no-mistakes review pass, not in the original steps above. It was fixed the same way (an `assertSupportItemsOwned` helper next to `assertGroupRowsHaveParticipants` in `invoice-router.ts`), with two more cross-tenant tests added to match.
