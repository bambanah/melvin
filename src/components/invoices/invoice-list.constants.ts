import { InvoiceStatus } from "@/generated/browser";

const STATUS_CONFIGS = {
	UNPAID: {
		label: "Unpaid",
		urlSlug: "unpaid",
		statuses: [InvoiceStatus.CREATED, InvoiceStatus.SENT]
	},
	PAID: {
		label: "Paid",
		urlSlug: "paid",
		statuses: [InvoiceStatus.PAID]
	}
} as const;

export type StatusFilter = keyof typeof STATUS_CONFIGS | "";

export const selectableStatusFilters = Object.keys(
	STATUS_CONFIGS
) as (keyof typeof STATUS_CONFIGS)[];

export const getStatusLabel = (filter: StatusFilter): string =>
	filter ? STATUS_CONFIGS[filter].label : "All Invoices";

export const getStatusStatuses = (
	filter: StatusFilter
): InvoiceStatus[] | undefined =>
	filter ? [...STATUS_CONFIGS[filter].statuses] : undefined;

export const filterFromUrl = (slug: string | undefined): StatusFilter =>
	(Object.entries(STATUS_CONFIGS).find(
		([, config]) => config.urlSlug === slug
	)?.[0] as StatusFilter) ?? "";

export const urlFromFilter = (filter: StatusFilter): string | undefined =>
	filter ? STATUS_CONFIGS[filter].urlSlug : undefined;
