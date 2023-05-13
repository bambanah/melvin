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
