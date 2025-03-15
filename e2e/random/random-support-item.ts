import { faker } from "@faker-js/faker";

export const randomSupportItem = (
	description?: string,
	weekdayCode?: string,
	weekdayRate?: string
) => ({
	description: description ?? faker.lorem.words(3),
	weekdayCode:
		weekdayCode ??
		faker.helpers.fromRegExp(/[0-9]{2}_[0-9]{9}_[0-9]{4}_[0-9]_[0-9]/),
	weekdayRate: weekdayRate ?? faker.finance.amount({ min: 5, max: 200 })
});
