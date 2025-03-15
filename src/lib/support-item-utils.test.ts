import {
	getNonLabourTravelCode,
	getRegistrationGroups,
	getSupportCategories,
	getSupportItemDefs
} from "@/lib/support-item-utils";
import { expect, test } from "vitest";

test("Should return correct provider travel - non-labour costs code", () => {
	expect(getNonLabourTravelCode("04_104_0125_6_1")).toEqual("04_799_0125_6_1");
	expect(getNonLabourTravelCode("04_102_0136_6_1")).toEqual("04_799_0136_6_1");
});

test("should get support categories", () => {
	const supportCategories = getSupportCategories();
	expect(supportCategories.length).toEqual(15);
});

test("should get registration groups", () => {
	const registrationGroups = getRegistrationGroups();
	expect(registrationGroups.length).toEqual(35);
});

test("should get support items", () => {
	const supportItems = getSupportItemDefs("Group And Centre Based Activities");
	expect(supportItems.length).toEqual(104);
});
