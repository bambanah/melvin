# TRD-001 — Capture-First Activity Entry

**Status**: Partially delivered (plan 012 — quick entry form shipped; capture-reliability goals remain) · **Priority**: P1 · **Depends on**: docs/plans/001-006 baseline · **Blocks**: TRD-005 (needs activities in-system), informs TRD-003/004/007 capture hooks

## Problem

The quick-entry form (shipped, `multi-activity-form.tsx`) has the right shape but loses to a phone note on reliability and completeness: typed input dies on a failed save, offline entry is impossible, cold-start is slow, the support-item override is a stub, and the worker gets no feedback about what the entry will bill. See `00-ux-analysis.md` §1-2.1.

## Goals

1. Input typed into the entry form is never lost — across crashes, offline, session expiry, and failed saves.
2. Entry works with no signal; syncs when connectivity returns.
3. From phone home screen to a ready entry form in ≤2 seconds warm.
4. The quick form is complete enough that the full activity form is only needed for edits.
5. Every saved activity shows a "billing receipt" — resolved support item variant, rate, and transit — that the worker can glance at and trust.

## Non-goals

- Free-text parsing of note shorthand (explicitly rejected in quick-activity-entry plan; revisit only if capture metrics say the structured form still loses).
- Full offline-first sync of _all_ app data. Only the capture path queues offline.
- Native app. PWA is sufficient for a solo user.
- Timer/clock-in mode ("start activity now, stop later"). Attractive but speculative; the shorthand evidence shows workers enter times retrospectively in one go. Recorded as a future candidate.

## Design

### D1. Draft persistence (the trust fix)

- Form state (all rows + date) writes to `localStorage` on every change, keyed by dialog session (`activity-draft:<date-iso>`).
- Reopening the form with a draft present restores it silently ("Draft restored · Clear").
- On successful save, the draft is deleted. On failed save, the draft remains and the error UI says so: "Couldn't save — your entries are kept here. Retry."
- Drafts survive logout/login (they're device-local and contain nothing another user of the device shouldn't see — acceptable for a solo-worker product; note in the ADR if multi-user ever happens).

### D2. Offline queue

- Convert the app to an installable PWA (manifest + service worker via `next-pwa` or hand-rolled Workbox; Next.js pages router is compatible).
- The capture path gets a durable outbox: on save, the `bulkAdd` payload is written to IndexedDB, then submission is attempted. Offline or 5xx → the entry shows as "Pending sync" in the calendar (rendered from the outbox, visually distinct), and a `sync` event (or app-open fallback) drains the queue.
- Conflict policy: outbox entries are creates only (edits stay online-only), so replay is idempotent — give each queued activity a client-generated `idempotencyKey` (add a unique nullable column to `Activity`; `bulkAdd` upserts on it) to make retries safe.
- Overlap validation runs server-side on drain; a rejected entry drops back to draft state with the reason, never discarded.

### D3. Launch speed

- PWA install prompt (and a `/capture` shortcut in the web-app manifest's `shortcuts`) deep-links straight to the multi-activity form with today's date.
- The form's data dependencies (recent clients, defaults, support-item summaries) are cached in the service worker with stale-while-revalidate so the dialog renders instantly offline.

### D4. Complete the quick form

- Replace the "Advanced" stub with a real support-item picker: a compact select listing the worker's items (from TRD-002's personal catalogue; until then, `supportItem.list`), defaulting per D5.
- Fix the "Back-to-back" badge to reflect actual contiguity (previous row's end == this row's start).
- Add a NF2F/cancellation entry point placeholder behind a flag (wired by TRD-007) and group-size control (wired by TRD-003) — capture surface should not need re-architecting when those land.

### D5. Smarter defaults

- Add `Client.defaultSupportItemId` (nullable). Resolution: client default → user default (existing) → most-recent item used with that client. The common case — each client always bills the same item — becomes zero-tap.
- Prefill the transport km field's placeholder with the client's last DISTANCE amount ("last time: 25 km") without auto-filling it (in-activity driving genuinely varies; a wrong silent default is worse than none — contrast with provider travel, which _is_ predictable and stays auto-derived).

### D6. Billing receipt (with TRD-002)

- After save (and in the calendar day modal), each activity renders one summary line: `Sat rate · $103.54/h · 4h20m · +18km travel` — the resolved variant/rate from the rate engine, or a warning chip when resolution found a gap ("No Saturday rate configured — billed weekday rate").
- Before TRD-002 lands, show what today's `getRateForActivity` resolves (code + rate) — even imperfect feedback beats none, and it creates the UI slot TRD-002 fills.

## Data model changes

- `Activity.idempotencyKey String? @unique` (D2).
- `Client.defaultSupportItemId String?` + relation (D5).

## API changes

- `activity.bulkAdd`: accept `idempotencyKey` per activity; upsert semantics; run overlap validation and trip transit calculation (closes finding #8's `bulkAdd` gaps — coordinate with whoever picks up that finding).
- New lightweight `activity.captureContext` query bundling recent clients + defaults + item summaries for SW caching (replaces three separate queries the dialog makes today).

## Testing notes

- E2E (Playwright): kill the page mid-entry → reopen → draft restored. Save with network blocked (route interception) → pending badge → unblock → synced, exactly one activity created (idempotency).
- Unit: draft serialization round-trip including group rows and transport items; contiguity badge logic.
- The billing-receipt line is covered by TRD-002's rate-resolution table tests; here just snapshot the rendering of each resolution outcome (resolved / fallback-warning / missing-item).

## Open questions

- PWA + NextAuth session lifetime: capture must not dead-end on an expired session while offline. Likely answer: outbox drain triggers re-auth flow but keeps the queue; verify with next-auth v4 behavior (v5 migration is deliberately deferred).
  - Answer: We will likely be migrating from next-auth in the future, so this is a non-issue
- Is `localStorage` draft enough, or should drafts also go to IndexedDB with the outbox? (Recommend: keep drafts in localStorage for simplicity; only the save payload graduates to the outbox.)
  - Answer: localStorage is fine
