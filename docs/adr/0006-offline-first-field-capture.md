# Offline-first Log capture

## Status

accepted

## Context

The Log is a phone-first scratchpad providers use in the field - in the car, in rural driveways, between clients - to stamp start/finish times and log trip km as they happen. This is precisely where mobile signal is unreliable (the same MMM1-3 rural regions our Travel Time Cap already accounts for). A capture tool that can silently drop the timestamp a provider drove out to record is not trustworthy at the exact moment it matters most.

## Decision

The Log persists on-device (at minimum the open Session and recent captures) and syncs to the server opportunistically. Taps are durable with zero connectivity for as long as needed and reconcile when back online. Timestamps are stamped client-side at tap time, so the recorded moment is always the real one regardless of when the write reaches the server. Conflicts resolve last-write-wins per Session.

We chose this over online-only (fragile - a dropped signal blocks or loses a capture) and over optimistic-plus-retry (survives brief drops, but unsynced taps are lost if the phone closes or dies before reconnect).

## Consequences

- Last-write-wins is acceptable because this is a single-user app whose usage naturally splits by device - capture on phone in the field, promote/invoice on desktop later - making genuine concurrent edits of the same Session rare, and because every Session field is editable after the fact.
- Sessions are ephemeral and die at promotion, so the offline store only ever holds un-promoted work; it is not a long-lived local mirror of the billing model.
