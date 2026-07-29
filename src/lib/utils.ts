import type { Prisma } from "@/generated/client";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, minimumFractionDigits = 2) {
	return value.toLocaleString(undefined, {
		style: "currency",
		currency: "AUD",
		minimumFractionDigits
	});
}

export function decimalToCurrencyString(value: Prisma.Decimal) {
	return formatCurrency(Number(value), 0);
}
