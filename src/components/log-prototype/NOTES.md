# Log capture prototype (stage 2 of #464)

**Question being answered:** How should the field-capture Log feel on a phone?
Which information hierarchy fits the capture habit - and does the stage-1
state model (one Open Session, handover-at-next-start, day-atomic Promotion)
feel right when driven with real taps?

**How to run:** `pnpm dev`, then open
<http://localhost:3000/dashboard/log-prototype> (best viewed at phone width).
Flip variants with the floating bar or the arrow keys:

- `?variant=notebook` - per-Client sections mirror the notes-app habit; a
  sticky coral banner is the open Session; day chips promote.
- `?variant=timeline` - one day at a time as a vertical rail with handover
  connectors between Sessions; a sticky bottom bar starts/ends.
- `?variant=now` - the open Session fills the screen (live timer, big-thumb
  buttons); history and Promotion are secondary, below.
- `?variant=hybrid` - the Now card as the open-Session state on top of the
  timeline's day rail. Added after first Provider feedback ("I really like
  the card at the top of the now option, but I love the timeline option").
- `?variant=capture` - port of `../support-friend` round-3 L2 "Capture" (the
  one-thumb field console the Provider liked), rewired to the real backend:
  its "travel handover" exit opens the start-next-Client flow (handover is
  captured at next Start) and "in-place handover" is the participant split.
  Keeps L2's warm-paper tokens verbatim; light mode only, like the source.

All variants share the same flow dialogs (start / end / handover / trip /
cost / backfill-edit / participants / promote) wired to the real `log-router`,
so captures hit the dev database.

**Provider feedback so far (2026-07-24):**

- The hybrid approach is the favourite.
- "Cost" on the capture buttons read as any cost - it's only parking/tolls/
  other travel-related expenses, so it's now "Travel cost" everywhere.
- The Now card must not disappear when the rail navigates to another day -
  it's the present, not part of the browsed day. Fixed in the hybrid.
- The day changer needs a "back to today" shortcut when browsed away. Added
  to hybrid and timeline.
- The full-coral Now card was too bright. Restyled to coral-as-accent: tinted
  background, coral border/timer/End button on the paper background.
- The support-friend L2 "Capture" console, ported as `?variant=capture` and
  wired to the real backend, landed very well ("yeah I like that a lot",
  2026-07-25).

**Verdict (2026-07-25): `capture` wins as-is.** The support-friend L2
"Capture" console - one-thumb field console on top, flat "Earlier today"
list and "Waiting to promote" day stack below. Confirmed over the hybrid and
over a console+rail mix. The HITL gate is closed; stage 3 (production UI)
builds this shape.

Carry into stage 3:

- The console's warm-paper tokens are literal light-mode hex values here -
  translate them into the theme system (and dark mode) properly.
- "Travel handover" as an exit action on the console maps to the backend's
  handover-at-next-start contract by opening the start-next-Client flow;
  "in-place handover" is the participant join/leave split. Validated here.
- Wording feedback that survives regardless of variant: capture buttons say
  "Travel cost" (not "Cost"); promotion is day-atomic and the console hints
  this while a session is open.
- Delete this directory and `src/pages/dashboard/log-prototype.tsx` when
  stage 3 starts - variants must not be promoted directly to production.
