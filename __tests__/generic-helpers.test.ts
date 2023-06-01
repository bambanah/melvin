import { pickRandomFrom } from "@utils/generic-utils";

describe("Generic utils test", () => {
	const testArr = ["first", "second", "third", "fourth", "fifth"];

	it("should correctly pick random from array", () => {
		const random = pickRandomFrom(testArr);

		expect(testArr).toContain(random);
	});

	it("should correctly avoid specified item when picking random from array", () => {
		for (let i = 0; i < 20; i++) {
			const random = pickRandomFrom(testArr, "first");

			expect(random === "first").toBeFalsy();
		}
	});
});
