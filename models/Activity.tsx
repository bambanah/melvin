interface ActivityType {
	description: string;
	rate_type: string;
	week_day: {
		item_code: string;
		rate: number | undefined;
	};
	week_night: {
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

	week_day = {
		item_code: "",
		rate: undefined,
	};

	week_night = {
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
