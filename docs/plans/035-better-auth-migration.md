# Plan 035: Migrate auth to better-auth (inside Next.js)

> **Executor instructions**: Every item lands as its own small PR on
> `main` — this plan never runs on a long-lived branch. Run every
> verification command before moving on. If a STOP condition occurs,
> stop and report. Update the status row in `docs/plans/README.md` as
> milestones complete. Plan [036](036-tanstack-start-migration.md)
> (framework switch) must not start until this plan's soak gate passes.
>
> **Drift check (run first)**:
> `git diff --stat 53fed77..HEAD -- src/server/auth.ts src/server/api/context.ts prisma/schema.prisma e2e/setup/ src/components/auth/ .github/workflows/`
> Expected drift: `.github/workflows/lint-and-test.yml` (pre-work item 1,
> commit `31869b4`). Any other in-scope change: compare the "Current
> state" claims below against live code; on a mismatch, treat as STOP.

## Status

- **Priority**: P2 (user-driven product decision)
- **Effort**: M (4–7 dev-days)
- **Risk**: MEDIUM — no auth rows are migrated (satellite tables are dropped and recreated), so the classic "irreversible auth data migration" risk does not apply; the `User` table alteration is the only schema change to business-owning data
- **Depends on**: 025 (its user-router tests pin `User`-table behavior — execute it as pre-work item 2)
- **Category**: architecture / migration
- **Planned at**: commit `53fed77`, 2026-07-12; re-scoped 2026-07-13 after a grilling session (decisions below)

**Split note**: this plan and [036](036-tanstack-start-migration.md) were originally one plan ("Migrate to TanStack Start, auth-first"). Split 2026-07-13: this plan carries the auth migration and ships to prod alone; 036 carries the framework switch and depends on this plan's soak gate.

**Decisions locked by the operator** (2026-07-12/13 — do not re-litigate):

- Auth → **better-auth**; **tRPC stays**; deployment stays self-hosted Docker/Node.
- **Drop and recreate** `Account`/`Session`/`VerificationToken` — no auth-row migration. There is one real production user (the operator), who re-links Google at first sign-in via trusted-provider linking. End-state quality beats transition seamlessness.
- **Email + password is a production feature** (`emailAndPassword: { enabled: true }`), not an e2e-only gate. `requireEmailVerification: true` (neutralizes pre-registration takeover via the trusted-linking path).
- **Magic link is dropped entirely** — login page offers Google + password only; former magic-link users set a password via the reset flow at the forced re-login.
- `accountLinking: { trustedProviders: ["google"] }` — firm, not "consider".
- Ids: `advanced: { database: { generateId: false } }`; new auth models carry `@default(cuid())` like the rest of the schema.
- Sessions: better-auth defaults (7-day expiry, rolling refresh). Forced global re-login at cutover is accepted.
- Soak gate: **until the operator has verified auth working correctly in prod** — usage-driven, no calendar.

**Supersedes** the README's rejected _Auth.js v5 migration_ finding (2026-07-07 audit): that rejected a maintenance-driven move; this is the product decision TRD-001 anticipated, and it exits next-auth entirely.

## Why this matters

Melvin runs on Next.js 16 pages router + tRPC 11 + Prisma 7 + next-auth v4. The operator wants TanStack Start (plan 036). Exploration (2026-07-12) established that **the deepest Next coupling is auth, not tRPC**: 49 tRPC procedures in 7 routers all flow through context `{ prisma, session }` built by `getServerAuthSession({ req, res })` in `src/server/api/context.ts`.

**Sequencing rationale**: shipping better-auth inside Next.js first (≈0.5 d of throwaway glue) means the framework branch touches zero auth code paths that matter, and any prod auth failure gets debugged in a familiar framework. better-auth has pages-router support (`toNodeHandler`) and first-class TanStack Start integration — the same `auth` instance survives the framework swap.

Current state (verified 2026-07-13):

- `src/server/auth.ts`: next-auth v4, `PrismaAdapter`, Google + EmailProvider (magic link), session callback exposing `user.id`.
- No `allowDangerousEmailAccountLinking` — today a magic-link-only user clicking Google gets `OAuthAccountNotLinked`.
- `Account.userId` is `@unique` (one OAuth account per user); `User.email` is nullable-but-unique.
- Nothing in `src/` assumes id shape (no cuid validation anywhere).
- The integration suite (8 files, `createCallerFactory` + real Postgres via `src/server/api/test/harness.ts`) is framework-agnostic and **runs in CI** (pre-work item 1, done).
- e2e auth bypass injects a raw `next-auth.session-token` cookie backed by a pre-created Session row (`e2e/setup/global.setup.ts`); Playwright CI runs against a production build (`pnpm start`), local runs use `pnpm dev:next`.

## Pre-work (each item its own PR on main) · 1.5–3 d

1. **Integration tests into CI** — **DONE** (`31869b4`), currently on the `tanstack-start` branch; fast-forward/merge it to `main` and push before anything else.
2. **Router coverage gaps** (1–2 d). Execute **plan 025** (user-router + custom rates — this plan alters the `User` table's columns; those tests must exist first). Then add direct tests for `activity.list` / `supportItem.list` cursor pagination asserting **today's Decimal serialization shape** — the superjson regression tripwire belongs to plan 036 but lands here, before any migration starts.
3. **e2e auth seam** (0.5–1 d). Extract `authenticateAsTestUser()` into `e2e/test-utils.ts` so `e2e/setup/global.setup.ts` no longer hardcodes next-auth session mechanics; parameterize Playwright's `webServer` command via env. This plan swaps the function body; 036 changes one env value.

## better-auth migration · 2.5–4 d

### Schema (0.5 d)

Via `prisma migrate dev --create-only`, hand-checked. No renames, no data mapping:

- **User** (in-place alteration — every Client/Activity/Invoice FKs it):
  - `email String?` → NOT NULL (**pre-flight**: `SELECT count(*) FROM "User" WHERE email IS NULL` must be 0 in prod)
  - add NOT NULL `name` (backfill from email local-part)
  - `emailVerified DateTime?` → `Boolean` (backfill `true` for existing users)
  - Custom fields (`abn`, bank fields, `transitRatePerKm`, default support items) untouched — better-auth ignores columns it doesn't own.
- **Drop** `Account`, `Session`, `VerificationToken`. **Create** better-auth's canonical `Account`, `Session`, `Verification` models, each with `@default(cuid())`. The single Google link is re-established at first sign-in (trusted linking), not migrated.

Rehearse once on a prod `pg_dump` restored locally — now a cheap sanity check of the `User` alters, not a gate.

### Server code (0.5–1 d)

- `src/server/auth.ts` → `betterAuth({ database: prismaAdapter(prisma, { provider: "postgresql" }), socialProviders: { google }, emailAndPassword: { enabled: true, requireEmailVerification: true }, emailVerification: { sendVerificationEmail }, account: { accountLinking: { trustedProviders: ["google"] } }, advanced: { database: { generateId: false } } })` plus `sendResetPassword`. Session config left at defaults (7-day rolling).
- One shared nodemailer send helper (existing `EMAIL_SERVER`/`EMAIL_FROM`) serves verification + password-reset emails. No magic-link plugin.
- Handler: `src/pages/api/auth/[...nextauth].ts` → `[...all].ts` with `toNodeHandler(auth.handler)` + `bodyParser: false` (throwaway Next glue; 036 deletes it).
- **`src/server/api/context.ts`**: `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`, **normalized to the current `session.user.id` shape in this one file** — protects all 49 procedures, `ownedDb`, and the integration harness unchanged.

### Client code (1–1.5 d)

- New `src/lib/auth-client.ts` (`createAuthClient`; no plugins needed).
- `src/components/auth/login-page.tsx`: Google button + email/password form; drop `getProviders()`. Add forgot-password / reset-password flow (new page + `authClient.requestPasswordReset` / `resetPassword`).
- `useSession` semantics change (`isPending`/`data`, not three-state `status`) — fix the gate in `src/components/shared/layout.tsx` so "pending" doesn't redirect.
- Drop `SessionProvider` from `_app.tsx`.
- Env: `NEXTAUTH_*` → `BETTER_AUTH_*` in `src/env/schema.js`, `.env.template`, CI, prod secrets.

### e2e rebuild (0.5 d)

No bypass — the suite signs in through the **real** password flow. Global setup creates the test user pre-verified with a credential account (server-side via `auth.api.signUpEmail` + a direct `emailVerified` flip, or equivalent), POSTs `/api/auth/sign-in/email`, stores the cookie in `storageState` through the pre-work item 3 seam.

### Cutover (0.5 d)

Single user, quiet evening, no announcement ceremony: dump → migrate → deploy → run the manual checklist. Rollback = restore dump (trivial while the only writes are the operator's own).

## Soak gate (blocks plan 036)

Soak in production **until the operator has verified auth is working correctly** — no fixed duration. Minimum evidence: one Google sign-in after a fresh session expiry (≤7 days away), verification + password-reset emails over real SMTP, session survives a server restart, normal invoice work unaffected. 036's pre-work (small PRs on main) may proceed during the soak; its framework branch may not.

## Risk register

| Risk                                                                                                         | Mitigation                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Trusted-provider re-link fails at first Google sign-in** (the one flow replacing the old rename migration) | Headline item on the cutover checklist; single user with DB access can attach the Account row by hand; rollback = restore dump |
| **better-auth session semantics** (`getSession` shape; `useSession` `isPending` vs `status`)                 | Normalize once in `context.ts`; integration suite is the tripwire; manually test loading→authed on slow network                |
| **Password signups open a pre-registration takeover via trusted linking**                                    | Neutralized by `requireEmailVerification: true`; do not relax it                                                               |
| better-auth releases fast                                                                                    | Pin the exact version at start; renovate handles drift after                                                                   |

## Verification

- **Integration suite (in CI)** must pass **unchanged** — needing to edit an integration test is a red flag (the context normalization has drifted).
- **Unit suite** incl. jsPDF golden masters.
- **Full e2e** through the real password sign-in.
- **Manual cutover checklist**: existing-user Google sign-in re-links via trusted linking (the headline), email verification + password reset over real SMTP, sign-out, session survives server restart, cross-tenant isolation spot-check, invoice PDF download.

## STOP conditions

- Pre-flight finds `User` rows with NULL email — stop, resolve data first.
- better-auth APIs have moved materially from what this plan describes (check versions against `Planned at` date) — re-verify the affected step against current docs before executing it.
- An integration test needs editing to pass — stop and understand why before continuing.

## Maintenance notes

- The `toNodeHandler` glue and the `fromNodeHeaders` context call are deliberate throwaway — plan 036 deletes them.
- The README "Findings considered and rejected" _Auth.js v5_ entry should gain a pointer to this plan when it completes (plan 023's docs-reconciliation pass can pick this up).
