# 015 — Fix transportItems.amount String-to-Number Validation

**Status**: DONE
**Depends on**: 012 (fixes a field introduced by the quick-entry `ActivityTransportItem` work)

> Migrated 2026-07-02 from `docs/plans/transport-amount-validation/` (pre-numbering three-file format); plan, context, and tasks merged into this file.

## Context

The update activity form was saving `transportItems.amount` as a string when the Zod schema expects a number, causing form validation errors.

## Root Cause

The `rules={{ valueAsNumber: true }}` approach doesn't work with react-hook-form's `Controller`/`FormField` components. The `rules` prop on `FormField` explicitly omits `valueAsNumber` because it only works with `register()` (uncontrolled inputs).

## Solution

Use `parseFloat()` in the `onChange` handler to convert the string value to a number before passing it to the form state. This matches the pattern used in `multi-activity-form.tsx`.

```tsx
<Input
	type="number"
	step={0.1}
	{...field}
	onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
/>
```

## Files Changed

- `src/components/activities/activity-form.tsx` - Updated three fields:
  - `transitDistance`
  - `transitDuration`
  - `transportItems.0.amount`

## Key Files

- `src/components/activities/activity-form.tsx` - The form with number input fields
- `src/components/activities/multi-activity-form.tsx` - Reference implementation using parseFloat
- `src/schema/activity-schema.ts` - Zod schema expecting `amount: z.number().min(0)`

## Decision

Chose `parseFloat()` in `onChange` over:

1. **Zod coerce** (`z.coerce.number()`) - Would require schema changes and affects all consumers
2. **FormField rules** - Not supported; `valueAsNumber` is explicitly omitted from Controller types

## Tasks

Last Updated: 2026-06-28

### Completed

- [x] Investigate root cause of string-to-number validation error
- [x] Update `transitDistance` field with parseFloat onChange
- [x] Update `transitDuration` field with parseFloat onChange
- [x] Update `transportItems.0.amount` field with parseFloat onChange
- [x] Verify typecheck passes

### Remaining

- [ ] Test in browser: add activity-based transport with an amount
- [ ] Verify form submits without validation errors
- [ ] Verify amount is saved correctly to database
