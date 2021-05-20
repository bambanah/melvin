interface ActivityType {
	description: string;
	rate_type: string;
	weekday: {
		item_code: string;
		rate: number | undefined;
	};
	weeknight: {
		item_code: string;
		rate: number | undefined;
	};
	saturday: {
		item_code: string;
		rate: number | undefined;
	};
	sunday: {
		item_code: string;
		rate: number | undefined;
	};
}

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
