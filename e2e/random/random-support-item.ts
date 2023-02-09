import supportItems from "../../public/ndis-support-catalogue-22-23.json";
import { pickRandomFrom } from "./utils";

export class RandomSupportItem {
	description: string;
	weekdayCode: string;
	weekdayRate: string;

	constructor() {
		let randomSupportItem;
		do {
			randomSupportItem = pickRandomFrom(supportItems);
		} while (!randomSupportItem.QLD);

		this.description = randomSupportItem.supportItemName;
		this.weekdayCode = randomSupportItem.supportItemNumber;
		this.weekdayRate = randomSupportItem.QLD.toString();
	}
}
