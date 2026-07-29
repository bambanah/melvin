import { z } from "zod";

/** The most *other* participants a group activity can add to its primary client (10 total). */
export const MAX_ADDITIONAL_GROUP_PARTICIPANTS = 9;

/** Total participants sharing a group session: the primary client plus the other participants. */
export const totalGroupSize = (otherParticipantIds: string[]): number =>
	otherParticipantIds.length + 1;

export const invoiceSchema = z.object({
	date: z.date().optional(),
	clientId: z.string().min(1, "Client is required"),
	billTo: z.string().optional(),
	invoiceNo: z.string().min(1, "Invoice number is required"),
	activityIds: z.array(z.string()).optional(),
	activitiesToCreate: z.array(
		z.object({
			supportItemId: z.string().min(1, "Support item is required"),
			groupClientIds: z
				.array(z.string())
				.max(MAX_ADDITIONAL_GROUP_PARTICIPANTS)
				.default([]),
			// No transit fields: the Provider Travel of an Activity created here is
			// derived from its Client's stored distance, never submitted - see
			// `standaloneTransitFields` in the invoice router.
			activities: z.array(
				z
					.object({
						date: z.date(),
						startTime: z.string(),
						endTime: z.string(),
						itemDistance: z.number()
					})
					.partial({ startTime: true, endTime: true, itemDistance: true })
					.refine(
						(data) =>
							(!!data.startTime && !!data.endTime) || !!data.itemDistance
					)
			)
		})
	)
});
export type InvoiceSchema = z.infer<typeof invoiceSchema>;
