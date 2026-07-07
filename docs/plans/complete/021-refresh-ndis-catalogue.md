# Plan 021: Refresh the bundled NDIS support catalogue from 2022-23 to 2026-27

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/lib/support-item-utils.ts src/lib/ndis-support-catalogue-22-23.json src/lib/testing/invoice-fixtures.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Status**: DONE
- **Priority**: P1
- **Effort**: S
- **Risk**: MED (test-fixture and PDF-snapshot churn)
- **Depends on**: none
- **Category**: bug (stale reference data with billing impact)
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

The support-item autocomplete and the travel/ABT support-code lookups are driven by a bundled JSON of the **2022-23** NDIS support catalogue (`startDate: "20220701"` throughout). Today is July 2026 — the catalogue has rolled over four times. Any worker trusting a suggested rate can over-bill (invalid claim) or under-bill (lost revenue) against the real price cap. The current 2026-27 catalogue already sits in the repo, unintegrated, at `docs/ndis/Clean - NDIS Support Catalogue - 2026-27 v1.0.xlsx`.

**This is the interim fix.** The proper fix — effective-dated catalogue-as-data per `docs/trd/trd-002-support-item-catalogue-and-rate-engine.md` — is plan 033, which deletes this JSON entirely. This plan makes the data non-wrong _now_ with minimal surface change.

## Current state

- `src/lib/ndis-support-catalogue-22-23.json` — 617 KB array of catalogue entries. Fields actually consumed by code: `supportItemNumber`, `supportItemName`, `registrationGroupNumber`, `registrationGroupName`, `supportCategoryName`. Other fields (`startDate`, rates, etc.) are present but check for consumers before dropping any (grep each field name).
- `src/lib/support-item-utils.ts:1` — the only production importer:

```ts
import supportItems from "./ndis-support-catalogue-22-23.json";
```

Its functions: `getSupportItemDefs(registrationGroupName?)` (autocomplete source), `getRegistrationGroups()`, `getSupportCategories()`, and the two code lookups that feed **every invoice's travel lines**:

```ts
export const getNonLabourTravelCode = (supportItemCode: string) => {
	const groupNumber = getGroupFromCode(supportItemCode);
	const supportItem = supportItems.find(
		(activity) =>
			activity.registrationGroupNumber === groupNumber &&
			activity.supportItemName === "Provider travel - non-labour costs"
	);
	return supportItem?.supportItemNumber;
};
```

(and the same shape matching `"Activity Based Transport"`).

- `src/lib/testing/invoice-fixtures.ts:102` — comment says fixture items come from this catalogue; PDF snapshot tests (`src/lib/pdf-generation.render.test.ts`, `__pdf_snapshots__/`, `__pdf_text__/`) render from those fixtures.
- Source of truth to import: `docs/ndis/Clean - NDIS Support Catalogue - 2026-27 v1.0.xlsx`.
- The user bills only items in registration groups 0125 and 0136 (recorded answer in TRD-002 open questions), so those families plus their travel/ABT rows are the critical content.

## Commands you will need

| Purpose                                        | Command                          | Expected on success   |
| ---------------------------------------------- | -------------------------------- | --------------------- |
| Typecheck                                      | `pnpm type-check`                | exit 0                |
| Unit tests                                     | `pnpm test:unit`                 | all pass              |
| PDF snapshots (only if intentionally updating) | `pnpm test:pdf-snapshots:update` | regenerates snapshots |
| Lint                                           | `pnpm lint`                      | exit 0                |

## Scope

**In scope**:

- `scripts/generate-ndis-catalogue.ts` (create — the XLSX→JSON converter, kept for future refreshes)
- `src/lib/ndis-support-catalogue.json` (create — the new data; year-free name so refreshes don't rename)
- `src/lib/ndis-support-catalogue-22-23.json` (delete)
- `src/lib/support-item-utils.ts` (re-point import)
- `src/lib/testing/invoice-fixtures.ts` (comment/codes only if needed)
- `package.json` (add `xlsx` as devDependency + a `catalogue:generate` script)

**Out of scope**:

- Rate validation, effective dating, price-limit checks — that's plan 033 (TRD-002).
- Any schema or router change.
- `docs/ndis/*` source files — read-only inputs.

## Git workflow

- Branch: `advisor/021-refresh-ndis-catalogue`
- Commit: `fix: refresh bundled NDIS support catalogue to 2026-27`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the converter script

Create `scripts/generate-ndis-catalogue.ts` (run via `pnpm exec tsx scripts/generate-ndis-catalogue.ts`; `tsx` is already a devDependency). It should:

1. Read `docs/ndis/Clean - NDIS Support Catalogue - 2026-27 v1.0.xlsx` with the `xlsx` package (add as devDependency).
2. First, print the sheet names and header row so you can map columns. Determine the columns corresponding to the JSON fields consumed by code (`supportItemNumber`, `supportItemName`, `registrationGroupNumber`, `registrationGroupName`, `supportCategoryName`) plus whatever other fields the old JSON has that are actually consumed (grep first — see Current state).
3. Emit `src/lib/ndis-support-catalogue.json` with the **same field names and value types** as the old file (compare one old entry with one new entry side by side).

Add `"catalogue:generate": "tsx scripts/generate-ndis-catalogue.ts"` to `package.json` scripts.

**Verify**: `pnpm exec tsx scripts/generate-ndis-catalogue.ts` → writes the JSON; `node -e "const c=require('./src/lib/ndis-support-catalogue.json'); console.log(c.length, Object.keys(c[0]))"` → non-trivial length and the expected keys.

### Step 2: Sanity-check the critical lookups against the new data

Before touching imports, confirm in the new JSON:

- Registration groups 0125 and 0136 exist with entries.
- Each of those groups contains an item whose `supportItemName` exactly matches `"Provider travel - non-labour costs"` and one matching `"Activity Based Transport"` (the string-match keys in `getNonLabourTravelCode` / `getActivityBasedTransportCode`). If the 2026-27 catalogue renamed these (case, punctuation, or wording), adjust the match strings in `support-item-utils.ts` — never the data.

**Verify**: a small ad-hoc node script printing both lookups' results for a known 0125 code (take one from `invoice-fixtures.ts`) → both return a support item number.

### Step 3: Swap the import, delete the old file

Change `support-item-utils.ts:1` to import `./ndis-support-catalogue.json`; delete `ndis-support-catalogue-22-23.json`; update the stale comment at `invoice-fixtures.ts:102`.

**Verify**: `pnpm type-check` → exit 0. `grep -rn "22-23" src/` → no matches.

### Step 4: Run the test suite and reconcile snapshots

`pnpm test:unit`. Expected outcomes:

- If fixtures pin their own codes/rates (they appear to — they're literals in `invoice-fixtures.ts`), everything passes untouched.
- If a test derives travel/ABT **codes** from the catalogue and the 2026-27 code differs, the PDF text/snapshot tests will diff. Inspect each diff: acceptable diffs are _exactly_ travel/ABT support-item codes; then run `pnpm test:pdf-snapshots:update` and re-run.

**Verify**: `pnpm test:unit` → all pass.

## Test plan

- No new tests required; the existing PDF text/render tests are the regression net.
- Add one small unit test in `src/lib/support-item-utils.test.ts` (file exists) pinning that `getNonLabourTravelCode` and `getActivityBasedTransportCode` return a defined code for a group-0125 item code — so a future catalogue refresh that breaks the name-match fails loudly instead of returning `undefined` (which today silently drops travel lines).

## Done criteria

- [x] `pnpm type-check` exits 0
- [x] `pnpm test:unit` exits 0
- [x] `grep -rn "ndis-support-catalogue-22-23" src/ scripts/` returns no matches; old JSON deleted
- [x] New unit test for the travel/ABT lookups exists and passes
- [x] `scripts/generate-ndis-catalogue.ts` + `catalogue:generate` script committed (rerunnable refresh path)
- [x] `pnpm lint` exits 0
- [x] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- The XLSX's structure doesn't contain the fields needed to reproduce the old JSON shape (e.g. registration group numbers absent) — report the actual columns found.
- PDF snapshot diffs touch anything other than travel/ABT codes (rates or totals changing means a fixture reads live catalogue data — that's a bigger coupling than this plan assumes).
- `getNonLabourTravelCode`/`getActivityBasedTransportCode` return `undefined` for the 0125/0136 families after the swap and no name-string adjustment fixes it.

## Maintenance notes

- **Superseded by plan 033** (TRD-002 catalogue-as-data): when `SupportItemDef` lands, this JSON and `support-item-utils.ts`'s lookups are deleted. Keep this plan's converter script — it becomes the seed generator's starting point.
- Annual refresh until then: drop the new XLSX in `docs/ndis/`, update the path in the script, run `pnpm catalogue:generate`, run the unit tests.
