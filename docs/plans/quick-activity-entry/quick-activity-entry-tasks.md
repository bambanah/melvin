# Quick Activity Entry — Tasks

Last Updated: 2026-06-20

## Data Model

- [x] Add `ActivityTransportItem` model to schema
- [x] Add `ActivityTransportType` enum (DISTANCE, PARKING, TOLL, OTHER)
- [x] Add relation from Activity to ActivityTransportItem
- [x] Create and run migration

## API

- [x] Add `activityTransport` router (or extend activity router)
  - [x] Create transport items when creating activity
  - [x] Update transport items when modifying activity
  - [x] Delete transport items with activity (cascade)
- [x] Update `activity.add` to accept transport items
- [x] Update `activity.modify` to accept transport items
- [x] Update activity queries to include transport items
- [x] Add `activity.bulkAdd` for multi-activity form

## Components

### Multi-Activity Form

- [x] Create `src/components/activities/multi-activity-form.tsx`
- [x] Date picker at top (default today)
- [x] Activity row component with:
  - [x] Client selector (recent chips + type-ahead)
  - [x] Time range input (single field, parse `HH:MM-HH:MM`)
  - [x] Transport km input (summing field)
  - [x] Expandable parking/tolls section
  - [x] Expandable advanced section (support item)
- [x] Add/remove activity rows
- [x] Form validation
  - [x] Required: client, time range
  - [x] Error: end before start
  - [ ] Warning: overlapping times (deferred)
  - [x] Ignore: empty rows
- [x] Save all activities in single transaction
- [x] Auto-create Trip when contiguous

### Client Selector

- [x] Create `src/components/forms/client-quick-select.tsx`
- [x] Show recent clients as tappable chips
- [x] Type-ahead search below
- [x] Track recent clients (localStorage or user preference)

### Time Range Input

- [x] Create `src/components/forms/time-range-input.tsx`
- [x] Parse `HH:MM-HH:MM` format (lenient with spaces)
- [x] Validate start < end
- [x] Return { startTime, endTime }

### Summing Distance Input

- [x] Create `src/components/forms/summing-distance-input.tsx`
- [x] Parse space-separated numbers
- [x] Show computed total after blur
- [x] Accept optional `km` suffix

## Entry Points

- [x] Add global "+" FAB (mobile) / nav button (desktop)
- [x] Route to multi-activity form with today's date
- [x] Update calendar day modal to use multi-activity form
- [x] Pass selected date to form

## Post-Save

- [x] Success toast with activity count and trip status
- [x] Navigate back to previous view

## Invoice Integration

- [x] Update activity cost calculation to include ActivityTransportItem
- [x] Update invoice PDF generation to show transport items
- [x] DISTANCE items: show as "Activity Based Transport: X km × $0.99"
- [x] PARKING/TOLL items: show type and amount (e.g., "Parking: $5.00")
- [x] Use correct NDIS line items (04_799_0104_6_1)
