import { formatCurrency } from "@/lib/utils";
import { expect, test } from "vitest";

// The formatter uses the runtime locale, so the currency symbol varies
// ("$" under en-AU, "A$" under en-US) - assert on the symbol-agnostic tail.

test("formatCurrency renders AUD with cents by default", () => {
	expect(formatCurrency(1234.5)).toMatch(/^A?\$1,234\.50$/);
	expect(formatCurrency(0)).toMatch(/^A?\$0\.00$/);
	expect(formatCurrency(62.17)).toMatch(/^A?\$62\.17$/);
});

test("formatCurrency drops forced cents when minimumFractionDigits is 0", () => {
	expect(formatCurrency(1234, 0)).toMatch(/^A?\$1,234$/);
	// Non-whole values still keep their cents
	expect(formatCurrency(1234.5, 0)).toMatch(/^A?\$1,234\.5$/);
});
