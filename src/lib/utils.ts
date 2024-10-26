import { Prisma } from "@prisma/client";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function decimalToCurrencyString(value: Prisma.Decimal) {
	return Number(value).toLocaleString(undefined, {
		style: "currency",
		currency: "AUD",
	});
}
