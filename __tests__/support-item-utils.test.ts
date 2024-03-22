import {
	getSupportCategories,
	getRegistrationGroups,
	getSupportItemDefs,
} from "@/utils/support-item-utils";

describe("support item utils", () => {
	it("should get support categories", () => {
		const supportCategories = getSupportCategories();
		expect(supportCategories.length).toEqual(15);
	});

	it("should get registration groups", () => {
		const registrationGroups = getRegistrationGroups();
		expect(registrationGroups.length).toEqual(35);
	});

	it("should get support items", () => {
		const supportItems = getSupportItemDefs(
			"Group And Centre Based Activities"
		);
		expect(supportItems.length).toEqual(104);
	});
});
