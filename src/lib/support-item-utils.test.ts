import {
	getActivityBasedTransportCode,
	getNonLabourTravelCode,
	getRegistrationGroups,
	getSupportCategories,
	getSupportItemDefs
} from "@/lib/support-item-utils";
import { expect, test } from "vitest";

test("Should return correct provider travel - non-labour costs code", () => {
	expect(getNonLabourTravelCode("04_104_0125_6_1")).toEqual("04_799_0125_6_1");
	expect(getNonLabourTravelCode("04_102_0136_6_1")).toEqual("04_799_0136_6_1");

	// 9-digit middle block is a valid code shape
	expect(getNonLabourTravelCode("04_123456789_0125_6_1")).toEqual(
		"04_799_0125_6_1"
	);

	// _T suffix is a valid code shape
	expect(getNonLabourTravelCode("04_104_0125_6_1_T")).toEqual(
		"04_799_0125_6_1"
	);

	// Group with no non-labour travel item in the catalogue
	expect(getNonLabourTravelCode("04_104_9999_6_1")).toEqual(undefined);

	// Malformed codes
	expect(getNonLabourTravelCode("not-a-code")).toEqual(undefined);
	expect(getNonLabourTravelCode("04_1044_0125_6_1")).toEqual(undefined);
	expect(getNonLabourTravelCode("")).toEqual(undefined);
});

test("Should return correct activity based transport code", () => {
	expect(getActivityBasedTransportCode("04_104_0125_6_1")).toEqual(
		"04_590_0125_6_1"
	);

	// 9-digit middle block is a valid code shape
	expect(getActivityBasedTransportCode("04_123456789_0125_6_1")).toEqual(
		"04_590_0125_6_1"
	);

	// _T suffix is a valid code shape
	expect(getActivityBasedTransportCode("04_104_0125_6_1_T")).toEqual(
		"04_590_0125_6_1"
	);

	// Group with no activity based transport item in the catalogue
	expect(getActivityBasedTransportCode("04_104_9999_6_1")).toEqual(undefined);

	// Malformed codes
	expect(getActivityBasedTransportCode("not-a-code")).toEqual(undefined);
	expect(getActivityBasedTransportCode("04_1044_0125_6_1")).toEqual(undefined);
	expect(getActivityBasedTransportCode("")).toEqual(undefined);
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
