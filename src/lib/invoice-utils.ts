import { round } from "./generic-utils";

const getNumber = (invoiceNo: string): number | undefined => {
	const matches = invoiceNo.match(/\d+$/);

	return matches ? Number(matches[0]) : undefined;
};

export const getNextInvoiceNo = (
	previousInvoiceNumbers: string[],
	clientInvoicePrefix?: string | null
) => {
	if (previousInvoiceNumbers.length === 0)
		return {
			nextInvoiceNo: clientInvoicePrefix ? `${clientInvoicePrefix}1` : "",
			latestInvoiceNo: ""
		};

	const latestInvoiceNo = getHighestInvoiceNo(previousInvoiceNumbers);

	const invoicePrefix =
		clientInvoicePrefix || latestInvoiceNo?.replace(/\d+$/, "") || "";

	const matches = latestInvoiceNo?.match(/\d+$/);
	const numberOfDigits = matches ? matches[0].length : 0;

	const nextInvoiceNo = `${invoicePrefix}${
		matches
			? (Number.parseInt(matches[0]) + 1)
					.toString()
					.padStart(numberOfDigits, "0")
			: 1
	}`;

	return { nextInvoiceNo, latestInvoiceNo };
};

export const getHighestInvoiceNo = (
	invoiceNumbers: string[]
): string | undefined => {
	if (invoiceNumbers.length === 0) {
		return undefined;
	}

	const highest = invoiceNumbers.reduce((previous, current) => {
		const currentNumber = getNumber(current);
		const previousNumber = getNumber(previous);

		if (currentNumber === undefined) return previous;
		if (previousNumber === undefined) return current;

		return previousNumber >= currentNumber ? previous : current;
	});

	return getNumber(highest) ? highest : undefined;
};

const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/**
 * Version ordinal → display suffix: 1 → "", 2 → "a", 3 → "b" … 27 → "z",
 * 28 → "aa" (bijective base-26, like spreadsheet column letters).
 */
export function invoiceVersionSuffix(versionNumber: number): string {
	let n = versionNumber - 1;
	if (n <= 0) return "";

	let suffix = "";
	while (n > 0) {
		n -= 1;
		suffix = SUFFIX_ALPHABET[n % 26] + suffix;
		n = Math.floor(n / 26);
	}

	return suffix;
}

/** The number as printed/downloaded: stored `invoiceNo` + version suffix. */
export function displayInvoiceNo(
	invoiceNo: string,
	versionNumber: number
): string {
	return `${invoiceNo}${invoiceVersionSuffix(versionNumber)}`;
}

export function invoiceCandidatesFromPaymentAmount(
	paymentAmount: number,
	invoiceTotals: Map<number, string | string[]>
): (string | string[])[][] {
	const totalAmounts = [...invoiceTotals.keys()].sort((a, b) => a - b);

	const result: number[][] = [];

	function backtrack(
		currentCombo: number[],
		currentSum: number,
		candidateIndex: number
	): void {
		if (currentSum === paymentAmount) {
			result.push([...currentCombo]);
			return;
		} else if (
			candidateIndex >= totalAmounts.length ||
			currentSum > paymentAmount
		) {
			return;
		}

		backtrack([...currentCombo], currentSum, candidateIndex + 1);

		currentCombo.push(totalAmounts[candidateIndex]);
		backtrack(
			[...currentCombo],
			round(currentSum + totalAmounts[candidateIndex], 2),
			candidateIndex + 1
		);
	}

	backtrack([], 0, 0);

	return result.map((invoiceIds) =>
		invoiceIds
			.map((id) => invoiceTotals.get(id))
			.filter((v): v is string | string[] => v !== undefined)
	);
}
