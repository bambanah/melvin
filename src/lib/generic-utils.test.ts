import { pickRandomFrom, round } from "@/lib/generic-utils";
import { expect, test } from "vitest";

const testArr = ["first", "second", "third", "fourth", "fifth"];

test("should correctly pick random from array", () => {
	const random = pickRandomFrom(testArr);

	expect(testArr).toContain(random);
});

test("should correctly avoid specified item when picking random from array", () => {
	for (let i = 0; i < 20; i++) {
		const random = pickRandomFrom(testArr, "first");

		expect(random === "first").toBeFalsy();
	}
});

test("Should round correctly", () => {
	expect(round(10, 2)).toEqual(10);
	expect(round(3.546_77, 2)).toEqual(3.55);
	expect(round(10.1, 2)).toEqual(10.1);
	expect(round(1.555, 2)).toEqual(1.56);
	expect(round(1.55, 1)).toEqual(1.6);
	expect(round(1.5, 0)).toEqual(2);
	expect(round(305.085, 2)).toEqual(305.09);
});
