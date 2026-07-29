import { supportItemRatesSchema } from "@/schema/support-item-rates-schema";

import { expect, test } from "vitest";

/**
 * Custom Rate overrides are typed into number inputs, so they arrive as
 * strings. These assertions pin the message each path shows the Provider,
 * matching the wording of the Support Item form's own rate fields.
 */
const messageFor = (input: unknown, field: string) => {
	const result = supportItemRatesSchema.safeParse(input);
	if (result.success) return undefined;
	return result.error.issues.find((issue) => issue.path.join(".") === field)
		?.message;
};

test("coerces overrides typed as strings and leaves absent ones unset", () => {
	const result = supportItemRatesSchema.safeParse({
		supportItemId: "support-item-1",
		weekdayRate: "67.56"
	});

	expect(result.success).toBe(true);
	expect(result.data?.weekdayRate).toBe(67.56);
	expect(result.data?.sundayRate).toBeUndefined();
});

// Current behaviour, not desired behaviour: the dialog submits every rate
// field, so a blank one arrives as "" and coerces to a $0 override that then
// wins over the Support Item's own rate. Fixing that is its own change.
test("coerces a blank override to zero", () => {
	const result = supportItemRatesSchema.safeParse({
		supportItemId: "support-item-1",
		weekdayRate: ""
	});

	expect(result.success).toBe(true);
	expect(result.data?.weekdayRate).toBe(0);
});

test("rejects a non-numeric override", () => {
	expect(
		messageFor(
			{ supportItemId: "support-item-1", weekdayRate: "abc" },
			"weekdayRate"
		)
	).toBe("Must be a number");
});

test("rejects more than two decimal places", () => {
	expect(
		messageFor(
			{ supportItemId: "support-item-1", sundayRate: "1.234" },
			"sundayRate"
		)
	).toBe("Can't be more than 2 decimal places (x.xx)");
});

test("requires a support item", () => {
	expect(messageFor({ supportItemId: "" }, "supportItemId")).toBe("Required");
});
