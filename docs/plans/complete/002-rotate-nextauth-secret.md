# Plan 002: Move the NextAuth secret to the environment and rotate it

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c48e1dd..HEAD -- src/server/auth.ts src/env/schema.js .env.template .github/workflows/lint-and-test.yml`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
>
> **SECRET HANDLING**: Never write the current committed secret value, or any
> newly generated secret value, into this plan, the README, a commit message,
> or any tracked file. Generated secrets go only into untracked `.env` files
> and deployment dashboards.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c48e1dd`, 2026-07-02

## Why this matters

The NextAuth signing secret is a hardcoded string literal committed at `src/server/auth.ts:45` (credential type: NextAuth session/JWT/email-token signing secret). Anyone with read access to the repo or its history can forge or validate auth tokens. A committed secret is burned permanently — moving it to the environment is necessary but not sufficient; it must also be **rotated** everywhere it is deployed. The env schema already declares `NEXTAUTH_SECRET` (`src/env/schema.js:6`) but as optional, and nothing reads it.

## Current state

- `src/server/auth.ts:45` — `secret:` is set to a committed string literal (value deliberately not reproduced here). The rest of the file builds `authOptions` for next-auth v4 with the Prisma adapter, Email + Google providers.
- `src/env/schema.js:4-16` — zod schema for server env; line 6 is currently:

```js
	NEXTAUTH_SECRET: z.string().min(1).optional(),
```

- `src/env/server.js` — validates `process.env` against `serverSchema` (read it before editing; if validation fails it should fail loudly at startup).
- `.env.template` — committed template of env vars with placeholder/empty values; developers copy it to `.env` (git-ignored, verified: `.gitignore` covers `.env*`).
- `.github/workflows/lint-and-test.yml` — CI defines env vars at the top (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`). The `e2e-tests` job boots the app, so once `NEXTAUTH_SECRET` becomes required, CI needs a dummy value (this is fine — it's a throwaway CI-only value like the existing `postgres:pass`).

## Commands you will need

| Purpose        | Command                                           | Expected on success                             |
| -------------- | ------------------------------------------------- | ----------------------------------------------- |
| Typecheck      | `pnpm type-check`                                 | exit 0                                          |
| Lint           | `pnpm lint`                                       | exit 0                                          |
| Generate value | `openssl rand -base64 32`                         | prints a new secret (do not commit it anywhere) |
| E2E (optional) | `pnpm db:up && pnpm prisma:push && pnpm test:e2e` | all pass                                        |

## Scope

**In scope** (the only files you should modify):

- `src/server/auth.ts`
- `src/env/schema.js`
- `.env.template` (add the variable NAME with an empty value only)
- `.github/workflows/lint-and-test.yml` (CI-only dummy value)
- Your local untracked `.env` (new generated value — never committed)

**Out of scope** (do NOT touch, even though they look related):

- Migrating next-auth v4 → v5 (deliberately deferred; see docs/plans/README.md).
- Any other provider config in `authOptions` (Google/Email envs are already optional and env-driven).

## Git workflow

- Branch: `advisor/002-rotate-nextauth-secret`
- Commit message: `fix: read nextauth secret from environment` (conventional commits, matching repo history)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Read the secret from the environment

In `src/server/auth.ts`, replace the hardcoded literal on line 45 with:

```ts
secret: process.env.NEXTAUTH_SECRET;
```

**Verify**: `grep -c "secret: process.env.NEXTAUTH_SECRET" src/server/auth.ts` → `1`, and the old literal is gone: `grep -n "secret: \"" src/server/auth.ts` → no matches.

### Step 2: Make the env var required

In `src/env/schema.js:6`, remove `.optional()`:

```js
	NEXTAUTH_SECRET: z.string().min(1),
```

Read `src/env/server.js` to confirm it validates `serverSchema` at startup and throws/exits on failure (so a missing secret fails fast rather than silently running unsigned).

**Verify**: `pnpm type-check` → exit 0. `pnpm lint` → exit 0.

### Step 3: Update the template and your local env

- In `.env.template`, ensure a line `NEXTAUTH_SECRET=` exists (empty value, name only). Add it if absent.
- In your local untracked `.env`, set `NEXTAUTH_SECRET` to a fresh value from `openssl rand -base64 32`. Do not reuse the old committed value.

**Verify**: `grep -n "NEXTAUTH_SECRET=" .env.template` → one match with nothing after `=`. `git status` → `.env` does NOT appear (it is git-ignored; if it appears, STOP).

### Step 4: Give CI a dummy value

In `.github/workflows/lint-and-test.yml`, add to the top-level `env:` block (alongside `NEXTAUTH_URL`):

```yaml
NEXTAUTH_SECRET: "ci-only-dummy-secret-not-used-in-production"
```

**Verify**: `grep -n "NEXTAUTH_SECRET" .github/workflows/lint-and-test.yml` → one match.

### Step 5: Rotation handoff (human required)

The executor cannot rotate deployed environments. Report to the operator:

> The committed NextAuth secret is burned (it lives in git history at `src/server/auth.ts:45` before this change). Generate a NEW value (`openssl rand -base64 32`) and set `NEXTAUTH_SECRET` in every deployment environment (the env schema references Vercel, so check the Vercel project settings). Rotating invalidates in-flight email sign-in links and may sign out active sessions — that is the point.

## Test plan

No unit tests cover auth config. The behavioral gate is: with `NEXTAUTH_SECRET` unset, the app must fail to start (env validation); with it set, login must work. If Docker is available: `pnpm db:up && pnpm prisma:push && pnpm test:e2e` → the e2e suite authenticates via stored session state and passes.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n 'secret: "' src/server/auth.ts` returns no matches (no string literal assigned to `secret`)
- [ ] `grep -n "NEXTAUTH_SECRET: z.string().min(1)," src/env/schema.js` → one match (no `.optional()`)
- [ ] `pnpm type-check` exits 0; `pnpm lint` exits 0
- [ ] `.env.template` contains `NEXTAUTH_SECRET=` with no value
- [ ] CI workflow contains a dummy `NEXTAUTH_SECRET`
- [ ] No secret value appears in any tracked file (`git diff` review)
- [ ] Rotation handoff message delivered to the operator
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `src/env/server.js` does not actually validate the schema at startup (then making the var required is decorative — report and propose wiring validation instead).
- `.env` or any file containing a generated secret shows up in `git status` as tracked.
- Any deployment config file in the repo (e.g. `Dockerfile`) turns out to bake in the secret — report the location; do not edit deployment files beyond the listed scope.

## Maintenance notes

- The old value remains in git history; treat it as public forever. History rewriting is not worth it — rotation is the fix.
- Reviewer: confirm no `.env` files are in the diff and the CI value is obviously fake.
- Follow-up (deferred): consider making `GOOGLE_ID`/`GOOGLE_SECRET` required-together via a zod refinement.
