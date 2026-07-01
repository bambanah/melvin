# Group Activity Form - Tasks

Last Updated: 2026-06-28

## Completed

- [x] Add `excludeClientId` prop to ClientQuickSelect
- [x] Extend ActivityRowData with isGroup and groupClientId
- [x] Add Group toggle button to ActivityRow
- [x] Add second client picker (shown when isGroup=true)
- [x] Update validation for groupClientId
- [x] Update submit handler to create two activities for groups
- [x] Use defaultGroupSupportItemId for group activities

## Testing

- [ ] Test creating a group activity with two clients
- [ ] Verify two activities appear on calendar
- [ ] Verify transport items only on primary client
- [ ] Test validation error when groupClientId missing
