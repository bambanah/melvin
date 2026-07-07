import { z } from "zod";

/**
 * The frozen shape of an `InvoiceVersion.content` jsonb document (docs/adr/0004,
 * docs/plans/017). Every read of `content` parses through this schema.
 *
 * `schemaVersion` is the evolution mechanism: add new fields as optional; a
 * breaking shape change bumps the literal and the renderer branches on it.
 * Never rewrite stored content to match a newer schema version.
 */
export const invoiceVersionLineSchema = z.object({
	kind: z.enum(["SUPPORT", "TRAVEL_TIME", "TRAVEL_KM", "ABT", "EXPENSE"]),
	description: z.string(),
	supportItemCode: z.string(),
	serviceDate: z.string(),
	quantity: z.number(),
	unit: z.enum(["HOUR", "KM", "MINUTE", "EACH"]),
	unitPrice: z.number(),
	total: z.number(),
	activityId: z.string().optional(),
	// The printed Details column, frozen so re-renders can't drift
	// (docs/plans/017 Step 2).
	detailsText: z.string(),
	// The printed Unit Price column's suffix — absent for EXPENSE lines,
	// which print no unit price (docs/plans/017 Step 6).
	unitPriceSuffix: z.enum(["hr", "km"]).optional()
});

export const invoiceVersionContentSchema = z.object({
	schemaVersion: z.literal(1),
	backfilled: z.boolean().optional(),
	header: z.object({
		invoiceNo: z.string(),
		displayInvoiceNo: z.string(),
		date: z.string(),
		participantName: z.string(),
		participantNumber: z.string().optional(),
		billTo: z.string().optional(),
		// Set on versions >= 2: the previous version's display number.
		amendsDisplayInvoiceNo: z.string().optional()
	}),
	provider: z.object({
		name: z.string().optional(),
		abn: z.string().optional(),
		bankName: z.string().optional(),
		bsb: z.string().optional(),
		accountNumber: z.string().optional()
	}),
	lines: z.array(invoiceVersionLineSchema),
	total: z.number()
});

export type InvoiceVersionLine = z.infer<typeof invoiceVersionLineSchema>;
export type InvoiceVersionContent = z.infer<typeof invoiceVersionContentSchema>;
