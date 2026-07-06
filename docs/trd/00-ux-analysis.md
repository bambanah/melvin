# UX Flow Analysis — Beating the Phone Note

**The problem statement**: it is currently easier to jot `John: 20/6 9:30-1:50, 25km 12km` into a phone note than to enter the activity in Melvin. Everything downstream (invoicing, compliance, corrections) inherits the damage: activities get entered late from notes, transcription errors creep in, and invoicing becomes a batch chore instead of a byproduct.

**Design target** (confirmed with the product owner): one solo sole-trader support worker, entering activities **on their phone**, immediately after (or during) the activity — often in a car. Desktop is secondary, used for invoicing and admin. Payers are plan managers and self-managed participants.

This document analyses each flow as it exists at commit `c48e1dd` + working-tree WIP, names the friction, and points to the TRD that fixes it.

---

## 1. Why the phone note wins today

The note app's actual feature set: **instant open, zero navigation, works offline, never loses input, accepts any format, no login**. Melvin must match the first four; the last two are structural (format: the quick-entry form's chips + single time field are close enough; login: session persistence must just never interrupt capture).

The quick-activity-entry work (plan 012, already shipped) got the _form_ right. What still loses to the note:

| #   | Friction                            | Detail                                                                                                                                                                                                                                                                                                                                        | Fix               |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| F1  | **Input can be lost**               | The multi-activity dialog holds state in memory. Navigate away, tab discarded by mobile OS, session expiry, or a failed save (`toast.error("Failed to save activities")` — no retry, no preserved payload) → everything typed is gone. This is the single biggest trust-killer: one lost entry sends the worker back to the note app forever. | TRD-001           |
| F2  | **No offline path**                 | Entry happens in cars, car parks, basements. A `bulkAdd` mutation with no queue means no-signal = F1.                                                                                                                                                                                                                                         | TRD-001           |
| F3  | **Cold-start cost**                 | Browser tab → load Next.js dashboard → calendar → FAB → dialog. The note app is one tap. No PWA install, no home-screen shortcut targeting the form directly.                                                                                                                                                                                 | TRD-001           |
| F4  | **Support item override is a stub** | The quick form's "Advanced" section displays text but has no picker (`multi-activity-form.tsx:569-578`). A worker whose activity isn't the default item must abandon the quick flow entirely for the full form.                                                                                                                               | TRD-001           |
| F5  | **No billing feedback at capture**  | The worker can't see which rate variant (evening/Saturday/PH) the entry will bill, or that a Saturday item is missing a Saturday code and will silently under-bill. The note app is honest about deferring this; Melvin pretends it's handled.                                                                                                | TRD-001 + TRD-002 |
| F6  | **Un-capturable events**            | A no-show (billable cancellation!), a phone-call support (NF2F), a three-person group — none of these fit the current model, so they land in the note app or are lost as revenue.                                                                                                                                                             | TRD-003, TRD-007  |

## 2. Flow-by-flow walkthroughs

### 2.1 Activity entry (quick path — shipped, with WIP group toggle)

Dashboard calendar → FAB `+` → dialog: date (defaults today), per row: client chips (recents), time range single field, summing km field, optional parking/tolls, group toggle (WIP, 2 participants max). Auto-creates a Trip for contiguous rows; toast on save.

**Verdict**: right skeleton. Gaps beyond F1-F6: `activity.bulkAdd` skips overlap validation and trip transit calculation (plans README finding #8), so the auto-created trip's transit legs aren't populated — the auto-transit promise silently half-delivers. The "back-to-back" badge shows on any row with a start time (`isContiguous = row.timeRange.startTime !== ""` — always true once typed), not actual contiguity.

### 2.2 Activity entry (full form)

Separate page with react-hook-form; transit distance/duration fields editable; single transport item slot; support item select. Used for edits. Two divergent forms already drifted (transport amount parsing bug was fixed in one, then the other — plan 015, `docs/plans/015-transport-amount-validation.md`). Keep both, but TRD-001 makes the quick form complete enough that the full form is only for edits.

### 2.3 Auto-filled transit

Works via `Client.distanceToClient` + Trip structure; one-way semantics; 30-min cap. Friction: inter-client legs must be entered in a separate trip-builder modal after the fact (~850 duplicated lines across two modals, finding #12); nothing prompts at capture time ("Jane follows John — 12 km between them? [use last time's]"). Previously-entered inter-client distances aren't remembered per client-pair. TRD-004.

### 2.4 Support item selection

Global default + group default on the user; per-activity override via full form only. Creating a support item = hand-typing 4 codes + 4 rates from a PDF (the in-app link points at the **2024-25** price guide; the bundled autocomplete JSON is **2022-23**; rates changed **yesterday**). The "support items available to a worker" concept the product owner asked about is exactly this: a worker should pick from a short personal catalogue seeded from the official one, never type a code. TRD-002.

### 2.5 Custom prices

`SupportItemRates` supports per-client rate overrides (weekday/weeknight/sat/sun) — no PH tier, no validation against limits, and `getRateForDay` takes the first rate row with the day populated (client filtering happens only because the PDF query pre-filters; the invoice list total path passes _all_ rates — latent cross-client rate bleed). TRD-002 subsumes this into the rate engine.

### 2.6 Invoice bundling

Manual: Invoices → Create → pick client → date → tick unassigned activities → auto-suggested invoice number → Create → open → Download PDF → separate mailto link (no attachment) → manually "Mark as Sent". Nothing tells the worker _when_ to invoice whom, or that unbilled activities are aging. The product requirement is differing cadences per client (immediate/weekly/fortnightly). TRD-005.

### 2.7 Invoice amendment / correction

An `EDIT` link is always present regardless of status; editing a SENT/PAID invoice silently mutates it; re-downloading regenerates a different PDF under the same invoice number. Payment matching keys on totals and collapses identical amounts (finding #9). No credit-note/reissue concept, which plan managers require. TRD-006.

### 2.8 Group activities

WIP form creates 2 mirrored Activity records; transport on primary only; group rate is whatever the user typed on the group support item (assumed pre-divided by 2); invoice-side group entry has a known double-write bug (finding #7). No group size ≠ 2, no apportionment, no attendance/cancellation semantics, no centre capital cost. TRD-003 replaces the representation.

## 3. Target UX principles (bind all TRDs)

1. **Capture is sacred.** Anything typed survives crash, offline, and failed saves. Save drafts locally before attempting network. Never show a destructive error toast.
2. **Capture ≠ classification.** The worker records _what happened_ (who, when, km, costs, group, no-show). The rate engine — not the worker at 9pm in a car — decides codes, variants, and prices, and does so _visibly_ (each saved activity shows its resolved variant + price as a receipt line the worker can glance at).
3. **Two-tap happy path.** Recent client chip → time → save. Everything else has smart defaults: support item from client-level default (falling back to user default), transit from client record, date today.
4. **The app asks, the worker confirms.** Contiguous activities prompt trip linking with remembered distances; a Saturday entry with no Saturday code prompts once; an aging unbilled pile prompts an invoice at the client's cadence.
5. **Sent means sealed.** Post-send corrections are first-class (amend → reissue with versioned number), not silent mutation.

## 4. TRD map and priority

| TRD     | Title                                | Rationale for priority                                                                                                            |
| ------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| TRD-001 | Capture-first activity entry         | Directly attacks the phone-note problem (F1-F5); everything else depends on activities being _in_ the system.                     |
| TRD-002 | Support item catalogue & rate engine | Compliance floor: PH tier, 1-Jul rate rollover, code correctness, custom-price validation. Blocks accurate billing feedback (F5). |
| TRD-003 | Group activities & apportionment     | Second-largest billing surface; current 2-participant hack is both wrong (>2) and buggy (finding #7).                             |
| TRD-004 | Provider travel & trips UX           | Auto-transit exists; this closes the capture-time gaps and dedups the modals.                                                     |
| TRD-005 | Invoice bundling & cadence           | Converts invoicing from a memory game to a queue.                                                                                 |
| TRD-006 | Invoice amendment & corrections      | Required by plan-managed payers; unblocks trust in "Sent".                                                                        |
| TRD-007 | Cancellations & NF2F claims          | New revenue surfaces that currently live in the note app (F6).                                                                    |

Sequencing assumption (per product owner): security/correctness plans `docs/plans/001-006` land **before** all of this. TRD-002 additionally builds on plan 006 (single travel-rate source) and plan 004 (8pm boundary); TRD-003 must reconcile the group-form WIP in the working tree before starting.
