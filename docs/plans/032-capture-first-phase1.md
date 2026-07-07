# Plan 032: Capture-first phase 1 — draft persistence + offline/PWA spike (TRD-001)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/components/activities/multi-activity-form.tsx docs/trd/trd-001-capture-first-activity-entry.md`
> Also check `docs/plans/README.md`: if plan 030 (form consolidation) is DONE,
> the form is on react-hook-form and Step 2's serialization hooks into
> `form.watch()`/`getValues()` instead of the manual state described below.

## Status

- **Priority**: P2 (product's stated top priority; P2 only because correctness plans 018–021 go first)
- **Effort**: M (part 1) + spike (part 2)
- **Risk**: LOW–MED (additive UX; drafts must never leak between users of a shared device — accepted for solo product, see TRD)
- **Depends on**: none hard; 030 changes how Step 2 hooks in (see drift check)
- **Category**: direction
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

`docs/trd/00-ux-analysis.md` names this the product's raison d'être: _"entering an activity in Melvin loses to jotting it in a phone note"_ — typed input dies on a failed save (F1), offline entry is impossible (F2), cold start is slow (F3). `docs/trd/trd-001-capture-first-activity-entry.md` is the approved spec with its open questions **already answered** (localStorage drafts: yes; NextAuth offline-session concern: moot, auth migration planned separately). This plan delivers the smallest trust-building slice — D1 draft persistence — and runs the technical spike that de-risks the rest (D2 offline outbox / D3 PWA), producing a written design rather than speculative code.

## Current state

- The spec: `docs/trd/trd-001-capture-first-activity-entry.md`. Read it fully before starting. Key decisions inlined:
  - **D1 (this plan builds it)**: form state → `localStorage` on every change, key `activity-draft:<date-iso>`; silent restore with a "Draft restored · Clear" affordance; delete on successful save; on failed save keep the draft and say so: "Couldn't save — your entries are kept here. Retry."
  - **D2/D3 (this plan designs, does not build)**: installable PWA + IndexedDB outbox for `bulkAdd` payloads with client-generated `idempotencyKey` (a unique nullable `Activity` column; upsert semantics); overlap validation re-runs server-side on drain; rejected entries drop back to draft, never discarded.
  - Non-goals (do NOT build): free-text parsing, full offline sync of all data, native app, timer mode.
- The form: `src/components/activities/multi-activity-form.tsx` (644 lines). At `4b83de4` it holds state in `useState` (rows, date, errors) — the draft layer serializes that state. Find the state cluster: `grep -n "useState" src/components/activities/multi-activity-form.tsx`.
- No service worker, no `manifest.json`, no IndexedDB/localStorage persistence exists anywhere (`grep -rn "localStorage\|indexedDB\|serviceWorker" src public` → verify still true).
- E2E pattern: `e2e/activities.test.ts` (Playwright, logged-in storage state from `e2e/setup/storage-state.json`).

## Commands you will need

| Purpose      | Command                                                          | Expected on success |
| ------------ | ---------------------------------------------------------------- | ------------------- |
| Typecheck    | `pnpm type-check`                                                | exit 0              |
| Unit tests   | `pnpm test:unit`                                                 | all pass            |
| E2E          | `pnpm test:e2e`                                                  | all pass            |
| Targeted e2e | `pnpm exec playwright test e2e/activities.test.ts --project=e2e` | all pass            |

## Scope

**In scope**:

- `src/lib/activity-draft.ts` (create — pure serialize/restore/clear over a storage interface, unit-testable)
- `src/components/activities/multi-activity-form.tsx` (wire draft save/restore/clear + failed-save messaging)
- `e2e/activities.test.ts` (draft-survival scenario)
- `docs/plans/032-offline-outbox-design.md` (create — the spike's written output)

**Out of scope**:

- Building the outbox, service worker, manifest, or `idempotencyKey` column — that's the _next_ plan, written after the spike output is reviewed.
- The support-item override stub / smarter defaults (TRD-001 D4/D5) — separate slices.
- Any schema or router change.

## Git workflow

- Branch: `advisor/032-capture-drafts`
- Commits: `feat: persist activity entry drafts to localStorage` / `docs: offline outbox + PWA design spike`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: The draft module

Create `src/lib/activity-draft.ts`: `saveDraft(key, state)`, `loadDraft(key)`, `clearDraft(key)` over an injected `Storage` (so tests pass a fake). Serialize the form's row state including group participants and transport items; version the payload (`{ v: 1, ...}`) so a future shape change can discard incompatible drafts instead of crashing on restore. Key per TRD: `activity-draft:<date-iso>`.

**Verify**: new unit tests (see Test plan) pass.

### Step 2: Wire it into the form

On every state change (debounced ~500ms — use the existing `debounce` from `src/lib/generic-utils.ts`), `saveDraft`. On mount with a draft present: restore silently + render the "Draft restored · Clear" affordance. On successful save: `clearDraft`. On failed save: keep it and render the TRD's exact failure copy. Match the form's existing UI idioms (toasts via `react-toastify` — check how the form reports errors today and extend, don't replace).

**Verify**: `pnpm type-check` → 0; manual flow in dev server: type rows → reload page → rows restored.

### Step 3: E2E draft-survival test

In `e2e/activities.test.ts`, per TRD testing notes: fill the form, `page.reload()`, assert rows restored; complete a save, reopen, assert draft gone.

**Verify**: targeted e2e run → green; full `pnpm test:e2e` → green.

### Step 4: The offline/PWA spike (time-boxed: produce the doc, not code)

Write `docs/plans/032-offline-outbox-design.md` answering, with evidence from the actual repo/deps:

1. **SW tooling**: `next-pwa` vs hand-rolled Workbox vs plain SW for Next 16 **pages router** — check each candidate's Next-16 compatibility _as of execution date_ (this moves fast; cite versions).
2. **Outbox shape**: IndexedDB schema for queued `bulkAdd` payloads + `idempotencyKey` generation; drain triggers (`online` event, app-open, background sync API availability on iOS Safari — the phone-first target, so iOS constraints decide).
3. **Server contract**: the `Activity.idempotencyKey` migration + upsert semantics in `bulkAdd`; how a drain-time overlap rejection maps back to a restored draft (TRD D2's "never discarded" rule).
4. **Session expiry while offline**: with NextAuth v4 as-is (migration deferred per TRD answer), what happens to a drain when the session cookie expired; the queue-preserving re-auth flow.
5. A step-list skeleton for the follow-up implementation plan.

**Verify**: the doc exists and each of the five questions has a concrete answer or an explicitly flagged unknown.

## Test plan

- Unit (`src/lib/activity-draft.test.ts`): round-trip including group rows + transport items; corrupted JSON in storage → `loadDraft` returns null (no throw); version mismatch → discarded; `clearDraft` idempotent.
- E2E: Step 3's scenarios (reload-restore; save-clears).

## Done criteria

- [ ] Typing into quick entry, killing the page, reopening → entries restored (e2e-proven)
- [ ] Successful save clears the draft (e2e-proven)
- [ ] Failed save keeps the draft and shows the TRD's messaging (unit or e2e with a blocked route)
- [ ] `docs/plans/032-offline-outbox-design.md` answers the five spike questions
- [ ] `pnpm type-check`, `pnpm test:unit`, `pnpm test:e2e` all exit 0
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

- Plan 030 landed and the form is RHF-based, but the drift-check adaptation isn't obvious — report rather than force the manual-state wiring described here.
- Draft restore interacts badly with the form's initial-data flow (e.g. the dialog receives server-derived defaults that fight the restored draft) — report the specific conflict; the merge policy (draft wins? newest wins?) is a product call.
- The spike finds that iOS Safari constraints make the TRD's outbox design unworkable as specified — write that finding prominently in the design doc and stop before proposing an alternative architecture.

## Maintenance notes

- The draft payload version (`v: 1`) must bump whenever the form's row shape changes (plan 030 will change it — coordinate).
- The follow-up implementation plan (outbox/PWA build) should be written via `improve plan <description>` against the spike doc once reviewed.
