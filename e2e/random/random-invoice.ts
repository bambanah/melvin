import dayjs from "dayjs";
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

type Activity = {
	supportItem: string;
	date: string;
	startTime: string;
	endTime: string;
	transitDistance: string;
	transitDuration: string;
};

export class RandomInvoice {
	invoiceNo: string;
	billTo: string;
	activities: Activity[];

	constructor(invoiceNo?: string, billTo?: string, activities?: Activity[]) {
		this.invoiceNo =
			invoiceNo?.toString() ??
			Math.floor(Math.random() * 999_999_999 + 1).toString();
		this.billTo = billTo ?? pickRandomFrom(BILL_TO);
		this.activities = activities ?? [
			{
				supportItem: "",
				date: dayjs().format("DD/MM/YYYY"),
				startTime: "13:00",
				endTime: "14:00",
				transitDistance: "10",
				transitDuration: "20",
			},
		];
	}
}
