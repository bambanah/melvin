import supportItems from "@utils/ndis-support-catalogue-22-23.json";
import { pickRandomFrom } from "./utils";

export const randomSupportItem = (
	description?: string,
	weekdayCode?: string,
	weekdayRate?: string
) => {
	let randomSupportItem;
	do {
		randomSupportItem = pickRandomFrom(supportItems);
	} while (!randomSupportItem.QLD && !weekdayRate);

	return {
		description: description ?? randomSupportItem.supportItemName,
		weekdayCode: weekdayCode ?? randomSupportItem.supportItemNumber,
		weekdayRate: weekdayRate ?? randomSupportItem.QLD?.toString() ?? "10",
	};
};
