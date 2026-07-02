# TRD-003 — Group Activities & Apportionment

**Status**: Proposed · **Priority**: P1 · **Depends on**: TRD-002 (rate engine), reconciling the group-form WIP in the working tree + finding #7 (invoice group double-write) · **Blocks**: TRD-007's group-cancellation rule

## Problem

Group support (`04_102_0136_6_1` family) is a major billing surface, and the current representation is a hack that is simultaneously too narrow and non-compliant:

- A "group" is exactly **two** mirrored `Activity` records created by the quick form's WIP toggle; nothing links them (no shared session id), so editing one silently desynchronizes the other.
- The billed rate is whatever the user typed on the group support item — assumed pre-divided by 2. The NDIS rule is **limit ÷ N per participant for the full duration** (`01-billing-requirements.md` §4); N isn't stored, so N≠2 is unrepresentable and validation is impossible.
- Transport (ABT + provider travel) goes on the primary participant only, with hardcoded half-rates (`0.49`, `0.43` — which disagree with each other) instead of apportioning actual costs among participants by agreement.
- The invoice-side group creation path double-writes entries (finding #7) with an inverted `useEffect` guard.
- No attendance semantics: one participant cancelling late must be billed _as if attending_ while the divisor stays fixed — inexpressible today.
- Centre-based delivery (centre capital cost, $2.71/h/participant 2026-27) isn't modeled.

## Goals

1. A group session with N ≥ 2 participants is one entity; per-participant claims derive from it.
2. Per-participant price = agreed rate ≤ (variant limit ÷ N), enforced by the rate engine.
3. Transport costs are apportioned across nominated participants — no hardcoded half-rates.
4. Attendance/cancellation per participant (billing semantics via TRD-007).
5. Optional centre-based flag adding the centre capital cost line per participant.

## Non-goals

- Programs of support (`01-billing-requirements.md` §9) — different billing model, out of scope.
- Multiple workers per session (ratio supports like 1:2, 2:1). Solo-worker product; the group tables assume one worker.
- Scheduling/recurring group sessions (TRD-005 territory at most; likely never).

## Design

### D1. Data model — `GroupSession`

```prisma
model GroupSession {
  id            String   @id @default(cuid())
  date          DateTime @db.Date
  startTime     DateTime @db.Time(6)
  endTime       DateTime @db.Time(6)
  supportItemId String        // the 0136-family item
  inCentre      Boolean  @default(false)
  ownerId       String
  activities    Activity[]    // one per participant
}
```

- `Activity` gains `groupSessionId String?`. Each participant keeps their own `Activity` row (invoicing stays per-client — an invoice bundles one client's activities, unchanged), but time/date/item live on the session and the member activities mirror it. **The session is the write model; member activities are derived** — every session mutation rewrites its members in one transaction (avoids the desync bug class, and finding #8's transaction gaps don't get a new sibling).
- Group size N = `activities.length` **at billing time**, including cancelled-but-billable members (see D4).
- Migration: pair up existing mirrored group activities (same owner/date/times/group item, created by the current toggle) into sessions; unpaired group-item activities become N=1 sessions flagged for review (an N=1 "group" bills at the full limit — legal, it's just 1:1 delivered under a group item; warn).

### D2. Rates

The rate engine (TRD-002 D4) takes `groupSize`: per-participant unit price = min(agreed override, variant limit ÷ N). The UI shows the per-participant effective rate on the session ("3 participants · $24.53/h each"). Remove the "pre-divide your group rate yourself" convention — migration halves… no: migration _interprets_ existing group-item rates as already-divided-by-2 agreed prices and re-expresses them as session-level agreed rates where they match limit÷2, otherwise keeps them as explicit per-participant overrides.

### D3. Transport apportionment

- ABT items (`ActivityTransportItem`) move conceptually to the session for group sessions: entered once, with a **participant subset** (default: all) among whom the cost divides equally. Per-participant line = amount ÷ |subset| at the raw rate ($0.99/km vehicle, full amount for parking/tolls), against `04_591_0136_6_1`.
- Provider travel (to/from the session venue): apportion `transitDistance`/`transitDuration` equally across participants whose agreement allows it (default all). Kills the `0.43`/`0.49` constants (coordinate with plan 006, which unifies the travel rate source first — this TRD then generalizes ÷2 to ÷|subset|).
- Rounding: compute per-participant amounts to the cent; assign the remainder cent(s) to the first participant(s) so the sum equals the actual cost (property-tested).

### D4. Attendance & group cancellation

- Session members have `attended: Boolean` (default true). Marking a member as a no-show flags their activity as a cancellation (TRD-007 semantics: billed as if attended, "Cancellation" label on their invoice line) and **does not change N** for the others — exactly the PAPL group rule.
- A member removed _before_ the session (enough notice) is just deleted from the session; N changes; rates re-derive.

### D5. Centre capital cost

- `inCentre` on the session adds a derived line per participant: session hours × centre capital rate (from the catalogue via TRD-002, code `04_599_0136_6_1`) on each participant's invoice. Claimable for the whole duration when partially in-centre with the centre available — represent as the boolean; the subtlety goes in the tooltip.

### D6. Capture UX (extends TRD-001's quick form)

- The group toggle becomes a participant list: primary client chip row + "add participant" (chips reuse `ClientQuickSelect`, `excludeClientId` generalizes to a set). Time/km/parking entered once for the session.
- Billing receipt (TRD-001 D6) shows the per-participant rate so the ÷N is visible at capture.
- Fix/absorb the invoice-side group creation path: `invoice-activity-creation-form` stops creating group entries itself and offers "create group session" via the same component (removes finding #7's double-write surface).

## API changes

- New `groupSession` router: `create`, `update`, `setAttendance`, `delete` — each rewriting member activities transactionally.
- `activity.bulkAdd` accepts a `participants[]` shape per row (TRD-001 D2's outbox payload includes it).
- Guard rails: member activities reject direct time/item edits ("edit the group session").

## Testing notes

- Rate: N ∈ {1,2,3,5} × variants × both catalogue years — per-participant price and code (watch the 0136 code-suffix trap: Saturday group is `04_104_0136_6_1`).
- Apportionment property tests: Σ per-participant transport = session cost ±0¢ exactly (remainder-cent rule), any subset size.
- Attendance: 3-person session, one no-show → no-show billed at full ÷3 rate with cancellation label; others unchanged.
- Migration: fixture with current-style mirrored pairs, orphaned halves (the finding #7 debris), and N=1 group items.
- E2E: create 3-person session on phone viewport → three activities on calendar → three invoices each carrying their share.

## Open questions

- Do real sessions have per-participant agreed rates that differ (participant A negotiated below limit, B at limit)? Schema allows it via per-client `SupportItemRates`; confirm the UI needs to expose it or can hide it.
  - Answer: Yes
- Transport subset UI: is "everyone" always true in practice? If so, ship without the subset picker and keep it in the model only.
  - Answer: default all for group activities
