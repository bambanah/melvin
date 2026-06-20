# Quick Activity Entry — Tasks

Last Updated: 2026-06-20

## Data Model

- [ ] Add `ActivityTransportItem` model to schema
- [ ] Add `ActivityTransportType` enum (DISTANCE, PARKING, TOLL, OTHER)
- [ ] Add relation from Activity to ActivityTransportItem
- [ ] Create and run migration

## API

- [ ] Add `activityTransport` router (or extend activity router)
  - [ ] Create transport items when creating activity
  - [ ] Update transport items when modifying activity
  - [ ] Delete transport items with activity (cascade)
- [ ] Update `activity.add` to accept transport items
- [ ] Update `activity.modify` to accept transport items
- [ ] Update activity queries to include transport items

## Components

### Multi-Activity Form

- [ ] Create `src/components/activities/multi-activity-form.tsx`
- [ ] Date picker at top (default today)
- [ ] Activity row component with:
  - [ ] Client selector (recent chips + type-ahead)
  - [ ] Time range input (single field, parse `HH:MM-HH:MM`)
  - [ ] Transport km input (summing field)
  - [ ] Expandable parking/tolls section
  - [ ] Expandable advanced section (support item)
- [ ] Add/remove activity rows
- [ ] Form validation
  - [ ] Required: client, time range
  - [ ] Error: end before start
  - [ ] Warning: overlapping times
  - [ ] Ignore: empty rows
- [ ] Save all activities in single transaction
- [ ] Auto-create Trip when contiguous

### Client Selector

- [ ] Create `src/components/forms/client-quick-select.tsx`
- [ ] Show recent clients as tappable chips
- [ ] Type-ahead search below
- [ ] Track recent clients (localStorage or user preference)

### Time Range Input

- [ ] Create `src/components/forms/time-range-input.tsx`
- [ ] Parse `HH:MM-HH:MM` format (lenient with spaces)
- [ ] Validate start < end
- [ ] Return { startTime, endTime }

### Summing Distance Input

- [ ] Create `src/components/forms/summing-distance-input.tsx`
- [ ] Parse space-separated numbers
- [ ] Show computed total after blur
- [ ] Accept optional `km` suffix

## Entry Points

- [ ] Add global "+" FAB (mobile) / nav button (desktop)
- [ ] Route to multi-activity form with today's date
- [ ] Update calendar day modal to use multi-activity form
- [ ] Pass selected date to form

## Post-Save

- [ ] Success toast with activity count and trip status
- [ ] Navigate back to previous view

## Invoice Integration

- [ ] Update invoice generation to include ActivityTransportItem
- [ ] DISTANCE items: show as "Transport: X km × $0.99"
- [ ] PARKING/TOLL items: show type and amount (e.g., "Parking: $5.00")
- [ ] Use correct NDIS line items (Activity Based Transport codes)
