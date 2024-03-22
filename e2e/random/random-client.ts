import { pickRandomFrom } from "@/utils/generic-utils";

const USERS = [
	"Finn the Human",
	"Jake the Dog",
	"Princess Bubblegum",
	"Marceline",
	"Ice King",
	"BMO",
	"Lumpy Space Princess",
	"Lady Rainicorn",
	"Earl of Lemongrab",
	"Cinnamon Bun",
	"Peppermint Butler",
	"Gunter",
	"Abracadaniel",
	"Tree Trunks",
	"Susan Strong",
];
const BILL_TO = ["Corp Enterprises", "Enterprise Corp", "Company Two"];

export const randomClient = ({
	name,
	number,
	billTo,
	avoidName,
}: {
	name?: string;
	number?: number;
	billTo?: string;
	avoidName?: string;
} = {}) => {
	const clientName = name ?? pickRandomFrom(USERS, avoidName);

	return {
		name: clientName,
		number:
			number?.toString() ??
			Math.floor(Math.random() * 999_999_999 + 1).toString(),
		invoiceNumberPrefix: `${clientName.split(" ").slice(-1)}-`,
		billTo: billTo ?? pickRandomFrom(BILL_TO),
	};
};
