# Plan 031: Write a Getting Started README

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- README.md package.json .env.template`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

`README.md` is three lines. Setting up a fresh machine requires reverse-engineering: Node pinned `>=24 <25`, pnpm 11 via corepack, Docker for Postgres, `.env` from `.env.template`, prisma push/seed, and a two-part test story (unit vs integration vs e2e). Everything else in this repo assumes agents and humans onboard from docs (`CLAUDE.md`, `CONTEXT.md`, `docs/plans`) — the front door should match.

## Current state

- `README.md`:

```markdown
# Melvin

An invoice manager for NDIS carer work.
```

- Facts to document (verified from `package.json` and configs at `4b83de4`):
  - Engines: `node >=24 <25`; `packageManager: pnpm@11.10.0` (corepack).
  - `pnpm dev` = `db:up` (docker compose Postgres on port 5433) + `next dev`.
  - `.env.template` keys (names only — never document values): `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_ID`, `GOOGLE_SECRET`, `EMAIL_SERVER`, `EMAIL_FROM`, `SEED_EMAIL`.
  - DB setup: `pnpm prisma:migrate` (dev) or `pnpm prisma:push`, seed via `pnpm prisma:seed` (check `prisma.config.ts` for how seed is wired and whether `SEED_EMAIL` is required for it — document what you find).
  - Tests: `pnpm test:unit` (vitest, no DB), `pnpm test:integration` (needs Docker db + `.env`; creates a `melvin_test` database via `src/server/api/test/global-setup.ts`), `pnpm test:e2e` (Playwright).
  - Checks: `pnpm ci` = lint + type-check + format:check.
  - Doc map: `CONTEXT.md` (domain glossary), `CLAUDE.md` (agent instructions), `docs/adr/` (decisions), `docs/trd/` (roadmap specs), `docs/plans/` (implementation plans).

## Commands you will need

| Purpose                                            | Command             | Expected on success              |
| -------------------------------------------------- | ------------------- | -------------------------------- |
| Format                                             | `pnpm format:check` | exit 0                           |
| Full fresh-setup rehearsal (the real verification) | see Step 2          | dev server serves localhost:3000 |

## Scope

**In scope**: `README.md` only.

**Out of scope**: `CLAUDE.md`, `CONTEXT.md`, `.env.template` (if you find a needed-but-missing key, report it), deployment docs (Dockerfile exists but the deploy target is the operator's knowledge — leave a placeholder section or omit).

## Git workflow

- Branch: `advisor/031-readme`
- Commit: `docs: add getting started guide to README`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the README

Sections: **What is Melvin** (keep the existing line, add 2–3 sentences from `CONTEXT.md`'s vocabulary — solo NDIS support worker, activities → invoices → versioned PDFs); **Prerequisites** (Node 24 via your version manager, corepack-enabled pnpm 11, Docker); **Setup** (clone → `cp .env.template .env` and fill keys, with one line on what each key is for → `pnpm install` → `pnpm db:up` → `pnpm prisma:migrate` → `pnpm prisma:seed` if applicable → `pnpm dev`); **Testing** (the three suites + `pnpm ci`, noting which need Docker); **Project docs** (the doc map above, one line each). Keep it under ~80 lines; link rather than duplicate.

### Step 2: Rehearse the instructions

Follow your own README top-to-bottom as literally as possible (existing `.env` may be reused rather than re-created — note in your report which steps you could not rehearse for real, e.g. OAuth key creation). `pnpm db:up && pnpm dev:next` → visit http://localhost:3000 → login page renders.

**Verify**: dev server responds 200 on `/`; every command in the README exists in `package.json` scripts (`grep` each).

### Step 3: Format

**Verify**: `pnpm format:check` → exit 0.

## Test plan

The rehearsal in Step 2 is the test. Machine check: every fenced command in the README appears verbatim in `package.json` scripts or is a standard tool invocation (`cp`, `docker`, `corepack`).

## Done criteria

- [ ] README contains Prerequisites / Setup / Testing / Project docs sections
- [ ] All `.env` keys listed by name with a one-line purpose; **no values**
- [ ] Every referenced script exists in `package.json`
- [ ] `pnpm format:check` exits 0
- [ ] Only `README.md` modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

- The rehearsal fails on a step (e.g. seed requires an undocumented precondition) — document the failure in your report; fix the README to match reality, never paper over it.
- You'd need to add or rename an `.env.template` key to make setup work — that's a code change; report instead.

## Maintenance notes

- When plan 034 adds SMTP-based sending or plan 032 adds PWA setup steps, extend the README's env/setup sections in the same PR.
