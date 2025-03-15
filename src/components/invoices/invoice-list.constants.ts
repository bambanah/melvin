import { InvoiceStatus } from "@prisma/client";

export const statusFilters = ["ALL", "UNPAID", "PAID"] as const;
export type StatusFilter = (typeof statusFilters)[number];

export const statusFilterMap: Record<
	StatusFilter,
	InvoiceStatus[] | undefined
> = {
	ALL: undefined,
	UNPAID: [InvoiceStatus.CREATED, InvoiceStatus.SENT],
	PAID: [InvoiceStatus.PAID]
};
