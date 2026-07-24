import { faker } from "@faker-js/faker";
import { format } from "date-fns";

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
		"INV-" + faker.number.int({ min: 10000, max: 99999 }).toString(),
	billTo: billTo ?? faker.company.name(),
	activities: [
		{
			supportItemId: supportItemId ?? "",
			ownerId: ownerId ?? "",
			clientId: clientId ?? "",
			date: format(new Date(), "yyyy-MM-dd"),
			startTime: "13:00",
			endTime: "14:00",
			transitDistance: faker.number.int({ min: 1, max: 20 }),
			transitDuration: faker.number.int({ min: 1, max: 20 })
		}
	]
});
