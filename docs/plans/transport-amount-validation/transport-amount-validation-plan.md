# Fix transportItems.amount String-to-Number Validation

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
