# Regular Time prototypes (#502)

## 1. Set-up (branch `prototype/regular-time-setup`)

Question: how does the Provider enter, edit and clear a Client's Regular Time (start/end, Support Item, travel yes/no)?

Verdict: A, an inline "Regular time" `DetailSection` on the Client page. Only that variant is kept here (`setup-section.tsx`), to give the apply variants something to apply.

## 2. Applying (branch `prototype/regular-time-apply`)

Question: where does the Provider start from, how do they choose the Client and pick multiple past/today dates, and how are dates that already have an Activity for that Client flagged?

Run `pnpm dev`, set a Regular Time on one or two Clients (in memory - a full reload wipes it), then cycle variants with the bottom bar or `←`/`→`. The bar's label links to where the current variant lives. Nothing is saved: "Create" records the would-be Activities in memory, and those count as existing for later flags.

- A - Client page: apply dialog. "Apply to dates" under the Regular time section opens a month picker; the Client is implicit. Dots mark days with an Activity for the Client.
- B - Calendar: select mode. A "Regular time" button in the calendar header turns the month grid into a picker for one chosen Client; days with an Activity for that Client are outlined.
- C - Quick add: Regular time tab. A tab in the Add Activities dialog (FAB on phones, a calendar day's "Add Activity" on desktop): Client chips, then recent days as a checklist with the opened day ticked.
- D - Clients list: week grid. A card above the Clients list with one row per Client with a Regular Time and one tick per day of a week; fills several Clients at once.
- E - Quick add: regular time in the row. C without the tab, from feedback on C: in the normal Add Activities row, picking a Client with a Regular Time swaps the Time and Transport fields for a read-back of it. "Use specific details" brings the fields back, prefilled, to override; "Use regular time" returns. One date, the form's own, with a flag if that Client already has an Activity on it.

Verdict: C. A Regular Time is applied from a "Regular time" tab in the Add Activities dialog (quick-add FAB on phones, a calendar day's "Add Activity" on desktop), beside the normal Activities tab. The tab shows one chip per active Client with a Regular Time (name and time span, "+ travel" when claimed); picking one shows the last 14 days as a checklist, newest first ("Today", then "Sat 31 Oct"...), with "Show earlier days" extending it. The day the dialog was opened for is ticked unless that Client already has an Activity on it; days that do are marked "Already has an Activity" and start unticked but stay tickable. Future days never appear. "Create N Activities" creates one Activity per ticked day. E (the Regular Time inside the normal row, one date per save) was liked too, but lost on dropping multi-date.
