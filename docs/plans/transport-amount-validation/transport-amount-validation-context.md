# Context: Transport Amount Validation Fix

## Key Files

- `src/components/activities/activity-form.tsx` - The form with number input fields
- `src/components/activities/multi-activity-form.tsx` - Reference implementation using parseFloat
- `src/schema/activity-schema.ts` - Zod schema expecting `amount: z.number().min(0)`

## Decision

Chose `parseFloat()` in `onChange` over:

1. **Zod coerce** (`z.coerce.number()`) - Would require schema changes and affects all consumers
2. **FormField rules** - Not supported; `valueAsNumber` is explicitly omitted from Controller types
