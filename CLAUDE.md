# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Melvin is an invoice manager for NDIS (National Disability Insurance Scheme) carer work. It allows users to manage clients, track activities/services, create support items with different rate types, and generate PDF invoices.

## Commands

```bash
# Development
pnpm dev              # Start dev server with Turbopack (also starts Docker DB)
pnpm dev:next         # Start dev server only (assumes DB is running)

# Database
pnpm db:up            # Start PostgreSQL in Docker
pnpm db:down          # Stop Docker containers
pnpm db:nuke          # Reset DB (removes volumes and restarts)
pnpm prisma:migrate   # Create new migration
pnpm prisma:push      # Push schema changes without migration
pnpm prisma:seed      # Seed database

# Testing
pnpm test:unit        # Run Vitest unit tests
pnpm test:e2e         # Run Playwright e2e tests
pnpm test             # Run all tests

# Single test file
pnpm vitest run src/lib/date-utils.test.ts
pnpm playwright test e2e/clients.test.ts

# Code quality
pnpm lint             # ESLint
pnpm type-check       # TypeScript check
pnpm format:check     # Prettier check
pnpm format:write     # Prettier fix
```

## Architecture

### Tech Stack

- Next.js 16 (Pages Router) with Turbopack
- tRPC for type-safe API (routers in `src/server/api/routers/`)
- Prisma ORM with PostgreSQL
- NextAuth.js for authentication (Google OAuth + Email)
- Tailwind CSS 4 + shadcn/ui components
- React Hook Form + Zod for form validation

### Key Directories

- `src/pages/` - Next.js pages (dashboard routes under `/dashboard`)
- `src/server/api/routers/` - tRPC routers (activity, client, invoice, supportItem, user, pdf)
- `src/components/` - React components organized by feature
- `src/schema/` - Zod schemas for validation
- `src/lib/` - Utility functions (date, invoice, activity calculations)
- `prisma/` - Database schema and migrations
- `e2e/` - Playwright tests with global setup for auth

### Data Model

Core entities: User → Clients → Activities ← SupportItems → Invoices. Activities are services provided to clients, linked to support items which define rates (weekday/weekend/night). Invoices group activities for billing. SupportItemRates allows per-client rate overrides.

### tRPC Pattern

Client-side: `trpc` hook from `src/lib/trpc.ts` wraps React Query
Server-side: `authedProcedure` in `src/server/api/trpc.ts` enforces authentication, provides `ctx.prisma` and `ctx.session`

### E2E Tests

Playwright tests use `e2e/setup/global.setup.ts` to create a test user with a session cookie stored in `storage-state.json`. Tests run against a live dev server.
