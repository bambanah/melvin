import { z } from "zod";

export const NOT_A_NUMBER_MESSAGE = "Must be a number";
export const TOO_MANY_DECIMALS_MESSAGE =
	"Can't be more than 2 decimal places (x.xx)";

/**
 * A number field fed by a DOM number input, which hands back a string - so it
 * coerces.
 *
 * The `<string | number>` type argument is load-bearing: a bare
 * `z.coerce.number()` infers `unknown` as its *input* type, and `zodResolver`
 * types a form's field values from the input type - so without it every numeric
 * form field would be typed `unknown`.
 */
export const numberFromInput = (error = NOT_A_NUMBER_MESSAGE) =>
	z.coerce.number<string | number>({ error });

/**
 * An optional rate in dollars - a Support Item's own Day Rate, or a Client's
 * Custom Rate override of one.
 *
 * Only an *absent* field is left unset: a blank input arrives as `""`, which
 * coerces to `0`.
 */
export const optionalRate = numberFromInput()
	.multipleOf(0.01, TOO_MANY_DECIMALS_MESSAGE)
	.optional();

/**
 * A required date, chosen from a date picker. Only a missing date gets the
 * custom message; a wrong type falls through to Zod's own wording.
 */
export const requiredDate = (message: string) =>
	z.date({
		error: (issue) => (issue.input === undefined ? message : undefined)
	});
