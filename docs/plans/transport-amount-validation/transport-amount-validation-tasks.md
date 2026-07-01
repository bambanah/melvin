# Tasks: Transport Amount Validation Fix

Last Updated: 2026-06-28

## Completed

- [x] Investigate root cause of string-to-number validation error
- [x] Update `transitDistance` field with parseFloat onChange
- [x] Update `transitDuration` field with parseFloat onChange
- [x] Update `transportItems.0.amount` field with parseFloat onChange
- [x] Verify typecheck passes

## Remaining

- [ ] Test in browser: add activity-based transport with an amount
- [ ] Verify form submits without validation errors
- [ ] Verify amount is saved correctly to database
