# Plan 036: Migrate framework to TanStack Start

> **Executor instructions**: Do not start the framework branch until
> plan [035](035-better-auth-migration.md)'s soak gate has passed (the
> operator has verified better-auth working in prod). Pre-work items are
> individual PRs on `main` and may land during 035's soak. The framework
> switch itself is a single branch; while it is open, `main` is
> feature-frozen — the operator hotfixes only if absolutely required,
> and any hotfix is rebased into the branch immediately as a one-off
> event. If a STOP condition occurs, stop and report. Update the status
> row in `docs/plans/README.md` as milestones complete.
>
> **Drift check (run first)**: this plan was scoped at commit `53fed77`
> (2026-07-12), before 035 executed. At branch start, re-verify the
> "Current state" claims below against live code — 035 will have
> rewritten `src/server/auth.ts`, the login page, and the e2e setup.
> `git diff --stat <035-completion-commit>..HEAD -- src/lib/trpc.ts src/pages/ e2e/ Dockerfile package.json`
> should then be empty of surprises.

## Status

- **Priority**: P2 (user-driven product decision)
- **Effort**: L (8–14 dev-days incl. pre-work and optional phase)
- **Risk**: MEDIUM-HIGH — broad churn, but reversible; touches zero auth data (that was 035's job)
- **Depends on**: 035 (soak gate passed)
- **Category**: architecture / migration
- **Planned at**: commit `53fed77`, 2026-07-12; split from the original combined plan 2026-07-13

**Split note**: this plan and [035](035-better-auth-migration.md) were originally one plan. 035 ships better-auth inside Next.js and soaks; this plan swaps the framework under an already-proven auth setup.

**Decisions locked by the operator** (do not re-litigate): **tRPC stays** (no server-function rewrite; hook modernization is the optional phase); deployment target **self-hosted Docker/Node**; feature-freeze over weekly rebase while the branch is open.

**Supersedes** the README's rejected _App Router migration_ finding (2026-07-07 audit): that rejected a maintenance-driven move within the Next ecosystem; this plan exits the Next ecosystem entirely.

## Why this matters

Current state (verified 2026-07-12, at `53fed77`):

- 24 pages, all client-rendered except two `getServerSideProps` redirect gates (`src/pages/index.tsx`, `src/pages/login.tsx`). No middleware, no edge runtime, no `next/image`.
- ~57 Next-specific imports across 36 files (link/router/head/dynamic/font).
- The integration suite is framework-agnostic and runs in CI — the invariant for the whole migration.
- TanStack Start is stable (v1.0 Mar 2026; `@tanstack/react-start` Vite plugin); better-auth (live in prod after 035) has first-class TanStack Start integration.

## Pre-work (each item its own PR on main; may run during 035's soak) · 1 d

1. **Kill both `getServerSideProps` pages** (0.5 d). Convert `/` and `/login` to the client-side gate the other 22 pages use. (The login page's provider wiring is 035's job; this item is only the redirect gates.) Result: zero SSR → the framework switch is a pure-CSR transplant. Accepted temporary regression: logged-in users hitting `/` see a flash before redirect; the `beforeLoad` guard below restores it.
2. **Decouple `src/lib/trpc.ts` + drop Vercel remnants** (0.5 d). Delete the dead SSR branch (`ssr` defaults to false) and `VERCEL_URL` handling; remove `@vercel/speed-insights` from `_app.tsx` and package.json; drop `VERCEL*` from `src/env/schema.js`; move `baseListQueryInput` out of the client wiring file.
3. **Deliberately NOT doing**: pre-migrating tRPC hooks (~100 call sites of churn, de-risks nothing — the optional phase has a codemod); component/render tests (they'd test the tree this plan rewrites).

## Framework switch (single branch; pin exact versions at branch start) · 7–11 d

- **Scaffold/build** (1–1.5 d): swap `next` for `@tanstack/react-start` + Vite (`tanstackStart()` before `viteReact()`; `vite-tsconfig-paths` for `@/*`); `"type": "module"`; keep `src/env/server.js` fail-fast validation imported from `vite.config.ts`; Tailwind 4 via `@tailwindcss/vite`. **Router-wide `ssr: false`** to start — app is 100% CSR after pre-work item 1, so hydration is a non-issue.
- **Root + routing** (1.5–2.5 d): `_app.tsx` → `src/routes/__root.tsx` (providers, `head()`, `notFoundComponent`); fonts → fontsource imports, CSS vars set statically in `globals.css`. `[id]` → `$id` (deletes eight `Array.isArray(router.query.id)` dances). `dashboard/route.tsx` layout route carries **one canonical auth guard** in `beforeLoad`. `invoices/index` + `activity-form.tsx` search params → typed `validateSearch`; the e2e URL-filter-persistence spec is the acceptance test.
- **API routes**: `api/auth/$.ts` (`auth.handler(request)` + `tanstackStartCookies` plugin, delete 035's `toNodeHandler` glue); `api/trpc/$.ts` (`fetchRequestHandler`, context from `Request.headers`, session shape unchanged); `api/invoices/generate-pdf/$id.ts` (web `Response`, same headers; keep 404 branch — e2e asserts 404 and 405).
- **Mechanical sweep** (~36 files, 1–1.5 d): `next/link`→`Link`, `useRouter`→`useNavigate`/`useParams`, `next/head`→`head()`, `next/dynamic`→`React.lazy`, `next/navigation`→router hooks. `src/lib/trpc.ts`: `createTRPCNext` → classic `createTRPCReact` provider with **identical `httpBatchLink` + superjson** — all ~63 hook call sites zero-change (the optional phase owns the modernization).
- **e2e/CI/Docker** (1.5–2.5 d): `webServer` → `node .output/server/index.mjs` (env value from 035's e2e seam); Dockerfile copies `.output/` + `public/` + `prisma/`; expect a handful of e2e timing fixes.
- **Buffer** (1–2 d) for risk-register issues — every framework migration hits 2–3.

## Optional phase (post-soak) · 1.5–3 d

`npx @trpc/upgrade` codemod to `@trpc/tanstack-react-query` (~100 call sites; both clients can coexist); selectively enable SSR on `/` and `/login`.

## Risk register

| Risk                                                                                                                                                                           | Mitigation                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **superjson + 18 Prisma Decimal fields** — no registered superjson type; wire shape must not move                                                                              | Pin superjson 2.2.6; identical link config through the switch; 035's pre-work tests assert the serialized shape                         |
| **Prisma client bundling in Vite** — cjs client at `generated/prisma` in an ESM server build; `@/generated/browser` imported by client components could drag `pg` browser-side | Prisma strictly behind server routes; ready to flip generator `moduleFormat` to esm; inspect the client bundle after first build        |
| **react-pdf worker** — hardcoded `/pdf.worker.min.mjs` from `public/`                                                                                                          | Prefer `?url` import so Vite owns the asset; PDF snapshot tests + manual preview                                                        |
| **`"type": "module"` blast radius** — `src/env/*.js`, seed/scripts/hooks                                                                                                       | Convert env files to ESM/`.cjs`; smoke-run every package.json script                                                                    |
| TanStack Start releases fast                                                                                                                                                   | Pin exact versions at branch start; renovate handles drift after                                                                        |
| Long-lived branch drift                                                                                                                                                        | Feature-freeze main (hotfix only if absolutely required, rebased in immediately); 035 landing first keeps this branch purely mechanical |

## Verification

- **Integration suite (in CI)** must pass **unchanged** — needing to edit an integration test is a red flag (the context/session normalization has drifted).
- **Unit suite** incl. jsPDF golden masters = business-logic + PDF byte-stability invariant.
- **Full e2e**: routing, URL filters, PDF REST 404/405, mobile.
- **Manual auth checklist** (repeat 035's): Google sign-in, password sign-in + reset over real SMTP, sign-out, session survives server restart, cross-tenant isolation spot-check.

## STOP conditions

- An integration test needs editing to pass — stop and understand why before continuing (the context/session normalization has drifted).
- TanStack Start or better-auth APIs have moved materially from what this plan describes (check versions against `Planned at` date) — re-verify the affected step against current docs before executing it.

## Maintenance notes

- After this plan lands, delete `eslint-config-next` remnants and audit `package.json` for orphaned Next deps.
- The README "Findings considered and rejected" _App Router migration_ entry should gain a pointer to this plan when it completes (plan 023's docs-reconciliation pass can pick this up).
