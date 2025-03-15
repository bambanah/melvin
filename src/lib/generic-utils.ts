export function round(value: number, exp: number) {
	if (exp === undefined || +exp === 0) return Math.round(value);

	if (Number.isNaN(value) || !(typeof exp === "number" && exp % 1 === 0))
		return Number.NaN;

	// Shift
	let valueArray = value.toString().split("e");
	value = Math.round(
		+`${valueArray[0]}e${valueArray[1] ? +valueArray[1] + exp : exp}`
	);

	// Shift back
	valueArray = value.toString().split("e");
	return +`${valueArray[0]}e${valueArray[1] ? +valueArray[1] - exp : -exp}`;
}

export function groupBy<T>(arr: T[], keyGetter: (item: T) => string) {
	const groupedObj: { [key: string]: T[] } = {};

	for (const item of arr) {
		const key = keyGetter(item);
		const arr = (groupedObj[key] || []) as T[];

		arr.push(item);

		groupedObj[key] = arr;
	}

	return groupedObj;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const debounce = <T extends Function>(fn: T, ms = 300) => {
	let timeoutId: ReturnType<typeof setTimeout>;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (this: any, ...args: unknown[]) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn.apply(this, args), ms);
	};
};

export function pickRandomFrom<T>(arr: T[], avoid?: T) {
	if (arr.length === 1) {
		return arr[0];
	}

	if (avoid === undefined) {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	let selected: T = avoid;

	while (selected === avoid) {
		selected = arr[Math.floor(Math.random() * arr.length)];
	}

	return selected;
}
