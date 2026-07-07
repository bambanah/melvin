import {
	invoiceVersionContentSchema,
	type InvoiceVersionContent,
	type InvoiceVersionLine
} from "@/schema/invoice-version-schema";
import {
	billableLines,
	lineDetailsText,
	lineUnitPriceSuffix
} from "./billing-lines";
import { round } from "./generic-utils";
import { displayInvoiceNo } from "./invoice-utils";
import type { InvoicePdfData } from "./pdf-generation";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const groupDigits = (value: string, separator: string) =>
	value.replaceAll(/\B(?=(\d{3})+(?!\d))/g, separator);

export interface ProviderDetails {
	name?: string;
	abn?: string;
	bankName?: string;
	bsb?: string;
	accountNumber?: string;
}

/**
 * The provider/payment-footer fields exactly as the PDF prints them —
 * shared by the live render and the frozen `InvoiceVersion` builder so the
 * two paths can never drift (docs/plans/017 Step 2).
 */
export function formatProviderDetails(
	user: InvoicePdfData["user"]
): ProviderDetails {
	if (!user) return {};

	return {
		...(user.name ? { name: user.name } : {}),
		...(user.abn ? { abn: groupDigits(user.abn.toString(), " ") } : {}),
		...(user.bankName ? { bankName: user.bankName } : {}),
		...(user.bsb ? { bsb: groupDigits(user.bsb.toString(), "-") } : {}),
		...(user.bankNumber
			? { accountNumber: groupDigits(user.bankNumber.toString(), " ") }
			: {})
	};
}

export interface BuildInvoiceVersionContentOptions {
	versionNumber: number;
	previousDisplayInvoiceNo?: string;
	backfilled?: boolean;
}

/** Pure builder from plan 007's PDF loader output to the frozen snapshot shape. */
export function buildInvoiceVersionContent(
	data: InvoicePdfData,
	options: BuildInvoiceVersionContentOptions
): InvoiceVersionContent {
	const { invoice, user, rateContext } = data;
	const { versionNumber, previousDisplayInvoiceNo, backfilled } = options;

	const lines: InvoiceVersionLine[] = invoice.activities
		.filter((activity) => activity.supportItem !== null)
		.flatMap((activity) =>
			billableLines(activity, rateContext).map((line) => ({
				kind: line.kind,
				description: line.description,
				supportItemCode: line.supportItemCode,
				serviceDate: dayjs.utc(line.serviceDate).toISOString(),
				quantity: line.quantity,
				unit: line.unit,
				unitPrice: line.unitPrice,
				total: line.total,
				...(line.activityId ? { activityId: line.activityId } : {}),
				detailsText: lineDetailsText(line, activity),
				...(lineUnitPriceSuffix(line, activity)
					? { unitPriceSuffix: lineUnitPriceSuffix(line, activity) }
					: {})
			}))
		);

	const total = round(
		lines.reduce((sum, line) => sum + line.total, 0),
		2
	);

	const content: InvoiceVersionContent = {
		schemaVersion: 1,
		...(backfilled ? { backfilled: true } : {}),
		header: {
			invoiceNo: invoice.invoiceNo,
			displayInvoiceNo: displayInvoiceNo(invoice.invoiceNo, versionNumber),
			date: dayjs.utc(invoice.date).toISOString(),
			participantName: invoice.client?.name ?? "",
			...(invoice.client?.number
				? { participantNumber: invoice.client.number }
				: {}),
			...(invoice.billTo ? { billTo: invoice.billTo } : {}),
			...(previousDisplayInvoiceNo
				? { amendsDisplayInvoiceNo: previousDisplayInvoiceNo }
				: {})
		},
		provider: formatProviderDetails(user),
		lines,
		total
	};

	return invoiceVersionContentSchema.parse(content);
}
