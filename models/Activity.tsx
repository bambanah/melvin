import { Activity as ActivityType } from "../shared/types";

export default class Activity implements ActivityType {
	description = "";

	rate_type = "";

	weekday = {
		item_code: "",
		rate: 0,
	};

	weeknight = {
		item_code: "",
		rate: 0,
	};

	saturday = {
		item_code: "",
		rate: 0,
	};

	sunday = {
		item_code: "",
		rate: 0,
	};
}
