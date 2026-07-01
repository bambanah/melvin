# Plan 003: Enforce `ownerId` scoping on every cross-tenant read and mutation in the tRPC routers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c48e1dd..HEAD -- src/server/api/routers/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (001 covers the PDF paths; this plan covers everything else)
- **Category**: security
- **Planned at**: commit `c48e1dd`, 2026-07-02

## Why this matters

Every record in this app (`Client`, `Activity`, `Invoice`, `SupportItem`, `SupportItemRates`, `Trip`) has an `ownerId`. List queries consistently filter by it, but **most by-ID reads and nearly all mutations do not** — any authenticated user can read, modify, delete, or mark-paid another user's data by supplying a foreign ID, and two aggregate queries sum ALL users' invoices. `authedProcedure` only asserts a session exists (`src/server/api/trpc.ts:26-36`); there is no global tenant scoping, so every query must scope itself. The trip router already does this correctly — this plan brings the other four routers up to the same standard.

## Current state

All files are under `src/server/api/routers/`. In every procedure, the caller's ID is `ctx.session.user.id`.

**The correct pattern already in the repo** — `trip-router.ts` pre-verifies ownership before acting:

```ts
// trip-router.ts:46-59 — fetch scoped by ownerId, then assert everything was found
const activities = await ctx.prisma.activity.findMany({
	where: {
		id: { in: input.activityIds },
		ownerId: ctx.session.user.id
	},
	select: tripActivitySelect
});

if (activities.length !== input.activityIds.length) {
	throw new TRPCError({
		code: "NOT_FOUND",
		message: "One or more activities not found"
	});
}
```

**The defect sites.** Two shapes recur:

- Shape A (reads/aggregates/updateMany): a `where` that is simply missing `ownerId: ctx.session.user.id` — fix by adding it.
- Shape B (`prisma.<model>.update`/`delete` with `where: { id }`): Prisma's unique `update`/`delete` cannot take `ownerId` in the unique `where`, so insert an ownership pre-check first:

```ts
const existing = await ctx.prisma.<model>.findFirst({
	where: { id: input.id, ownerId: ctx.session.user.id },
	select: { id: true }
});
if (!existing) {
	throw new TRPCError({ code: "NOT_FOUND" });
}
// ... existing update/delete by id proceeds unchanged
```

Complete site list (line numbers at commit `c48e1dd`):

| #   | File                   | Procedure          | Line(s)                                                                                                         | Shape           | Notes                                                                                                                                        |
| --- | ---------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | invoice-router.ts      | `getTotalOwing`    | 151-153 (`where: { status: "SENT" }`)                                                                           | A               | currently sums EVERY user's invoices                                                                                                         |
| 2   | invoice-router.ts      | `matchByPayment`   | 359-367 (`where: { status: "SENT", ... }`)                                                                      | A               | leaks other users' invoice details                                                                                                           |
| 3   | invoice-router.ts      | `updateStatus`     | 339-350 (`updateMany where id in ids`)                                                                          | A               | add `ownerId` to the `updateMany` where                                                                                                      |
| 4   | invoice-router.ts      | `modify`           | 280-283 (`invoice.update where { id }`)                                                                         | B               |                                                                                                                                              |
| 5   | invoice-router.ts      | `delete`           | 427-431 (`invoice.delete where { id }`)                                                                         | B               |                                                                                                                                              |
| 6   | invoice-router.ts      | `create`           | 205-207 (`client.findUnique({ where: { id: clientId } })`)                                                      | A\*             | change to `findFirst` with `{ id, ownerId }`                                                                                                 |
| 7   | invoice-router.ts      | `create`           | 224 (`connect: activityIds`)                                                                                    | pre-check       | before creating, verify ownership of `inputInvoice.activityIds` using the trip-router pattern above (skip when the array is empty/undefined) |
| 8   | invoice-router.ts      | `create`           | 246-252 (group clients `findMany id in groupClientIds`)                                                         | A               | add `ownerId`, and throw NOT_FOUND if `clients.length !== new Set(groupClientIds).size`                                                      |
| 9   | invoice-router.ts      | `modify`           | 276-278 (client `findUnique`) and 292 (`connect: activityIds`)                                                  | A\* + pre-check | same treatment as sites 6-7                                                                                                                  |
| 10  | activity-router.ts     | `modify`           | 278-282 (`activityTransportItem.deleteMany where { activityId }`) then 284-287 (`activity.update where { id }`) | B               | ONE pre-check on the activity id placed BEFORE the `deleteMany` protects both writes                                                         |
| 11  | activity-router.ts     | `delete`           | 319-323 (`activity.delete where { id }`)                                                                        | B               |                                                                                                                                              |
| 12  | client-router.ts       | `getBillTo`        | 84-91 (`findFirst where { id }`)                                                                                | A               |                                                                                                                                              |
| 13  | client-router.ts       | `getNextInvoiceNo` | 102-118 (`findFirst where { id }`)                                                                              | A               |                                                                                                                                              |
| 14  | client-router.ts       | `update`           | 187-190 (`client.update where { id }`)                                                                          | B               |                                                                                                                                              |
| 15  | client-router.ts       | `delete`           | 216-220 (`client.delete where { id }`)                                                                          | B               | deleting a client cascades to invoices/activities — highest-damage site                                                                      |
| 16  | support-item-router.ts | `updateCustomRate` | 174-177 (`supportItemRates.update where { id }`)                                                                | B               |                                                                                                                                              |
| 17  | support-item-router.ts | `deleteCustomRate` | 195-199 (`supportItemRates.delete where { id }`)                                                                | B               |                                                                                                                                              |
| 18  | support-item-router.ts | `update`           | 217-222 (`supportItem.update where { id: input.supportItem.id }`)                                               | B               |                                                                                                                                              |
| 19  | support-item-router.ts | `delete`           | 236-240 (`supportItem.delete where { id }`)                                                                     | B               |                                                                                                                                              |

Already correct, for reference (do not change): all `list` procedures, `activity.byId` (`activity-router.ts:155-161`), `invoice.byId` (`invoice-router.ts:184-188`), `supportItem.byId` (`support-item-router.ts:80-84`), `client.latestInvoice` (`client-router.ts:136-137`), and the entire `trip-router.ts`.

Repo conventions: tabs, double quotes, `TRPCError({ code: "NOT_FOUND" })` on missing records.

## Commands you will need

| Purpose   | Command                                           | Expected on success        |
| --------- | ------------------------------------------------- | -------------------------- |
| Typecheck | `pnpm type-check`                                 | exit 0                     |
| Lint      | `pnpm lint`                                       | exit 0                     |
| Unit      | `pnpm exec vitest run`                            | all pass                   |
| E2E       | `pnpm db:up && pnpm prisma:push && pnpm test:e2e` | all pass (requires Docker) |

(Do NOT run `pnpm test:unit` — watch mode, never exits. Use `pnpm exec vitest run`.)

## Scope

**In scope** (the only files you should modify):

- `src/server/api/routers/invoice-router.ts`
- `src/server/api/routers/activity-router.ts`
- `src/server/api/routers/client-router.ts`
- `src/server/api/routers/support-item-router.ts`

**Out of scope** (do NOT touch, even though they look related):

- `src/server/api/routers/trip-router.ts` — already correct.
- `src/server/api/routers/pdf-router.ts` and `src/lib/pdf-generation.ts` — plan 001.
- `src/server/api/routers/user-router.ts` — operates on the session user only.
- Refactoring to a shared ownership-assert helper or Prisma client extension — tempting, but keep this change mechanical and reviewable; a consolidation can follow later.
- `activity-router.ts:180-182` (`forInvoice` returns a `TRPCError` instead of throwing) — known separate bug, tracked in plans/README.md; don't fix it here.

## Git workflow

- Branch: `advisor/003-ownership-scoping`
- Commit message: `fix: enforce owner scoping on router reads and mutations` (one commit per router file is also fine, e.g. `fix: enforce owner scoping in invoice router`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: invoice-router.ts (sites 1-9)

Apply the table. For site 7/9 activity-ID verification, insert before the create/update:

```ts
if (inputInvoice.activityIds && inputInvoice.activityIds.length > 0) {
	const ownedActivities = await ctx.prisma.activity.findMany({
		where: {
			id: { in: inputInvoice.activityIds },
			ownerId: ctx.session.user.id
		},
		select: { id: true }
	});
	if (ownedActivities.length !== inputInvoice.activityIds.length) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "One or more activities not found"
		});
	}
}
```

**Verify**: `pnpm type-check` → exit 0. `grep -c "ownerId: ctx.session.user.id" src/server/api/routers/invoice-router.ts` → count increased from 4 (at plan time) to at least 11.

### Step 2: activity-router.ts (sites 10-11)

For `modify`, place one Shape-B pre-check on `input.id` immediately after the overlap-conflict block (i.e., before the `deleteMany` at line 278). For `delete`, add the pre-check before the `delete` call.

**Verify**: `pnpm type-check` → exit 0. `grep -c "ownerId: ctx.session.user.id" src/server/api/routers/activity-router.ts` → at least 2 more than before (was 8).

### Step 3: client-router.ts (sites 12-15)

**Verify**: `pnpm type-check` → exit 0. `grep -c "ownerId: ctx.session.user.id" src/server/api/routers/client-router.ts` → at least 4 more than before.

### Step 4: support-item-router.ts (sites 16-19)

**Verify**: `pnpm type-check` → exit 0. `grep -c "ownerId: ctx.session.user.id" src/server/api/routers/support-item-router.ts` → at least 4 more than before.

### Step 5: Full verification

**Verify**: `pnpm lint` → exit 0. `pnpm exec vitest run` → all pass. If Docker is available: `pnpm db:up && pnpm prisma:push && pnpm test:e2e` → all pass (the e2e suite exercises CRUD through a single legitimate user, so it proves owners can still do everything they could before).

### Step 6: Manual audit sweep

Run:

```
grep -n -E "prisma\.(activity|invoice|client|supportItem|supportItemRates)\.(update|updateMany|delete|deleteMany|findFirst|findUnique|findMany)\(" src/server/api/routers/*.ts
```

For every hit in the four in-scope files, confirm the surrounding `where` (or a pre-check within the same procedure) references `ownerId: ctx.session.user.id`. The known exceptions that need no scoping: `activity.create`/`invoice.create`/`client.create`/`supportItem.create`/`supportItemRates.create` (they SET `ownerId` in `data`), and nested writes inside an already-verified parent.

**Verify**: zero unexplained hits.

## Test plan

Router-level tests need a DB harness that doesn't exist yet (tracked in plans/README.md as a follow-up; plan 005 covers pure-function tests only). The gates here are the e2e regression suite plus the Step 6 sweep. When a router test harness lands later, the first tests to write are: user B cannot `invoice.updateStatus`, `client.delete`, or `activity.modify` records owned by user A (expect `NOT_FOUND`), and `invoice.getTotalOwing` for user B excludes user A's invoices.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] All 19 sites in the table changed; Step 6 sweep shows zero unexplained unscoped calls in the four files
- [ ] `pnpm type-check` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm exec vitest run` exits 0
- [ ] E2E suite passes (or is explicitly reported as not run because Docker was unavailable)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Line numbers/excerpts don't match the live code (drift since `c48e1dd`).
- You find a call site reading/writing tenant data that is NOT in the table and NOT in the "already correct" list — report it rather than silently fixing, so the site list stays authoritative.
- The e2e suite fails on a flow the table touches (likely a pre-check throwing where the UI expected success) — report the failing spec and the site number.
- You are tempted to change response shapes or add new procedures — that is out of scope.

## Maintenance notes

- Every future procedure must scope by `ownerId`; the trip-router pattern is the exemplar. A Prisma client extension that injects tenant scoping automatically would prevent regression — deliberately deferred to keep this diff mechanical.
- Reviewer: check each Shape-B pre-check throws BEFORE any write (especially site 10, where the `deleteMany` precedes the `update`).
- `invoice.create`'s group-activity path double-writes activities (separate known bug — see plans/README.md finding #7); this plan only adds ownership checks around it, it does not fix the duplication.
