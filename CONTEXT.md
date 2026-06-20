# Domain Glossary

## Core Entities

**Activity**
A single service delivery to a Client. Has a date, start/end time, and is billed under a Support Item. May include Activity Based Transport and Provider Travel costs.

**Client**
A participant receiving NDIS-funded support. Has a stored `distanceToClient` used to calculate Provider Travel.

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

## Key Distinctions

- Provider Travel is **predictable** (based on client's address) and **apportionable** (split across Trip participants)
- Activity Based Transport is **ad-hoc** (varies per activity) and belongs entirely to one Client
- Both are billed as non-labour km costs but under different NDIS support item codes
