# ADR 0003: Allow Trip Modification After Invoicing

**Status**: Accepted  
**Date**: 2026-06-19

## Context

When a Trip contains activities that have already been invoiced, modifying the Trip (adding/removing activities, changing inter-client distances) affects the transit allocation for all activities in the Trip — including invoiced ones.

Options considered:

1. **Lock trips with invoiced activities** — Prevent any modification; user must void invoice first
2. **Version trips** — Keep historical snapshots; invoiced activities reference their version
3. **Allow modification, recalculate all** — Permit changes, update transit on all activities, show warning

## Decision

**Allow modification with recalculation**. When a Trip containing invoiced activities is modified:

1. Show a warning: "This trip includes invoiced activities. Modifying it will change their transit values."
2. Recalculate transit for all activities in the Trip
3. The invoice line items remain unchanged (invoices are immutable snapshots)

Trip versioning is deferred as a future feature if audit requirements emerge.

## Consequences

**Positive**:
- Simple mental model: the Trip always reflects current reality
- No workflow friction (no need to void invoices for corrections)
- Providers can fix mistakes without administrative overhead

**Negative**:
- Activity transit values can diverge from what was invoiced
- No built-in audit trail of what transit was at invoice time (invoice itself is the record)
- Could cause confusion if provider expects invoice to update automatically

**Mitigations**:
- Clear warning before modifying trips with invoiced activities
- Invoice stores the transit value at time of generation (immutable)
- Future: add Trip versioning if compliance or audit needs arise
