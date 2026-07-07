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
	expect(registrationGroups.length).toEqual(36);
});

test("should get support items", () => {
	const supportItems = getSupportItemDefs("Group And Centre Based Activities");
	expect(supportItems.length).toEqual(14);
});

// Regression net for catalogue refreshes: the travel/ABT lookups match on the
// exact `supportItemName` strings above. If a future catalogue renames those
// items, these lookups silently return undefined and drop every invoice's
// travel line — so pin that they resolve to a defined code for a group-0125
// (community access) and group-0136 (group activities) item.
test("travel/ABT lookups resolve to a defined code for the billed 0125/0136 families", () => {
	expect(getNonLabourTravelCode("04_104_0125_6_1")).toBeDefined();
	expect(getActivityBasedTransportCode("04_104_0125_6_1")).toBeDefined();
	expect(getNonLabourTravelCode("04_102_0136_6_1")).toBeDefined();
	expect(getActivityBasedTransportCode("04_102_0136_6_1")).toBeDefined();
});
