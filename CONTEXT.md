# Domain Glossary

## Core Entities

**Provider**
The sole-trader NDIS support provider using Melvin (the `User` in code). Owns all Clients, Activities, and Invoices. Their ABN and bank details are printed on invoices; they configure a default Transit Rate and default Support Items (one solo, one group) for quick entry.

**Invoice**
A grouping of Activities for a single Client, representing a bill for NDIS-funded services. Moves through three statuses: Draft (stored as Created), Sent, and Paid. Sending freezes an Invoice Version; Amending re-opens it. An Invoice that has ever been sent (has any Invoice Version) cannot be deleted. Can be exported as a PDF for submission to the billing handler.

**Invoice Version**
An immutable snapshot of an Invoice's resolved content (line items, rates, totals, header details) frozen at the moment the Invoice is sent. An Invoice accumulates versions as it is amended and re-sent; every version remains downloadable forever. The first version is displayed with the bare invoice number (INV-001), subsequent versions with a letter suffix derived from the version ordinal (INV-001a, INV-001b, …).

**Backfilled Version**
An Invoice Version reconstructed after the fact for Invoices sent before versioning existed. Its content is a best-effort recompute from live data rather than a true freeze at send time; it is flagged and badged as backfilled.

**Draft**
An Invoice (or PDF render of one) whose content is not yet frozen in an Invoice Version — either never sent, or re-opened by an Amendment. A PDF rendered from live data always carries a DRAFT watermark; a clean PDF can only be rendered from an Invoice Version.

**Amendment**
Correcting an already-sent Invoice (wrong support item, client out of funding, etc.). Sent and paid Invoices are locked against editing; Amending is the deliberate action that re-opens the working Invoice (from sent or paid), and re-sending it freezes the next Invoice Version. The previously sent versions are unaffected.

**Invoice Number**
The number a Client's billing handler sees (e.g. INV-001). Each Client can set a prefix; the suggested next number is the highest existing number plus one, preserving zero-padding. The printed/downloaded number also carries the Invoice Version suffix.

**Bill To**
The recipient printed on an Invoice (e.g. a plan manager or the participant themselves). Defaults from the Client's stored bill-to and can be overridden per Invoice.

**Activity**
A single service delivery to a Client. Has a date, and is billed under a Support Item — by time span (start/end) for hourly items or by its own distance for per-km items. May include Activity Based Transport and Provider Travel costs.

**Pending Activity**
An Activity not yet attached to any Invoice. Pending Activities are grouped by Client and offered for pick-up when the Client's next Invoice is created.

**Client**
A participant receiving NDIS-funded support. Has a stored `distanceToClient` used to calculate Provider Travel. Either active (a current client) or inactive (a former client, hidden from pickers but retained with full invoice history). A Client with any sent Invoice cannot be deleted — only deactivated.

**Trip**
A group of back-to-back Activities on the same day where transit is shared. The first activity's transit is from home, middle activities have inter-client transit, and the last activity includes the return leg.

**Support Item**
An NDIS line item with a code, description, and rates. Activities are billed against a Support Item. Carries a Rate Type and up to four Day Rates.

## Rates & Billing Lines

**Day Rate**
One of up to four code + rate pairs on a Support Item: weekday, weeknight, Saturday, Sunday. Each Activity resolves exactly one by its date and end time — a Saturday date takes the Saturday rate, Sunday the Sunday rate, a weekday activity ending 8 pm or later the weeknight rate, everything else the weekday rate (which is the only mandatory pair).

**Custom Rate**
A per-Client override of a Support Item's Day Rates. When billing, a Custom Rate for the Invoice's Client wins over the Support Item's own rate, day type by day type.

**Rate Type**
Whether a Support Item is billed by the hour (quantity = the Activity's duration) or by the kilometre (quantity = the Activity's own distance). A per-km item always bills its distance, even if a time span was also recorded.

**Billing Line**
One priced row on an invoice. An Activity expands into lines of five kinds: the support itself, Provider Travel labour costs (minutes), Provider Travel non-labour costs (km), Activity Based Transport (km), and flat Transport Expenses. Every total — printed rows, the invoice total, UI totals — is a sum of these lines; there is no second costing path.

## Billable Driving

**Provider Travel**
Driving to and from clients (home → client → home). Billed in two parts: **labour costs** — the travel minutes, charged at the Activity's resolved hourly Day Rate — and **non-labour costs** — the kilometres, charged at the Transit Rate under the Registration Group's travel code. Stored as `transitDuration` and `transitDistance` on Activity, calculated automatically from the Client's stored distance/travel time and Trip structure.

**Inter-Client Transit**
The distance and travel time between two clients in a Trip. Entered manually by the provider for each leg. Used to calculate Provider Travel for middle and last activities in a Trip.

**Transit Rate**
The per-kilometre rate charged for Provider Travel non-labour costs. Defaults to the User's configured rate (max $0.99/km per NDIS rules). Can be overridden per Client. For group activities, the resolved rate is apportioned by participant count — see **Group Activity**.

**Group Activity**
An Activity delivered to 2–10 Melvin Clients at once, recorded as one mirrored Activity per participant sharing a `groupSize` (the participant count at creation; membership is immutable afterwards). A group Support Item's stored rate holds the full per-session amount; each participant is billed `floorToCent(rate ÷ groupSize)` for the hourly support rate, Provider Travel per-km, and Activity Based Transport per-km alike.

**Travel Time Cap**
NDIS MMM1-3 regions limit claimable travel time to 30 minutes per leg. Applied as a hard cap during transit calculation (capping the minutes billed as Provider Travel labour costs), with a warning shown when exceeded.

**Activity Based Transport**
Costs of transporting the client during an activity as part of delivering support. Distance legs are billed at $0.99/km (apportioned for Group Activities); non-distance costs are billed as flat Transport Expenses. Stored as `ActivityTransportItem` records. Entered manually by the provider.

**Transport Expense**
A non-distance Activity Based Transport cost — parking, a toll, or other — billed as a flat amount at face value, with an optional note printed on the invoice.

## Payments

**Total Owing**
The amount outstanding across all Sent Invoices. Each Invoice contributes its latest Invoice Version's frozen total — never a live recompute — so later rate or catalogue edits can't move an amount already owed.

**Payment Matching**
Working backwards from a received payment amount to the combination(s) of Sent Invoices whose frozen totals sum exactly to it, so a lump-sum bank deposit can be resolved to the invoices it pays.

## NDIS Pricing

**Price Guide**
The official NDIA document (published annually) that defines all valid Support Item codes, their prices, and billing rules. Melvin bundles it as a catalogue and uses it to derive the Provider Travel and Activity Based Transport codes matching a Support Item's Registration Group. (Validating that rates don't exceed NDIS price limits is not implemented.)

**Registration Group**
The NDIA grouping a Support Item code belongs to (encoded in the code itself). An Activity's Provider Travel and Activity Based Transport are billed under the travel codes of the same Registration Group as its Support Item.

**Price Limited Support**
A Support Item with a maximum price set by NDIA. Providers can charge up to but not exceed this rate.

**Quotable Support**
A Support Item with no fixed catalogue price — the rate is negotiated between provider and participant.

## Key Distinctions

- Provider Travel is **predictable** (based on client's address) and **apportionable** (split across Trip participants)
- Activity Based Transport is **ad-hoc** (varies per activity) and belongs entirely to one Client
- Provider Travel **labour** costs are a time cost at the support item's own hourly rate; Provider Travel **non-labour** and Activity Based Transport **distance** are per-km costs under different NDIS travel codes; Transport Expenses are flat pass-through amounts
