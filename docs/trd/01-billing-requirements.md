# NDIS Billing Requirements & Gotchas

**Purpose**: The authoritative reference for what a _correct_ Melvin invoice looks like, and the trap list that testing and the validation strategy must cover. Written for the engineering team implementing the TRDs in this folder.

**Sources**: NDIS Pricing Arrangements and Price Limits 2025-26 v1.0 (`docs/ndis/`, "PAPL"), NDIS Support Catalogue 2026-27 v1.0 (`docs/ndis/`), extracts in `docs/ndis/provider-travel.md` and `docs/ndis/activity-based-transport.md`.

**Payer context**: invoices go to plan managers and self-managed participants. Both need NDIS-claimable line items (support item code, date, quantity, unit price); plan managers are the stricter audience and will bounce invoices that exceed price limits or use wrong codes.

---

## 1. The two focus support items

Both are hourly, price-limited, and support **NF2F, Provider Travel, and Short Notice Cancellation (7-day)** claims.

### 1:1 — Assistance to Access Community, Social and Recreational Activities (reg. group 0125)

| Variant         | Code              | 2025-26 limit | 2026-27 limit (from 1 Jul 2026) |
| --------------- | ----------------- | ------------- | ------------------------------- |
| Weekday daytime | `04_104_0125_6_1` | $70.23        | $73.58                          |
| Weekday evening | `04_103_0125_6_1` | $77.38        | $81.07                          |
| Saturday        | `04_105_0125_6_1` | $98.83        | $103.54                         |
| Sunday          | `04_106_0125_6_1` | $127.43       | $133.50                         |
| Public holiday  | `04_102_0125_6_1` | $156.03       | $163.46                         |

Associated codes: Provider Travel non-labour `04_799_0125_6_1`, Activity Based Transport `04_590_0125_6_1`.

### Group — Group and Centre Based Activities (reg. group 0136)

| Variant         | Code              | 2025-26 limit | 2026-27 limit |
| --------------- | ----------------- | ------------- | ------------- |
| Weekday daytime | `04_102_0136_6_1` | $70.23        | $73.58        |
| Weekday evening | `04_103_0136_6_1` | $77.38        | $81.07        |
| Saturday        | `04_104_0136_6_1` | $98.83        | $103.54       |
| Sunday          | `04_105_0136_6_1` | $127.43       | $133.50       |
| Public holiday  | `04_106_0136_6_1` | $156.03       | $163.46       |

Associated codes: Provider Travel non-labour `04_799_0136_6_1`, Activity Based Transport `04_591_0136_6_1`, Centre Capital Cost `04_599_0136_6_1` ($2.59/h 2025-26, $2.71/h 2026-27, per participant per hour, only when delivered in a centre).

> **GOTCHA — the code-suffix trap.** The middle segment does **not** mean the same thing across registration groups. `04_102_0125_6_1` is _public holiday_ 1:1; `04_102_0136_6_1` is _weekday daytime_ group. `04_104_0125_6_1` is _weekday daytime_ 1:1; `04_104_0136_6_1` is _Saturday_ group. Any mapping keyed on the `04_10x` prefix alone will silently bill the wrong day variant. Melvin currently asks users to hand-type these codes into four free-text fields — this trap is live today. Test: every (item, day-variant) pair asserts the exact full code.

Remote multipliers are ×1.4 (remote) and ×1.5 (very remote) on the national limit. Melvin currently assumes national; fine to keep as an explicit assumption, but record it.

## 2. Day and time-of-day classification (PAPL pp. 19-20)

The billable variant is determined by **when the support is delivered to the participant**, not the worker's shift:

1. Determine the **day**: a Saturday support starts at/after midnight before the Saturday and ends by midnight of it; same pattern for Sunday and public holidays. Public holiday beats Saturday/Sunday.
2. Then the **time of day** (weekdays, disability support workers): **daytime** starts ≥6:00am and ends ≤8:00pm; **evening** starts ≥8:00pm and finishes ≤midnight; **night** crosses midnight or starts before 6:00am.
3. A support that fits none of the buckets must be **billed as two or more separate supports** — _except_ when the same worker delivers the entire support across a shift boundary, in which case **the higher price limit applies to the whole support**. Melvin is single-worker, so the exception always applies: a 6pm–9pm activity legitimately bills entirely at the evening rate.

> **GOTCHA — current code uses 7pm, not 8pm.** `getRateForActivity` switches to evening at `endTime.hour() >= 19`. Plan `004` fixes this to 20:00. Tests must pin: end 19:59 → daytime; end 20:01 → evening (via the same-worker whole-support rule); start ≥20:00 → evening.
>
> **GOTCHA — missing weekend fallback is under-billing, not over-billing.** If an activity falls on a Saturday but the support item has no `saturdayCode`, the code silently bills the weekday rate. Correct for compliance (never exceeds a limit) but loses money; the validation layer should warn, not stay silent.
>
> **GOTCHA — no public holiday tier exists in the schema.** `SupportItem` has weekday/weeknight/saturday/sunday only. A public-holiday activity today bills at (at best) the weekend rate — roughly $60/h left on the table per PH hour, or a compliance breach if a custom rate exceeds the applicable non-PH limit. `isHoliday()` in `date-utils.ts` is display-only, contains fixed dates built with _the current year_ (wrong for entries dated in a different year, e.g. early-January entry of late-December work), includes 24 Dec (not a national holiday), and omits Easter, King's Birthday and all state holidays. Public holidays are **state-based**: the correct calendar depends on where the support is delivered. See TRD-002.

## 3. Price limits, custom prices, and claim formats

- **Price-limited items**: charge up to but never above the limit **applicable on the date of service**. Custom rates (`SupportItemRates`, per client) must validate against the correct variant's limit — a custom Saturday rate must be ≤ the Saturday limit, not the weekday one.
- **Quantity format**: claim the actual hours at the agreed unit price (e.g. 45 min at $190/h = 0.75 × $190), **not** 1 unit at the computed total. Invoice lines should show quantity × unit price accordingly.
- **Non-price-limited items** (Provider Travel non-labour, ABT): claimed against a **notional $1.00 unit price** — a $21.50 transport cost is claimed as **21.5 units × $1.00** (PAPL p. 19). Melvin's PDF currently prints `X km × $0.99/km`; the maths agrees but plan managers claiming through the portal need the dollars-as-quantity convention to be at least derivable. Recommended: show the computation (`22 km × $0.99/km`) _and_ the claimable line total, since the total is what maps to units.
- **Annual price changes land on 1 July.** The 2026-27 rates took effect 2026-07-01 — _yesterday relative to this doc's writing_. An invoice created in July covering June activities must bill June activities at 2025-26 limits. Rates must therefore be **effective-dated by date of service**, not looked up from a single current value (TRD-002). Test: activity 30 Jun + activity 1 Jul on one invoice → two different limits.
- **GST**: NDIS supports of this kind are GST-free; the invoice should say so (plan managers occasionally reject "Tax Invoice" documents with no GST statement).

## 4. Group activity rules (PAPL pp. 34, 65)

- **The price limit for each participant = table limit ÷ number of people in the group.** Each participant is claimed for the **full duration** at that divided limit. Group of 3, 2 hours, weekday daytime 2026-27: each participant ≤ $73.58/3 = $24.5267/h → claim 2h at ≤$24.53/h each. (Rounding: validate against the unrounded division; display to cents.)
- Melvin's current group support is hardcoded to **exactly two participants** (a second Activity record cloned from the first) and relies on the _user-entered rate_ on the group support item being pre-divided. Nothing validates rate ≤ limit ÷ N, and N isn't stored. See TRD-003.
- **ABT and travel apportionment**: when transporting ≥2 participants on one trip, apportion the km/toll/parking costs (and travel time) among them, agreed in advance. The current hack — group ABT at $0.49/km and group travel at $0.43/km on the _primary participant only_ — is a group-of-2 approximation baked into constants (`activity-utils.ts`, `pdf-generation.ts`; plan `006` and TRD-003 replace it). Note the two constants don't even agree with each other.
- **Centre capital cost**: claimable per participant per hour when the group support is delivered in a facility (or partially, if the centre stays available throughout). Not currently modeled; optional flag in TRD-003.
- **Group cancellation**: if one participant cancels late and can't be replaced, bill the canceller **as if they attended** (cancellation claim) and bill everyone else **as though all attended** — i.e. the divisor does not change.

## 5. Provider Travel (PAPL pp. 22-26)

- Claimable only when the support was delivered face-to-face, agreed in advance, and (for sole traders) the travel is from the usual place of work to/from the participant or between participants.
- **Labour (time)**: capped at **30 min per leg in MMM1-3** (60 in MMM4-5), including the return leg from the last participant. Claimed against the **same support item** as the primary support (portal "Provider Travel" claim type), at the agreed hourly rate or lower. Melvin bills `transitDuration × rate/60` on the primary item's code — correct shape; the 30-min cap is applied at trip-calculation time.
- **Non-labour (km)**: ≤**$0.99/km** own vehicle; tolls/parking at full amount; claimed against `04_799_*`. Only claimable **where travel time is claimable** — a leg whose time is entirely non-claimable shouldn't have its km claimed either (edge case worth a test; current code doesn't link them).
- **Multi-participant runs**: apportion time and km (including the return) across the participants in the run, by prior agreement. Melvin's Trip model allocates legs to activities (first leg → first activity, etc.) rather than apportioning the total — an accepted simplification (ADR-0001, ADR-0002); keep, but document it in service agreements.
- Rate is claimed at the time-of-day variant applicable to the travel? No — use the **same rate agreed for the primary support**.

## 6. Activity Based Transport (PAPL pp. 29-32)

- Transport **during** the support (home→pool→home with the participant): worker time is billed as part of the primary support hours; vehicle costs ≤$0.99/km (≤$2.76 modified vehicle), tolls/parking full amount, against `04_590_0125_6_1` / `04_591_0136_6_1`.
- ABT items are **not** price-limited (notional $1 unit) and per the catalogue do **not** allow travel/NF2F/cancellation claims on themselves.
- The worked example (PAPL p. 32) confirms: transport time (25 + 20 min) is folded into the primary item's hours. Melvin's activity duration is `startTime→endTime`, which naturally includes in-activity driving — correct, no separate handling needed. Only the km/parking/tolls become `ActivityTransportItem` lines.

## 7. Short Notice Cancellations (PAPL pp. 27-28)

Not representable in Melvin today (see TRD-007). Rules:

- Both focus items allow **7-day** short-notice cancellation claims: less than 7 clear days' notice, or a no-show.
- Claim **up to 100%** of the agreed fee, using the **same support item** and rate that would have applied, flagged as a cancellation (portal "Cancellation" claim type; the invoice line should be labelled).
- Conditions: agreed cancellation terms in the service agreement, and the provider couldn't find alternative billable work for the time (sole traders: the "must pay the worker" condition doesn't apply, but the alternative-work condition does).
- No hard cap on count, but the NDIA monitors unusual volumes.
- Public holidays do **not** extend the 7-day notice window.
- Travel/ABT for a no-show discovered _en route_: the cancellation claim covers the support fee; there's no delivered face-to-face support, so provider travel is **not** claimable for that leg. Trip transit math must handle a cancelled middle activity (the leg still had to be driven to the next client — allocate it to the next real activity, not the cancelled one).

## 8. Non-Face-to-Face supports (PAPL pp. 21-22)

- Claimable on both focus items when the work is **participant-specific and enables the support** (e.g. writing a progress report for this participant), agreed in advance. Admin (claims processing, rostering, service bookings, entering data into Melvin itself) is explicitly **not** claimable.
- Claimed on the same support item with the NF2F claim type; hourly at the agreed rate.
- Not modeled in Melvin; TRD-007 adds it as an activity kind with no transit and no transport items.

## 9. Programs of Support (PAPL p. 35) — recorded as out of scope

Group providers can agree a "program of support" (≤6 months): bill scheduled sessions whether or not the participant attends, exempt from cancellation rules, 2-week exit notice, 4-week non-attendance limit. This is a materially different billing model; none of the TRDs implement it. If group work grows, revisit.

## 10. Invoice content requirements (plan-managed / self-managed)

Minimum line data a plan manager expects: provider name + ABN, participant name and NDIS number, per line: support item code, service date, quantity (hours as decimals or $-units), unit price, line total; invoice number, invoice date, GST-free statement, payment details. Melvin's PDF has all of these except the GST statement and prints bank details only when _all five_ bank fields are set (silent omission — worth a warning in the UI instead).

**Amendments**: plan managers cannot process a second invoice with the same invoice number, and silently regenerating a changed PDF under the same number causes reconciliation disputes. Once sent, an invoice must be immutable; corrections go out as a new versioned document (see TRD-006).

---

## 11. Validation strategy for testing

Layered, cheapest first:

1. **Characterization safety net** (plans `005`, exists first): lock current cost math before changing it.
2. **Rate-resolution unit tests** (TRD-002): a table-driven suite asserting (item, date, start, end, group size, state) → (code, unit price, quantity). Boundary cases: 19:59/20:00/20:01 ends; Fri 8pm–11pm; Sat 00:00 start; public holiday in each supported state; 30 Jun vs 1 Jul rate rollover; missing weekend code fallback (expect warning); custom rate above/below variant limit.
3. **Apportionment property tests** (TRD-003): for any group size N and any cost, the per-participant claims sum to the total (within cent rounding), and each per-participant rate ≤ limit ÷ N.
4. **Golden-file invoice tests**: fixed fixture (mixed 1:1/group/travel/ABT/cancellation invoice) → snapshot the PDF line items (codes, quantities, prices, total). Any rule change shows up as a reviewable diff. The PAPL worked examples (provider-travel.md, activity-based-transport.md) make excellent fixtures — encode all four as tests with their published expected totals ($70.83/$21.50 ABT example; $100/$41.67/$46.80 travel example; the MMM4-5 apportionment example).
5. **Catalogue-import validation** (TRD-002): every stored support item code must exist in the imported official catalogue with matching day-variant, and every stored rate ≤ the catalogue limit effective at today's date; run as a lint-style check surfaced in the UI, not a hard block (quotable/negotiated items exist).
6. **Invoice-level invariants**: no line's unit price exceeds its item's limit at service date; non-price-limited lines carry the notional-unit convention; invoice total = Σ line totals (guards the double-write / duplicate-merge bugs in findings #7/#9).

## 12. Known open questions

- **Which state's public-holiday calendar?** Needs a user setting (single value is fine for a solo worker).
- **MMM region**: assume MMM1-3 (30-min cap) as today, or make it a setting alongside the state? Recommend a setting with MMM1-3 default.
- **Remote/very-remote price columns**: out of scope unless the worker operates in MMM6-7.
