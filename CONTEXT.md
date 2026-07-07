# Domain Glossary

## Core Entities

**Invoice**
A grouping of Activities for a single Client, representing a bill for NDIS-funded services. Can be exported as a PDF for submission to the billing handler.

**Invoice Version**
An immutable snapshot of an Invoice's resolved content (line items, rates, totals, header details) frozen at the moment the Invoice is sent. An Invoice accumulates versions as it is amended and re-sent; every version remains downloadable forever. The first version is displayed with the bare invoice number (INV-001), subsequent versions with a letter suffix derived from the version ordinal (INV-001a, INV-001b, …).

**Draft**
An Invoice (or PDF render of one) whose content is not yet frozen in an Invoice Version — either never sent, or re-opened by an Amendment. A PDF rendered from live data always carries a DRAFT watermark; a clean PDF can only be rendered from an Invoice Version.

**Amendment**
Correcting an already-sent Invoice (wrong support item, client out of funding, etc.). Sent and paid Invoices are locked against editing; Amending is the deliberate action that re-opens the working Invoice (from sent or paid), and re-sending it freezes the next Invoice Version. The previously sent versions are unaffected.

**Activity**
A single service delivery to a Client. Has a date, start/end time, and is billed under a Support Item. May include Activity Based Transport and Provider Travel costs.

**Client**
A participant receiving NDIS-funded support. Has a stored `distanceToClient` used to calculate Provider Travel. Either active (a current client) or inactive (a former client, hidden from pickers but retained with full invoice history). A Client with any sent Invoice cannot be deleted — only deactivated.

**Trip**
A group of back-to-back Activities on the same day where transit is shared. The first activity's transit is from home, middle activities have inter-client transit, and the last activity includes the return leg.

**Support Item**
An NDIS line item with a code, description, and rate. Activities are billed against a Support Item.

## Billable Driving

**Provider Travel**
Driving to and from clients (home → client → home). Billed as NDIS "Provider Travel – non-labour costs". Stored as `transitDistance` on Activity. Calculated automatically from Client's `distanceToClient` and Trip structure.

**Inter-Client Transit**
The distance and travel time between two clients in a Trip. Entered manually by the provider for each leg. Used to calculate Provider Travel for middle and last activities in a Trip.

**Transit Rate**
The per-kilometre rate charged for Provider Travel. Defaults to the User's configured rate (max $0.99/km per NDIS rules). Can be overridden per Client. Separate rates exist for individual activities (`transitRatePerKm`) and group activities (`groupTransitRatePerKm`).

**Travel Time Cap**
NDIS MMM1-3 regions limit claimable travel time to 30 minutes per leg. Applied as a hard cap during transit calculation, with a warning shown when exceeded.

**Activity Based Transport**
Driving done during an activity as part of delivering support (e.g., driving the client to an appointment). Billed as NDIS "Activity Based Transport" at $0.99/km. Stored as `ActivityTransportItem` records. Entered manually by the provider.

## NDIS Pricing

**Price Guide**
The official NDIA document (published annually) that defines all valid Support Item codes, their maximum prices, and billing rules. Used to validate that invoiced rates don't exceed NDIS limits.

**Price Limited Support**
A Support Item with a maximum price set by NDIA. Providers can charge up to but not exceed this rate.

**Quotable Support**
A Support Item with no fixed price — the rate is negotiated between provider and participant. Not subject to price validation.

## Key Distinctions

- Provider Travel is **predictable** (based on client's address) and **apportionable** (split across Trip participants)
- Activity Based Transport is **ad-hoc** (varies per activity) and belongs entirely to one Client
- Both are billed as non-labour km costs but under different NDIS support item codes
