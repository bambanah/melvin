# Group Activity Support in Multi-Activity Form

## Context

The "Add Activities" dialog only supported single-participant activities. Group activities (2 participants sharing a session) are represented as two separate Activity records.

## Approach

- Added "Group" toggle button to each activity row
- When enabled, shows second client picker below primary
- On submit, creates two Activity records (one per client) with same time/support item
- Only primary client gets transport items (avoid double-counting)
- Disables auto-trip creation when group activities present

## Files Changed

- `src/components/activities/multi-activity-form.tsx` - Main UI changes
- `src/components/forms/client-quick-select.tsx` - Added `excludeClientId` prop
