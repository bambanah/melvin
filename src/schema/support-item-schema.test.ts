import { supportItemSchema } from "@/schema/support-item-schema";

import { expect, test } from "vitest";

/**
 * The rate fields are fed by number inputs, which hand back strings - so the
 * schema coerces. These assertions pin the exact message each validation path
 * shows the Provider, which types alone can't catch.
 */
const base = {
	description: "Assistance with self-care",
	weekdayCode: "01_011_0107_1_1"
};

const messageFor = (input: unknown, field: string) => {
	const result = supportItemSchema.safeParse(input);
	if (result.success) return undefined;
	return result.error.issues.find((issue) => issue.path.join(".") === field)
		?.message;
};

test("accepts a rate typed as a string", () => {
	const result = supportItemSchema.safeParse({
		...base,
		weekdayRate: "67.56"
	});

	expect(result.success).toBe(true);
	expect(result.data?.weekdayRate).toBe(67.56);
	expect(result.data?.rateType).toBe("HOUR");
});

test("requires the weekday rate", () => {
	expect(messageFor(base, "weekdayRate")).toBe("Must be a number");
	expect(messageFor({ ...base, weekdayRate: "" }, "weekdayRate")).toBe(
		"Required"
	);
	expect(messageFor({ ...base, weekdayRate: 0 }, "weekdayRate")).toBe(
		"Required"
	);
});

test("rejects a non-numeric rate", () => {
	expect(messageFor({ ...base, weekdayRate: "abc" }, "weekdayRate")).toBe(
		"Must be a number"
	);
	expect(
		messageFor(
			{ ...base, weekdayRate: 1, weeknightRate: "abc" },
			"weeknightRate"
		)
	).toBe("Must be a number");
});

test("rejects more than two decimal places", () => {
	expect(messageFor({ ...base, weekdayRate: "1.234" }, "weekdayRate")).toBe(
		"Can't be more than 2 decimal places (x.xx)"
	);
	expect(
		messageFor({ ...base, weekdayRate: 1, sundayRate: 1.234 }, "sundayRate")
	).toBe("Can't be more than 2 decimal places (x.xx)");
});

test("rejects a malformed item code", () => {
	expect(messageFor({ ...base, weekdayCode: "nope" }, "weekdayCode")).toBe(
		"Must be in format XX_XXX_XXXX_X_X"
	);
});

test("leaves the optional rate pairs unset when absent", () => {
	const result = supportItemSchema.safeParse({ ...base, weekdayRate: 1 });

	expect(result.success).toBe(true);
	expect(result.data?.weeknightRate).toBeUndefined();
	expect(result.data?.sundayRate).toBeUndefined();
});
