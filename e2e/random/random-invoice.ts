import dayjs from "dayjs";
import { pickRandomFrom } from "@/utils/generic-utils";

const BILL_TO = ["Corp Enterprises", "Enterprise Corp", "Company Two"];

export const randomInvoice = ({
	invoiceNo,
	billTo,
	supportItemId,
	ownerId,
	clientId,
}: {
	invoiceNo?: string;
	billTo?: string;
	supportItemId?: string;
	ownerId?: string;
	clientId?: string;
} = {}) => ({
	invoiceNo:
		invoiceNo?.toString() ??
		Math.floor(Math.random() * 999_999_999 + 1).toString(),
	billTo: billTo ?? pickRandomFrom(BILL_TO),
	activities: [
		{
			supportItemId: supportItemId ?? "",
			ownerId: ownerId ?? "",
			clientId: clientId ?? "",
			date: dayjs().format("YYYY-MM-DD"),
			startTime: "13:00",
			endTime: "14:00",
			transitDistance: "10",
			transitDuration: "20",
		},
	],
});
