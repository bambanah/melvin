import supportItems from "./ndis-support-catalogue-22-23.json";

export const getSupportItemDefs = (registrationGroupName?: string) => {
	return registrationGroupName === undefined
		? supportItems
		: supportItems.filter(
				(item) => item.registrationGroupName === registrationGroupName
		  );
};

export const getRegistrationGroups = () => [
	...new Set(supportItems.map((item) => item.registrationGroupName)),
];

export const getSupportCategories = () => [
	...new Set(supportItems.map((item) => item.supportCategoryName)),
];

export const getNonLabourTravelCode = (supportItemCode: string) => {
	// Identical to regex in support-item-schema, except capturing the group number (third block)
	const groupNumberMatch = supportItemCode.match(
		/^\d{2}_(?:\d{3}|\d{9})_(\d{4})_\d_\d(?:_T)?$/
	)?.[1];
	const groupNumber = Number(groupNumberMatch);

	const supportItem = supportItems.find(
		(activity) =>
			activity.registrationGroupNumber === groupNumber &&
			activity.supportItemName === "Provider travel - non-labour costs"
	);

	return supportItem?.supportItemNumber;
};
