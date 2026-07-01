# Group Activity Form - Context

## Key Files

- `src/components/activities/multi-activity-form.tsx` - Main form with group toggle
- `src/components/forms/client-quick-select.tsx` - Client picker with exclusion support
- `src/server/api/routers/activity-router.ts` - bulkAdd mutation (no changes needed)
- `src/components/invoices/invoice-activity-creation-form.tsx` - Reference for group pattern

## Key Decisions

1. **Toggle-based UX**: Explicit "Group" toggle per row rather than detecting support item type
2. **Two activities**: Group = two Activity records (one per client), not a new model
3. **Transport handling**: Only primary client gets transport items
4. **Trip handling**: Auto-trip disabled for group activities (same time slot)
