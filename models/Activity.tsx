import { Activity as ActivityType } from "../shared/types";

export default class Activity implements ActivityType {
	description = "";

	rate_type = "";

	weekday = {
		item_code: "",
		rate: undefined,
	};

	weeknight = {
		item_code: "",
		rate: undefined,
	};

	saturday = {
		item_code: "",
		rate: undefined,
	};

	sunday = {
		item_code: "",
		rate: undefined,
	};
}
