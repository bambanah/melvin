import { floorToCent, round } from "@/lib/generic-utils";
import { expect, test } from "vitest";

test("Should round correctly", () => {
	expect(round(10, 2)).toEqual(10);
	expect(round(3.546_77, 2)).toEqual(3.55);
	expect(round(10.1, 2)).toEqual(10.1);
	expect(round(1.555, 2)).toEqual(1.56);
	expect(round(1.55, 1)).toEqual(1.6);
	expect(round(1.5, 0)).toEqual(2);
	expect(round(305.085, 2)).toEqual(305.09);
});

test("Should floor to the nearest cent", () => {
	expect(floorToCent(0.99 / 2)).toEqual(0.49);
	expect(floorToCent(0.85 / 2)).toEqual(0.42);
	expect(floorToCent(70.2 / 2)).toEqual(35.1);
	expect(floorToCent(0.99 / 3)).toEqual(0.33);
	expect(floorToCent(0.99 / 10)).toEqual(0.09);
});
