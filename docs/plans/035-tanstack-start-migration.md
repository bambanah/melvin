# Plan 035: Migrate to TanStack Start (auth-first: better-auth, then framework)

> **Executor instructions**: This is a multi-phase roadmap executed over
> weeks, not one sitting. Phases land independently — 0 and 1 on `main`,
> 2 on a branch. Run every verification command before moving on. If a
> STOP condition occurs, stop and report. Update the status row in
> `docs/plans/README.md` as each phase completes (e.g.
> `IN PROGRESS (phase 1 shipped, soaking)`).
>
> **Drift check (run first, per phase)**:
> `git diff --stat 53fed77..HEAD -- src/server/auth.ts src/server/api/context.ts src/lib/trpc.ts prisma/schema.prisma e2e/setup/ .github/workflows/`
> If in-scope files changed since planning, compare the "Current state"
> claims below against live code; on a mismatch, treat as STOP.

## Status

- **Priority**: P2 (user-driven product decision)
- **Effort**: XL (14–22 dev-days across phases; 2–4 calendar months at hobby cadence)
- **Risk**: HIGH overall, partitioned — Phase 1 carries the only irreversible step (auth data migration); Phase 2 is broad but reversible
- **Depends on**: 025 (its user-router tests are Phase 0.2's prerequisite — land it first)
- **Category**: architecture / migration
- **Planned at**: commit `53fed77`, 2026-07-12

**Decisions locked by the operator** (do not re-litigate): auth → **better-auth** (migrating existing users' Google links); **tRPC stays** (no server-function rewrite); deployment target **self-hosted Docker/Node** (Vercel bits dropped).

**Supersedes** two entries in the README's "Findings considered and rejected" (2026-07-07 audit): the _App Router migration_ and _Auth.js v5 migration_ rejections. Those rejected maintenance-driven moves within the Next ecosystem; this plan is the "future product decision" the audit's TRD-001 note anticipated, and it exits the Next ecosystem entirely.

## Why this matters

Melvin runs on Next.js 16 pages router + tRPC 11 + Prisma 7 + next-auth v4. The operator wants TanStack Start. Exploration (2026-07-12) established:

- 24 pages, all client-rendered except two `getServerSideProps` redirect gates (`src/pages/index.tsx`, `src/pages/login.tsx`). No middleware, no edge runtime, no `next/image`.
- 49 tRPC procedures in 7 routers; context `{ prisma, session }` from `getServerAuthSession({ req, res })` in `src/server/api/context.ts`. **The deepest Next coupling is auth, not tRPC.**
- ~57 Next-specific imports across 36 files (link/router/head/dynamic/font).
- The integration suite (8 files, `createCallerFactory` + real Postgres via `src/server/api/test/harness.ts`) is framework-agnostic — the invariant for the whole migration — but **is not run in CI**. e2e auth bypass injects a raw `next-auth.session-token` cookie (`e2e/setup/global.setup.ts`), which dies under better-auth (signed cookies).
- TanStack Start is stable (v1.0 Mar 2026; `@tanstack/react-start` Vite plugin). better-auth has an official NextAuth migration guide, pages-router support (`toNodeHandler`), and first-class TanStack Start integration — which is what makes the auth-first sequencing below possible.

**Sequencing rationale**: auth = irreversible data/identity risk; framework = broad but reversible churn. Shipping better-auth inside Next.js first (≈0.5 d of throwaway glue) means the framework branch touches zero auth data, and a prod auth failure gets debugged in a familiar framework.

## Effort summary

| Phase | What                                                  | Estimate  |
| ----- | ----------------------------------------------------- | --------- |
| 0     | Pre-work on main (CI, coverage, seams)                | 3.5–5.5 d |
| 1     | better-auth **inside Next.js**, ship + soak 1–2 weeks | 3.5–5.5 d |
| 2     | TanStack Start switch (branch; feature-freeze main)   | 7–11 d    |
| 3     | Optional: `@trpc/tanstack-react-query` codemod + SSR  | 1.5–3 d   |

## Phase 0 — Pre-work (each item its own PR on main) · 3.5–5.5 d

1. **Integration tests into CI** (0.5 d, first). Add a Postgres-service job running `pnpm test:integration` to `.github/workflows/lint-and-test.yml`. A safety net not in CI isn't one.
2. **Router coverage gaps** (1–2 d). Execute **plan 025** for user-router + custom rates (Phase 1 rewrites the `User` table's columns — those tests must exist first). Then add direct tests for `activity.list` / `supportItem.list` cursor pagination asserting **today's Decimal serialization shape** — the superjson regression tripwire for Phases 2–3.
3. **e2e auth seam** (0.5–1 d). Extract `authenticateAsTestUser()` into `e2e/test-utils.ts` so `e2e/setup/global.setup.ts` no longer hardcodes next-auth session mechanics; parameterize Playwright's `webServer` command via env. Phase 1 swaps one function body; Phase 2 changes one env value.
4. **Kill both `getServerSideProps` pages** (0.5 d). Convert `/` and `/login` to the client-side gate the other 22 pages use; hardcode the two providers in `src/components/auth/login-page.tsx` (drop `getProviders()`). Result: zero SSR → Phase 2 is a pure-CSR transplant. Accepted temporary regression: logged-in users hitting `/` see a flash before redirect; Phase 2's `beforeLoad` restores it.
5. **Decouple `src/lib/trpc.ts` + drop Vercel remnants** (0.5 d). Delete the dead SSR branch (`ssr` defaults to false) and `VERCEL_URL` handling; remove `@vercel/speed-insights` from `_app.tsx` and package.json; drop `VERCEL*` from `src/env/schema.js`; move `baseListQueryInput` out of the client wiring file.
6. **Deliberately NOT doing**: pre-migrating tRPC hooks (~100 call sites of churn, de-risks nothing — Phase 3 has a codemod); component/render tests (they'd test the tree Phase 2 rewrites).

**Verify**: CI green including the new integration job; e2e green through the new seam; manual `/` + `/login` redirect check.

## Phase 1 — better-auth on Next.js (ships to prod, then soaks 1–2 weeks) · 3.5–5.5 d

**Simplification (accepted)**: drop sessions, force one re-login. `Session`/`VerificationToken` are recreated, not migrated — the trickiest mapping disappears. Announce the forced re-login.

### Schema/data migration (1–1.5 d)

Hand-authored SQL via `prisma migrate dev --create-only` (**renames, not drop+create** — Prisma's diff would generate destructive drops). Rehearse on a prod `pg_dump` restored locally.

- **User**: `email String?` → NOT NULL (pre-flight: `SELECT count(*) FROM "User" WHERE email IS NULL` must be 0 in prod); add NOT NULL `name` (backfill from email local-part); `emailVerified DateTime?` → `Boolean` (backfill `true` for existing users). Custom fields (`abn`, bank fields, `transitRatePerKm`, default support items) untouched — better-auth ignores columns it doesn't own.
- **Account**: rename `provider`→`providerId`, `providerAccountId`→`accountId`, snake_case→camelCase token columns, `expires_at Int`→`accessTokenExpiresAt DateTime` (`to_timestamp`); drop `type`/`token_type`/`session_state`/`oauth_token*`; **drop `userId @unique`** (keep plain index + `@@unique([providerId, accountId])`). This rename is what preserves Google links — better-auth looks up `(providerId, accountId)` = today's `(provider, providerAccountId)`. No re-consent.
- **Session** → recreate to better-auth shape (`id`, `token @unique`, `expiresAt`, `ipAddress?`, `userAgent?`, `userId`, timestamps). **VerificationToken** → replace with `Verification`.

### Code (1–1.5 d)

- `src/server/auth.ts` → `betterAuth({ database: prismaAdapter(prisma, { provider: "postgresql" }), socialProviders: { google }, plugins: [magicLink({ sendMagicLink })] })`; port the nodemailer send from EmailProvider (existing `EMAIL_SERVER`/`EMAIL_FROM`). Consider `accountLinking: { trustedProviders: ["google"] }`. Decide `generateId` (cuid vs default) deliberately.
- Handler: `src/pages/api/auth/[...nextauth].ts` → `[...all].ts` with `toNodeHandler(auth.handler)` + `bodyParser: false` (throwaway Next glue).
- **`src/server/api/context.ts`**: `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`, **normalized to the current `session.user.id` shape in this one file** — protects all 49 procedures, `ownedDb`, and the integration harness unchanged.
- Client sweep (6 files): new `src/lib/auth-client.ts` (`createAuthClient` + `magicLinkClient`). `useSession` semantics change (`isPending`/`data`, not three-state `status`) — fix the gate in `src/components/shared/layout.tsx` so "pending" doesn't redirect. `signIn("google"/"email")` → `authClient.signIn.social/magicLink`. Drop `SessionProvider` from `_app.tsx`.
- Env: `NEXTAUTH_*` → `BETTER_AUTH_*` in `src/env/schema.js`, `.env.template`, CI, prod secrets.

### e2e bypass rebuild (0.5–1 d)

Raw-cookie injection dies (signed cookies). Preferred: test-only `emailAndPassword: { enabled: process.env.E2E_AUTH === "1" }`; setup POSTs `/api/auth/sign-in/email`, stores `Set-Cookie` in `storageState`. Fallback: insert a magic-link `Verification` row (tokens stored plain) and visit the verify URL.

### Cutover (0.5–1 d)

Maintenance window: dump → migrate → deploy → manual checklist (below). Rollback = restore dump; viable only before new writes — hence the soak before Phase 2.

## Phase 2 — TanStack Start switch (single branch) · 7–11 d

- **Scaffold/build** (1–1.5 d): swap `next` for `@tanstack/react-start` + Vite (`tanstackStart()` before `viteReact()`; `vite-tsconfig-paths` for `@/*`); `"type": "module"`; keep `src/env/server.js` fail-fast validation imported from `vite.config.ts`; Tailwind 4 via `@tailwindcss/vite`. **Router-wide `ssr: false`** to start — app is 100% CSR after Phase 0.4, so hydration is a non-issue.
- **Root + routing** (1.5–2.5 d): `_app.tsx` → `src/routes/__root.tsx` (providers, `head()`, `notFoundComponent`); fonts → fontsource imports, CSS vars set statically in `globals.css`. `[id]` → `$id` (deletes eight `Array.isArray(router.query.id)` dances). `dashboard/route.tsx` layout route carries **one canonical auth guard** in `beforeLoad`. `invoices/index` + `activity-form.tsx` search params → typed `validateSearch`; the e2e URL-filter-persistence spec is the acceptance test.
- **API routes**: `api/auth/$.ts` (`auth.handler(request)` + `tanstackStartCookies` plugin, delete Phase 1's `toNodeHandler` glue); `api/trpc/$.ts` (`fetchRequestHandler`, context from `Request.headers`, session shape unchanged); `api/invoices/generate-pdf/$id.ts` (web `Response`, same headers; keep 404 branch — e2e asserts 404 and 405).
- **Mechanical sweep** (~36 files, 1–1.5 d): `next/link`→`Link`, `useRouter`→`useNavigate`/`useParams`, `next/head`→`head()`, `next/dynamic`→`React.lazy`, `next/navigation`→router hooks. `src/lib/trpc.ts`: `createTRPCNext` → classic `createTRPCReact` provider with **identical `httpBatchLink` + superjson** — all ~63 hook call sites zero-change (Phase 3 owns the modernization).
- **e2e/CI/Docker** (1.5–2.5 d): `webServer` → `node .output/server/index.mjs` (env value from Phase 0.3); Dockerfile copies `.output/` + `public/` + `prisma/`; expect a handful of e2e timing fixes.
- **Buffer** (1–2 d) for risk-register issues — every framework migration hits 2–3.

## Phase 3 (optional, post-soak) · 1.5–3 d

`npx @trpc/upgrade` codemod to `@trpc/tanstack-react-query` (~100 call sites; both clients can coexist); selectively enable SSR on `/` and `/login`.

## Risk register

| Risk                                                                                                                                                                           | Mitigation                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **superjson + 18 Prisma Decimal fields** — no registered superjson type; wire shape must not move                                                                              | Pin superjson 2.2.6; identical link config through Phase 2; Phase 0.2 tests assert the serialized shape                          |
| **Auth data migration is the only irreversible step** (Google links)                                                                                                           | Rehearse on prod dump; pre-flight SQL checks; ship alone + soak                                                                  |
| **Prisma client bundling in Vite** — cjs client at `generated/prisma` in an ESM server build; `@/generated/browser` imported by client components could drag `pg` browser-side | Prisma strictly behind server routes; ready to flip generator `moduleFormat` to esm; inspect the client bundle after first build |
| **better-auth session semantics** (`getSession` shape; `useSession` `isPending` vs `status`)                                                                                   | Normalize once in `context.ts`; integration suite is the tripwire; manually test loading→authed on slow network                  |
| **react-pdf worker** — hardcoded `/pdf.worker.min.mjs` from `public/`                                                                                                          | Prefer `?url` import so Vite owns the asset; PDF snapshot tests + manual preview                                                 |
| **`"type": "module"` blast radius** — `src/env/*.js`, seed/scripts/hooks                                                                                                       | Convert env files to ESM/`.cjs`; smoke-run every package.json script                                                             |
| TanStack Start and better-auth release fast                                                                                                                                    | Pin exact versions at branch start; renovate handles drift after                                                                 |
| Long-lived Phase 2 branch drift                                                                                                                                                | Feature-freeze main during Phase 2 (or rebase weekly); Phases 0–1 landing first keep the branch purely mechanical                |

## Verification

- **Integration suite (in CI from Phase 0.1)** must pass **unchanged** through Phases 1 and 2 — needing to edit an integration test is a red flag.
- **Unit suite** incl. jsPDF golden masters = business-logic + PDF byte-stability invariant.
- **Full e2e** per phase: Phase 1 proves the new auth cookie end-to-end; Phase 2 proves routing, URL filters, PDF REST 404/405, mobile.
- **Manual auth checklist** (Phase 1 cutover, repeated after Phase 2): existing-user Google sign-in (the "links intact" proof), magic link over real SMTP, sign-out, session survives server restart, cross-tenant isolation spot-check.

## STOP conditions

- Phase 1 pre-flight finds `User` rows with NULL email or duplicate `(provider, providerAccountId)` pairs — stop, report, resolve data before migrating.
- The migration rehearsal on the prod dump fails or better-auth cannot see existing Google accounts — do not proceed to prod.
- During Phase 2, an integration test needs editing to pass — stop and understand why before continuing (the context/session normalization has drifted).
- better-auth or TanStack Start APIs have moved materially from what this plan describes (check versions against `Planned at` date) — re-verify the affected step against current docs before executing it.

## Maintenance notes

- Phase 1's `toNodeHandler` glue and the `fromNodeHeaders` context call are deliberate throwaway — Phase 2 deletes them.
- After Phase 2 lands, delete `eslint-config-next` remnants and audit `package.json` for orphaned Next deps.
- The README "Findings considered and rejected" App-Router/Auth.js-v5 entries should gain a pointer to this plan when it completes (plan 023's docs-reconciliation pass can pick this up).
