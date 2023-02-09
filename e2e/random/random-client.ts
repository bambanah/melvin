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

export class RandomClient {
	name: string;
	number: string;
	billTo: string;

	constructor(name?: string, number?: number, billTo?: string) {
		this.name = name ?? pickRandomFrom(USERS);
		this.number =
			number?.toString() ??
			Math.floor(Math.random() * 999_999_999 + 1).toString();
		this.billTo = billTo ?? pickRandomFrom(BILL_TO);
	}
}
