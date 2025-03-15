import { faker } from "@faker-js/faker";
import dayjs from "dayjs";

export const randomInvoice = ({
	invoiceNo,
	billTo,
	supportItemId,
	ownerId,
	clientId
}: {
	invoiceNo?: string;
	billTo?: string;
	supportItemId?: string;
	ownerId?: string;
	clientId?: string;
} = {}) => ({
	invoiceNo:
		invoiceNo?.toString() ??
		faker.number.int({ min: 10000, max: 99999 }).toString(),
	billTo: billTo ?? faker.company.name(),
	activities: [
		{
			supportItemId: supportItemId ?? "",
			ownerId: ownerId ?? "",
			clientId: clientId ?? "",
			date: dayjs().format("YYYY-MM-DD"),
			startTime: "13:00",
			endTime: "14:00",
			transitDistance: faker.number.int({ min: 1, max: 20 }),
			transitDuration: faker.number.int({ min: 1, max: 20 })
		}
	]
});
