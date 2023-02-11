import { pickRandomFrom } from "./utils";

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
}: {
	name?: string;
	number?: number;
	billTo?: string;
} = {}) => ({
	name: name ?? pickRandomFrom(USERS),
	number:
		number?.toString() ??
		Math.floor(Math.random() * 999_999_999 + 1).toString(),
	billTo: billTo ?? pickRandomFrom(BILL_TO),
});
