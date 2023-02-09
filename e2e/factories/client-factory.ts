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

const pickRandomFrom = (arr: string[]) =>
	arr[Math.floor(Math.random() * arr.length)];

export const randomClient = () => {
	const name = pickRandomFrom(USERS);
	const number = Math.floor(Math.random() * 999_999_999 + 1).toString();
	const billTo = pickRandomFrom(BILL_TO);

	return {
		name,
		number,
		billTo,
	};
};
