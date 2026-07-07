# Plan 024: HTTP hardening — security headers, safe Content-Disposition, dev-DB binding

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- next.config.ts src/pages/api/invoices/generate-pdf/[id].ts docker-compose.yml src/lib/pdf-generation.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (headers chosen to avoid CSP-style breakage; full CSP deliberately deferred)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

The app renders NDIS participant names/numbers and the provider's bank details (BSB/account) in the browser, and serves PDFs of the same. Today there are zero hardening headers (no `X-Content-Type-Options`, no frame protection, no HSTS), a user-controlled string (`invoiceNo`) is interpolated raw into a `Content-Disposition` header, and the dev Postgres publishes port 5433 on **all host interfaces** guarded by the password `pass`. Each fix is small; together they close the defense-in-depth gaps around a PII surface.

## Current state

- `next.config.ts` (entire file):

```ts
import { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
!process.env.SKIP_ENV_VALIDATION && require("./src/env/server.js");

const nextConfig: NextConfig = {
	output: "standalone"
};

export default nextConfig;
```

- `src/pages/api/invoices/generate-pdf/[id].ts:36,45` — two sites interpolate `fileName` raw:

```ts
.setHeader("Content-Disposition", `inline; filename="${fileName}"`)
// and
"Content-Disposition": `inline; filename="${fileName}"`
```

`fileName` comes from `src/lib/pdf-generation.ts` as `` `${invoice.invoiceNo}.pdf` `` (line ~354) or `` `${content.header.displayInvoiceNo}.pdf` `` (line ~377). `invoiceNo` is user input validated only as `z.string().min(1)` (`src/schema/invoice-schema.ts:15`). Node rejects CR/LF in header values (so response splitting degrades to a 500), but embedded `"` corrupts the parameter and non-ASCII breaks the header.

- `docker-compose.yml` (entire file):

```yaml
services:
  postgres-db:
    container_name: melvin-db
    image: postgres:16
    ports:
      - "5433:5432"
    restart: unless-stopped
    environment:
      - POSTGRES_PASSWORD=pass
```

This compose file is dev-only (`pnpm db:up`); integration tests also use it.

## Commands you will need

| Purpose                     | Command                                                                                       | Expected on success |
| --------------------------- | --------------------------------------------------------------------------------------------- | ------------------- |
| Typecheck                   | `pnpm type-check`                                                                             | exit 0              |
| Unit tests                  | `pnpm test:unit`                                                                              | all pass            |
| Dev server smoke            | `pnpm db:up && pnpm dev:next` then `curl -sI http://localhost:3000 \| grep -i x-content-type` | header present      |
| E2E (header regression net) | `pnpm test:e2e`                                                                               | all pass            |
| Lint                        | `pnpm lint`                                                                                   | exit 0              |

## Scope

**In scope**:

- `next.config.ts`
- `src/pages/api/invoices/generate-pdf/[id].ts`
- `docker-compose.yml`

**Out of scope**:

- A full `Content-Security-Policy` — needs tuning against Next's inline scripts/styles; deferred deliberately (see Maintenance notes).
- `src/schema/invoice-schema.ts` — tightening `invoiceNo`'s allowed characters could reject _existing_ invoice numbers on edit; sanitize at the sink instead.
- NextAuth cookie flags (defaults are correct), CORS (none configured — same-origin only, correct).

## Git workflow

- Branch: `advisor/024-http-hardening`
- Commit: `fix: add security headers, sanitize pdf filename header, bind dev db to localhost`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Security headers in `next.config.ts`

Add:

```ts
const securityHeaders = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains"
	}
];

const nextConfig: NextConfig = {
	output: "standalone",
	async headers() {
		return [{ source: "/:path*", headers: securityHeaders }];
	}
};
```

**Verify**: `pnpm dev:next` (db not required for a header check) + `curl -sI http://localhost:3000/ | grep -iE "x-content-type-options|x-frame-options|strict-transport"` → all three present. Stop the dev server after.

### Step 2: Sanitize the PDF filename at the sink

In `generate-pdf/[id].ts`, before the two header writes, derive a safe name once:

```ts
const safeFileName = fileName.replace(/[^\w.-]/g, "_");
```

and emit `Content-Disposition` as `` `inline; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}` `` at both sites (RFC 5987: ASCII fallback + encoded full name so legitimate unicode invoice numbers keep their real name in modern browsers).

**Verify**: `pnpm type-check` → exit 0. `pnpm test:e2e` → `e2e/invoice-pdf.test.ts` passes (download filename behavior unchanged for plain invoice numbers).

### Step 3: Bind the dev DB to localhost and parameterize the password

In `docker-compose.yml`: change the port mapping to `"127.0.0.1:5433:5432"` and the password line to `- POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-pass}` (default preserved so `pnpm db:up` keeps working with existing `.env`/`DATABASE_URL` values; anyone who wants a stronger local password sets the env var).

**Verify**: `pnpm db:nuke` (recreates the container with new settings — this **wipes local dev data**; acceptable for the dev DB, but say so in your report) then `pnpm db:up && pnpm test:integration` → all pass.

## Test plan

- No new unit tests (config + sink sanitization). The e2e PDF test is the regression net for Step 2; integration suite for Step 3.
- Manual check in report: `curl -sI` output pasted for the three headers.

## Done criteria

- [ ] `curl -sI http://localhost:3000/` shows `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`
- [ ] Both `Content-Disposition` sites use the sanitized + RFC 5987 form (`grep -n "filename" src/pages/api/invoices/generate-pdf/[id].ts`)
- [ ] `docker-compose.yml` binds `127.0.0.1:5433` and reads the password from env with a default
- [ ] `pnpm type-check`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm lint` all exit 0
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

- `X-Frame-Options: DENY` breaks a real flow (e.g. the PDF preview component renders the API route in an iframe — check `src/components/invoices/` for iframe/react-pdf usage of the generate-pdf URL **before** Step 1; if it does, use `SAMEORIGIN`).
- e2e PDF download tests fail on the filename after Step 2 — the harness may assert an exact `Content-Disposition`; report rather than weakening the sanitization.
- The deployment target turns out to terminate TLS in a way that makes HSTS wrong (only if the operator says so).

## Maintenance notes

- **Deferred**: a report-only `Content-Security-Policy` is the natural next hardening step; it needs an inventory of inline styles/scripts (Tailwind inline styles are fine; Next dev-mode needs `unsafe-eval`, so the policy must be env-conditional). Raise as its own small plan when wanted.
- If the app is ever iframed intentionally (e.g. embedding the PDF viewer), revisit `X-Frame-Options`.
