# Plan 009: Router-level test harness — test the routers through their own interface

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0ae76ab..HEAD -- src/server/api/ vitest.config.mts package.json docker-compose.yml`
> Plan 003 (ownership scoping) is EXPECTED to have landed and is REQUIRED —
> this plan's first tests assert its rules. Other changes: compare the
> "Current state" excerpts against the live code; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (additive — new test infrastructure; no production code changes)
- **Depends on**: docs/plans/003
- **Absorbs**: the "Router-level integration test harness" follow-up in docs/plans/README
- **Category**: tests
- **Planned at**: commit `0ae76ab`, 2026-07-02 (architecture review, revision 2)

## Why this matters

After plan 005, the pure functions are pinned — but the routers, where the
consequential behavior lives, have no test surface at all: plan 003's 19
ownership rules are verified only by a manual grep sweep, the trip
write-back mutations have never been executed by a test, finding #9's
payment matching is untestable, and TRD-006 explicitly parks its
sealed-invoice guard tests "in the ownership-scoping harness" — which
doesn't exist. docs/plans/README names this the biggest remaining test gap.

The routers ARE the application's interface — the UI crosses exactly this
seam. A harness that calls procedures as real users against a real database
means callers and tests cross the same seam, with no mocking past it.

After this plan: `pnpm test:integration` runs vitest suites that invoke tRPC
procedures as user A and user B against a disposable Postgres database, and
the first suite locks in plan 003's cross-tenant rules.

## Current state

(All at `0ae76ab`.)

- `src/server/api/trpc.ts` — context is plain `{ prisma, session }`;
  `authedProcedure` asserts `ctx.session?.user`. Nothing about the context
  requires HTTP — a hand-built `{ prisma, session: { user: { id } } }` is a
  valid context.
- `src/server/api/app-router.ts` — exports `appRouter` (procedures:
  `user`, `invoice`, `activity`, `supportItem`, `clients`, `pdf`, `trip`).
- Check the `@trpc/server` major version in `package.json` before writing
  the caller helper: v10 → `appRouter.createCaller(ctx)`; v11 →
  `const createCaller = t.createCallerFactory(appRouter)` (factory exported
  from `trpc.ts`). Use whichever the installed version supports.
- `vitest.config.mts` — single config, `environment: "jsdom"`, includes
  `./src/**/*.test.?(c|m)[jt]s?(x)`. Integration tests need `node`
  environment and must NOT run under the default unit glob (they need a DB).
- `docker-compose.yml` — local Postgres (`postgres:pass`), started by
  `pnpm db:up`; schema applied with `pnpm prisma:push` (no migration files —
  the repo uses `db push`). CI's e2e job already boots this stack
  (`.github/workflows/lint-and-test.yml`).
- `prisma.config.ts` / `src/server/prisma.ts` — the Prisma client reads
  `DATABASE_URL`. A test database is most simply a second database on the
  same container, selected by overriding `DATABASE_URL` for the test
  process.
- Session shape: `session.user.id` (typed in `src/server/auth.ts`'s
  `declare module "next-auth"` block); `expires` is required by the
  `Session` type — set a far-future ISO string in the fake.
- Repo conventions: tabs, double quotes, plain vitest `test`/`expect`.

## Commands you will need

| Purpose         | Command                                 | Expected on success   |
| --------------- | --------------------------------------- | --------------------- |
| Start DB        | `pnpm db:up`                            | postgres container up |
| Integration     | `pnpm test:integration` (created below) | all pass              |
| Unit unaffected | `pnpm exec vitest run`                  | all pass, no DB used  |
| Typecheck/Lint  | `pnpm type-check && pnpm lint`          | exit 0                |

## Scope

**In scope** (the only files you should modify/create):

- `src/server/api/test/` (create: harness helpers + integration suites; pick this or a sibling `src/server/test/` and stay consistent)
- `vitest.integration.config.mts` (create)
- `vitest.config.mts` (exclude `*.integration.test.ts` from the unit glob if the naming below doesn't already keep them apart)
- `package.json` (add the `test:integration` script)
- `src/server/api/trpc.ts` ONLY if the tRPC version requires exporting a caller factory — no behavioral change
- `.github/workflows/lint-and-test.yml` (optional Step 5 — CI job)

**Out of scope** (do NOT touch):

- Any router or production module — if a test exposes a bug, characterize it with a NOTE comment and report it (same discipline as plan 005).
- The e2e Playwright stack.
- Seeding beyond what the tests themselves create.

## Git workflow

- Branch: `arch/009-router-test-harness`
- Conventional commits, e.g. `test: add router-level integration harness`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Vitest integration config + script

Create `vitest.integration.config.mts`: `environment: "node"`, include
`["./src/**/*.integration.test.ts"]`, `fileParallelism: false` (suites share
one database), and a `globalSetup` file (Step 2). Add the script:

```json
"test:integration": "vitest run --config vitest.integration.config.mts"
```

Confirm the unit config's glob does not match `*.integration.test.ts`; if it
does, add an `exclude`.

**Verify**: `pnpm test:integration` → "no test files found" exit path (or a
trivial placeholder passes); `pnpm exec vitest run` still runs only the
existing unit suites.

### Step 2: Global setup — disposable database

`globalSetup` script: read the base `DATABASE_URL`, swap the database name to
`melvin_test`, create the database if missing (a `postgres` client or
`prisma db push` handles creation on Postgres via the connection), run
`prisma db push --skip-generate` against it (shell out with the overridden
env), and export the overridden `DATABASE_URL` into `process.env` for the
test workers. Document that `pnpm db:up` must be running (fail fast with a
clear message when the container is down).

**Verify**: `pnpm db:up && pnpm test:integration` → setup completes; `psql`
(or `prisma db pull` with the test URL) shows the schema in `melvin_test`.

### Step 3: The harness helpers

In `src/server/api/test/harness.ts`:

```ts
export async function createTestUser(name?): Promise<User>; // prisma.user.create, unique email per call
export function callerFor(user: User); // caller with ctx { prisma, session: { user: { id: user.id, … }, expires } }
export async function resetDb(): Promise<void>; // TRUNCATE all app tables RESTART IDENTITY CASCADE
```

Use the version-appropriate caller construction (see Current state). Call
`resetDb` in a suite-level `beforeEach`.

**Verify**: a smoke test — `callerFor(userA).clients.list(...)` returns an
empty page; creating a client as A and listing as A returns it.

### Step 4: First suites — plan 003's rules, written down at last

`ownership.integration.test.ts`, exactly the cases plan 003's test plan
deferred here:

1. User B `invoice.updateStatus` on A's invoice → `NOT_FOUND`, and A's row is unchanged.
2. User B `clients.delete` on A's client → `NOT_FOUND`; A's client survives (highest-damage site).
3. User B `activity.modify` on A's activity → `NOT_FOUND`.
4. `invoice.getTotalOwing` for B excludes A's SENT invoices.
5. User B `pdf.forInvoice` on A's invoice → empty/denied per plan 001's behavior.

`trip-lifecycle.integration.test.ts` (first-ever execution of the write-back
paths; doubles as plan 008's regression net):

6. `trip.create` with 3 activities + 2 legs → each activity's persisted `transitDistance`/`transitDuration` matches `calculateTripTransit`'s allocation.
7. `trip.removeActivity` (middle) → removed activity restored to standalone values; remaining reallocated.
8. `trip.delete` → all activities restored to standalone values, `tripId` null.

**Verify**: `pnpm test:integration` → all 8+ pass.

### Step 5 (optional, confirm with operator if CI minutes matter): CI job

Add an `integration-tests` job to `.github/workflows/lint-and-test.yml`
mirroring the e2e job's Postgres service, running
`pnpm prisma:push && pnpm test:integration`.

**Verify**: workflow YAML parses (`gh workflow view` or a dry run on the branch).

## Test plan

This plan IS test infrastructure; its own gate is Steps 3-4 passing twice in
a row (`pnpm test:integration && pnpm test:integration`) to prove `resetDb`
actually isolates runs.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm test:integration` exits 0, twice consecutively
- [ ] ≥8 integration tests across the two suites above
- [ ] `pnpm exec vitest run` (unit) exits 0 and touches no database (passes with Docker down)
- [ ] `pnpm type-check`, `pnpm lint` exit 0
- [ ] No production source file modified except the optional caller-factory export (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 003 has not landed (the Step 4 assertions would characterize the vulnerability instead of the fix).
- The Prisma client caches `DATABASE_URL` in a way the env override can't reach (e.g. read at import time before globalSetup runs) — report; the fix may need a `src/server/prisma.ts` touch, which is out of scope.
- Ownership tests FAIL against plan 003's landed code — you found a live cross-tenant hole; report the procedure and site immediately, do not "fix" the test.
- Trip lifecycle numbers disagree with `calculateTripTransit` — that's the uncapped-restore divergence documented in plan 008; characterize with a NOTE and cross-reference plan 008 rather than asserting either value as correct.

## Maintenance notes

- This harness is the intended home for: plan 008's lifecycle regression,
  finding #9's payment-matching tests, TRD-006's sealing guards, and
  future TRD router work. Keep suites `*.integration.test.ts` so the split
  stays mechanical.
- Plan 010 (tenant-scoping seam) must run its refactor under this suite —
  it is the regression net that makes that refactor safe.
- Reviewer: check `resetDb` truncates every app table (a new model that
  isn't truncated shows up as cross-test flake later).
