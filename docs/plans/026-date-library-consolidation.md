# Plan 026: Consolidate on dayjs — central plugin module, drop date-fns

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/ package.json`
> Then re-run the two greps in "Current state" — the site lists there are the
> ground truth this plan operates on; regenerate them rather than trusting the
> counts below if anything changed.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW–MED (date formatting is user-visible; e2e suite is the net)
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

Two date libraries ship to the client (`dayjs` — the de-facto standard with ~176 usages across 29 files — and `date-fns`, kept alive by exactly four `format()` calls). Separately, dayjs plugin registration is copy-pasted as `dayjs.extend(require("dayjs/plugin/…"))` at **17 sites across 9 files**, with plugin sets drifting per file — a CommonJS `require` inside ESM/TS modules, and a runtime "plugin not loaded" bug waiting for the first consumer that forgets. One central dayjs module fixes the drift; four mechanical swaps remove date-fns.

## Current state

- `require`-style plugin registration (17 sites), files:
  `src/server/api/routers/activity-router.ts`, `src/components/invoices/invoice-page.tsx`, `src/components/activities/activity-form.tsx`, `src/components/activities/activity-page.tsx`, `src/components/invoices/invoice-form.tsx`, `src/components/invoices/invoice-activity-creation-form.tsx`, `src/components/forms/date-picker.tsx`, `src/components/forms/time-input.tsx`, `src/components/invoices/invoice-list.tsx`.
  Regenerate with: `grep -rn "dayjs.extend(require" src --include='*.ts*'`
  Example (`src/components/forms/date-picker.tsx:5-6`):

```ts
import dayjs from "dayjs";
dayjs.extend(require("dayjs/plugin/customParseFormat"));
```

- ESM-style plugin registration also exists (the convention to keep, but centralized) — e.g. `src/lib/date-utils.ts:3-9`:

```ts
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
```

Find all of these too: `grep -rln "dayjs/plugin" src --include='*.ts*'`

- `date-fns` importers (4 files, `format` only):
  `src/components/ui/date-picker.tsx:3`, `src/components/invoices/invoice-form.tsx:26`, `src/components/invoices/invoice-activity-creation-form.tsx:30`, `src/components/activities/activity-form.tsx:27`.
  Regenerate with: `grep -rn "from \"date-fns\"" src`
- Two date-picker components exist and both stay (different roles): `src/components/ui/date-picker.tsx` (calendar popover, react-day-picker based) and `src/components/forms/date-picker.tsx` (native `<input type="date">` for react-hook-form). Only their _library_ usage is consolidated.
- `react-day-picker` depends on date-fns internally via its own dependency — removing `date-fns` from **our** `package.json` is safe as long as no `src/` file imports it.
- Repo path alias: `@/` → `src/` (see any existing import).

## Commands you will need

| Purpose                            | Command           | Expected on success |
| ---------------------------------- | ----------------- | ------------------- |
| Typecheck                          | `pnpm type-check` | exit 0              |
| Unit tests                         | `pnpm test:unit`  | all pass            |
| E2E (formatting regression net)    | `pnpm test:e2e`   | all pass            |
| Lint                               | `pnpm lint`       | exit 0              |
| Build (catches ESM/require issues) | `pnpm build`      | exit 0              |

## Scope

**In scope**:

- `src/lib/dayjs.ts` (create)
- Every file listed by the two greps above (mechanical import swaps only)
- `package.json` (remove `date-fns`)

**Out of scope**:

- Behavioral changes to any date logic (`getDuration`, rate boundaries, `stripTimezone`) — plans 019/033 own those.
- Replacing either date-picker component.
- `node_modules`/lockfile beyond what `pnpm install` regenerates after the manifest edit.

## Git workflow

- Branch: `advisor/026-date-consolidation`
- Commits (two logical units): `refactor: central dayjs module with plugins registered once` then `refactor: replace date-fns format calls with dayjs`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `src/lib/dayjs.ts`

Union of every plugin currently registered anywhere (regenerate the list: `grep -rhn "dayjs/plugin/[a-zA-Z]*" src -o | sort -u`). Expected set from recon: `utc`, `timezone`, `customParseFormat`, `localizedFormat` — trust the grep over this list. Shape:

```ts
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);
dayjs.extend(timezone);
dayjs.extend(utc);

export default dayjs;
```

**Verify**: `pnpm type-check` → exit 0.

### Step 2: Migrate every dayjs importer to the central module

In each file found by `grep -rln "dayjs/plugin\|dayjs.extend" src` **and** every plain `import dayjs from "dayjs"` (`grep -rln 'from "dayjs"' src`): replace with `import dayjs from "@/lib/dayjs";` and delete the local `extend` lines. `src/lib/dayjs.ts` itself is the only file left importing from `"dayjs"` directly. (Type-only imports like `import type { Dayjs } from "dayjs"` may remain.)

**Verify**: `grep -rn "dayjs.extend" src --include='*.ts*' | grep -v "src/lib/dayjs.ts"` → no matches; `pnpm test:unit` → all pass.

### Step 3: Replace the four date-fns `format` calls

For each of the 4 files: note the exact `format(date, "<tokens>")` tokens, replace with `dayjs(date).format("<equivalent>")`. Token mapping for the likely cases: date-fns `PPP` → dayjs `LL` (needs `localizedFormat`, registered in Step 1); `dd/MM/yyyy` → `DD/MM/YYYY`; `yyyy-MM-dd` → `YYYY-MM-DD`; `MMM d, yyyy` → `MMM D, YYYY`. If a token has no listed equivalent, consult dayjs format docs rather than guessing — and eyeball the rendered output in the dev server for one of the four sites.

**Verify**: `pnpm type-check` → exit 0; `grep -rn "date-fns" src` → no matches.

### Step 4: Remove the dependency and run everything

Remove `"date-fns"` from `package.json` dependencies; `pnpm install`.

**Verify**: `pnpm build` → exit 0 (proves react-day-picker still resolves its own date-fns); `pnpm test:unit`, `pnpm lint` → pass; `pnpm test:e2e` → all pass (date rendering flows exercised by `e2e/activities.test.ts`, `e2e/invoices.test.ts`).

## Test plan

- No new tests — this is a refactor guarded by the existing unit + e2e suites and the build.
- The high-risk spots are format-token translation (Step 3) and a module that used a plugin implicitly registered by _another_ module's import order (Step 2 removes that class of bug going forward; the full test suite catches any current dependence).

## Done criteria

- [ ] `grep -rn "date-fns" src package.json` → no matches (lockfile will still contain it via react-day-picker — that's fine)
- [ ] `grep -rn "dayjs.extend" src | grep -v lib/dayjs` → no matches
- [ ] `grep -rn "extend(require" src` → no matches
- [ ] `pnpm build`, `pnpm type-check`, `pnpm test:unit`, `pnpm test:e2e`, `pnpm lint` all exit 0
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

- A date-fns call site turns out to use more than `format` (regenerate the grep; if e.g. `parse`/`differenceIn*` appear, the effort estimate is wrong — report before proceeding).
- e2e shows a visible date-format change you cannot map to an exact dayjs token.
- `pnpm build` fails after removing date-fns (would mean something imports it transitively through our code — find the importer, don't re-add the dep blindly).

## Maintenance notes

- Convention going forward (worth a line in `CLAUDE.md` in a future docs pass): **always** `import dayjs from "@/lib/dayjs"` — never from `"dayjs"` directly. An ESLint `no-restricted-imports` rule for `"dayjs"` (allowing `src/lib/dayjs.ts`) would enforce it; deferred as a nice-to-have.
- Plan 033 (rate engine) adds holiday/timezone-sensitive logic — it should import from this module.
