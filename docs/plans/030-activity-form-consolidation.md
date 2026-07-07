# Plan 030: Bring multi-activity-form onto react-hook-form + Zod and deduplicate activity form logic

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/components/activities/ src/components/invoices/invoice-activity-creation-form.tsx src/components/invoices/invoice-form.tsx src/schema/activity-schema.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: L (multi-day; stage it)
- **Risk**: MED — this is the primary data-entry path; every stage must keep e2e green
- **Depends on**: 029 (pure-logic tests), and ideally 019 (schema time-order refine) so the schema being adopted is final
- **Category**: tech-debt
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

Eight forms in this repo follow one convention — `react-hook-form` + `zodResolver` against a `src/schema/*` schema. The largest and most-used form, the quick-entry `multi-activity-form.tsx` (644 lines), is the exception: hand-rolled `useState` form state, a bespoke `errors` object, and validation (`validateTimeRange`, ad-hoc checks) that is **disconnected from `activitySchema`** — so schema changes (like plan 019's midnight refine) silently don't reach the biggest entry surface until server rejection. Activity-entry concerns (group participants, transport items, time ranges, support-item selection) are additionally forked across four components. This plan converges the outlier onto the convention and extracts the shared pieces, so the next schema change lands in one place.

## Current state

- The outlier: `src/components/activities/multi-activity-form.tsx` (644 lines) — `grep -n "useForm\|zodResolver" ` on it returns nothing; state via multiple `useState`, per-row errors derived through `validateTimeRange(row.timeRange)` at line ~171; contains a stubbed support-item override section (~lines 569-578) and a hand-rolled transport-items editor (~lines 555-590).
- The convention (exemplar to match): `src/components/activities/activity-form.tsx` — `useForm` + `zodResolver(activitySchema)`-style setup, shared field components from `src/components/forms/` (`date-picker.tsx`, `time-input.tsx`, `time-range-input.tsx`).
- The four components with forked activity-entry logic:
  1. `src/components/activities/activity-form.tsx` (single activity, RHF)
  2. `src/components/activities/multi-activity-form.tsx` (quick entry, manual state)
  3. `src/components/invoices/invoice-activity-creation-form.tsx` (RHF)
  4. `src/components/invoices/invoice-form.tsx` (RHF, embeds activity creation rows)
- Shared pure logic already extracted (keep using): `src/lib/group-participants.ts` (participant list transforms), `validateTimeRange` (`src/components/forms/time-range-input.tsx:123`), `stripTimezone` (`src/lib/date-utils.ts:64`).
- Schema: `src/schema/activity-schema.ts` — `activitySchema` (times as `"HH:mm"` strings, `groupSize` 2–10, `transportItems` array). RHF field-array shape for multiple rows: `useFieldArray` over `{ activities: ActivitySchema[] }`.
- Server entry point used by the quick form: find it via `grep -n "bulkAdd\|useMutation" src/components/activities/multi-activity-form.tsx` — the payload contract must not change in this plan.
- E2E net: `e2e/activities.test.ts` exercises quick entry; `e2e/invoices.test.ts` exercises invoice-embedded creation. These are your gates.

## Commands you will need

| Purpose      | Command                                                          | Expected on success |
| ------------ | ---------------------------------------------------------------- | ------------------- |
| Typecheck    | `pnpm type-check`                                                | exit 0              |
| Unit tests   | `pnpm test:unit`                                                 | all pass            |
| E2E          | `pnpm test:e2e`                                                  | all pass            |
| Targeted e2e | `pnpm exec playwright test e2e/activities.test.ts --project=e2e` | all pass            |
| Lint         | `pnpm lint`                                                      | exit 0              |

## Suggested executor toolkit

- Add `@testing-library/react`, `@testing-library/user-event` as devDependencies in Stage C (jsdom already configured in `vitest.config.mts`).

## Scope

**In scope**:

- `src/components/activities/multi-activity-form.tsx`
- New shared components under `src/components/forms/` (e.g. `transport-items-editor.tsx`, `group-participants-editor.tsx`, `support-item-select.tsx`) extracted from the four forms
- `src/components/activities/activity-form.tsx`, `src/components/invoices/invoice-activity-creation-form.tsx`, `src/components/invoices/invoice-form.tsx` — **only** to swap in the extracted shared components
- New component tests co-located with the new shared components

**Out of scope**:

- Any server/router change; the mutation payloads are fixed contracts.
- `src/schema/activity-schema.ts` — adopt it, don't modify it.
- UX/visual redesign — the rendered UI should be pixel-equivalent-ish; this is a state-management refactor.
- The support-item override **stub** (lines ~569-578): leave it a stub. Completing it is TRD-001 D4 (plan 032).

## Git workflow

- Branch: `advisor/030-activity-form-consolidation`
- One commit per stage: `refactor: extract shared transport/group/support-item field components`, `refactor: migrate multi-activity-form onto react-hook-form field arrays`, `test: component tests for shared activity form fields`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Stage A: Extract shared field components (no behavior change)

1. Read all four forms and inventory the duplicated blocks: transport-items editor (type select + $ amount + note rows), group-participants editor (client selects driven by `group-participants.ts`), support-item select (incl. `isGroupSupportItem` handling — grep it).
2. Extract each into `src/components/forms/`, prop-driven so both RHF (`Controller`/register) and the still-manual multi-activity-form can host them during the transition. Start consumption in the three RHF forms only.

**Verify after each extraction**: `pnpm type-check` → 0; `pnpm test:e2e` → green.

### Stage B: Migrate multi-activity-form to RHF field arrays

1. Define the form model: `z.object({ date: ..., activities: z.array(rowSchema) })` where `rowSchema` is derived from `activitySchema` (`.pick`/`.extend` — derive, don't fork; the point is schema changes propagate).
2. Replace the `useState` cluster with `useForm` + `useFieldArray`; per-row errors come from the resolver (`formState.errors.activities[i]`), replacing the hand-rolled `errors` object. `validateTimeRange` remains the fast-path UX validator if the current UX shows errors on blur — wire it through the schema (`superRefine`) or keep it as a field-level validate; either way the _schema_ must also hold the rule so server and form agree.
3. Swap in the Stage A shared components.
4. Keep the submit payload byte-identical (same mutation, same shape) — diff a captured payload before/after (log it in dev or assert in a component test).

**Verify**: `pnpm exec playwright test e2e/activities.test.ts --project=e2e` → green after each sub-step; full `pnpm test:e2e` at stage end; plan 029's unit tests untouched and green.

### Stage C: Component tests for the new seams

Add RTL tests for the extracted components: transport-items editor add/remove/update wiring; group-participants editor respecting the cap (drives `appendParticipant`); one multi-activity-form test: fill two rows, one with end-before-start → row-level error message shown, submit blocked.

**Verify**: `pnpm test:unit` → all pass including new component tests.

## Test plan

Covered in Stage C, plus the plan-029 suite as the regression baseline. The e2e activity flows are the acceptance gate at every stage boundary.

## Done criteria

- [ ] `grep -n "useForm" src/components/activities/multi-activity-form.tsx` → match (RHF adopted); the manual `errors` object and `useState` form-state cluster are gone
- [ ] Row validation derives from `activitySchema` (schema import present; no forked time-order rule)
- [ ] The duplicated transport/group/support-item blocks exist once each under `src/components/forms/` and all four forms consume them
- [ ] `pnpm type-check`, `pnpm test:unit`, `pnpm test:e2e`, `pnpm lint` all exit 0
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

- The submit payload cannot be kept identical under `useFieldArray` (e.g. the mutation depends on state the RHF model can't express) — report the exact mismatch.
- e2e reveals UX behavior encoded only in the manual state machine (e.g. row auto-add on last-row edit) that doesn't map to RHF — report with the specific interaction before hacking around it.
- Stage A's extraction forces prop surfaces so wide they're worse than duplication (>~10 props) — stop and report; the decomposition boundary may be wrong.
- Playwright suite is red on `main` before you start (pre-existing) — report; you have no gate.

## Maintenance notes

- After this, plan 032 (capture-first) builds drafts/outbox on top of the RHF model — its localStorage draft serialization should serialize `form.getValues()`, one reason this plan precedes it.
- Reviewers: scrutinize Stage B step 4 (payload parity) hardest; everything else is reversible UI plumbing.
