import { Prisma } from "@prisma/client";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function decimalToCurrencyString(value: Prisma.Decimal) {
	return Number(value).toLocaleString(undefined, {
		style: "currency",
		currency: "AUD",
		minimumFractionDigits: 0
	});
}
