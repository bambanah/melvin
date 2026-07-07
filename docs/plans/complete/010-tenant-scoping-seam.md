# Plan 010: A tenant-scoping seam under the routers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0ae76ab..HEAD -- src/server/api/`
> Plans 003 (ownership scoping) and 009 (router test harness) are EXPECTED
> to have landed and are REQUIRED. Re-derive every site list from the live
> code — plan 003 changed these files substantially after the line numbers
> below were recorded.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW–MED (pure refactor of security-relevant code — mechanical, but only safe because plan 009's suite exists)
- **Depends on**: docs/plans/003, docs/plans/009
- **Implements**: plan 003's deferred maintenance note ("a Prisma client extension that injects tenant scoping automatically would prevent regression — deliberately deferred")
- **Category**: architecture
- **Planned at**: commit `0ae76ab`, 2026-07-02 (architecture review, revision 2)

## Why this matters

Plan 003 fixes the cross-tenant leak mechanically: ~19 hand-placed
`findFirst({ id, ownerId }) → NOT_FOUND` pre-checks and `ownerId` additions
across four routers, verified by a manual grep sweep. Correct — but tenancy
remains a convention each procedure re-implements, enforced by review.
TRD-001 through TRD-007 all add new procedures; each one is a fresh chance
to forget the ritual, and the grep sweep doesn't run in CI.

The seam already exists: `authedProcedure` (`src/server/api/trpc.ts:38`) is
where every tenant-scoped request passes. Deepening it means procedures
receive a data-access surface that is scoped by construction — forgetting
becomes impossible rather than reviewable. The same seam absorbs the
cursor-pagination ritual repeated in four `list` procedures.

After this plan: routers express intent (`ctx.owned.activity.assert(id)`,
`paginate(...)`) and the ownership invariant lives in one module with plan
009's cross-tenant suite proving it.

## Current state

(At `0ae76ab`, BEFORE plan 003 — the shapes below are what plan 003
multiplies; re-derive exact sites from the landed code.)

- `src/server/api/trpc.ts` — context `{ prisma, session }`;
  `authMiddleware` narrows `session.user`; `authedProcedure` is the only
  procedure builder the routers use (`user-router` included). No scoped
  data-access layer exists.
- Plan 003 introduces two recurring shapes across
  `invoice-router.ts`, `activity-router.ts`, `client-router.ts`,
  `support-item-router.ts`:
  - **Shape A**: `ownerId: ctx.session.user.id` added to a `where`.
  - **Shape B**: a pre-check before unique `update`/`delete`:
    `findFirst({ where: { id, ownerId } , select: { id: true }})` →
    `TRPCError NOT_FOUND` (~12 sites per plan 003's table).
- Pagination ritual, four copies: `take: limit + 1` → pop → `nextCursor` at
  `client-router.ts:31`, `activity-router.ts:72`, `invoice-router.ts:108`,
  `support-item-router.ts:39`.
- `trip-router.ts` already follows the fetch-scoped-then-assert pattern
  natively and, after plan 008, applies change-sets in transactions — treat
  it as a consumer to migrate LAST, or leave as-is if the migration is not
  mechanical (see Scope).
- **Design decision, made here**: use typed helper wrappers, NOT a Prisma
  `$extends` query extension. Rationale: an extension cannot inject
  `ownerId` into unique `where` clauses (`update`/`delete` by id — exactly
  the Shape-B sites), so it would cover only half the surface while hiding
  which half; and with a single adapter it is a hypothetical seam. Helpers
  are explicit, type-safe, and greppable. Revisit an extension only if
  Prisma later supports scoping unique operations.

## Commands you will need

| Purpose     | Command                               | Expected on success |
| ----------- | ------------------------------------- | ------------------- |
| Integration | `pnpm db:up && pnpm test:integration` | all pass            |
| Unit        | `pnpm exec vitest run`                | all pass            |
| Typecheck   | `pnpm type-check`                     | exit 0              |
| Lint        | `pnpm lint`                           | exit 0              |

## Scope

**In scope** (the only files you should modify/create):

- `src/server/api/owned.ts` (create — the scoped data-access module) + unit test
- `src/server/api/trpc.ts` (attach the scoped surface to the authed context)
- `src/server/api/routers/{invoice,activity,client,support-item}-router.ts` (migrate call sites)
- `src/server/api/test/` (extend plan 009's suites where a migrated site lacked coverage)

**Out of scope** (do NOT touch):

- `trip-router.ts` and `pdf-router.ts` — already correct patterns; migrate in a follow-up only if it stays mechanical.
- `user-router.ts` — operates on the session user only.
- Any behavior change: same queries, same errors (`NOT_FOUND`), same response shapes. This is a pure relocation of the invariant.
- New procedures or schema changes.

## Git workflow

- Branch: `arch/010-tenant-scoping-seam`
- Conventional commits, e.g. `refactor: move tenant scoping behind an owned-data seam`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Build the scoped surface

Create `src/server/api/owned.ts`:

```ts
export function ownedDb(prisma: PrismaClient, ownerId: string) {
	return {
		activity: ownedModel(prisma.activity, ownerId),
		invoice: ownedModel(prisma.invoice, ownerId),
		client: ownedModel(prisma.client, ownerId),
		supportItem: ownedModel(prisma.supportItem, ownerId),
		supportItemRates: ownedModel(prisma.supportItemRates, ownerId)
	};
}
// each ownedModel exposes:
//   findMany/findFirst — ownerId merged into where
//   assert(id)         — Shape-B pre-check; throws TRPCError NOT_FOUND
//   assertAll(ids)     — the trip-router "length !== ids.length" pattern
```

Plus `paginate({ query, limit, cursor })` encapsulating the
`take: limit + 1` / pop / `nextCursor` ritual. Keep the generics as simple
as the Prisma types allow — if full generic typing fights you, per-model
explicit wrappers are fine (five small functions beat one clever type).

In `trpc.ts`, extend `authMiddleware`'s returned ctx with
`owned: ownedDb(ctx.prisma, ctx.session.user.id)`.

**Verify**: `pnpm type-check` → exit 0; unit test for `paginate` and for
`assert` throwing `NOT_FOUND` on a foreign id (harness-based).

### Step 2: Migrate one router end-to-end (invoice)

Replace every plan-003 pre-check and scoped `where` in `invoice-router.ts`
with the `ctx.owned` equivalents; replace its `list` ritual with
`paginate`. Do not restructure anything else.

**Verify**: `pnpm test:integration` → plan 009's ownership suite passes
unchanged (this is the point: the tests don't know the implementation
moved). `pnpm exec vitest run` → pass.

### Step 3: Migrate the remaining three routers

Same treatment for `activity-router.ts`, `client-router.ts`,
`support-item-router.ts`, one commit each.

**Verify** after each: `pnpm test:integration && pnpm type-check && pnpm lint` → pass.

### Step 4: Make the sweep automatic

Re-run plan 003's Step 6 grep sweep; after migration the expected result
changes to: NO raw `ctx.prisma.<tenant-model>.*` calls remain in the four
routers except `create` (which sets `ownerId` in `data`) and nested writes
under an asserted parent. Add that grep as a comment atop `owned.ts` so the
check is one paste away for reviewers; optionally add it as an eslint
`no-restricted-syntax` rule if it expresses cleanly — do not force it.

**Verify**: sweep shows zero unexplained hits.

## Test plan

Plan 009's cross-tenant suite is the specification; it must pass before,
during (per-router commits), and after. Add missing coverage opportunistically:
any migrated Shape-B site not yet exercised by an integration test gets one
(foreign id → `NOT_FOUND`).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `src/server/api/owned.ts` exists; `ctx.owned` available in authed procedures
- [ ] Step 4 sweep: zero raw tenant-model Prisma calls in the four routers outside the documented exceptions
- [ ] `grep -rn "take: limit + 1" src/server/api/routers` → no matches
- [ ] `pnpm test:integration` exits 0 with the ownership suite unmodified (except additions)
- [ ] `pnpm exec vitest run`, `pnpm type-check`, `pnpm lint` exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plans 003 or 009 have not landed (no pre-checks to migrate, or no net to migrate under).
- Any integration test needs its EXPECTATION changed to pass — behavior moved when only structure should have.
- The Prisma generic types make `ownedModel` require `any`-casts — fall back to per-model explicit wrappers (allowed above); if even those need casts, report.
- You find a plan-003 site whose scoping rule doesn't fit the helpers (e.g. an aggregate with a compound where) — leave it raw, list it in the Step 4 exceptions comment, and note it in the report rather than bending the helper.

## Maintenance notes

- Every future procedure should use `ctx.owned` — mention this in the PR
  description; TRD executors should treat raw `ctx.prisma` on tenant models
  as a review flag.
- If Prisma ships unique-where extension support, an `$extends`-based
  implementation can replace `ownedModel` internals without touching the
  routers — that is the seam paying rent.
- Reviewer: the diff should be call-site substitutions plus one new module.
  Any change to a `where` beyond adding/moving `ownerId` is a red flag.
