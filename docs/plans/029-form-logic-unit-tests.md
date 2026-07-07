# Plan 029: Unit-test the pure client-side form logic (group participants, time ranges)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/lib/group-participants.ts src/components/forms/time-range-input.tsx src/lib/date-utils.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (additive tests only)
- **Depends on**: none — but must land **before** plan 030 (it's 030's safety net)
- **Category**: tests
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

The repo has zero `*.test.tsx` files: all client-side logic is covered only by happy-path Playwright e2e. Three pure, logic-dense pieces feed the biggest data-entry surface (the quick-entry form, 644 lines) and the group-billing rules: the participant-list transforms, the time-range validator, and `stripTimezone`. These are trivial to unit test today (no DOM needed — vitest is already configured with `environment: "jsdom"` and `include: ["./src/**/*.test.?(c|m)[jt]s?(x)"]`), and plan 030 (the multi-activity-form refactor) must not start without them.

## Current state

- `src/lib/group-participants.ts` (29 lines, entire logic):

```ts
export const setParticipantAt = (ids, index, clientId) => {
	/* replace at index */
};
export const appendParticipant = (ids) =>
	ids.length >= MAX_ADDITIONAL_GROUP_PARTICIPANTS ? ids : [...ids, ""];
export const removeParticipantAt = (ids, index) =>
	ids.filter((_, i) => i !== index);
```

`MAX_ADDITIONAL_GROUP_PARTICIPANTS` comes from `@/schema/invoice-schema` (group = 2–10 participants total, so additional = 9 — confirm the constant's value in the schema file).

- `src/components/forms/time-range-input.tsx:123` — `export function validateTimeRange(...)`: read the function before testing; it's consumed by `multi-activity-form.tsx:171` for per-row error derivation.
- `src/lib/date-utils.ts:64-68` — `stripTimezone(date)`: `Date.UTC(y, m, d, 0, 0, 0)` — used by the forms to normalize picker dates before sending to the server.
- Test conventions: co-located `*.test.ts` next to the source (see `src/lib/activity-utils.test.ts` for the fixture-and-expect style). Unit suite: `pnpm test:unit` (vitest, ~2s).

## Commands you will need

| Purpose    | Command                                                   | Expected on success |
| ---------- | --------------------------------------------------------- | ------------------- |
| Typecheck  | `pnpm type-check`                                         | exit 0              |
| Unit tests | `pnpm test:unit`                                          | all pass            |
| Targeted   | `pnpm exec vitest run src/lib/group-participants.test.ts` | all pass            |
| Lint       | `pnpm lint`                                               | exit 0              |

## Scope

**In scope** (create only):

- `src/lib/group-participants.test.ts`
- `src/components/forms/time-range-input.test.ts` (or `.tsx` if the validator's types require it)
- additions to `src/lib/date-utils.test.ts` for `stripTimezone`

**Out of scope**:

- React Testing Library / component rendering tests — deliberately deferred to plan 030, which restructures the components these would test.
- Changing any production code. If a test reveals a bug, write the test to _document_ the actual behavior with a clear name, and report it.

## Git workflow

- Branch: `advisor/029-form-logic-tests`
- Commit: `test: unit-test group participant transforms and time range validation`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: `group-participants.test.ts`

Cases: `setParticipantAt` replaces without mutating the input array (assert original unchanged — the functions promise "returns a new array"); `appendParticipant` appends `""` and is a no-op at the cap (build an array of length `MAX_ADDITIONAL_GROUP_PARTICIPANTS`); `removeParticipantAt` removes the right index, handles index 0 and last, out-of-range index is a no-op returning a copy.

**Verify**: targeted vitest run → all pass.

### Step 2: `validateTimeRange` tests

Read the implementation at `time-range-input.tsx:123` first and enumerate its branches. Minimum cases: valid range → no error; end before start → error; equal times → whichever the implementation decides (pin it); missing/partial input → pin behavior; malformed strings (e.g. `"25:00"`) → pin behavior. Name each test after the rule, not the input.

**Verify**: targeted vitest run → all pass.

### Step 3: `stripTimezone` tests

In `src/lib/date-utils.test.ts`: a local `Date` at 23:30 on the 15th in a UTC+10 environment must map to the 15th 00:00 UTC (construct with explicit local components); round-trip stability (`stripTimezone(stripTimezone(d))` idempotent). Vitest runs in the machine's TZ — construct dates from components rather than parsing strings so the tests are TZ-independent.

**Verify**: `pnpm test:unit` → all pass.

## Test plan

The steps are the test plan. Expected new-test count: roughly 12–18 assertions across three files.

## Done criteria

- [ ] The three test files/additions exist; `pnpm test:unit` exits 0 with them included
- [ ] `pnpm type-check` and `pnpm lint` exit 0
- [ ] No production code modified (`git status`)
- [ ] `docs/plans/README.md` status row updated (and 030's Depends-on satisfied)

## STOP conditions

- `validateTimeRange`'s signature or location differs from `time-range-input.tsx:123` (drift).
- A test exposes a real defect in `validateTimeRange` (e.g. accepts end-before-start): pin the behavior with a clearly named test and report — do not fix production code in this plan.

## Maintenance notes

- Plan 030 refactors `multi-activity-form.tsx` onto react-hook-form; these tests must keep passing untouched (they test the pure seams, not the component).
- When RTL component tests arrive (with 030), `@testing-library/react` + `@testing-library/user-event` will need adding as devDependencies; jsdom is already configured.
